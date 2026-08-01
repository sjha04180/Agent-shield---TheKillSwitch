import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { BlockchainTransaction } from "@/models/BlockchainTransaction";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    
    // Fetch blockchain history
    const history = await BlockchainTransaction.find({})
      .populate("agentId", "name")
      .populate("policyId", "name")
      .sort({ timestamp: -1 })
      .limit(50);

    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error("Blockchain History GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch on-chain transaction history" } }, { status: 500 });
  }
}
