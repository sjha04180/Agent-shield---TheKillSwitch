import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { ConnectedAgent } from "@/models/ConnectedAgent";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Group connected agents by provider
    const agents = await ConnectedAgent.find({});
    
    const providerStats = agents.reduce((acc, agent) => {
      if (!acc[agent.provider]) {
        acc[agent.provider] = {
          provider: agent.provider,
          agentCount: 0,
          onlineCount: 0,
          totalRequests: 0,
          totalBlocked: 0,
        };
      }
      
      const stats = acc[agent.provider];
      stats.agentCount++;
      if (agent.status === "online") stats.onlineCount++;
      stats.totalRequests += agent.requestsToday;
      stats.totalBlocked += agent.blockedCount;
      
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: Object.values(providerStats),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
