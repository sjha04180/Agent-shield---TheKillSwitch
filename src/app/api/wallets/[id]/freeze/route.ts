import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Wallet } from "@/models/Wallet";
import { AuditLog } from "@/models/AuditLog";
import { SecurityEvent } from "@/models/SecurityEvent";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    await dbConnect();

    const wallet = await Wallet.findById(id);
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Wallet not found" } },
        { status: 404 }
      );
    }

    // RBAC: Only the owner can freeze the wallet
    if (wallet.ownerId.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to freeze this wallet" } },
        { status: 403 }
      );
    }

    wallet.status = "frozen";
    await wallet.save();

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

    // Write audit log
    await AuditLog.create({
      userId: session.user.id,
      action: "WALLET_FREEZE",
      details: `Wallet ${wallet.name} (${wallet.address}) frozen via dashboard.`,
      metadata: { walletId: wallet._id, address: wallet.address },
      ipAddress: ip,
    });

    // Write security event
    await SecurityEvent.create({
      walletId: wallet._id,
      eventType: "KILLSWITCH_TRIGGERED",
      severity: "critical",
      details: `Emergency Kill Switch activated for wallet ${wallet.name}`,
      metadata: { triggeredBy: session.user.id },
      resolved: false,
    });

    return NextResponse.json({ success: true, data: wallet });
  } catch (error) {
    console.error("Wallet Freeze Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}
