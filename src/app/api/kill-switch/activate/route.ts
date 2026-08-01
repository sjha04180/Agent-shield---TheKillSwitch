import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { KillSwitchEvent } from "@/models/KillSwitchEvent";
import { Agent } from "@/models/Agent";
import { Wallet } from "@/models/Wallet";
import { AuditLog } from "@/models/AuditLog";
import { AgentActivity } from "@/models/AgentActivity";

const activateSchema = z.object({
  reason: z.string().min(5, "Please provide a valid emergency reason (minimum 5 characters)."),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const parsed = activateSchema.parse(body);

    // 1. Create Kill Switch Activation Event in DB
    const event = await KillSwitchEvent.create({
      status: "activated",
      triggeredBy: session.user.id,
      triggerType: "manual",
      reason: parsed.reason,
    });

    // 2. Pause all agents belonging to the owner (or all agents if admin)
    const filter = session.user.role === "admin" ? {} : { ownerId: session.user.id };
    const targetAgents = await Agent.find(filter);
    
    for (const agent of targetAgents) {
      agent.status = "paused";
      await agent.save();

      // Log activity for the agent
      await AgentActivity.create({
        agentId: agent._id,
        activityType: "PAUSED",
        details: `Agent auto-paused by Global Emergency Kill Switch. Reason: ${parsed.reason}`,
        metadata: { killSwitchEventId: event._id }
      });
    }

    // 3. Freeze all wallets belonging to the owner (or all wallets if admin)
    const walletFilter = session.user.role === "admin" ? {} : { ownerId: session.user.id };
    const targetWallets = await Wallet.find(walletFilter);
    
    for (const wallet of targetWallets) {
      wallet.status = "frozen";
      await wallet.save();
    }

    // 4. Log audit log
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    await AuditLog.create({
      userId: session.user.id,
      action: "KILLSWITCH_ACTIVATE",
      details: `Global Emergency Kill Switch ACTIVATED. Reason: ${parsed.reason}. Frozen ${targetAgents.length} agents & ${targetWallets.length} wallets.`,
      metadata: { eventId: event._id },
      ipAddress: ip
    });

    return NextResponse.json({
      success: true,
      message: "Emergency Kill Switch activated successfully. All agents paused & wallets frozen.",
      data: event
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid reason parameter", details: error.errors } }, { status: 400 });
    }
    console.error("Kill Switch Activation Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to activate Kill Switch" } }, { status: 500 });
  }
}
