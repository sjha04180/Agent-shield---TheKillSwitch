import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Wallet } from "@/models/Wallet";

const createWalletSchema = z.object({
  name: z.string().min(3, "Wallet name must be at least 3 characters"),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
  chainId: z.number().int().positive("Invalid Chain ID"),
  walletType: z.enum(["EOA", "Safe", "ERC4337"]).default("ERC4337"),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    await dbConnect();
    
    // RBAC: Admin sees all wallets, Owner sees only their own
    let wallets;
    if (session.user.role === "admin") {
      wallets = await Wallet.find({});
    } else {
      wallets = await Wallet.find({ ownerId: session.user.id });
    }

    return NextResponse.json({ success: true, data: wallets });
  } catch (error) {
    console.error("Wallets GET Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    // Admins shouldn't directly create user wallets in standard owner mode
    if (session.user.role === "admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Administrators cannot directly create owner wallets" } },
        { status: 403 }
      );
    }

    await dbConnect();
    const body = await req.json();
    const parsed = createWalletSchema.parse(body);

    // Check if wallet already exists
    const existing = await Wallet.findOne({ address: parsed.address.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "WALLET_EXISTS", message: "A wallet with this address already exists" } },
        { status: 400 }
      );
    }

    const wallet = await Wallet.create({
      ownerId: session.user.id,
      address: parsed.address.toLowerCase(),
      name: parsed.name,
      chainId: parsed.chainId,
      walletType: parsed.walletType,
      status: "active",
    });

    return NextResponse.json({ success: true, data: wallet }, { status: 211 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload parameters", details: error.errors } },
        { status: 400 }
      );
    }
    console.error("Wallet POST Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}
