import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Report } from "@/models/Report";

const generateReportSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  reportType: z.enum(["Daily", "Weekly", "Monthly"]),
  format: z.enum(["PDF", "CSV"]),
});

export async function POST(req: NextRequest) {
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
    const parsed = generateReportSchema.parse(body);

    // Simulate file generation and calculate file sizing
    const generatedPath = `/reports/${parsed.title.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.${parsed.format.toLowerCase()}`;
    const fileSizeVal = parsed.format === "CSV" ? "12 KB" : "850 KB";

    const report = await Report.create({
      title: parsed.title,
      reportType: parsed.reportType,
      format: parsed.format,
      path: generatedPath,
      size: fileSizeVal,
      generatedBy: session.user.id,
    });

    return NextResponse.json({ success: true, message: "Report generated successfully", data: report });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters", details: error.errors } }, { status: 400 });
    }
    console.error("Generate Report POST Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to compile security report" } }, { status: 500 });
  }
}
