import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { AgentTransaction } from "@/models/AgentTransaction";
import { AgentMetrics } from "@/models/AgentMetrics";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();

    // Owner vs Admin checks
    const filter = session.user.role === "admin" ? {} : { ownerId: session.user.id };

    // 1. Agent Status aggregation
    const agents = await Agent.find(filter);
    const statusCounts = {
      draft: 0,
      active: 0,
      paused: 0,
      frozen: 0,
      blocked: 0,
      archived: 0,
    };
    const riskCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    agents.forEach((agent) => {
      if (statusCounts[agent.status] !== undefined) {
        statusCounts[agent.status]++;
      }
      if (riskCounts[agent.riskLevel] !== undefined) {
        riskCounts[agent.riskLevel]++;
      }
    });

    // 2. Global transactional statistics
    const agentIds = agents.map((a) => a._id);
    const txFilter = { agentId: { $in: agentIds } };
    const transactions = await AgentTransaction.find(txFilter);

    // Group transactions by vendor/reason category
    const vendorMap: Record<string, number> = {};
    let totalRequests = transactions.length;
    let blockedRequests = 0;
    let approvedRequests = 0;

    transactions.forEach((tx) => {
      if (tx.status === "blocked") blockedRequests++;
      if (tx.status === "executed" || tx.status === "approved") approvedRequests++;

      // Extract vendor name (first token of reason e.g. "OpenAI - API Credits" -> "OpenAI")
      const vendorName = tx.reason.split(" - ")[0] || "Unknown";
      vendorMap[vendorName] = (vendorMap[vendorName] || 0) + 1;
    });

    // Format vendors for chart representation
    const vendorData = Object.entries(vendorMap)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5 vendors

    // 3. Overall performance metrics averages
    const metricsList = await AgentMetrics.find({ agentId: { $in: agentIds } });
    let totalAvgSpentSum = 0;
    metricsList.forEach((m) => {
      totalAvgSpentSum += m.averageRequestAmount;
    });
    const avgAmountVal = metricsList.length > 0 ? (totalAvgSpentSum / metricsList.length).toFixed(4) : "0.00";

    return NextResponse.json({
      success: true,
      data: {
        agentStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
        riskDistribution: Object.entries(riskCounts).map(([name, value]) => ({ name, value })),
        topVendors: vendorData,
        overallStats: {
          totalRequests,
          blockedRequests,
          approvedRequests,
          successRate: totalRequests > 0 ? ((approvedRequests / totalRequests) * 100).toFixed(1) : "100",
          averageRequestAmount: avgAmountVal
        }
      }
    });

  } catch (error) {
    console.error("Simulator Metrics GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to gather metrics" } }, { status: 500 });
  }
}
