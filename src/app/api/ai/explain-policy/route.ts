import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { ValidationLog } from "@/models/ValidationLog";
import { AIService } from "@/services/ai/aiService";

const schema = z.object({
  logId: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const parsed = schema.parse(body);

    const log = await ValidationLog.findById(parsed.logId)
      .populate("agentId", "name")
      .populate("policyId", "name");

    if (!log) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Log record not found" } }, { status: 404 });
    }

    const queryPrompt = `Explain why the transaction (ID: ${log.transactionId}) was evaluated as "${log.status}".
Recipient address: ${log.recipient}.
Amount: ${log.amount} ${log.token}.
Calculated Risk Score: ${log.riskScore}/100.
Triggered Rules Summary:
${log.rulesTriggered.map(r => `- Rule: "${r.ruleName}" | Status: ${r.status} | Details: ${r.message}`).join("\n")}
Explain the violations and provide security suggestions.`;

    const explanation = await AIService.generateCompletion(session.user.id, queryPrompt, "explain_policy");

    return NextResponse.json({ success: true, data: explanation });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload parameters", details: error.errors } }, { status: 400 });
    }
    console.error("AI Explain Policy error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to generate policy analysis" } }, { status: 500 });
  }
}
