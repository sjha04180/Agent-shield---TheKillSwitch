import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { ConnectedAgent } from "@/models/ConnectedAgent";
import { AgentCredentials } from "@/models/AgentCredentials";
import { AuditLog } from "@/models/AuditLog";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { agentId, secretToken } = body;
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    if (!agentId || !secretToken) {
      return NextResponse.json(
        { success: false, error: "Missing agentId or secretToken" },
        { status: 400 }
      );
    }

    // 1. Verify credentials via AgentCredentials collection
    const credential = await AgentCredentials.findOne({ agentId, status: "active" });
    if (!credential || credential.agentToken !== secretToken) {
      await AuditLog.create({
        action: "AGENT_AUTH_FAILED",
        details: `Failed authentication attempt for agentId: ${agentId}`,
        ipAddress: ip,
        metadata: { agentId },
      });
      return NextResponse.json(
        { success: false, error: "Invalid credentials or agent not active" },
        { status: 401 }
      );
    }

    // 2. Load connected agent state
    const agent = await ConnectedAgent.findOne({ agentId });
    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent connected config missing" },
        { status: 404 }
      );
    }

    // Update status to online
    agent.status = "online";
    agent.lastSeen = new Date();
    await agent.save();

    await AuditLog.create({
      action: "AGENT_AUTHENTICATED",
      details: `Agent ${agentId} successfully authenticated via credentials collection.`,
      ipAddress: ip,
      metadata: { agentId, provider: agent.provider },
    });

    return NextResponse.json({
      success: true,
      data: {
        agentId: agent.agentId,
        provider: agent.provider,
        role: agent.role,
        status: agent.status,
      },
    });
  } catch (error) {
    console.error("[/api/agents/authenticate] Error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication service unavailable" },
      { status: 500 }
    );
  }
}
