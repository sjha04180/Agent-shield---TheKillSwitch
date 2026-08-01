import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { ValidationLog } from "@/models/ValidationLog";
import { AIService } from "@/services/ai/aiService";

export async function POST() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();

    // Query validation logs generated in last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await ValidationLog.find({ timestamp: { $gte: yesterday } });

    const totalCount = logs.length;
    const blockedCount = logs.filter(l => l.status === "Blocked").length;
    const reviewCount = logs.filter(l => l.status === "Pending Manual Review").length;

    const queryPrompt = `Generate a security status executive summary for the last 24 hours.
Metrics summary:
- Total verification requests: ${totalCount}
- Blocked actions: ${blockedCount}
- Flagged manual overrides: ${reviewCount}
Formulate a professional summary detailing threat vectors, system status, and operations performance.`;

    const summary = await AIService.generateCompletion(session.user.id, queryPrompt, "default");

    return NextResponse.json({ success: true, data: summary });

  } catch (error) {
    console.error("AI Executive Summary error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to compile executive summary" } }, { status: 500 });
  }
}
