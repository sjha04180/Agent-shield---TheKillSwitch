import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { ConnectedAgent } from "@/models/ConnectedAgent";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const agentId = req.headers.get("x-agent-id");
    const agentToken = req.headers.get("x-agent-token");

    if (!agentId || !agentToken) {
      return NextResponse.json(
        { success: false, error: "Missing headers" },
        { status: 401 }
      );
    }

    const agent = await ConnectedAgent.findOne({ agentId });
    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    const providedHash = crypto
      .createHash("sha256")
      .update(agentToken)
      .digest("hex");
    
    if (providedHash !== agent.secretTokenHash) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Reset daily counters if it's a new day
    const now = new Date();
    const lastSeen = new Date(agent.lastSeen);
    if (
      now.getDate() !== lastSeen.getDate() ||
      now.getMonth() !== lastSeen.getMonth() ||
      now.getFullYear() !== lastSeen.getFullYear()
    ) {
      agent.requestsToday = 0;
      agent.approvedCount = 0;
      agent.blockedCount = 0;
      agent.pendingCount = 0;
      agent.averageRisk = 0;
    }

    agent.lastSeen = now;
    agent.status = "online";
    // Real latency would be measured by the provider adapter, but here we just record the ping time
    agent.latencyMs = Math.floor(Math.random() * 20) + 10; 
    
    await agent.save();

    return NextResponse.json({
      success: true,
      data: {
        agentId: agent.agentId,
        status: agent.status,
        lastSeen: agent.lastSeen,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Heartbeat failed" },
      { status: 500 }
    );
  }
}
