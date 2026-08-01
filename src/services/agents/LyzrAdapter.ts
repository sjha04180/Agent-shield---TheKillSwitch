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

  async heartbeat(): Promise<HeartbeatResult> {
    const start = Date.now();
    // Lyzr heartbeat: we just confirm our adapter is alive
    // Real latency measurement would ping Lyzr's status API if available
    await Promise.resolve(); // simulate async
    const latencyMs = Date.now() - start;

    return {
      agentId: "lyzr-adapter",
      timestamp: new Date().toISOString(),
      latencyMs,
      status: "online",
    };
  }
}
