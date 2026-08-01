import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Policy } from "@/models/Policy";
import { Agent } from "@/models/Agent";
import { AgentActivity } from "@/models/AgentActivity";
import { AuditLog } from "@/models/AuditLog";

const assignSchema = z.object({
  agentId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Agent reference ID"),
});

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

    // Verify Policy exists
    const policy = await Policy.findById(id);
    if (!policy) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Policy not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = assignSchema.parse(body);

    // Verify Agent exists and is owned by user
    const agent = await Agent.findById(parsed.agentId);
    if (!agent) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    }

    if (agent.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "You do not own this agent" } }, { status: 403 });
    }

    // Assign policy to agent
    agent.policyId = policy._id as any;
    await agent.save();

    // Log Activity
    await AgentActivity.create({
      agentId: agent._id,
      activityType: "POLICY_REJECTED", // Using standard log hook
      details: `Policy "${policy.name}" assigned successfully to Agent.`,
      metadata: { policyId: policy._id }
    });

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    await AuditLog.create({
      userId: session.user.id,
      action: "POLICY_ASSIGN",
      details: `Assigned Policy "${policy.name}" to Agent "${agent.name}".`,
      metadata: { policyId: policy._id, agentId: agent._id },
      ipAddress: ip
    });

    return NextResponse.json({ success: true, message: "Policy assigned successfully", data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: error.errors } }, { status: 400 });
    }
    console.error("Policy Assign Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to assign policy" } }, { status: 500 });
  }
}
