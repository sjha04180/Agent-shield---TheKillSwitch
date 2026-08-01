import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { AgentActivity } from "@/models/AgentActivity";
import { AgentMetrics } from "@/models/AgentMetrics";

const createAgentSchema = z.object({
  name: z.string().min(2, "Agent name must be at least 2 characters"),
  description: z.string().optional().default(""),
  purpose: z.string().min(3, "Agent purpose description is required"),
  walletId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Wallet reference ID"),
  network: z.string().min(1, "Target network is required"),
  spendingLimit: z.number().nonnegative("Spending limit must be positive"),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("low"),
  allowedTokens: z.array(z.string()).default(["ETH"]),
  avatar: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    await dbConnect();

    let agents;
    if (session.user.role === "admin") {
      agents = await Agent.find({}).populate("walletId", "name address");
    } else {
      agents = await Agent.find({ ownerId: session.user.id }).populate("walletId", "name address");
    }

    return NextResponse.json({ success: true, data: agents });
  } catch (error) {
    console.error("Agents GET Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    await dbConnect();
    const body = await req.json();
    const parsed = createAgentSchema.parse(body);

    // Generate credentials
    const rawApiKey = `agentshield_sk_${crypto.randomBytes(24).toString("hex")}`;
    const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

    const agent = await Agent.create({
      ownerId: session.user.id,
      walletId: parsed.walletId,
      name: parsed.name,
      description: parsed.description,
      purpose: parsed.purpose,
      network: parsed.network,
      spendingLimit: parsed.spendingLimit,
      riskLevel: parsed.riskLevel,
      allowedTokens: parsed.allowedTokens,
      avatar: parsed.avatar,
      tags: parsed.tags,
      status: "draft",
      apiKeyHash,
    });

    // Create activity record
    await AgentActivity.create({
      agentId: agent._id,
      activityType: "CREATED",
      details: `Simulated Agent ${agent.name} deployed as Draft status.`,
      metadata: { createdBy: session.user.id },
    });

    // Initialize metrics container
    await AgentMetrics.create({
      agentId: agent._id,
      requestsToday: 0,
      approvedCount: 0,
      rejectedCount: 0,
      blockedCount: 0,
      successRate: 100,
      averageRequestAmount: 0,
    });

    return NextResponse.json({
      success: true,
      data: {
        agent,
        rawApiKey, // Return only ONCE to user on frontend to copy
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload parameters", details: error.errors } },
        { status: 400 }
      );
    }
    console.error("Agent POST Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}
