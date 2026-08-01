import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Wallet } from "@/models/Wallet";

const updateSchema = z.object({
  name: z.string().min(3, "Wallet name must be at least 3 characters").optional(),
  status: z.enum(["active", "frozen"]).optional(),
});

export async function PUT(
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

    // RBAC check: Owner must be the session user. Admins cannot edit owner wallets without permission.
    if (wallet.ownerId.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to modify this wallet" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateSchema.parse(body);

    if (parsed.name) wallet.name = parsed.name;
    if (parsed.status) wallet.status = parsed.status;

    await wallet.save();

    return NextResponse.json({ success: true, data: wallet });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid updates", details: error.errors } },
        { status: 400 }
      );
    }
    console.error("Wallet PUT Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // RBAC: Only owner can delete their own wallet
    if (wallet.ownerId.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to delete this wallet" } },
        { status: 403 }
      );
    }

    await Wallet.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Wallet deleted successfully" });
  } catch (error) {
    console.error("Wallet DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}
