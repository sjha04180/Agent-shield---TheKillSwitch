import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/dbConnect";
import { ConnectedAgent } from "@/models/ConnectedAgent";
import { Agent } from "@/models/Agent";
import { Wallet } from "@/models/Wallet";
import { Policy } from "@/models/Policy";
import { AuditLog } from "@/models/AuditLog";
import { AgentTransaction } from "@/models/AgentTransaction";
import { getAdapter } from "@/services/agents/AgentAdapter";
import { guardRequest } from "@/services/agents/promptGuard";
import { evaluatePolicy } from "@/services/policy/policyEngine";
import { AgentRequest } from "@/types/agent-adapter";
import { simulateTransaction, executeTransaction } from "@/services/blockchain/blockchainService";
import { explainDecision } from "@/services/ai/copilotService";

// ─── Request Contract ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  agentId: z.string().min(1),
  agentName: z.string().optional(),
  provider: z.enum(["lyzr", "simulator", "future"]),
  organizationId: z.string().optional(),
  walletAddress: z.string().optional(),
  recipientAddress: z.string().optional(),
  network: z.string().optional(),
  token: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  purpose: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  riskHint: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
});

// ─── POST /api/agents/request ─────────────────────────────────────────────
// Main governance entry point for all AI agents (Lyzr + Simulator).
//
// Pipeline:
//  1. Extract agent credentials from headers
//  2. Authenticate ConnectedAgent (hash-compare token)
//  3. Prompt injection guard
//  4. Normalize via provider adapter
//  5. Load wallet + policy
//  6. Policy Engine → Decision
//  7. Update ConnectedAgent stats + Audit log
//  8. Return standardized AgentResponse

export async function POST(req: NextRequest) {
  const requestStart = Date.now();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  try {
    await dbConnect();

    // ── Step 1: Extract credentials from headers ──────────────────────────
    const agentId = req.headers.get("x-agent-id");
    const agentToken = req.headers.get("x-agent-token");

    if (!agentId || !agentToken) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: "Missing X-Agent-Id or X-Agent-Token headers.",
        },
        { status: 401 }
      );
    }

    // ── Step 2: Authenticate the ConnectedAgent ───────────────────────────
    const connectedAgent = await ConnectedAgent.findOne({ agentId });
    if (!connectedAgent) {
      await AuditLog.create({
        action: "AGENT_AUTH_FAILED",
        details: `Unknown agentId attempted request: ${agentId}`,
        ipAddress: ip,
        metadata: { agentId },
      });
      return NextResponse.json(
        { status: "BLOCKED", risk: 100, reason: "Agent not registered." },
        { status: 401 }
      );
    }

    if (connectedAgent.status === "disabled") {
      return NextResponse.json(
        { status: "BLOCKED", risk: 100, reason: "Agent is disabled." },
        { status: 403 }
      );
    }

    // Verify token hash
    const providedHash = crypto
      .createHash("sha256")
      .update(agentToken)
      .digest("hex");
    if (providedHash !== connectedAgent.secretTokenHash) {
      await AuditLog.create({
        action: "AGENT_AUTH_FAILED",
        details: `Invalid token for agentId: ${agentId}`,
        ipAddress: ip,
        metadata: { agentId },
      });
      return NextResponse.json(
        { status: "BLOCKED", risk: 100, reason: "Invalid agent token." },
        { status: 401 }
      );
    }

    // ── Step 3: Parse raw body ────────────────────────────────────────────
    const body = await req.json();
    const parsedBody = RequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: "Invalid request schema.",
          errors: parsedBody.error.errors,
        },
        { status: 400 }
      );
    }

    // ── Step 4: Prompt injection guard ───────────────────────────────────
    const guard = guardRequest(
      parsedBody.data.purpose ?? "",
      parsedBody.data.metadata as Record<string, unknown> | undefined
    );
    if (!guard.safe) {
      await AuditLog.create({
        agentId: connectedAgent._id,
        action: "PROMPT_INJECTION_BLOCKED",
        details: `Prompt injection attempt blocked. Agent: ${agentId}. Threat: ${guard.threat}`,
        ipAddress: ip,
        metadata: { agentId, threat: guard.threat },
      });
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: "Policy violation detected. Request rejected.",
          detail: guard.threat,
        },
        { status: 400 }
      );
    }

    // ── Step 5: Normalize via provider adapter ───────────────────────────
    const provider = parsedBody.data.provider;
    const adapter = await getAdapter(provider);
    await adapter.connect();

    let agentRequest: AgentRequest;
    try {
      agentRequest = await adapter.receiveTransaction({
        ...parsedBody.data,
        agentId,
      });
    } catch (normErr) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: `Payload normalization failed: ${normErr instanceof Error ? normErr.message : "Unknown"}`,
        },
        { status: 400 }
      );
    }

    // ── Step 6: Load linked Agent + Wallet + Policy ───────────────────────
    let internalAgent = null;
    let wallet = null;
    let policy = null;

    if (connectedAgent.linkedAgentId) {
      internalAgent = await Agent.findById(connectedAgent.linkedAgentId);
    } else {
      // Fall back: find an active agent that owns the requested wallet
      wallet = await Wallet.findOne({
        address: agentRequest.walletAddress.toLowerCase(),
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
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 90,
          reason:
            "No active Agent record linked. Register and link an Agent first.",
        },
        { status: 400 }
      );
    }

    if (!wallet) {
      wallet = await Wallet.findById(internalAgent.walletId);
    }

    if (!wallet || wallet.status === "frozen") {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: "Wallet is frozen or unavailable.",
        },
        { status: 403 }
      );
    }

    if (!internalAgent.policyId) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 80,
          reason:
            "No policy assigned to this agent. Assign a policy before processing transactions.",
        },
        { status: 400 }
      );
    }

    policy = await Policy.findById(internalAgent.policyId);
    if (!policy || policy.status !== "active") {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 80,
          reason: "Policy is inactive or missing.",
        },
        { status: 400 }
      );
    }

    // ── Step 7: Run Governance Pipeline ──────────────────────────────────
    const validation = await evaluatePolicy(
      internalAgent._id.toString(),
      wallet._id.toString(),
      {
        to: agentRequest.recipientAddress,
        amount: agentRequest.amount,
        token: agentRequest.token,
        network: agentRequest.network,
      },
      policy
    );

    // ── Step 8: Execute Transaction (if approved) ──────────────────────────
    let transactionId = `0x${crypto.randomBytes(32).toString("hex")}`;
    const isApproved = validation.decision === "Approved";
    const statusVal = isApproved
      ? "executed"
      : validation.decision === "Pending Manual Review"
      ? "pending"
      : "blocked";

    // If blockchain execution is enabled and transaction is approved
    if (isApproved) {
      const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false"; // Default to true in hackathon
      try {
        if (demoMode || !process.env.MASTER_WALLET_PRIVATE_KEY) {
           const sim = await simulateTransaction(agentRequest.recipientAddress, agentRequest.amount, agentRequest.token);
           transactionId = sim.txHash;
        } else {
           // Execute transaction using master key
           const exec = await executeTransaction(agentRequest.recipientAddress, agentRequest.amount, agentRequest.token, agentRequest.network, process.env.MASTER_WALLET_PRIVATE_KEY);
           transactionId = exec.txHash;
        }
      } catch (txErr) {
        console.error("Execution failed:", txErr);
        // Fallback to simulation if blockchain fails
        const sim = await simulateTransaction(agentRequest.recipientAddress, agentRequest.amount, agentRequest.token);
        transactionId = sim.txHash;
      }
    }

    await AgentTransaction.create({
      transactionId,
      agentId: internalAgent._id,
      walletId: wallet._id,
      recipient: agentRequest.recipientAddress,
      token: agentRequest.token,
      network: agentRequest.network,
      amount: agentRequest.amount,
      reason: agentRequest.purpose,
      status: statusVal,
    });

    // ── Step 9: Update ConnectedAgent statistics ───────────────────────────
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
          approvedCount: validation.decision === "Approved" ? 1 : 0,
          blockedCount: validation.decision === "Blocked" ? 1 : 0,
          pendingCount: validation.decision === "Pending Manual Review" ? 1 : 0,
        },
        averageRisk: newAvg,
        lastActivity: new Date(),
        status: "online",
        lastSeen: new Date(),
        latencyMs: Date.now() - requestStart,
      }
    );

    // ── Step 10: Audit log ────────────────────────────────────────────────
    await AuditLog.create({
      agentId: internalAgent._id,
      action: `TX_${validation.decision.toUpperCase().replace(/ /g, "_")}`,
      details: `[${provider.toUpperCase()}] Agent "${agentId}" proposed ${agentRequest.amount} ${agentRequest.token} to ${agentRequest.recipientAddress.slice(0, 10)}... — Decision: ${validation.decision}. Risk: ${validation.riskScore}.`,
      ipAddress: ip,
      metadata: { transactionId, riskScore: validation.riskScore, provider, agentId },
    });

    await adapter.disconnect();

    // ── Step 11: AI Copilot Explanation ───────────────────────────────────
    const explanation = await explainDecision(
      validation.decision,
      validation.reason,
      validation.riskScore,
      validation.factors,
      agentRequest.amount,
      agentRequest.token
    );

    // ── Step 12: Return standardized response ─────────────────────────────
    if (validation.decision === "Approved") {
      return NextResponse.json({
        status: "APPROVED",
        transactionId,
        risk: validation.riskScore,
        reason: validation.reason,
        explanation,
        ruleResults: validation.ruleResults,
      });
    } else if (validation.decision === "Pending Manual Review") {
      return NextResponse.json({
        status: "PENDING_REVIEW",
        risk: validation.riskScore,
        reason: validation.reason,
        explanation,
        ruleResults: validation.ruleResults,
      });
    } else {
      return NextResponse.json({
        status: "BLOCKED",
        risk: validation.riskScore,
        reason: validation.reason,
        explanation,
        ruleResults: validation.ruleResults,
      });
    }
  } catch (error) {
    console.error("[/api/agents/request] Error:", error);
    return NextResponse.json(
      {
        status: "BLOCKED",
        risk: 100,
        reason: "Internal governance error. Transaction rejected for safety.",
      },
      { status: 500 }
    );
  }
}
