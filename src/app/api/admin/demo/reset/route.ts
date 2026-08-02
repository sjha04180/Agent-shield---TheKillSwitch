import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Organization } from "@/models/Organization";
import { Wallet } from "@/models/Wallet";
import { Agent } from "@/models/Agent";
import { AgentTransaction } from "@/models/AgentTransaction";
import { AgentActivity } from "@/models/AgentActivity";
import { AgentMetrics } from "@/models/AgentMetrics";
import { AuditLog } from "@/models/AuditLog";
import { ValidationLog } from "@/models/ValidationLog";
import { KillSwitchEvent } from "@/models/KillSwitchEvent";
import { RiskAnalysis } from "@/models/RiskAnalysis";
import { ConnectedAgent } from "@/models/ConnectedAgent";
import { SystemConfig } from "@/models/SystemConfig";
import { ManualApproval } from "@/models/ManualApproval";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    await dbConnect();

    // 1. Wipe collections
    await Promise.all([
      Organization.deleteMany({}),
      Wallet.deleteMany({}),
      Agent.deleteMany({}),
      AgentTransaction.deleteMany({}),
      AgentActivity.deleteMany({}),
      AgentMetrics.deleteMany({}),
      AuditLog.deleteMany({}),
      ValidationLog.deleteMany({}),
      KillSwitchEvent.deleteMany({}),
      RiskAnalysis.deleteMany({}),
      ConnectedAgent.deleteMany({}),
      ManualApproval.deleteMany({}),
    ]);

    // 2. Reset platform configurations to default
    await SystemConfig.findOneAndUpdate(
      {},
      {
        demoMode: true,
        lyzrEnabled: true,
        simulatorSpeed: "normal",
        autoDemo: false,
        blockchainSimulation: true,
        geminiEnabled: true,
      },
      { upsert: true, new: true }
    );

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    await AuditLog.create({
      userId: session.user.id,
      action: "DEMO_ENVIRONMENT_RESET",
      details: "Cleared all governance policies, transactions, and metrics.",
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "Demo environment database scrubbed successfully." });

  } catch (error) {
    console.error("Demo reset error:", error);
    return NextResponse.json({ success: false, error: "Scrubbing demo database failed" }, { status: 500 });
  }
}
