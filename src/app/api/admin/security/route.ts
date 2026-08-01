import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { ValidationLog } from "@/models/ValidationLog";
import { KillSwitchEvent } from "@/models/KillSwitchEvent";
import { RiskAnalysis } from "@/models/RiskAnalysis";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Administrators access only" } },
        { status: 403 }
      );
    }

    await dbConnect();

    const [violations, killSwitches, riskLogs] = await Promise.all([
      ValidationLog.find({ status: "Blocked" })
        .populate("agentId", "name")
        .sort({ timestamp: -1 })
        .limit(10),
      KillSwitchEvent.find({})
        .populate("triggeredBy", "name")
        .sort({ timestamp: -1 })
        .limit(10),
      RiskAnalysis.find({ riskScore: { $gte: 70 } })
        .populate("agentId", "name")
        .sort({ timestamp: -1 })
        .limit(10)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        violations,
        killSwitches,
        highRiskEvents: riskLogs
      }
    });

  } catch (error) {
    console.error("Admin Security GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load security center metrics" } }, { status: 500 });
  }
}
