import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { RiskAnalysis } from "@/models/RiskAnalysis";
import { AIService } from "@/services/ai/aiService";

const schema = z.object({
  riskAnalysisId: z.string().regex(/^[0-9a-fA-F]{24}$/),
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

    const risk = await RiskAnalysis.findById(parsed.riskAnalysisId).populate("agentId", "name");
    if (!risk) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Risk analysis record not found" } }, { status: 404 });
    }

    const queryPrompt = `Provide a threat analysis breakdown for transaction: ${risk.transactionId}.
Agent name: ${(risk.agentId as any)?.name || "Autonomous Bot"}.
Aggregated Risk Score: ${risk.riskScore}/100.
Contributing Risk Factors identified:
${risk.factorsTriggered.map(f => `- Factor: ${f}`).join("\n")}
Elaborate on each factor and recommend hardening fixes.`;

    const explanation = await AIService.generateCompletion(session.user.id, queryPrompt, "explain_risk");

    return NextResponse.json({ success: true, data: explanation });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameter format", details: error.errors } }, { status: 400 });
    }
    console.error("AI Explain Risk error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to generate threat risk breakdown" } }, { status: 500 });
  }
}
