import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { AgentTransaction } from "@/models/AgentTransaction";

export async function GET(
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

    // RBAC
    if (session.user.role !== "admin" && agent.ownerId.toString() !== session.user.id) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
    }

    const transactions = await AgentTransaction.find({ agentId: id }).sort({ timestamp: -1 }).limit(50);
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error("Agent Transactions GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch transactions" } }, { status: 500 });
  }
}
