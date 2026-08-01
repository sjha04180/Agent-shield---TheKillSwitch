import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { ConnectedAgent } from "@/models/ConnectedAgent";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Fetch all connected agents to display in the UI
    const agents = await ConnectedAgent.find({}).sort({ createdAt: 1 }).lean();
    
    return NextResponse.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch connected agents" },
      { status: 500 }
    );
  }
}
