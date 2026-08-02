import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { ConnectedAgent } from "@/models/ConnectedAgent";
import { AgentCredentials } from "@/models/AgentCredentials";

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

    // 1. Verify credentials via AgentCredentials collection
    const credential = await AgentCredentials.findOne({ agentId, status: "active" });
    if (!credential || credential.agentToken !== agentToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid credentials" },
        { status: 401 }
      );
    }

    // 2. Fetch connected agent document
    const agent = await ConnectedAgent.findOne({ agentId });
    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent connected config missing" },
        { status: 404 }
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
    console.error("[GET /api/agents/heartbeat] Error:", error);
    return NextResponse.json(
      { success: false, error: "Heartbeat check failed" },
      { status: 500 }
    );
  }
}
