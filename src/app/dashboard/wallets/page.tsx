"use client";

import React, { useState, useEffect } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { z } from "zod";

const createWalletSchema = z.object({
  name: z.string().min(3, "Wallet name must be at least 3 characters"),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
});

export default function WalletsPage() {
  const {
    metaMaskAddress,
    metaMaskConnected,
    metaMaskBalance,
    connectMetaMask,
    wallets,
    loading,
    error: walletError,
    fetchDbWallets,
    createDbWallet,
    freezeDbWallet,
    unfreezeDbWallet,
    deleteDbWallet,
  } = useWalletStore();

  const { addNotification } = useNotificationStore();

  // Local Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState(11155111); // Sepolia by default
  const [walletType, setWalletType] = useState<"ERC4337" | "Safe" | "EOA">("ERC4337");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy state tracker
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDbWallets();
  }, [fetchDbWallets]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsSubmitting(true);

    const parsed = createWalletSchema.safeParse({ name, address });
    if (!parsed.success) {
      setValidationError(parsed.error.errors[0]?.message || "Invalid inputs");
      setIsSubmitting(false);
      return;
    }

    const success = await createDbWallet(name, address, chainId, walletType);
    setIsSubmitting(false);

    if (success) {
      addNotification("Wallet Registered", `Successfully registered governance wallet: ${name}`, "success");
      // Reset
      setName("");
      setAddress("");
      setModalOpen(false);
    }
  };

  // Populate dynamic mock wallet fields when user clicks 'Auto-Fill with MetaMask'
  const handleAutoFill = () => {
    if (metaMaskConnected && metaMaskAddress) {
      setAddress(metaMaskAddress);
      setName("MetaMask Managed Account");
    } else {
      alert("Please connect MetaMask first.");
    }
  };

  const handleGenerateMockData = async () => {
    const mocks = [
      { name: "Polygon Smart Account", address: "0x3fc91a3f3b9c8b8a8b89c8a8b98b9f1c7d2f8e12", chainId: 137, type: "ERC4337" },
      { name: "Base Multi-sig Module", address: "0x71c5a92a3f9c8b8a8b98c8a8b98b9f1c7d2f8e34", chainId: 8453, type: "Safe" },
      { name: "Sepolia Test Account", address: "0x51c91a3f3b9c8b8a8b89c8a8b98b9f1c7d2f8e56", chainId: 11155111, type: "ERC4337" }
    ];

    for (const mock of mocks) {
      await createDbWallet(mock.name, mock.address, mock.chainId, mock.type);
    }
    addNotification("Mock Wallets Ingested", "Ingested Ethereum, Polygon, and Base governance configurations.", "info");
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-gray-400 text-xs mt-0.5">Manage and freeze security module wallets controlled by AI agents.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateMockData}
            className="px-4 py-2 text-xs font-semibold bg-[#101827] border border-[#1f2937] text-gray-400 hover:text-white rounded-xl transition"
          >
            💡 Load Mock Wallets
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl transition shadow-glow"
          >
            + Register Wallet
          </button>
        </div>
      </div>

      {/* Web3 MetaMask Status card */}
      <div className="p-6 bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow">
        <h3 className="text-md font-bold text-white mb-4">MetaMask Web3 Node State</h3>
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div className="space-y-1">
            {metaMaskConnected ? (
              <>
                <p className="text-sm font-semibold text-white">Connected EOA: <span className="font-mono text-gray-400">{metaMaskAddress}</span></p>
                <p className="text-xs text-gray-400">Node Balance: <span className="text-[#10B981] font-mono font-bold">{metaMaskBalance} ETH</span></p>
              </>
            ) : (
              <p className="text-sm text-gray-400">MetaMask provider is disconnected. Connect to auto-fill registration addresses.</p>
            )}
          </div>
          {!metaMaskConnected ? (
            <button
              onClick={connectMetaMask}
              className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl transition shadow-glow"
            >
              🦊 Connect Wallet
            </button>
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" title="Active Connection" />
          )}
        </div>
      </div>

      {/* Database Wallets List */}
      <div className="bg-[#101827] border border-[#1f2937]/80 rounded-2xl shadow-glow overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f2937]/80">
          <h3 className="text-md font-bold text-white">Governed Assets ({wallets.length})</h3>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="text-4xl block mb-2">💳</span>
            <h4 className="text-white font-semibold">No Governed Wallets</h4>
            <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">
              Please register a wallet module. Autonomous agents cannot trans-operate until you configure a target governance contract address.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#1f2937]/85 text-xs text-gray-500 uppercase font-semibold">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4">Network</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]/50">
                {wallets.map((wallet) => (
                  <tr key={wallet._id} className="hover:bg-[#050816]/30 transition">
                    {/* Name */}
                    <td className="px-6 py-4 font-semibold text-white">{wallet.name}</td>
                    
                    {/* Address */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
                        <span>{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</span>
                        <button
                          onClick={() => copyToClipboard(wallet.address, wallet._id)}
                          className="text-gray-500 hover:text-white transition"
                          title="Copy Address"
                        >
                          {copiedId === wallet._id ? "✓" : "📋"}
                        </button>
                      </div>
                    </td>

                    {/* Network */}
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-300">
                        {wallet.chainId === 1 && "Ethereum"}
                        {wallet.chainId === 137 && "Polygon"}
                        {wallet.chainId === 8453 && "Base"}
                        {wallet.chainId === 11155111 && "Sepolia"}
                        {![1, 137, 8453, 11155111].includes(wallet.chainId) && `Chain ID: ${wallet.chainId}`}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 text-xs font-mono font-semibold text-blue-400">{wallet.walletType}</td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold capitalize ${
                        wallet.status === "active" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#EF4444]/15 text-[#EF4444]"
                      }`}>
                        {wallet.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {wallet.status === "active" ? (
                          <button
                            onClick={() => freezeDbWallet(wallet._id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] rounded-lg transition"
                          >
                            Freeze
                          </button>
                        ) : (
                          <button
                            onClick={() => unfreezeDbWallet(wallet._id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] rounded-lg transition"
                          >
                            Unfreeze
                          </button>
                        )}
                        <button
                          onClick={() => deleteDbWallet(wallet._id)}
                          className="p-1 text-gray-500 hover:text-red-400 transition"
                          title="Delete Wallet"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Wallet Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#050816]/75 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-md bg-[#101827] border border-[#1f2937] rounded-2xl p-6 shadow-glow relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition font-bold"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-5">Register Governed Wallet</h3>

            {validationError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 text-red-400 text-xs rounded-xl">
                ⚠️ {validationError}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Wallet Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                  placeholder="Marketing Escrow Wallet"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Contract Address</label>
                  {metaMaskConnected && (
                    <button
                      type="button"
                      onClick={handleAutoFill}
                      className="text-xs text-[#2563EB] hover:underline"
                    >
                      Autofill connected EOA
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm font-mono"
                  placeholder="0x..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Network</label>
                  <select
                    value={chainId}
                    onChange={(e) => setChainId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                  >
                    <option value={11155111}>Sepolia Testnet</option>
                    <option value={1}>Ethereum Mainnet</option>
                    <option value={137}>Polygon Mainnet</option>
                    <option value={8453}>Base Mainnet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Wallet Type</label>
                  <select
                    value={walletType}
                    onChange={(e) => setWalletType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                  >
                    <option value="ERC4337">ERC-4337 Account</option>
                    <option value="Safe">Gnosis Safe</option>
                    <option value="EOA">Standard EOA</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#1f2937] text-gray-400 font-medium hover:text-white transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-medium transition shadow-glow flex items-center justify-center text-sm"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Register"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
