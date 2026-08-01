"use client";

import React, { useState, useEffect } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { useNotificationStore } from "@/store/useNotificationStore";

interface ContractDeployment {
  _id: string;
  contractName: string;
  address: string;
  network: string;
  compiler: string;
}

interface OnChainTx {
  _id: string;
  hash: string;
  blockNumber: number;
  gasUsed: string;
  status: "success" | "reverted";
  walletAddress: string;
  agentId?: {
    name: string;
  };
  policyId?: {
    name: string;
  };
  actionType: string;
  timestamp: string;
}

export default function BlockchainDashboard() {
  const { metaMaskConnected, metaMaskAddress, metaMaskChainId } = useWalletStore();
  const { addNotification } = useNotificationStore();

  const [contracts, setContracts] = useState<ContractDeployment[]>([]);
  const [history, setHistory] = useState<OnChainTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchContracts = async () => {
    try {
      const res = await fetch("/api/contracts");
      const data = await res.json();
      if (data.success) setContracts(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/blockchain/history");
      const data = await res.json();
      if (data.success) setHistory(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchContracts(), fetchHistory()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleSeedContracts = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/contracts/deploy", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        addNotification("Web3 Seed Active", "Solidity contract registry seeded successfully on Sepolia testnet.", "success");
        refreshAll();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSeeding(false);
    }
  };

  // Check if connected network is Sepolia (Chain ID 11155111, or hex 0xaa36a7)
  const isSepolia = metaMaskChainId === 11155111;

  const handleSwitchNetwork = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia chainId in hex
      });
    } catch (switchError: any) {
      // If network is not added, request add chain
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Test Network",
                rpcUrls: ["https://rpc.sepolia.org"],
                nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Blockchain Dashboard</h2>
          <p className="text-gray-400 text-xs mt-0.5">Monitor on-chain smart accounts, deployment states, and cryptographic gateways.</p>
        </div>
        <button
          onClick={handleSeedContracts}
          disabled={isSeeding}
          className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl transition shadow-glow disabled:opacity-50"
        >
          {isSeeding ? "Seeding..." : "⚡ Deploy/Seed Sepolia Contracts"}
        </button>
      </div>

      {/* Connection & Network Warnings */}
      {metaMaskConnected && !isSepolia && (
        <div className="p-4 bg-red-950/20 border border-red-500/35 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-glow-danger">
          <div>
            <span className="text-xs font-bold text-white uppercase block mb-1">Wrong Network Detected</span>
            <p className="text-xs text-gray-400">
              Your MetaMask EOA is connected to Chain ID {metaMaskChainId}. Please switch network environments to Sepolia Testnet.
            </p>
          </div>
          <button
            onClick={handleSwitchNetwork}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] uppercase rounded-lg transition"
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      {/* Metamask stats & contracts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Columns 1-2): Active Smart Contracts list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1f2937]/85">
              <h3 className="text-sm font-bold text-white">Solidity Governance Contracts</h3>
            </div>
            
            {contracts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                No active contracts registered in database directory. Click Deploy/Seed to register Sepolia contract addresses.
              </div>
            ) : (
              <div className="divide-y divide-[#1f2937]/50">
                {contracts.map((c) => (
                  <div key={c._id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#050816]/30 transition">
                    <div>
                      <span className="text-xs font-bold text-white block">{c.contractName}</span>
                      <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{c.address}</span>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-[#2563EB]/15 text-[#2563EB] uppercase">
                        {c.network}
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono block mt-1">Compiler: v0.8.20</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Web3 parameters */}
        <div className="space-y-6">
          <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
            <h3 className="text-sm font-bold text-white mb-4">MetaMask Context Parameters</h3>
            <ul className="space-y-3.5 text-xs text-gray-400">
              <li className="flex justify-between border-b border-[#1f2937]/50 pb-2.5">
                <span>EOA Connected Address:</span>
                <span className="font-semibold text-white font-mono">
                  {metaMaskConnected && metaMaskAddress ? `${metaMaskAddress.slice(0, 8)}...` : "Not connected"}
                </span>
              </li>
              <li className="flex justify-between border-b border-[#1f2937]/50 pb-2.5">
                <span>Selected Network:</span>
                <span className="font-semibold text-white font-mono">
                  {metaMaskConnected ? (isSepolia ? "Sepolia Testnet" : "Custom network") : "Unknown"}
                </span>
              </li>
              <li className="flex justify-between pb-2.5">
                <span>Chain ID Hex:</span>
                <span className="font-semibold text-white font-mono">
                  {metaMaskConnected && metaMaskChainId ? `0x${metaMaskChainId.toString(16)}` : "Unassigned"}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* On-chain execute log list */}
      <div className="bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f2937]/85">
          <h3 className="text-sm font-bold text-white">On-chain transaction logs</h3>
        </div>
        
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-12">No on-chain transaction records generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1f2937]/85 text-xs text-gray-500 uppercase font-semibold">
                  <th className="px-6 py-4">Transaction Hash</th>
                  <th className="px-6 py-4">Block</th>
                  <th className="px-6 py-4">Gas Used</th>
                  <th className="px-6 py-4">Agent name</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]/50">
                {history.map((tx) => (
                  <tr key={tx._id} className="hover:bg-[#050816]/30 transition">
                    <td className="px-6 py-4 font-mono text-[#2563EB] hover:underline">
                      <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">
                        {tx.hash.slice(0, 16)}...{tx.hash.slice(-12)}
                      </a>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-400">{tx.blockNumber}</td>
                    <td className="px-6 py-4 font-mono text-gray-400">{tx.gasUsed} gas</td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {tx.agentId?.name || "Governance Module"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tx.status === "success"
                          ? "bg-[#10B981]/15 text-[#10B981]"
                          : "bg-[#EF4444]/15 text-[#EF4444]"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
