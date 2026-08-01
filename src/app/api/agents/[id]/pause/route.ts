import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { AgentActivity } from "@/models/AgentActivity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const agent = await Agent.findById(id);
    if (!agent) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    }

    if (agent.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
    }

    agent.status = "paused";
    await agent.save();

    await AgentActivity.create({
      agentId: agent._id,
      activityType: "PAUSED",
      details: `AI Agent ${agent.name} has been paused. Operations suspended.`,
      metadata: { triggeredBy: session.user.id },
    });

    return NextResponse.json({ success: true, data: agent });
  } catch (error) {
    console.error("Agent Pause Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}
