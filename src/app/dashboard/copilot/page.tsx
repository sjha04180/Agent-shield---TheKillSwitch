"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAIStore } from "@/store/useAIStore";
import { useNotificationStore } from "@/store/useNotificationStore";

export default function CopilotPage() {
  const {
    conversations,
    activeConversation,
    loading,
    usageRequests,
    fetchConversations,
    startNewConversation,
    selectConversation,
    sendMessage,
    clearConversation,
    fetchUsage,
  } = useAIStore();

  const { addNotification } = useNotificationStore();
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchUsage();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const text = input;
    setInput("");
    await sendMessage(text);
    fetchUsage();
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInput(suggestion);
    // Focus or trigger immediately
    setInput("");
    await sendMessage(suggestion);
    fetchUsage();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification("Copied", "Response copied to clipboard.", "success");
  };

  const suggestions = [
    "Why was my last transaction blocked?",
    "Suggest safer spending limits for AI Agents.",
    "Summarize today's executive security status.",
    "Explain the risk calculations for Wallet anomalies."
  ];

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 font-sans">
      {/* 1. Left Side: Chat Sessions History list */}
      <div className="w-64 bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-4 flex flex-col justify-between shadow-glow">
        <div className="space-y-4">
          <button
            onClick={startNewConversation}
            className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-glow"
          >
            + New Conversation
          </button>
          
          <div className="space-y-1.5 overflow-y-auto max-h-[350px] pr-1">
            <span className="text-[10px] text-gray-500 uppercase font-semibold block px-2 mb-2">Previous Chats</span>
            {conversations.map((c) => (
              <div
                key={c._id}
                onClick={() => selectConversation(c._id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  activeConversation?._id === c._id
                    ? "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25"
                    : "text-gray-400 hover:text-white hover:bg-[#050816]/30"
                }`}
              >
                {c.title.length > 22 ? `${c.title.slice(0, 22)}...` : c.title}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={clearConversation}
          className="w-full py-2 bg-red-950/20 border border-red-500/35 hover:bg-red-950/40 text-red-400 rounded-xl text-xs font-bold transition"
        >
          Clear History
        </button>
      </div>

      {/* 2. Middle: Chat Screen interface */}
      <div className="flex-1 bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-6 flex flex-col justify-between shadow-glow relative">
        <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2">
          {(!activeConversation || activeConversation.messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-16">
              <span className="text-4xl block animate-bounce">🤖</span>
              <h3 className="text-md font-bold text-white">AI Security Copilot</h3>
              <p className="text-gray-400 text-xs max-w-sm">
                Ask me to analyze wallet actions, explain policy blocks, or summarize audit timeline logs.
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg mt-6">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s)}
                    className="p-3 bg-[#050816]/50 hover:bg-[#050816] border border-[#1f2937]/80 rounded-xl text-[10px] text-gray-400 hover:text-white text-left transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeConversation.messages.map((m, idx) => (
                <div key={idx} className={`p-4 rounded-2xl flex gap-3 text-xs leading-relaxed ${
                  m.role === "user" ? "bg-[#050816]/75 border border-[#1f2937]/50" : "bg-[#2563EB]/5 border border-[#2563EB]/15 text-gray-200"
                }`}>
                  <span className="text-lg">{m.role === "user" ? "👤" : "🛡️"}</span>
                  <div className="flex-1">
                    <span className="font-bold text-white block mb-1">
                      {m.role === "user" ? "You" : "Security Copilot"}
                    </span>
                    <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-300">{m.content}</div>
                    
                    {m.role === "model" && (
                      <button
                        onClick={() => handleCopy(m.content)}
                        className="mt-3 text-[10px] text-gray-500 hover:text-white transition flex items-center gap-1"
                      >
                        📋 Copy Answer
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="p-4 bg-[#2563EB]/5 border border-[#2563EB]/15 rounded-2xl flex gap-3 text-xs">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <span className="font-bold text-white block mb-1">Security Copilot</span>
                    <div className="flex gap-1.5 py-1">
                      <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input box form */}
        <form onSubmit={handleSend} className="relative mt-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] text-xs font-sans placeholder-gray-500"
            placeholder="Type your security question here (e.g. why was my wallet frozen?)..."
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-3.5 top-3 text-[#2563EB] hover:text-blue-400 disabled:opacity-30 transition font-bold"
          >
            Send
          </button>
        </form>
      </div>

      {/* 3. Right Side: Settings & limits metrics panel */}
      <div className="w-64 bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-5 space-y-6 shadow-glow">
        <div>
          <h3 className="text-xs font-bold text-white mb-3">Model selector</h3>
          <div className="w-full px-3 py-2 rounded-xl bg-[#050816] border border-[#2563EB]/30 text-xs text-[#2563EB] font-semibold flex items-center gap-1.5 shadow-glow-blue select-none">
            <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
            Google Gemini 1.5 Flash (Active)
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-white mb-3">Copilot Usage quotas</h3>
          <ul className="space-y-3.5 text-xs text-gray-400">
            <li className="flex justify-between border-b border-[#1f2937]/50 pb-2">
              <span>Requests Today:</span>
              <span className="font-semibold text-white font-mono">{usageRequests}/100</span>
            </li>
            <li className="flex justify-between border-b border-[#1f2937]/50 pb-2">
              <span>Security Grounding:</span>
              <span className="text-[#10B981] font-semibold uppercase">Active</span>
            </li>
            <li className="flex justify-between pb-2">
              <span>Signatures Guard:</span>
              <span className="text-white font-semibold">Enforced</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
