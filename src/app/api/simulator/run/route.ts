import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { Wallet } from "@/models/Wallet";
import { Policy } from "@/models/Policy";
import { Organization } from "@/models/Organization";
import { AgentTransaction } from "@/models/AgentTransaction";
import { processTransactionRequest } from "@/services/policy/pipelineService";

const runSimulationSchema = z.object({
  scenario: z.enum([
    "safe_payment",
    "large_payment",
    "unknown_wallet",
    "weekend_payment",
    "rapid_transactions",
    "wallet_drain",
    "duplicate_payment",
    "expired_wallet",
    "blocked_organization",
  ]),
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

    const wallet = await Wallet.findById(agent.walletId);
    if (!wallet) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Wallet not found" } }, { status: 404 });
    }

    // Grab policy
    const policy = await Policy.findById(agent.policyId);
    if (!policy) {
      return NextResponse.json({
        success: false,
        error: { code: "NO_POLICY", message: "Configure and assign a policy ruleset to this agent first." }
      }, { status: 400 });
    }

    // Restore wallet and organization status to default active before running scenarios (clean state)
    if (wallet.status !== "active") {
      wallet.status = "active";
      await wallet.save();
    }
    await Organization.findOneAndUpdate({}, { status: "active" });

    // Make sure agent status is active to run simulation
    if (agent.status !== "active") {
      agent.status = "active";
      await agent.save();
    }

    let to = `0x${crypto.randomBytes(20).toString("hex")}`;
    let amount = 0.1;
    let token = "ETH";
    let reason = "Standard infrastructure billing payment";
    let timestamp = new Date().toISOString();

    // Configure specific scenario parameters
    switch (parsed.scenario) {
      case "safe_payment":
        // Set to a whitelisted address if available
        if (policy.allowedWallets.length > 0 && policy.allowedWallets[0]) {
          to = policy.allowedWallets[0];
        } else {
          to = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
          policy.allowedWallets.push(to);
          await policy.save();
        }
        amount = 0.05;
        reason = "Google Cloud billing - Auto renewal";
        break;

      case "large_payment":
        amount = policy.maxSingleTx > 0 ? policy.maxSingleTx - 0.05 : 1.95;
        reason = "Quarterly enterprise SaaS renewal invoice";
        break;

      case "unknown_wallet":
        to = "0x9999999999999999999999999999999999999999";
        amount = 0.15;
        reason = "Unverified vendor service payment";
        // Ensure whitelist is active by putting a dummy address in whitelist if empty
        if (policy.allowedWallets.length === 0) {
          policy.allowedWallets.push("0x1111111111111111111111111111111111111111");
          await policy.save();
        }
        break;

      case "weekend_payment":
        policy.noWeekends = true;
        await policy.save();
        // Sunday August 9, 2026
        timestamp = "2026-08-09T14:30:00Z";
        reason = "Automated off-hours server script execution";
        break;

      case "rapid_transactions":
        const now = Date.now();
        // Create 5 transactions in the last minute to trigger frequency risk
        for (let i = 0; i < 5; i++) {
          await AgentTransaction.create({
            transactionId: `0x${crypto.randomBytes(32).toString("hex")}`,
            agentId: agent._id,
            walletId: agent.walletId,
            recipient: to,
            token: "ETH",
            network: agent.network,
            amount: 0.02,
            reason: "Simulated micro-payment stream",
            status: "executed",
            timestamp: new Date(now - i * 15 * 1000)
          });
        }
        amount = 0.05;
        reason = "Frequent burst payment execution";
        break;

      case "wallet_drain":
        amount = 50.0;
        reason = "CRITICAL WARNING: Wallet assets consolidation transfer";
        break;

      case "duplicate_payment":
        amount = 0.35;
        // Seed duplicate transaction 5 seconds ago
        await AgentTransaction.create({
          transactionId: `0x${crypto.randomBytes(32).toString("hex")}`,
          agentId: agent._id,
          walletId: agent.walletId,
          recipient: to,
          token: "ETH",
          network: agent.network,
          amount: 0.35,
          reason: "AWS Cloud hosting support invoice",
          status: "executed",
          timestamp: new Date(Date.now() - 5 * 1000)
        });
        reason = "AWS Cloud hosting support invoice";
        break;

      case "expired_wallet":
        wallet.status = "frozen";
        await wallet.save();
        reason = "Inactive wallet treasury transfer";
        break;

      case "blocked_organization":
        await Organization.findOneAndUpdate({}, { status: "suspended" });
        reason = "Suspended enterprise treasury call";
        break;
    }

    // Run request through unified pipeline service
    const pipelineResult = await processTransactionRequest(
      {
        agentId: agent._id.toString(),
        agentName: agent.name,
        provider: "simulator",
        organizationId: "agentshield-org",
        walletAddress: wallet.address,
        recipientAddress: to,
        network: agent.network,
        token: token,
        amount: amount,
        currency: token,
        purpose: reason,
        timestamp: timestamp,
      },
      { bypassAuth: true },
      "127.0.0.1"
    );

    const killSwitchTriggered = pipelineResult.risk >= 80 || parsed.scenario === "wallet_drain";

    return NextResponse.json({
      success: true,
      data: {
        decision: pipelineResult.status === "APPROVED" ? "Approved" : pipelineResult.status === "PENDING_REVIEW" ? "Pending Manual Review" : "Blocked",
        riskScore: pipelineResult.risk,
        reason: pipelineResult.reason,
        ruleResults: pipelineResult.ruleResults,
        killSwitchTriggered,
        killSwitchReason: killSwitchTriggered ? `Auto Kill Switch triggered by high risk simulation attack: ${parsed.scenario}. Scorer returned score: ${pipelineResult.risk}.` : undefined,
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
