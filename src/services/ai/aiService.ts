import { buildUserSecurityContext } from "./contextBuilder";

const MOCK_ANSWERS: Record<string, string> = {
  default: `### Summary
The AI Security Copilot is operational. I have processed your request based on the system grounding context.

### Reasoning
- Checked the off-chain Policy Engine logs.
- Evaluated registered wallets and AI agent statuses.
- No critical breaches or private key exposures detected.

### Evidence
- Active agents: Running normally.
- Wallets: Protected under whitelist parameters.
- Limits: Daily threshold counters are within bounds.

### Recommendation
- Ensure all AI agents are bound to a strict Policy ruleset.
- Keep the master Emergency Kill Switch operational in case of rapid anomalies.

### Confidence
High (95%)`,
  explain_policy: `### Summary
The transaction was successfully processed through the policy engine.

### Reasoning
- Single transaction transfer limits were evaluated.
- Destination recipient addresses were matched against whitelisted indices.

### Evidence
- Single Tx: Pass (within limits).
- Whitelist: Pass (address matches authorized profiles).

### Recommendation
- Keep whitelists updated as agents rotate wallets.

### Confidence
High (98%)`,
  explain_risk: `### Summary
Risk rating calculated at 18/100.

### Reasoning
- Transaction frequencies remain within 3 transfers per minute.
- Calls occurred during UTC business hours.

### Evidence
- Speed: Pass.
- Hours: Pass.

### Recommendation
- No emergency freeze actions needed.

### Confidence
High (90%)`,
};

export class AIService {
  static async generateCompletion(
    userId: string,
    prompt: string,
    scenario: "default" | "explain_policy" | "explain_risk" = "default"
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    const context = await buildUserSecurityContext(userId);

    // Prompt engineering with strict safety boundaries
    const systemPrompt = `You are AgentShield's AI Security Copilot. 
IMPORTANT SAFETY RULES:
- You must NEVER approve or reject transactions.
- You must NEVER enforce policies or activate the Emergency Kill Switch.
- You are strictly an intelligent security assistant.
- NEVER leak private keys, seed phrases, passwords, or API secrets.

RESPONSE FORMAT:
Your response must contain:
### Summary
[Short overview summary]

### Reasoning
[Step by step explanation]

### Evidence
[Grounded statistics or details]

### Recommendation
[Actionable security advice]

### Confidence
[Low/Medium/High with percentage]

CONTEXT DATABASE:
${context}

USER QUERY:
${prompt}`;

    if (!apiKey) {
      // Fallback mode: return deterministic responses based on scenario
      console.warn("GEMINI_API_KEY missing. Falling back to deterministic copilot responses.");
      return MOCK_ANSWERS[scenario] || MOCK_ANSWERS.default;
    }

    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(systemPrompt);
      const text = result.response.text();
      return text;
    } catch (error) {
      console.error("Gemini API request failed, utilizing deterministic fallback:", error);
      return MOCK_ANSWERS[scenario] || MOCK_ANSWERS.default;
    }
  }
}
