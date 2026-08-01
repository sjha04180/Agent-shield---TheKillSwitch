import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbConnect } from "@/lib/dbConnect";
import { ConnectedAgent } from "@/models/ConnectedAgent";
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

    const agent = await ConnectedAgent.findOne({ agentId });
    if (!agent) {
      await AuditLog.create({
        action: "AGENT_AUTH_FAILED",
        details: `Failed authentication attempt for unknown agentId: ${agentId}`,
        ipAddress: ip,
        metadata: { agentId },
      });
      return NextResponse.json(
        { success: false, error: "Agent not registered" },
        { status: 401 }
      );
    }

    if (agent.status === "disabled") {
      return NextResponse.json(
        { success: false, error: "Agent is disabled" },
        { status: 403 }
      );
    }

    // Verify token hash
    const providedHash = crypto
      .createHash("sha256")
      .update(secretToken)
      .digest("hex");

    if (providedHash !== agent.secretTokenHash) {
      await AuditLog.create({
        action: "AGENT_AUTH_FAILED",
        details: `Invalid token for agentId: ${agentId}`,
        ipAddress: ip,
        metadata: { agentId },
      });
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Update status to online
    agent.status = "online";
    agent.lastSeen = new Date();
    await agent.save();

    await AuditLog.create({
      action: "AGENT_AUTHENTICATED",
      details: `Agent ${agentId} successfully authenticated.`,
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
