import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Report } from "@/models/Report";


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
    
    let logs = await Report.find({})
      .populate("generatedBy", "name")
      .sort({ generatedAt: -1 });

    // Seed mock reports if empty to give user immediate reports to test downloads
    if (logs.length === 0) {
      logs = await Report.insertMany([
        {
          title: "Q3 Threat Vector Audit",
          reportType: "Monthly",
          format: "CSV",
          path: "/reports/q3_threat_audit.csv",
          size: "45 KB",
          generatedBy: new mongoose.Types.ObjectId(session.user.id)
        },
        {
          title: "Weekly Policy Violations Summary",
          reportType: "Weekly",
          format: "PDF",
          path: "/reports/weekly_violations_log.pdf",
          size: "1.2 MB",
          generatedBy: new mongoose.Types.ObjectId(session.user.id)
        }
      ]) as any;
    }

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Admin Reports GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load audit logs reports directory" } }, { status: 500 });
  }
}
