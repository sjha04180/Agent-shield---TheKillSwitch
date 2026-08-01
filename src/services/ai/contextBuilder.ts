import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { Wallet } from "@/models/Wallet";
import { Policy } from "@/models/Policy";
import { ValidationLog } from "@/models/ValidationLog";
import { isKillSwitchActive } from "../engine/policyEngine";

export async function buildUserSecurityContext(userId: string): Promise<string> {
  await dbConnect();

  // 1. Gather all collections
  const filter = { ownerId: userId };
  
  const [agents, wallets, policies, recentLogs, killSwitchActive] = await Promise.all([
    Agent.find(filter),
    Wallet.find(filter),
    Policy.find({ createdBy: userId }),
    ValidationLog.find({ agentId: { $in: await Agent.find(filter).select("_id") } })
      .sort({ timestamp: -1 })
      .limit(5),
    isKillSwitchActive()
  ]);

  // 2. Format into clean Markdown text context block
  let context = `### SYSTEM SECURITY GROUNDING DATA
Active Security Halt (Emergency Kill Switch): ${killSwitchActive ? "ACTIVE" : "INACTIVE"}

#### Connected AI Agents:
${agents.map(a => `- Agent: "${a.name}" | Status: ${a.status} | Wallet address: ${a.walletId} | Network: ${a.network}`).join("\n")}

#### Smart Contract Wallets:
${wallets.map(w => `- Wallet Address: ${w.address} | Network: ${w.network} | Status: ${w.status}`).join("\n")}

#### Configured Governance Policies:
${policies.map(p => `- Policy Name: "${p.name}" | Single Tx Limit: ${p.maxSingleTx} ETH | Daily Spent limit: ${p.maxDailySpent} ETH | Allowed Risk Limit Score: ${p.maxRiskScore}/100`).join("\n")}

#### Recent Policy Evaluations & Verification Logs:
${recentLogs.map(log => `- Tx: ${log.transactionId} | Amount: ${log.amount} ETH | Status: ${log.status} | Recipient: ${log.recipient} | Risk Score: ${log.riskScore}`).join("\n")}
`;

  return context;
}
