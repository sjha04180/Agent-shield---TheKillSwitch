import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { AgentActivity } from "@/models/AgentActivity";
import { AgentTransaction } from "@/models/AgentTransaction";
import { AgentMetrics } from "@/models/AgentMetrics";

// Predefined vendors library
interface Vendor {
  name: string;
  category: string;
  defaultReason: string;
}

const VENDORS: Vendor[] = [
  { name: "OpenAI", category: "AI Services", defaultReason: "API Credits Refill" },
  { name: "Google Cloud", category: "Infrastructure", defaultReason: "Compute Instance Payment" },
  { name: "AWS", category: "Infrastructure", defaultReason: "GPU Node Allocation" },
  { name: "Vercel", category: "Hosting", defaultReason: "SaaS Subscription Billing" },
  { name: "Supabase", category: "SaaS", defaultReason: "DB Storage Extension" },
  { name: "GitHub", category: "Development", defaultReason: "Copilot Seats Renewal" },
  { name: "Namecheap", category: "Domain", defaultReason: "Domain Name Renewal" },
  { name: "Anthropic", category: "AI Services", defaultReason: "Claude 3.5 API Usage" },
];

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Fetch all active agents
    const activeAgents = await Agent.find({ status: "active" });
    if (activeAgents.length === 0) {
      return NextResponse.json({ success: true, message: "No active agents in simulator loop", triggersCount: 0 });
    }

    let triggersCount = 0;
    const tickResults = [];

    for (const agent of activeAgents) {
      // 1. 40% chance of generating a request in this tick
      if (Math.random() > 0.4) continue;

      triggersCount++;

      // 2. Select random vendor
      const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)]!;
      
      // 3. Roll transaction details
      const token = agent.allowedTokens[Math.floor(Math.random() * agent.allowedTokens.length)] || "ETH";
      const network = agent.network;
      const recipient = `0x${crypto.randomBytes(20).toString("hex")}`;
      const reason = `${vendor.name} - ${vendor.defaultReason}`;

      // Calculate amount relative to limit
      let amount = 0;
      if (token === "ETH") {
        amount = Number((Math.random() * 0.25).toFixed(4));
      } else {
        // e.g. USDC
        amount = Math.round(Math.random() * 300) + 10;
      }

      // 4. Decide transaction outcome
      // Roll a 20% chance that it gets BLOCKED (triggers policy anomaly)
      const isAnomalous = Math.random() < 0.2;
      const isExceeded = amount > agent.spendingLimit && agent.spendingLimit > 0;
      
      let status: 'executed' | 'blocked' = 'executed';
      let blockReason = "";

      if (isAnomalous) {
        status = 'blocked';
        blockReason = "Anomalous recipient address flagged by Gemini risk guard.";
      } else if (isExceeded) {
        status = 'blocked';
        blockReason = `Transaction amount (${amount} ${token}) exceeds default limit bounds (${agent.spendingLimit} ${token}).`;
      }

      // Generate simulated tx hash
      const transactionId = `0x${crypto.randomBytes(32).toString("hex")}`;

      // Create transaction log
      const tx = await AgentTransaction.create({
        transactionId,
        agentId: agent._id,
        walletId: agent.walletId,
        recipient,
        token,
        network,
        amount,
        reason,
        status,
      });

      // Write activity entries
      await AgentActivity.create({
        agentId: agent._id,
        activityType: "TX_REQUESTED",
        details: `Simulated transaction proposed: ${amount} ${token} to ${vendor.name} for ${vendor.defaultReason}`,
        metadata: { transactionId, amount, token, vendor: vendor.name },
      });

      if (status === 'blocked') {
        await AgentActivity.create({
          agentId: agent._id,
          activityType: "TX_BLOCKED",
          details: `Transaction BLOCKED: ${blockReason}`,
          metadata: { transactionId, blockReason },
        });
      } else {
        await AgentActivity.create({
          agentId: agent._id,
          activityType: "TX_APPROVED",
          details: `Transaction APPROVED & EXECUTED. Hash: ${transactionId.slice(0, 10)}...`,
          metadata: { transactionId },
        });
      }

      // 5. Update agent metrics
      const metrics = await AgentMetrics.findOne({ agentId: agent._id });
      if (metrics) {
        metrics.requestsToday += 1;
        if (status === 'blocked') {
          metrics.blockedCount += 1;
        } else {
          metrics.approvedCount += 1;
        }
        
        const totalRequests = metrics.requestsToday;
        metrics.successRate = Number(((metrics.approvedCount / totalRequests) * 100).toFixed(1));
        
        // Recalculate average request size
        const currentTotal = (metrics.averageRequestAmount * (totalRequests - 1)) + amount;
        metrics.averageRequestAmount = Number((currentTotal / totalRequests).toFixed(4));
        
        await metrics.save();
      }

      tickResults.push({
        agentName: agent.name,
        vendor: vendor.name,
        amount,
        token,
        status,
        blockReason
      });
    }

    return NextResponse.json({
      success: true,
      message: "Simulation tick executed successfully",
      triggersCount,
      tickResults
    });

  } catch (error) {
    console.error("Simulation Tick Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to run simulation cycle" } }, { status: 500 });
  }
}
