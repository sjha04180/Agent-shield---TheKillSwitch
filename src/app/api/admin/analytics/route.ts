import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Administrators access only" } },
        { status: 403 }
      );
    }

    // Mock rich data snapshots matching standard enterprise tools for chart layouts
    const dailyTrends = [
      { date: "Mon", transactions: 120, blocked: 4, gas: 120000 },
      { date: "Tue", transactions: 145, blocked: 2, gas: 135000 },
      { date: "Wed", transactions: 95, blocked: 8, gas: 98000 },
      { date: "Thu", transactions: 180, blocked: 1, gas: 190000 },
      { date: "Fri", transactions: 210, blocked: 12, gas: 240000 },
      { date: "Sat", transactions: 85, blocked: 0, gas: 75000 },
      { date: "Sun", transactions: 110, blocked: 3, gas: 92000 }
    ];

    const riskDistribution = [
      { category: "Safe (0-20)", count: 320 },
      { category: "Low (21-40)", count: 85 },
      { category: "Moderate (41-60)", count: 28 },
      { category: "Elevated (61-80)", count: 12 },
      { category: "Critical (81-100)", count: 3 }
    ];

    return NextResponse.json({
      success: true,
      data: {
        dailyTrends,
        riskDistribution
      }
    });

  } catch (error) {
    console.error("Admin Analytics GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to gather analytics data" } }, { status: 500 });
  }
}
