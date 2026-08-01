import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Organization } from "@/models/Organization";

const updateOrgStatusSchema = z.object({
  orgId: z.string().regex(/^[0-9a-fA-F]{24}$/),
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

    let orgs = await Organization.find({}).sort({ createdAt: -1 });

    // Seed mock organizations if empty
    if (orgs.length === 0) {
      orgs = await Organization.insertMany([
        { name: "Acme Fintech Corp", industry: "Financial", country: "United States", status: "active", walletCount: 3, agentCount: 5, riskScore: 18 },
        { name: "Ether Ventures", industry: "Blockchain", country: "Singapore", status: "active", walletCount: 6, agentCount: 10, riskScore: 42 },
        { name: "Cyberdyne AI Research", industry: "Defense & Robotics", country: "Japan", status: "suspended", walletCount: 2, agentCount: 4, riskScore: 88 }
      ]);
    }

    return NextResponse.json({ success: true, data: orgs });
  } catch (error) {
    console.error("Admin Orgs GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to query organizations" } }, { status: 500 });
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
    const parsed = updateOrgStatusSchema.parse(body);

    const org = await Organization.findById(parsed.orgId);
    if (!org) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Organization not found" } }, { status: 404 });
    }

    org.status = parsed.status;
    await org.save();

    return NextResponse.json({ success: true, message: `Organization is now ${parsed.status}.` });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: error.errors } }, { status: 400 });
    }
    console.error("Admin Org PUT Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update organization status" } }, { status: 500 });
  }
}
