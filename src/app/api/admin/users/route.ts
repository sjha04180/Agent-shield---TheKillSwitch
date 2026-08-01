import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { User } from "@/models/User";

const updateUserStatusSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  status: z.enum(["active", "suspended"]),
});

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
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Admin Users GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to query users list" } }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Administrators access only" } },
        { status: 403 }
      );
    }

    await dbConnect();
    const body = await req.json();
    const parsed = updateUserStatusSchema.parse(body);

    const user = await User.findById(parsed.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "User profile not found" } }, { status: 404 });
    }

    user.status = parsed.status;
    await user.save();

    return NextResponse.json({ success: true, message: `User account is now ${parsed.status}.` });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: error.errors } }, { status: 400 });
    }
    console.error("Admin User PUT Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update user profile" } }, { status: 500 });
  }
}
