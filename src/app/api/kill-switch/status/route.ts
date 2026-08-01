import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { KillSwitchEvent } from "@/models/KillSwitchEvent";
import { isKillSwitchActive } from "@/services/engine/policyEngine";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();

    const active = await isKillSwitchActive();
    const lastEvent = await KillSwitchEvent.findOne().sort({ timestamp: -1 });

    return NextResponse.json({
      success: true,
      data: {
        active,
        lastEvent
      }
    });

  } catch (error) {
    console.error("Kill Switch Status GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch status" } }, { status: 500 });
  }
}
