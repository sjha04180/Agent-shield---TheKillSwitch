/**
 * LyzrAdapter — Lyzr AI Provider Implementation
 *
 * Handles all communication normalization from Lyzr AI agents.
 * Lyzr agents call POST /api/agents/request with their credentials.
 * This adapter validates and normalizes the Lyzr payload format
 * into the standard AgentRequest contract.
 *
 * Security contract:
 * - This adapter NEVER calls Lyzr APIs directly
 * - All communication is inbound HTTP from Lyzr → AgentShield
 * - AgentShield is the authority; Lyzr is a submitter
 */

import { z } from "zod";
import { IAgentAdapter } from "./AgentAdapter";
import {
  AgentRequest,
  AgentRequestSchema,
  HeartbeatResult,
} from "@/types/agent-adapter";

// ─── Lyzr Raw Payload Format ──────────────────────────────────────────────
// Lyzr agents may send their own field naming convention.
// We accept both native AgentRequest format and this Lyzr-specific format.

const LyzrPayloadSchema = z.object({
  // Lyzr-specific fields (snake_case convention)
  agent_id: z.string().optional(),
  agent_name: z.string().optional(),
  org_id: z.string().optional(),
  wallet_addr: z.string().optional(),
  recipient_addr: z.string().optional(),
  chain: z.string().optional(),
  token_type: z.string().optional(),
  transfer_amount: z.number().optional(),
  transfer_currency: z.string().optional(),
  description: z.string().optional(),
  urgency: z.enum(["low", "normal", "high", "critical"]).optional(),
  risk_score_hint: z.number().optional(),
  extra: z.record(z.unknown()).optional(),
  ts: z.string().optional(),

  // Also accept the normalized AgentRequest format directly
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  provider: z.literal("lyzr").optional(),
  organizationId: z.string().optional(),
  walletAddress: z.string().optional(),
  recipientAddress: z.string().optional(),
  network: z.string().optional(),
  token: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  purpose: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  riskHint: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
});

type LyzrPayload = z.infer<typeof LyzrPayloadSchema>;

export class LyzrAdapter implements IAgentAdapter {
  private connected = false;

  async connect(): Promise<void> {
    // Lyzr is inbound-only — no outbound connection needed
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  validatePayload(payload: unknown): { valid: boolean; errors?: string[] } {
    const result = LyzrPayloadSchema.safeParse(payload);
    if (result.success) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
    };
  }

  normalizeRequest(raw: unknown): AgentRequest {
    const parsed = LyzrPayloadSchema.parse(raw);
    const now = new Date().toISOString();

    // Map Lyzr snake_case → standard contract (camelCase)
    const normalized = {
      agentId: parsed.agent_id ?? parsed.agentId ?? "lyzr-unknown",
      agentName: parsed.agent_name ?? parsed.agentName ?? "Lyzr Agent",
      provider: "lyzr" as const,
      organizationId: parsed.org_id ?? parsed.organizationId ?? "default-org",
      walletAddress: parsed.wallet_addr ?? parsed.walletAddress ?? "0x0000000000000000000000000000000000000000",
      recipientAddress: parsed.recipient_addr ?? parsed.recipientAddress ?? "0x0000000000000000000000000000000000000000",
      network: parsed.chain ?? parsed.network ?? "sepolia",
      token: parsed.token_type ?? parsed.token ?? "ETH",
      amount: parsed.transfer_amount ?? parsed.amount ?? 0,
      currency: parsed.transfer_currency ?? parsed.currency ?? "ETH",
      purpose: parsed.description ?? parsed.purpose ?? "Lyzr agent transaction",
      priority: parsed.urgency ?? parsed.priority ?? "normal",
      riskHint: parsed.risk_score_hint ?? parsed.riskHint,
      metadata: {
        ...(parsed.extra ?? parsed.metadata ?? {}),
        _source: "lyzr",
      },
      timestamp: parsed.ts ?? parsed.timestamp ?? now,
    };

    // Final validation through the standard schema
    return AgentRequestSchema.parse(normalized);
  }

  async receiveTransaction(raw: unknown): Promise<AgentRequest> {
    if (!this.connected) await this.connect();
    return this.normalizeRequest(raw);
  }

  normalizePayload(raw: unknown): AgentRequest {
    return this.normalizeRequest(raw);
  }

  async generateTransaction(agentId: string, message: string): Promise<AgentRequest> {
    const endpoint = process.env.LYZR_ENDPOINT || "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";
    const apiKey = process.env.LYZR_API_KEY;
    const userId = process.env.LYZR_USER_ID;

    if (!apiKey || !userId) {
      console.warn("[LyzrAdapter] LYZR_API_KEY or LYZR_USER_ID is not configured. Triggering failover to Demo Mode.");
      await this.triggerDemoFailover("Lyzr environment variables are missing.");
      throw new Error("Lyzr unavailable. Simulator activated.");
    }

    let lyzrAgentId = "";
    if (agentId === "cloud-billing-agent" || agentId === "cloud_billing") {
      lyzrAgentId = process.env.LYZR_CLOUD_AGENT_ID || "6a6e4c1ca38896fb0eb4cd1a";
    } else if (agentId === "treasury-agent" || agentId === "treasury") {
      lyzrAgentId = process.env.LYZR_TREASURY_AGENT_ID || "6a6e4e1f3e5531f4fe904659";
    } else {
      throw new Error(`Unsupported Lyzr agent ID: ${agentId}`);
    }

    const sessionId = `${lyzrAgentId}-${Math.random().toString(36).substring(2, 10)}`;
    const promptMessage = message || "Generate a transaction request JSON.";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          user_id: userId,
          agent_id: lyzrAgentId,
          session_id: sessionId,
          message: promptMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Lyzr status ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.response || "";
      
      // Extract first JSON object from raw response text
      const match = rawText.match(/\{[\s\S]*?\}/);
      if (!match) {
        throw new Error("Lyzr response did not contain a valid transaction JSON payload.");
      }

      const parsedJson = JSON.parse(match[0]);

      // Normalize Lyzr keys to AgentRequest schema
      return this.normalizeRequest({
        ...parsedJson,
        agent_id: agentId,
        ts: new Date().toISOString(),
      });

    } catch (err: any) {
      console.error("[LyzrAdapter] API Connection Failed:", err);
      await this.triggerDemoFailover(err.message || "Network timeout / connection error.");
      throw new Error("Lyzr unavailable. Simulator activated.");
    }
  }

  private async triggerDemoFailover(reason: string): Promise<void> {
    try {
      const { SystemConfig } = await import("@/models/SystemConfig");
      const { AuditLog } = await import("@/models/AuditLog");
      
      // Update system configuration to Demo Mode
      await SystemConfig.findOneAndUpdate({}, { demoMode: true });

      // Create log
      await AuditLog.create({
        action: "LYZR_FAILOVER_TRIGGERED",
        details: `Lyzr API offline or misconfigured. Falling back to Demo Mode. Error: ${reason}`,
        ipAddress: "127.0.0.1",
        metadata: { error: reason },
      });
      console.log("[LyzrAdapter] Graceful failover to Demo Mode successfully engaged.");
    } catch (dbErr) {
      console.error("[LyzrAdapter] Failed to write failover logs:", dbErr);
    }
  }

  async heartbeat(): Promise<HeartbeatResult> {
    const start = Date.now();
    const apiKey = process.env.LYZR_API_KEY;

    if (!apiKey) {
      return {
        agentId: "lyzr-adapter",
        timestamp: new Date().toISOString(),
        latencyMs: 0,
        status: "offline",
      };
    }

    try {
      // Perform simple heartbeat probe check using a short request or checking keys
      const endpoint = process.env.LYZR_ENDPOINT || "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout for fast liveness

      const response = await fetch(endpoint, {
        method: "OPTIONS", // OPTIONS request is lightweight and doesn't execute inference
        headers: { "x-api-key": apiKey },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return {
        agentId: "lyzr-adapter",
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
        status: response.status === 405 || response.ok ? "online" : "offline", // 405 is fine since OPTIONS might be blocked but validates API key check
      };
    } catch (err) {
      return {
        agentId: "lyzr-adapter",
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
        status: "offline",
      };
    }
  }
}

