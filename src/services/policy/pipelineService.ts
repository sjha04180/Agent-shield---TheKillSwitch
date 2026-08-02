import crypto from "crypto";
import { dbConnect } from "@/lib/dbConnect";
import { ConnectedAgent } from "@/models/ConnectedAgent";
import { Agent } from "@/models/Agent";
import { Wallet } from "@/models/Wallet";
import { Policy } from "@/models/Policy";
import { Organization } from "@/models/Organization";
import { AuditLog } from "@/models/AuditLog";
import { AgentTransaction } from "@/models/AgentTransaction";
import { AgentActivity } from "@/models/AgentActivity";
import { AgentMetrics } from "@/models/AgentMetrics";
import { KillSwitchEvent } from "@/models/KillSwitchEvent";
import { SystemConfig } from "@/models/SystemConfig";
import { evaluatePolicy } from "@/services/policy/policyEngine";
import { simulateTransaction, executeTransaction, signCoSigningPayload } from "@/services/blockchain/blockchainService";
import { explainDecision } from "@/services/ai/copilotService";
import { AgentRequest } from "@/types/agent-adapter";

export interface PipelineResult {
  status: "APPROVED" | "BLOCKED" | "PENDING_REVIEW";
  transactionId?: string;
  risk: number;
  reason: string;
  explanation: string;
  ruleResults: any[];
}

export async function processTransactionRequest(
  payload: Partial<AgentRequest> & { agentId: string },
  credentials?: { token?: string; bypassAuth?: boolean },
  ip: string = "unknown"
): Promise<PipelineResult> {
  const requestStart = Date.now();
  await dbConnect();

  // ── Step 0: Check System settings ───────────────────────────────────────
  let config = await SystemConfig.findOne();
  if (!config) {
    config = await SystemConfig.create({ demoMode: true, lyzrEnabled: true });
  }

  const providerType = payload.provider || "simulator";
  if (providerType === "lyzr" && !config.lyzrEnabled) {
    throw new Error("Lyzr Agent Gateway is currently disabled by administrators.");
  }

  // ── Step 1: Authentication ──────────────────────────────────────────────
  const agentId = payload.agentId;
  const connectedAgent = await ConnectedAgent.findOne({ agentId });
  
  if (!connectedAgent) {
    await AuditLog.create({
      action: "AGENT_AUTH_FAILED",
      details: `Unknown agentId attempted request: ${agentId}`,
      ipAddress: ip,
      metadata: { agentId },
    });
    return {
      status: "BLOCKED",
      risk: 100,
      reason: "Agent registration not found.",
      explanation: "The requesting AI agent is not registered on the AgentShield platform.",
      ruleResults: [{ ruleName: "Agent Authentication", status: "FAIL", message: "Agent not registered." }],
    };
  }

  if (connectedAgent.status === "disabled") {
    return {
      status: "BLOCKED",
      risk: 100,
      reason: "Agent is disabled.",
      explanation: "This AI agent has been disabled by the administrator.",
      ruleResults: [{ ruleName: "Agent Activation", status: "FAIL", message: "Agent status is disabled." }],
    };
  }

  // Check if organization is suspended
  const organization = await Organization.findOne({ status: "suspended" });
  if (organization) {
    return {
      status: "BLOCKED",
      risk: 100,
      reason: "Organization is suspended.",
      explanation: "All transaction gateway calls are halted because the organization is suspended.",
      ruleResults: [{ ruleName: "Organization Status", status: "FAIL", message: "Organization is suspended." }],
    };
  }

  // If credentials are required (not bypassed by simulator/internal tick)
  if (!credentials?.bypassAuth) {
    const token = credentials?.token;
    if (!token) {
      return {
        status: "BLOCKED",
        risk: 100,
        reason: "Missing authentication token.",
        explanation: "AI Agent proposed transaction without authorization headers.",
        ruleResults: [{ ruleName: "Agent Authentication", status: "FAIL", message: "Missing token." }],
      };
    }
    const providedHash = crypto.createHash("sha256").update(token).digest("hex");
    if (providedHash !== connectedAgent.secretTokenHash) {
      await AuditLog.create({
        action: "AGENT_AUTH_FAILED",
        details: `Invalid token for agentId: ${agentId}`,
        ipAddress: ip,
        metadata: { agentId },
      });
      return {
        status: "BLOCKED",
        risk: 100,
        reason: "Invalid agent token.",
        explanation: "Cryptographic credential mismatch. The secret token is invalid.",
        ruleResults: [{ ruleName: "Agent Authentication", status: "FAIL", message: "Credential mismatch." }],
      };
    }
  }

  // ── Step 2: Load linked Agent, Wallet & Policy ──────────────────────────
  let internalAgent = null;
  let wallet = null;
  let policy = null;

  if (connectedAgent.linkedAgentId) {
    internalAgent = await Agent.findById(connectedAgent.linkedAgentId);
  } else {
    // Attempt fallback lookup via wallet address
    const requestWalletAddress = payload.walletAddress || "0x0000000000000000000000000000000000000001";
    wallet = await Wallet.findOne({
      address: requestWalletAddress.toLowerCase(),
      status: "active",
    });
    if (wallet) {
      internalAgent = await Agent.findOne({
        walletId: wallet._id,
        status: "active",
      });
    }
  }

  if (!internalAgent) {
    return {
      status: "BLOCKED",
      risk: 90,
      reason: "No active Agent record linked.",
      explanation: "No active governance entity corresponds to this agent. Link it via the dashboard first.",
      ruleResults: [{ ruleName: "Agent Record Link", status: "FAIL", message: "Agent record missing." }],
    };
  }

  if (!wallet) {
    wallet = await Wallet.findById(internalAgent.walletId);
  }

  if (!wallet || wallet.status === "frozen") {
    return {
      status: "BLOCKED",
      risk: 100,
      reason: "Wallet is frozen or unavailable.",
      explanation: "The smart contract wallet associated with this agent is locked or frozen.",
      ruleResults: [{ ruleName: "Wallet Lock", status: "FAIL", message: "Associated wallet is not active." }],
    };
  }

  if (!internalAgent.policyId) {
    return {
      status: "BLOCKED",
      risk: 80,
      reason: "No policy assigned to this agent.",
      explanation: "Governance rules are missing. Assign a policy before submitting transactions.",
      ruleResults: [{ ruleName: "Policy Check", status: "FAIL", message: "No policy configured." }],
    };
  }

  policy = await Policy.findById(internalAgent.policyId);
  if (!policy || policy.status !== "active") {
    return {
      status: "BLOCKED",
      risk: 80,
      reason: "Policy is inactive or missing.",
      explanation: "The governed policy linked to this agent is currently disabled.",
      ruleResults: [{ ruleName: "Policy Configuration", status: "FAIL", message: "Linked policy inactive." }],
    };
  }

  // ── Step 3: Run Governance & Risk Engine ────────────────────────────────
  const validation = await evaluatePolicy(
    internalAgent._id.toString(),
    wallet._id.toString(),
    {
      to: payload.recipientAddress || "0x000000000000000000000000000000000000dead",
      amount: payload.amount || 0,
      token: payload.token || "ETH",
      network: payload.network || "sepolia",
      geoCountry: (payload.metadata?.geoCountry as string) || "US",
      timestamp: payload.timestamp
    },
    policy
  );

  // ── Step 4: Circuit Breaker Auto Kill Switch (Score >= 80) ───────────────
  let killSwitchTriggered = false;
  if (validation.riskScore >= 80) {
    killSwitchTriggered = true;
    
    // Set global organization freeze
    await KillSwitchEvent.create({
      status: "activated",
      triggerType: "automatic",
      reason: `Auto Kill Switch triggered by high risk score: ${validation.riskScore}. Factors: ${validation.factors.join(", ")}`,
    });

    // Pause all agents and freeze all wallets of this owner
    await Agent.updateMany({ ownerId: internalAgent.ownerId }, { status: "paused" });
    await Wallet.updateMany({ ownerId: internalAgent.ownerId }, { status: "frozen" });

    // Write activity record
    await AgentActivity.create({
      agentId: internalAgent._id,
      activityType: "FROZEN",
      details: "Auto Kill Switch ACTIVATED due to Critical Risk anomaly detection.",
      metadata: { riskScore: validation.riskScore, factors: validation.factors },
    });
  }

  // ── Step 5: Decision Mapping ────────────────────────────────────────────
  let decision: "APPROVED" | "BLOCKED" | "PENDING_REVIEW" = "BLOCKED";
  let statusVal: "executed" | "blocked" | "pending" = "blocked";

  if (killSwitchTriggered) {
    decision = "BLOCKED";
    statusVal = "blocked";
  } else if (validation.decision === "Approved") {
    decision = "APPROVED";
    statusVal = "executed";
  } else if (validation.decision === "Pending Manual Review") {
    decision = "PENDING_REVIEW";
    statusVal = "pending";
  } else {
    decision = "BLOCKED";
    statusVal = "blocked";
  }

  // ── Step 6: Blockchain Execution (or Simulation mode fallback) ──────────
  let transactionId = `0x${crypto.randomBytes(32).toString("hex")}`;
  
  if (decision === "APPROVED") {
    const demoMode = config.demoMode;
    const recipient = payload.recipientAddress || "0x000000000000000000000000000000000000dead";
    const amount = payload.amount || 0;
    const token = payload.token || "ETH";

    try {
      if (demoMode || !process.env.MASTER_WALLET_PRIVATE_KEY) {
        // Run co-signing payload generation to simulate signing payload
        const simulatedSig = await signCoSigningPayload(
          internalAgent._id.toString(),
          wallet.address,
          recipient,
          amount,
          "0x",
          1, // simulated nonce
          Math.floor(Date.now() / 1000) + 3600, // simulated deadline
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" // default hardhat private key
        );
        const sim = await simulateTransaction(recipient, amount, token);
        transactionId = sim.txHash;
      } else {
        // Execute transaction via Ethereum client
        const exec = await executeTransaction(
          recipient,
          amount,
          token,
          payload.network || "sepolia",
          process.env.MASTER_WALLET_PRIVATE_KEY
        );
        transactionId = exec.txHash;
      }
    } catch (err) {
      console.warn("[Pipeline] Blockchain execution failed, falling back to simulated queue:", err);
      const sim = await simulateTransaction(recipient, amount, token);
      transactionId = sim.txHash;
    }
  }

  // ── Step 7: Log Transaction ─────────────────────────────────────────────
  await AgentTransaction.create({
    transactionId,
    agentId: internalAgent._id,
    walletId: wallet._id,
    recipient: payload.recipientAddress || "0x000000000000000000000000000000000000dead",
    token: payload.token || "ETH",
    network: payload.network || "sepolia",
    amount: payload.amount || 0,
    reason: payload.purpose || "Unspecified automated call",
    status: statusVal,
  });

  // ── Step 8: Update Stats and Metrics ─────────────────────────────────────
  const prevAvg = connectedAgent.averageRisk;
  const prevCount = connectedAgent.requestsToday;
  const newAvg =
    prevCount === 0
      ? validation.riskScore
      : Math.round(((prevAvg * prevCount + validation.riskScore) / (prevCount + 1)) * 10) / 10;

  await ConnectedAgent.findOneAndUpdate(
    { agentId },
    {
      $inc: {
        requestsToday: 1,
        approvedCount: decision === "APPROVED" ? 1 : 0,
        blockedCount: decision === "BLOCKED" ? 1 : 0,
        pendingCount: decision === "PENDING_REVIEW" ? 1 : 0,
      },
      averageRisk: newAvg,
      lastActivity: new Date(),
      status: "online",
      lastSeen: new Date(),
      latencyMs: Date.now() - requestStart,
    }
  );

  // Update AgentMetrics container
  const metrics = await AgentMetrics.findOne({ agentId: internalAgent._id });
  if (metrics) {
    metrics.requestsToday += 1;
    if (decision === "APPROVED") {
      metrics.approvedCount += 1;
    } else if (decision === "BLOCKED") {
      metrics.blockedCount += 1;
    } else {
      metrics.rejectedCount += 1; // mapping manual review as pending
    }
    metrics.successRate = Number(((metrics.approvedCount / metrics.requestsToday) * 100).toFixed(1));
    const amountVal = payload.amount || 0;
    const currentTotal = (metrics.averageRequestAmount * (metrics.requestsToday - 1)) + amountVal;
    metrics.averageRequestAmount = Number((currentTotal / metrics.requestsToday).toFixed(4));
    await metrics.save();
  }

  // ── Step 9: Write Activity & Audit Trails ──────────────────────────────
  await AgentActivity.create({
    agentId: internalAgent._id,
    activityType: "TX_REQUESTED",
    details: `Agent proposed ${payload.amount} ${payload.token} to ${payload.recipientAddress?.slice(0, 10)}... (Provider: ${providerType})`,
    metadata: { transactionId, amount: payload.amount, purpose: payload.purpose },
  });

  await AgentActivity.create({
    agentId: internalAgent._id,
    activityType: decision === "APPROVED" ? "TX_APPROVED" : decision === "BLOCKED" ? "TX_BLOCKED" : "TX_PENDING",
    details: `Validator result: ${decision}. Policy result: ${validation.reason}`,
    metadata: { transactionId },
  });

  await AuditLog.create({
    agentId: internalAgent._id,
    action: `TX_${decision}`,
    details: `[${providerType.toUpperCase()}] Agent "${agentId}" proposed transfer. Decision: ${decision}. Risk: ${validation.riskScore}.`,
    ipAddress: ip,
    metadata: { transactionId, riskScore: validation.riskScore, provider: providerType, agentId },
  });

  // ── Step 10: Generate AI Explanations ──────────────────────────────────
  const explanation = await explainDecision(
    validation.decision,
    validation.reason,
    validation.riskScore,
    validation.factors,
    payload.amount || 0,
    payload.token || "ETH"
  );

  return {
    status: decision,
    transactionId: decision === "APPROVED" ? transactionId : undefined,
    risk: validation.riskScore,
    reason: validation.reason,
    explanation,
    ruleResults: validation.ruleResults,
  };
}
