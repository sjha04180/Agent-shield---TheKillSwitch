import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { KillSwitchEvent } from "@/models/KillSwitchEvent";
import { AuditLog } from "@/models/AuditLog";

const deactivateSchema = z.object({
  reason: z.string().min(5, "Please provide a valid deactivation reason."),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const parsed = deactivateSchema.parse(body);

    // Create deactivation event
    const event = await KillSwitchEvent.create({
      status: "deactivated",
      triggeredBy: session.user.id,
      triggerType: "manual",
      reason: parsed.reason,
    });

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    await AuditLog.create({
      userId: session.user.id,
      action: "KILLSWITCH_DEACTIVATE",
      details: `Emergency Kill Switch DEACTIVATED. Reason: ${parsed.reason}`,
      metadata: { eventId: event._id },
      ipAddress: ip
    });

    return NextResponse.json({
      success: true,
      message: "Emergency Kill Switch deactivated. Wallets can now be manually unfrozen.",
      data: event
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid reason", details: error.errors } }, { status: 400 });
    }
    console.error("Kill Switch Deactivation Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to deactivate Kill Switch" } }, { status: 500 });
  }
}
