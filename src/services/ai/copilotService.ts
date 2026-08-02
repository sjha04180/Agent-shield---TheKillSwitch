import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

export async function explainDecision(
  decision: "Approved" | "Blocked" | "Pending Manual Review",
  reason: string,
  riskScore: number,
  factors: string[],
  amount: number,
  token: string
): Promise<string> {
  // If no API key or in a simulated test environment, fallback to deterministic string
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "dummy_key") {
    return `Deterministic Fallback: Transaction was ${decision}. Reason: ${reason}. Risk Score: ${riskScore}. Factors: ${factors.join(", ") || "None"}.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
    You are AgentShield's AI Copilot, a security assistant for an Enterprise AI Wallet Governance Platform.
    A transaction of ${amount} ${token} was recently evaluated by the Policy and Risk Engines.
    
    Decision: ${decision}
    Risk Score: ${riskScore} (0-100 scale)
    Core Reason: ${reason}
    Triggered Risk Factors: ${factors.length > 0 ? factors.join(", ") : "None"}
    
    Provide a concise, professional explanation of why this transaction was ${decision.toLowerCase()}, highlighting the risks or policy violations if any. Finally, provide 1 actionable recommendation.
    Keep the response under 4 sentences. Do not use markdown formatting.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("[CopilotService] Gemini generation failed, falling back to deterministic explanation:", error);
    return `Fallback: Transaction was ${decision}. Reason: ${reason}. Risk Score: ${riskScore}.`;
  }
}
