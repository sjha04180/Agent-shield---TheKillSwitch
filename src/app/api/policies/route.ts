import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Policy } from "@/models/Policy";

const policyRulesSchema = z.object({
  name: z.string().min(3, "Policy name must be at least 3 characters"),
  description: z.string().optional().default(""),
  maxSingleTx: z.number().nonnegative().default(0),
  maxDailySpent: z.number().nonnegative().default(0),
  maxWeeklySpent: z.number().nonnegative().default(0),
  maxMonthlySpent: z.number().nonnegative().default(0),
  maxTxPerHour: z.number().nonnegative().default(0),
  maxTxPerDay: z.number().nonnegative().default(0),
  allowedWallets: z.array(z.string()).default([]),
  blockedWallets: z.array(z.string()).default([]),
  allowedContracts: z.array(z.string()).default([]),
  blockedContracts: z.array(z.string()).default([]),
  allowedTokens: z.array(z.string()).default(["ETH"]),
  blockedTokens: z.array(z.string()).default([]),
  allowedNetworks: z.array(z.number()).default([]),
  businessHoursOnly: z.boolean().default(false),
  businessStartHour: z.number().min(0).max(23).default(9),
  businessEndHour: z.number().min(0).max(23).default(17),
  weekdaysOnly: z.boolean().default(false),
  noWeekends: z.boolean().default(false),
  timezone: z.string().default("UTC"),
  holidayLock: z.boolean().default(false),
  maxRiskScore: z.number().min(0).max(100).default(80),
  requireManualApproval: z.boolean().default(false),
  blockUnknownMerchants: z.boolean().default(false),
  blockHighRiskVendors: z.boolean().default(false),
  blockNewWallets: z.boolean().default(false),
  emergencyFreezeEnabled: z.boolean().default(true),
  killSwitchEnabled: z.boolean().default(true),
  autoPauseAgent: z.boolean().default(true),
  autoLockWallet: z.boolean().default(true),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    
    // Fetch all policies
    const policies = await Policy.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: policies });
  } catch (error) {
    console.error("Policies GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch policies" } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const parsed = policyRulesSchema.parse(body);

    // Verify uniqueness
    const existing = await Policy.findOne({ name: parsed.name });
    if (existing) {
      return NextResponse.json({ success: false, error: { code: "EXISTS", message: "A policy with this name already exists" } }, { status: 400 });
    }

    const policy = await Policy.create({
      ...parsed,
      createdBy: session.user.id,
      status: "active"
    });

    return NextResponse.json({ success: true, data: policy });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid rule schema parameters", details: error.errors } }, { status: 400 });
    }
    console.error("Policy POST Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create policy" } }, { status: 500 });
  }
}
