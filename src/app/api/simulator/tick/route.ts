import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { Wallet } from "@/models/Wallet";
import { processTransactionRequest } from "@/services/policy/pipelineService";

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

      // Load wallet to get its address
      const wallet = await Wallet.findById(agent.walletId);
      if (!wallet) continue;

      // 2. Select random vendor
      const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)]!;
      
      // 3. Roll transaction details
      const token = agent.allowedTokens[Math.floor(Math.random() * agent.allowedTokens.length)] || "ETH";
      const network = agent.network;
      const recipient = `0x${crypto.randomBytes(20).toString("hex")}`;
      const reason = `${vendor.name} - ${vendor.defaultReason}`;

      let amount = 0;
      if (token === "ETH") {
        amount = Number((Math.random() * 0.25).toFixed(4));
      } else {
        amount = Math.round(Math.random() * 300) + 10;
      }

      // 4. Run through centralized transaction pipeline
      const pipelineResult = await processTransactionRequest(
        {
          agentId: agent._id.toString(),
          agentName: agent.name,
          provider: "simulator",
          organizationId: "agentshield-org",
          walletAddress: wallet.address,
          recipientAddress: recipient,
          network: network,
          token: token,
          amount: amount,
          currency: token,
          purpose: reason,
          timestamp: new Date().toISOString(),
        },
        { bypassAuth: true },
        "127.0.0.1"
      );

      tickResults.push({
        agentName: agent.name,
        vendor: vendor.name,
        amount,
        token,
        status: pipelineResult.status,
        reason: pipelineResult.reason,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Simulation tick executed successfully",
      triggersCount,
      tickResults,
    });

  } catch (error) {
    console.error("Simulation Tick Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to run simulation cycle" } }, { status: 500 });
  }
}
