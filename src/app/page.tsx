import React from 'react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050816] text-gray-100 overflow-x-hidden font-sans">
      {/* Navigation Header */}
      <header className="border-b border-[#1f2937]/60 bg-[#050816]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="AgentShield Logo" className="w-8 h-8 object-contain rounded-lg shadow-glow" />
            <span className="font-semibold text-lg tracking-wider text-white">Agent<span className="text-[#2563EB]">Shield</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#architecture" className="hover:text-white transition">Architecture</a>
            <a href="#workflow" className="hover:text-white transition">Workflow</a>
            <a href="#techstack" className="hover:text-white transition">Tech Stack</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium hover:text-white transition">Login</a>
            <a href="/dashboard" className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-blue-700 transition shadow-glow">
              Launch Console
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Abstract Background Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#2563EB]/10 to-[#10B981]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/30 text-xs font-semibold text-[#2563EB] mb-8">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            Solution for InnovaHack 2026 Round 2 Domain 1: FinTech — Problem Statement #2 "The Kill Switch"
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            AgentShield
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
            Secure AI Wallet Governance Platform for Autonomous Financial Agents
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/dashboard" className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all shadow-glow text-center text-sm min-w-[150px]">
              Launch Demo
            </a>
            <a href="/dashboard" className="px-6 py-3.5 rounded-xl bg-[#10B981]/10 hover:bg-[#10b981]/20 text-[#10B981] font-semibold border border-[#10B981]/30 transition text-center text-sm min-w-[150px]">
              Live Demo
            </a>
            <a href="#architecture" className="px-6 py-3.5 rounded-xl bg-[#101827] hover:bg-[#101827]/80 text-white font-semibold border border-[#1f2937] transition text-center text-sm min-w-[150px]">
              View Architecture
            </a>
            <a href="https://github.com/CodeCrafters/AgentShield" target="_blank" rel="noopener noreferrer" className="px-6 py-3.5 rounded-xl bg-[#101827] hover:bg-[#101827]/80 text-white font-semibold border border-[#1f2937] transition text-center text-sm min-w-[150px]">
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 px-6 border-t border-[#1f2937]/50 bg-[#101827]/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Out-of-Band Risk Enforcement</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Never trust the AI agent's internal checks. AgentShield executes governance checks on external, isolated pipelines.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-[#101827] border border-[#1f2937] hover:border-[#2563EB]/40 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] mb-6">
                🛡️
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Granular Limit Policies</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Define maximum transaction limits, hourly limits, and daily caps. Policies are evaluated cryptographically before submitting on-chain.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-[#101827] border border-[#1f2937] hover:border-[#ef4444]/40 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444] mb-6">
                🚨
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Instant On-Chain Kill Switch</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Deactivate permission layers instantly. A single button sets an on-chain freeze, locking out compromised agents immediately.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-[#101827] border border-[#1f2937] hover:border-[#10b981]/40 transition duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981] mb-6">
                📜
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Immutable Audit Trails</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Every transaction, validation run, and policy override gets indexed to our tamper-proof audit engine, with AI explainability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture Section */}
      <section id="architecture" className="py-24 px-6 border-t border-[#1f2937]/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[#2563EB] text-sm font-semibold tracking-wider uppercase mb-2 block">Zero-Trust Model</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Autonomous but Governed</h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                AI agents operate within complex networks and interact with contracts dynamically. 
                AgentShield handles keys and validates operations at the network interface layer.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] font-bold text-xs">1</div>
                  <div>
                    <h4 className="text-white font-medium mb-1">API Shield Proxy</h4>
                    <p className="text-gray-400 text-sm">The agent gets an isolated API gateway credential with zero access to underlying private keys.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] font-bold text-xs">2</div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Dual-Validation Gate</h4>
                    <p className="text-gray-400 text-sm">Rules check parameters. Gemini flags malicious payload structures dynamically.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] font-bold text-xs">3</div>
                  <div>
                    <h4 className="text-white font-medium mb-1">On-Chain Freeze</h4>
                    <p className="text-gray-400 text-sm">Our module on ERC-4337 smart contracts rejects transactions when frozen, independent of servers.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-[#101827] border border-[#1f2937] shadow-glow relative">
              <div className="flex items-center justify-between border-b border-[#1f2937] pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                </div>
                <span className="text-xs text-gray-500 font-mono">policy-enforcement-layer.json</span>
              </div>
              <pre className="text-xs text-blue-400 font-mono overflow-x-auto leading-relaxed">
{`{
  "agentId": "agent_01j4k92p8h",
  "limits": {
    "maxPerTransaction": "0.5 ETH",
    "dailyCap": "2.0 ETH",
    "currentDailySpent": "1.8 ETH"
  },
  "permissions": {
    "allowTokens": ["ETH", "USDC"],
    "whitelist": ["0x71C...397", "0x3fc...811"]
  },
  "killSwitchState": {
    "frozen": false,
    "lastTriggered": null
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="techstack" className="py-20 px-6 border-t border-[#1f2937]/50 bg-[#101827]/10 text-center">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12">Production-Grade Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 justify-center">
            <div className="p-6 rounded-xl bg-[#101827]/60 border border-[#1f2937] text-sm text-gray-300">Next.js 15</div>
            <div className="p-6 rounded-xl bg-[#101827]/60 border border-[#1f2937] text-sm text-gray-300">Solidity / Hardhat</div>
            <div className="p-6 rounded-xl bg-[#101827]/60 border border-[#1f2937] text-sm text-gray-300">Tailwind CSS</div>
            <div className="p-6 rounded-xl bg-[#101827]/60 border border-[#1f2937] text-sm text-gray-300">MongoDB Atlas</div>
            <div className="p-6 rounded-xl bg-[#101827]/60 border border-[#1f2937] text-sm text-gray-300">Google Gemini API</div>
            <div className="p-6 rounded-xl bg-[#101827]/60 border border-[#1f2937] text-sm text-gray-300">Ethers.js / Web3</div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 border-t border-[#1f2937]/50 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#101827] border border-[#1f2937]">
            <h4 className="text-white font-medium mb-2">Why can't I just trust the AI agent?</h4>
            <p className="text-gray-400 text-sm">
              AI models are statistical systems. A simple prompt injection, package dependency compromise, or model hallucination can trigger unintended payouts. Guardrails must be enforced externally.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[#101827] border border-[#1f2937]">
            <h4 className="text-white font-medium mb-2">How does the Kill Switch function under load?</h4>
            <p className="text-gray-400 text-sm">
              The Kill Switch has dual logic: an off-chain API block which is near-instant, and an on-chain flag modifier on the ERC-4337 smart account. Even if our API servers go down, on-chain protection prevents execution.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f2937]/60 bg-[#050816] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-[#2563EB] to-[#10B981]" />
            <span className="font-semibold text-sm tracking-wider text-white">AgentShield</span>
          </div>
          <span className="text-xs text-gray-500">© 2026 AgentShield Systems. Built for high-security Web3 agency.</span>
        </div>
      </footer>
    </div>
  );
}
