import { ethers } from "ethers";
import crypto from "crypto";

/**
 * Returns a read-only Ethers.js provider for the given network.
 * Uses environment RPC URLs for Sepolia, with public fallbacks.
 */
export function getProvider(network: string): ethers.JsonRpcProvider {
  const rpcUrls: Record<string, string> = {
    sepolia: process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
    ethereum: "https://cloudflare-eth.com",
    polygon: "https://polygon-rpc.com",
    base: "https://mainnet.base.org",
  };

  const url = rpcUrls[network.toLowerCase()] ?? rpcUrls.sepolia;
  return new ethers.JsonRpcProvider(url);
}

/**
 * Fetches the ETH balance of an address on the given network.
 * Returns the balance formatted as a decimal ETH string.
 */
export async function getWalletBalance(
  address: string,
  network: string
): Promise<{ balanceEth: string; balanceWei: string }> {
  const provider = getProvider(network);
  const balanceWei = await provider.getBalance(address);
  const balanceEth = ethers.formatEther(balanceWei);
  return { balanceEth, balanceWei: balanceWei.toString() };
}

/**
 * Fetches the current block number on the given network.
 */
export async function getCurrentBlock(network: string): Promise<number> {
  const provider = getProvider(network);
  return await provider.getBlockNumber();
}

/**
 * Fetches a transaction receipt by its hash.
 * Returns null if the transaction is not yet mined.
 */
export async function getTransactionReceipt(
  txHash: string,
  network: string
): Promise<ethers.TransactionReceipt | null> {
  const provider = getProvider(network);
  return await provider.getTransactionReceipt(txHash);
}

/**
 * Checks whether a given address is a smart contract (has code deployed).
 */
export async function isContract(
  address: string,
  network: string
): Promise<boolean> {
  const provider = getProvider(network);
  const code = await provider.getCode(address);
  return code !== "0x";
}

/**
 * Gets the current gas price estimate on the given network.
 * Returns values in Gwei.
 */
export async function getGasPrice(
  network: string
): Promise<{ gasPriceGwei: string; gasPriceWei: string }> {
  const provider = getProvider(network);
  const feeData = await provider.getFeeData();
  const gasPriceWei = feeData.gasPrice ?? BigInt(0);
  const gasPriceGwei = ethers.formatUnits(gasPriceWei, "gwei");
  return { gasPriceGwei, gasPriceWei: gasPriceWei.toString() };
}

/**
 * Simulates a transaction (used when demo mode is active or blockchain RPC is down)
 */
export async function simulateTransaction(
  to: string,
  amount: number,
  token: string
): Promise<{ txHash: string; status: "executed" }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  // Generate a fake transaction hash
  const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
  
  return { txHash, status: "executed" };
}

/**
 * Executes an actual transaction on-chain via Ethers.js
 */
export async function executeTransaction(
  to: string,
  amount: number,
  token: string,
  network: string,
  privateKey: string
): Promise<{ txHash: string; status: "executed" | "failed" }> {
  try {
    const provider = getProvider(network);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Convert amount to Wei (assuming 18 decimals for ETH/native tokens)
    const amountWei = ethers.parseEther(amount.toString());
    
    const tx = await wallet.sendTransaction({
      to,
      value: amountWei,
    });
    
    // Wait for 1 confirmation
    const receipt = await tx.wait(1);
    
    if (receipt && receipt.status === 1) {
      return { txHash: tx.hash, status: "executed" };
    } else {
      return { txHash: tx.hash, status: "failed" };
    }
  } catch (error) {
    console.error("[BlockchainService] Transaction failed:", error);
    throw error;
  }
}

/**
 * Generates an EIP-191 compliant co-signing signature for the TransactionExecutor contract.
 */
export async function signCoSigningPayload(
  agentAddress: string,
  walletAddress: string,
  targetAddress: string,
  amountEth: number,
  dataHex: string,
  nonce: number,
  deadline: number,
  privateKey: string
): Promise<string> {
  const valueWei = ethers.parseEther(amountEth.toString());
  const messageHash = ethers.solidityPackedKeccak256(
    ["address", "address", "address", "uint256", "bytes", "uint256", "uint256"],
    [
      agentAddress,
      walletAddress,
      targetAddress,
      valueWei,
      dataHex || "0x",
      nonce,
      deadline
    ]
  );
  
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));
  return signature;
}

