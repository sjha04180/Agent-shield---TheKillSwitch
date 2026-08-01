import { ethers } from "ethers";

const GATEWAY_PRIVATE_KEY = process.env.GATEWAY_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // local hardhat #0 key

export async function signTransactionPayload(
  agentAddress: string,
  walletAddress: string,
  targetAddress: string,
  value: string, // in wei representation (bigint string)
  data: string,
  nonce: number,
  deadline: number
): Promise<string> {
  const wallet = new ethers.Wallet(GATEWAY_PRIVATE_KEY);
  
  // ABI encode packed parameters matching TransactionExecutor.sol hash structure
  const msgHash = ethers.solidityPackedKeccak256(
    ["address", "address", "address", "uint256", "bytes", "uint256", "uint256"],
    [
      agentAddress,
      walletAddress,
      targetAddress,
      BigInt(value),
      data || "0x",
      nonce,
      deadline
    ]
  );
  
  // Sign the Keccak256 message bytes using the gateway's private key
  const messageBytes = ethers.getBytes(msgHash);
  const signature = await wallet.signMessage(messageBytes);
  return signature;
}
