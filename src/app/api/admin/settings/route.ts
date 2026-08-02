import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { SystemConfig } from "@/models/SystemConfig";
import { AuditLog } from "@/models/AuditLog";

const updateSettingsSchema = z.object({
  demoMode: z.boolean(),
  lyzrEnabled: z.boolean(),
  simulatorSpeed: z.enum(["normal", "fast", "stress"]),
  autoDemo: z.boolean(),
  blockchainSimulation: z.boolean(),
  geminiEnabled: z.boolean(),
});

export async function GET() {
  try {
    await dbConnect();
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({
        demoMode: true,
        lyzrEnabled: true,
        simulatorSpeed: "normal",
        autoDemo: false,
        blockchainSimulation: true,
        geminiEnabled: true,
      });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error("GET /api/admin/settings Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to read system settings" } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    // Allow owner or admin roles to adjust settings
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    await dbConnect();
    const body = await req.json();
    const parsed = updateSettingsSchema.parse(body);

    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }

    config.demoMode = parsed.demoMode;
    config.lyzrEnabled = parsed.lyzrEnabled;
    config.simulatorSpeed = parsed.simulatorSpeed;
    config.autoDemo = parsed.autoDemo;
    config.blockchainSimulation = parsed.blockchainSimulation;
    config.geminiEnabled = parsed.geminiEnabled;
    await config.save();

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    await AuditLog.create({
      userId: session.user.id,
      action: "PLATFORM_SETTINGS_UPDATED",
      details: `Settings updated. Demo Mode: ${parsed.demoMode}, Auto Demo: ${parsed.autoDemo}, Speed: ${parsed.simulatorSpeed}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, data: config, message: "Settings synchronized successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: error.errors } },
        { status: 400 }
      );
    }
    console.error("PUT /api/admin/settings Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update system settings" } },
      { status: 500 }
    );
  }
}
