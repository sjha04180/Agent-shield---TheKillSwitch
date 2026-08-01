import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { AgentActivity } from "@/models/AgentActivity";
import { AgentMetrics } from "@/models/AgentMetrics";
import { AgentTransaction } from "@/models/AgentTransaction";

const updateAgentSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  purpose: z.string().min(3).optional(),
  spendingLimit: z.number().nonnegative().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  tags: z.array(z.string()).optional(),
  allowedTokens: z.array(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    await dbConnect();

    const agent = await Agent.findById(id).populate("walletId", "name address");
    if (!agent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent profile not found" } },
        { status: 404 }
      );
    }

    // Access Control: Owner sees own agent, Admin sees all
    if (session.user.role !== "admin" && agent.ownerId.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: agent });
  } catch (error) {
    console.error("Agent Detail GET Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    await dbConnect();

    const agent = await Agent.findById(id);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found" } },
        { status: 404 }
      );
    }

    // Owners only. Admins cannot edit owner agents without permission
    if (agent.ownerId.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to modify this agent" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateAgentSchema.parse(body);

    if (parsed.name) agent.name = parsed.name;
    if (parsed.description !== undefined) agent.description = parsed.description;
    if (parsed.purpose) agent.purpose = parsed.purpose;
    if (parsed.spendingLimit !== undefined) agent.spendingLimit = parsed.spendingLimit;
    if (parsed.riskLevel) agent.riskLevel = parsed.riskLevel;
    if (parsed.tags) agent.tags = parsed.tags;
    if (parsed.allowedTokens) agent.allowedTokens = parsed.allowedTokens;

    await agent.save();

    await AgentActivity.create({
      agentId: agent._id,
      activityType: "POLICY_REJECTED", // Using standard type to log updates
      details: `Agent specifications and properties updated via dashboard.`,
      metadata: { updatedBy: session.user.id },
    });

    return NextResponse.json({ success: true, data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: error.errors } },
        { status: 400 }
      );
    }
    console.error("Agent PUT Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    await dbConnect();

    const agent = await Agent.findById(id);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found" } },
        { status: 404 }
      );
    }

    // Owner checks
    if (agent.ownerId.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to delete this agent" } },
        { status: 403 }
      );
    }

    // Delete agent records
    await Agent.findByIdAndDelete(id);
    await AgentActivity.deleteMany({ agentId: id });
    await AgentMetrics.deleteMany({ agentId: id });
    await AgentTransaction.deleteMany({ agentId: id });

    return NextResponse.json({ success: true, message: "Agent and all analytics removed successfully." });
  } catch (error) {
    console.error("Agent DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}
