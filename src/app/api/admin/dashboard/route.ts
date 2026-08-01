import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";
import { Agent } from "@/models/Agent";
import { Organization } from "@/models/Organization";
import { ValidationLog } from "@/models/ValidationLog";

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

    const [userCount, walletCount, orgCount, activeAgents, pausedAgents, validationLogs] = await Promise.all([
      User.countDocuments({}),
      Wallet.countDocuments({}),
      Organization.countDocuments({}),
      Agent.countDocuments({ status: "active" }),
      Agent.countDocuments({ status: "paused" }),
      ValidationLog.find({}).limit(5) // recent reviews
    ]);

    // Calculate mock blocks vs approvals
    const blockedCount = await ValidationLog.countDocuments({ status: "Blocked" });
    const approvedCount = await ValidationLog.countDocuments({ status: "Approved" });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          userCount,
          orgCount,
          walletCount,
          activeAgents,
          pausedAgents,
          blockedTransactions: blockedCount,
          successfulTransactions: approvedCount,
          securityAlertsCount: blockedCount // fallback metrics
        },
        recentLogs: validationLogs
      }
    });

  } catch (error) {
    console.error("Admin Dashboard GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to gather admin metrics" } }, { status: 500 });
  }
}
