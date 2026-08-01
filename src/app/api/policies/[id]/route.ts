import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Policy } from "@/models/Policy";
import { Agent } from "@/models/Agent";

const updatePolicyRulesSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "disabled"]).optional(),
  maxSingleTx: z.number().nonnegative().optional(),
  maxDailySpent: z.number().nonnegative().optional(),
  maxWeeklySpent: z.number().nonnegative().optional(),
  maxMonthlySpent: z.number().nonnegative().optional(),
  maxTxPerHour: z.number().nonnegative().optional(),
  maxTxPerDay: z.number().nonnegative().optional(),
  allowedWallets: z.array(z.string()).optional(),
  blockedWallets: z.array(z.string()).optional(),
  allowedContracts: z.array(z.string()).optional(),
  blockedContracts: z.array(z.string()).optional(),
  allowedTokens: z.array(z.string()).optional(),
  blockedTokens: z.array(z.string()).optional(),
  allowedNetworks: z.array(z.number()).optional(),
  businessHoursOnly: z.boolean().optional(),
  businessStartHour: z.number().min(0).max(23).optional(),
  businessEndHour: z.number().min(0).max(23).optional(),
  weekdaysOnly: z.boolean().optional(),
  noWeekends: z.boolean().optional(),
  timezone: z.string().optional(),
  holidayLock: z.boolean().optional(),
  maxRiskScore: z.number().min(0).max(100).optional(),
  requireManualApproval: z.boolean().optional(),
  blockUnknownMerchants: z.boolean().optional(),
  blockHighRiskVendors: z.boolean().optional(),
  blockNewWallets: z.boolean().optional(),
  emergencyFreezeEnabled: z.boolean().optional(),
  killSwitchEnabled: z.boolean().optional(),
  autoPauseAgent: z.boolean().optional(),
  autoLockWallet: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    
    const policy = await Policy.findById(id);
    if (!policy) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Policy not found" } }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updatePolicyRulesSchema.parse(body);

    // Apply updates dynamically
    Object.assign(policy, parsed);
    await policy.save();

    return NextResponse.json({ success: true, data: policy });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: error.errors } }, { status: 400 });
    }
    console.error("Policy PUT Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update policy" } }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    // Verify if policy is currently assigned to any agent
    const assignedAgent = await Agent.findOne({ policyId: id });
    if (assignedAgent) {
      return NextResponse.json({
        success: false,
        error: { code: "ASSIGNED", message: `Cannot delete policy. It is currently assigned to Agent: ${assignedAgent.name}` }
      }, { status: 400 });
    }

    await Policy.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Policy deleted successfully" });
  } catch (error) {
    console.error("Policy DELETE Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete policy" } }, { status: 500 });
  }
}
