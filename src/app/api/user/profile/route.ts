import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { User } from "@/models/User";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  organization: z.string().optional(),
  timezone: z.string().optional(),
  image: z.string().url("Invalid image URL").or(z.string().length(0)).optional(),
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
    const user = await User.findById(session.user.id).select("-passwordHash");
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User profile not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Profile GET Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    await dbConnect();
    const body = await req.json();
    const parsed = profileSchema.parse(body);

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User profile not found" } },
        { status: 404 }
      );
    }

    // Apply updates
    if (parsed.name) user.name = parsed.name;
    if (parsed.organization !== undefined) user.organization = parsed.organization;
    if (parsed.timezone) user.timezone = parsed.timezone;
    if (parsed.image !== undefined) user.image = parsed.image;

    await user.save();

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        timezone: user.timezone,
        image: user.image,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload parameters", details: error.errors } },
        { status: 400 }
      );
    }
    console.error("Profile PUT Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}
