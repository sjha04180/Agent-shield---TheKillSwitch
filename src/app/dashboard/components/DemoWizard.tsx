import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useWalletStore } from "@/store/useWalletStore";
import { useRouter } from "next/navigation";

interface WizardStep {
  title: string;
  description: string;
  actionText?: string;
  secondaryActionText?: string;
  targetSelector?: string; // Highlight selector
}

const WIZARD_STEPS: WizardStep[] = [
  {
    title: "1. Welcome to AgentShield",
    description: "Welcome! AgentShield protects corporate treasuries from autonomous AI agent hallucinations. Let's run a quick co-signing demo.",
    actionText: "Initialize Demo Setup",
  },
  {
    title: "2. Establish Organization",
    description: "We are seeding Acme / Nova Finance in the MongoDB governance database to host wallets and register AI agents.",
    actionText: "Verify Sandbox Organization",
  },
  {
    title: "3. Connect Smart Wallet",
    description: "Connect your controller Web3 hardware/MetaMask wallet. Owners hold the ultimate master EOA to freeze keys or execute recovery withdrawals.",
    actionText: "Simulate Wallet Connection",
  },
  {
    title: "4. Register AI Agents",
    description: "AI agents operate with restricted API tokens. Let's register three agents: Cloud Billing, Treasury, and Payroll Agents.",
    actionText: "Link Autopilot Bots",
  },
  {
    title: "5. Assign Strict Policies",
    description: "Configure policies: 2.0 ETH single transaction caps, weekend locks, token whitelists, and a maximum risk limit score of 75/100.",
    actionText: "Enforce Guardrails",
  },
  {
    title: "6. Dispatch Safe Transaction",
    description: "We'll propose a valid Google Cloud billing transfer (0.05 ETH). Since it satisfies all rules and risk is low, it Cosigns & executes on-chain.",
    actionText: "Simulate Safe Transfer",
  },
  {
    title: "7. Suspicious Transaction",
    description: "Let's propose a 1.95 ETH transfer. It is close to the single transaction limit threshold, raising risk levels to Medium.",
    actionText: "Simulate Elevated Risk",
  },
  {
    title: "8. Policy Engine Block",
    description: "Proposing a transfer to a blacklisted destination wallet (0xdead). The isolated Policy Engine gateway blocks the payload instantly.",
    actionText: "Trigger Policy Block",
  },
  {
    title: "9. Auto Kill Switch Trigger",
    description: "A malicious sweep transaction (50 ETH) is proposed. Risk engine returns Critical (100). The global Kill Switch trips, freezing wallets and pausing all agents.",
    actionText: "Trigger Emergency Freeze",
  },
  {
    title: "10. Cryptographic Co-signing",
    description: "EIP-191 ECDSA gateway signatures co-authorize approvals. Nonces increment to block replay attacks. Recovery master keys bypass compromise.",
    actionText: "Verify Contract Security",
  },
  {
    title: "11. Audit ledger",
    description: "Navigate to the Audit ledger to view the immutable verification events and Gemini-grounded explanations.",
    actionText: "View Audit Logs",
  },
  {
    title: "12. Analytics Operations",
    description: "Review metrics: total evaluations, blocked anomalies, average risk rate, and recent security notifications.",
    actionText: "Conclude Demo Wizard",
  },
];

export function DemoWizard() {
  const router = useRouter();
  const { demoMode, setupDemoData, resetDemoData } = useSettingsStore();
  const { addNotification } = useNotificationStore();
  const { connectMetaMask, wallets, fetchDbWallets } = useWalletStore();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [scriptRunning, setScriptRunning] = useState(false);
  const [scriptProgress, setScriptProgress] = useState("");

  // Clean layout highlighting based on active step selector
  useEffect(() => {
    if (!isOpen) {
      document.querySelectorAll(".wizard-highlight").forEach((el) => {
        el.classList.remove("wizard-highlight", "ring-2", "ring-[#2563EB]", "ring-offset-2", "ring-offset-[#050816]");
      });
      return;
    }

    const selectors: Record<number, string> = {
      1: "aside", // Sidebar Org
      2: "aside",
      3: "header", // MetaMask button
      4: "a[href='/dashboard/agents']", // Sidebar link
      5: "a[href='/dashboard/policies']",
      6: "main",
      7: "main",
      8: "main",
      9: "main",
      10: "a[href='/dashboard/blockchain']",
      11: "a[href='/dashboard/audit']",
      12: "a[href='/dashboard']",
    };

    // Remove old highlights
    document.querySelectorAll(".wizard-highlight").forEach((el) => {
      el.classList.remove("wizard-highlight", "ring-2", "ring-[#2563EB]", "ring-offset-2", "ring-offset-[#050816]");
    });

    const selector = selectors[currentStep];
    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add("wizard-highlight", "ring-2", "ring-[#2563EB]", "ring-offset-2", "ring-offset-[#050816]");
      }
    }
  }, [currentStep, isOpen]);

  const handleStepAction = async () => {
    const step = WIZARD_STEPS[currentStep];
    if (!step) return;

    try {
      if (currentStep === 0) {
        // Welcome -> Initialize Setup
        const success = await setupDemoData();
        if (success) {
          addNotification("Sandbox Ready", "Organization Nova Finance, strict policies, and wallets successfully loaded.", "success");
          setCurrentStep(1);
        } else {
          addNotification("Setup Failed", "Failed to seed demo assets.", "error");
        }
      } else if (currentStep === 1) {
        // Org
        setCurrentStep(2);
      } else if (currentStep === 2) {
        // Connect MetaMask
        await connectMetaMask();
        addNotification("MetaMask Mock Connected", "Controller EOA attached to Admin Console.", "success");
        setCurrentStep(3);
      } else if (currentStep === 3) {
        // Register agents
        router.push("/dashboard/agents");
        addNotification("Agents Loaded", "Cloud Billing, Treasury, and Payroll agents registered in console.", "success");
        setCurrentStep(4);
      } else if (currentStep === 4) {
        // Policies
        router.push("/dashboard/policies");
        addNotification("Policies Active", "Enterprise strict spending bounds and token restrictions assigned.", "success");
        setCurrentStep(5);
      } else if (currentStep === 5) {
        // Generate safe transaction
        router.push("/dashboard/simulator");
        addNotification("Dispatching Proposal", "Submitting Google Cloud invoice (0.05 ETH) from Cloud Agent...", "success");
        const res = await fetch("/api/simulator/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: "safe_payment", agentId: await getFirstAgentId() })
        });
        const data = await res.json();
        if (data.success) {
          addNotification("Approved & Signed", "Transaction was Approved by policy gateway and signed on-chain.", "success");
          setCurrentStep(6);
        }
      } else if (currentStep === 6) {
        // Suspicious
        addNotification("Dispatching Proposal", "Submitting large payment (1.95 ETH) from Treasury Agent...", "success");
        const res = await fetch("/api/simulator/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: "large_payment", agentId: await getFirstAgentId() })
        });
        const data = await res.json();
        if (data.success) {
          addNotification("Approved under Review", "Approved. Risk Score: 60 (Medium). Manual confirmation required.", "warning");
          setCurrentStep(7);
        }
      } else if (currentStep === 7) {
        // Block
        addNotification("Dispatching Proposal", "Attempting transfer to blacklist 0xdead...", "warning");
        const res = await fetch("/api/simulator/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: "unknown_wallet", agentId: await getFirstAgentId() })
        });
        const data = await res.json();
        if (data.success) {
          addNotification("Policy Breach Blocked", "Transaction Blocked: Wallet address not whitelisted.", "error");
          setCurrentStep(8);
        }
      } else if (currentStep === 8) {
        // Auto Kill Switch
        addNotification("Dispatching Proposal", "Attempting emergency sweep of 50 ETH from Agent Wallet...", "warning");
        const res = await fetch("/api/simulator/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: "wallet_drain", agentId: await getFirstAgentId() })
        });
        const data = await res.json();
        if (data.success) {
          addNotification("AUTO HALT TRIGGERED", "Risk score 100/100. Emergency Kill Switch engaged. Wallet frozen.", "error");
          setCurrentStep(9);
        }
      } else if (currentStep === 9) {
        // Blockchain console
        router.push("/dashboard/blockchain");
        setCurrentStep(10);
      } else if (currentStep === 11) {
        // Audit Logs
        router.push("/dashboard");
        setCurrentStep(11);
      } else if (currentStep === 10) {
        // Audit Logs
        router.push("/dashboard/audit");
        setCurrentStep(11);
      } else if (currentStep === 11) {
        // Conclude
        setIsOpen(false);
        setCurrentStep(0);
        addNotification("Demo Complete", "Thank you for reviewing AgentShield!", "success");
      }
    } catch (e) {
      addNotification("Demo Step Error", "Failed to advance demo scenario.", "error");
    }
  };

  const getFirstAgentId = async (): Promise<string> => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      return data.data[0]?._id || "";
    } catch (e) {
      return "";
    }
  };

  // Launch Automated Enterprise Demo Sequence (60s execution script)
  const handleLaunchEnterpriseDemo = async () => {
    setScriptRunning(true);
    setIsOpen(true);
    setCurrentStep(0);

    const steps = demoMode ? [
      { text: "Scrubbing databases...", action: async () => { await resetDemoData(); } },
      { text: "Seeding Nova Finance organization...", action: async () => { await setupDemoData(); } },
      { text: "Deploying AI Agent smart contract wallets...", action: async () => { await fetchDbWallets(); } },
      { text: "Enforcing Spending Limits & Whitelists...", action: async () => {} },
      { text: "Submitting Safe AWS Billing payment (0.05 ETH)...", action: async () => {
          const id = await getFirstAgentId();
          await fetch("/api/simulator/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: "safe_payment", agentId: id })
          });
        }
      },
      { text: "Submitting Large Treasury payment (1.95 ETH)...", action: async () => {
          const id = await getFirstAgentId();
          await fetch("/api/simulator/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: "large_payment", agentId: id })
          });
        }
      },
      { text: "Anomalous Address check (0xdead)...", action: async () => {
          const id = await getFirstAgentId();
          await fetch("/api/simulator/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: "unknown_wallet", agentId: id })
          });
        }
      },
      { text: "Compromised Node: trigger auto-draining (50 ETH)...", action: async () => {
          const id = await getFirstAgentId();
          await fetch("/api/simulator/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: "wallet_drain", agentId: id })
          });
        }
      },
      { text: "Circuit Breaker engaged: Org Frozen status: TRUE.", action: async () => {} },
      { text: "Completed Enterprise Demo Run! Redirecting...", action: async () => { router.push("/dashboard"); } }
    ] : [
      { text: "Initializing Live Security Gateway...", action: async () => {} },
      { text: "Verifying active smart contracts on Sepolia...", action: async () => { await fetchDbWallets(); } },
      { text: "Prompting Live Cloud Billing Agent to run billing check...", action: async () => {
          const id = await getFirstAgentId();
          await fetch("/api/simulator/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: "safe_payment", agentId: id })
          });
        }
      },
      { text: "Prompting Live Treasury Agent to propose payout...", action: async () => {
          const id = await getFirstAgentId();
          await fetch("/api/simulator/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: "large_payment", agentId: id })
          });
        }
      },
      { text: "Triggering anomalous transaction block check...", action: async () => {
          const id = await getFirstAgentId();
          await fetch("/api/simulator/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: "unknown_wallet", agentId: id })
          });
        }
      },
      { text: "Simulating node drain threat on Live agents...", action: async () => {
          const id = await getFirstAgentId();
          await fetch("/api/simulator/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: "wallet_drain", agentId: id })
          });
        }
      },
      { text: "Global emergency circuit breaker active.", action: async () => {} },
      { text: "Completed Live Demo run! Check your Sepolia ledger.", action: async () => { router.push("/dashboard"); } }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      setScriptProgress(step.text);
      // Map currentStep visually to wizard
      setCurrentStep(Math.min(i + 1, 11));
      
      try {
        await step.action();
        addNotification("Auto Demo Run", step.text, i === 6 || i === 7 ? "error" : "success");
      } catch (err) {
        console.error(err);
      }
      
      // Wait 5-6 seconds per step to let visual logs/charts update beautifully
      await new Promise((resolve) => setTimeout(resolve, 5500));
    }

    setScriptRunning(false);
    setScriptProgress("");
    setCurrentStep(11);
  };

  return (
    <>
      {/* Floating launcher trigger */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5">
        <button
          onClick={handleLaunchEnterpriseDemo}
          disabled={scriptRunning}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold shadow-glow flex items-center gap-1.5 transition disabled:opacity-50"
        >
          ⚡ {scriptRunning ? (demoMode ? "Enterprise Demo Running..." : "Live Demo Running...") : (demoMode ? "Launch Enterprise Demo" : "Launch Live Demo")}
        </button>

        {demoMode && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-12 h-12 rounded-full bg-[#101827] border border-[#1f2937] hover:border-[#2563EB]/40 flex items-center justify-center text-xl shadow-glow transition"
            title="Toggle Sandbox Demo Wizard"
          >
            🎓
          </button>
        )}
      </div>

      <AnimatePresence>
        {(demoMode || scriptRunning) && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 bg-[#101827] border border-[#1f2937] rounded-2xl p-5 shadow-2xl z-40 font-sans backdrop-blur-md"
          >
            <div className="flex justify-between items-center border-b border-[#1f2937]/80 pb-3 mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {demoMode ? "AgentShield Sandbox Wizard" : "AgentShield Live Monitor"}
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {scriptRunning ? (
              <div className="space-y-4 py-6 text-center">
                <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-400 font-mono">
                  {demoMode ? "Running Automated Sandbox Demo" : "Running Live Transaction Demo"}
                </p>
                <div className="p-3 bg-[#050816] rounded-xl border border-[#1f2937]/50 text-xs font-mono text-emerald-400">
                  {scriptProgress}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-white mb-1.5">
                    {WIZARD_STEPS[currentStep]?.title}
                  </h5>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {WIZARD_STEPS[currentStep]?.description}
                  </p>
                </div>

                {/* Progress dot indicators */}
                <div className="flex gap-1 justify-center py-2">
                  {WIZARD_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition ${
                        idx === currentStep ? "bg-[#2563EB]" : "bg-gray-700"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex justify-between gap-3 border-t border-[#1f2937]/80 pt-3">
                  <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-[10px] font-bold transition disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    onClick={handleStepAction}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-bold transition shadow-glow flex-1"
                  >
                    {WIZARD_STEPS[currentStep]?.actionText || "Next Step"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
