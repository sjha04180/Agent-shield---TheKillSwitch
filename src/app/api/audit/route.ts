import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { ValidationLog } from "@/models/ValidationLog";
import { Agent } from "@/models/Agent";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const agentId = searchParams.get("agentId");
    const status = searchParams.get("status");
    const query = searchParams.get("query");
    
    await dbConnect();

    // Owner RBAC verification
    const agentsFilter = session.user.role === "admin" ? {} : { ownerId: session.user.id };
    const userAgents = await Agent.find(agentsFilter).select("_id");
    const userAgentIds = userAgents.map((a) => a._id);

    // Build DB filters
    const filter: any = { agentId: { $in: userAgentIds } };

    if (agentId) {
      filter.agentId = agentId;
    }
    if (status && status !== "all") {
      filter.status = status;
    }
    if (query) {
      filter.$or = [
        { recipient: { $regex: query, $options: "i" } },
        { transactionId: { $regex: query, $options: "i" } }
      ];
    }

    // Paginate logs
    const logs = await ValidationLog.find(filter)
      .populate("agentId", "name avatar")
      .populate("policyId", "name")
      .sort({ timestamp: -1 })
      .limit(100);

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Audit Logs GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to query validation ledger logs" } }, { status: 500 });
  }
}
