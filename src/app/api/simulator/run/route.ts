import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { Wallet } from "@/models/Wallet";
import { Policy } from "@/models/Policy";
import { AgentTransaction } from "@/models/AgentTransaction";
import { AgentActivity } from "@/models/AgentActivity";
import { KillSwitchEvent } from "@/models/KillSwitchEvent";
import { evaluatePolicy } from "@/services/policy/policyEngine";

const runSimulationSchema = z.object({
  scenario: z.enum(["compromised", "drain", "malicious", "fake_vendor", "spam", "bypass"]),
  agentId: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const parsed = runSimulationSchema.parse(body);

    const agent = await Agent.findById(parsed.agentId);
    if (!agent) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    }

    // Grab policy
    const policy = await Policy.findById(agent.policyId);
    if (!policy) {
      return NextResponse.json({
        success: false,
        error: { code: "NO_POLICY", message: "Configure and assign a policy ruleset to this agent first." }
      }, { status: 400 });
    }

    // Make sure agent status is active to run simulation
    if (agent.status !== "active") {
      agent.status = "active";
      await agent.save();
    }

    let to = `0x${crypto.randomBytes(20).toString("hex")}`;
    let amount = 0.1;
    let token = "ETH";
    let reason = "";

    // Configure specific scenario parameters
    switch (parsed.scenario) {
      case "drain":
        amount = 50.0;
        reason = "Emergency Sweep - Transfer out all wallet assets";
        break;
      case "compromised":
        amount = policy.maxSingleTx > 0 ? policy.maxSingleTx * 3 : 15.0;
        reason = "Compromised Node - Bulk allocation payment";
        break;
      case "malicious":
        // Set recipient to a blocked contract if configured, or generate mock block
        if (policy.blockedContracts.length > 0 && policy.blockedContracts[0]) {
          to = policy.blockedContracts[0];
        } else {
          to = "0x000000000000000000000000000000000000dead";
          policy.blockedContracts.push(to);
          await policy.save();
        }
        reason = "Malicious Contract Call - Execute delegatecall hijack";
        break;
      case "fake_vendor":
        reason = "Hacker Merchant - Fake SaaS Invoice Billing";
        break;
      case "spam":
        reason = "Spam bot request";
        break;
      case "bypass":
        amount = 0.0001;
        reason = "Penetration scan - rule bypass test";
        break;
    }

    // 1. Run through Policy Engine Validation
    const validation = await evaluatePolicy(agent._id.toString(), agent.walletId.toString(), {
      to,
      amount,
      token,
      network: agent.network
    }, policy);

    // 2. Generate simulated EVM tx hash
    const transactionId = `0x${crypto.randomBytes(32).toString("hex")}`;

    // 3. Write transaction log
    const statusVal = validation.decision === "Approved" ? "executed" : "blocked";
    await AgentTransaction.create({
      transactionId,
      agentId: agent._id,
      walletId: agent.walletId,
      recipient: to,
      token,
      network: agent.network,
      amount,
      reason,
      status: statusVal
    });

    // Write timeline activity logs
    await AgentActivity.create({
      agentId: agent._id,
      activityType: "TX_REQUESTED",
      details: `Attack Simulator: proposed ${amount} ${token} to ${to.slice(0, 10)}... (Scenario: ${parsed.scenario})`,
      metadata: { scenario: parsed.scenario, transactionId }
    });

    await AgentActivity.create({
      agentId: agent._id,
      activityType: validation.decision === "Approved" ? "TX_APPROVED" : "TX_BLOCKED",
      details: `Validator result: ${validation.decision}. Reason: ${validation.reason}`,
      metadata: { transactionId }
    });

    // 4. Auto Kill Switch Activation: Triggered on High Risk (score >= 80)
    let killSwitchEvent = null;
    if (validation.riskScore >= 80 || parsed.scenario === "drain" || parsed.scenario === "malicious") {
      // Create auto kill switch event
      killSwitchEvent = await KillSwitchEvent.create({
        status: "activated",
        triggerType: "automatic",
        reason: `Auto Kill Switch triggered by high risk simulation attack: ${parsed.scenario}. Scorer returned score: ${validation.riskScore}.`,
      });

      // Pause all agents belonging to this owner
      await Agent.updateMany({ ownerId: session.user.id }, { status: "paused" });
      // Freeze all wallets belonging to this owner (bug fix: was Agent.updateMany)
      await Wallet.updateMany({ ownerId: session.user.id }, { status: "frozen" });

      await AgentActivity.create({
        agentId: agent._id,
        activityType: "FROZEN",
        details: `Auto Kill Switch ACTIVATED. All agent operations locked.`,
        metadata: { killSwitchEventId: killSwitchEvent._id }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        decision: validation.decision,
        riskScore: validation.riskScore,
        reason: validation.reason,
        ruleResults: validation.ruleResults,
        killSwitchTriggered: !!killSwitchEvent,
        killSwitchReason: killSwitchEvent?.reason
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload parameters", details: error.errors } }, { status: 400 });
    }
    console.error("Simulation run error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Simulator runner failed" } }, { status: 500 });
  }
}
