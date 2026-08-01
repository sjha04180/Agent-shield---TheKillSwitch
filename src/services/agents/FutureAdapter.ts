/**
 * FutureAdapter — Placeholder for Future Provider Integrations
 *
 * This stub satisfies the IAgentAdapter interface and ensures that
 * adding a new provider (CrewAI, LangGraph, OpenAI Operator, AutoGen,
 * Claude Agents) requires only implementing this file's methods — no
 * other files need to change.
 *
 * Supported future providers:
 *   - CrewAI       (crew-based multi-agent workflows)
 *   - LangGraph    (state-machine agent graphs)
 *   - OpenAI Operator (GPT-4o function-calling agents)
 *   - AutoGen      (Microsoft multi-agent framework)
 *   - Claude Agents (Anthropic tool-use agents)
 */

import { IAgentAdapter } from "./AgentAdapter";
import {
  AgentRequest,
  AgentRequestSchema,
  HeartbeatResult,
} from "@/types/agent-adapter";

export class FutureAdapter implements IAgentAdapter {
  private connected = false;

  async connect(): Promise<void> {
    // TODO: initialize SDK / credentials for the target provider
    this.connected = true;
    console.warn(
      "[FutureAdapter] connect() called — this is a stub. Implement for your target provider."
    );
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  validatePayload(payload: unknown): { valid: boolean; errors?: string[] } {
    if (typeof payload !== "object" || payload === null) {
      return {
        valid: false,
        errors: [
          "FutureAdapter: payload must be a JSON object. Provider-specific validation not yet implemented.",
        ],
      };
    }
    return { valid: true };
  }

  normalizeRequest(raw: unknown): AgentRequest {
    // TODO: Map provider-specific field names to standard AgentRequest schema
    // For now, attempt direct parse — this will throw if fields are missing
    const p = raw as Record<string, unknown>;
    return AgentRequestSchema.parse({
      ...p,
      provider: "future",
      timestamp: p.timestamp ?? new Date().toISOString(),
      metadata: {
        ...(typeof p.metadata === "object" && p.metadata !== null ? p.metadata : {}),
        _source: "future",
      },
    });
  }

  async receiveTransaction(raw: unknown): Promise<AgentRequest> {
    if (!this.connected) await this.connect();
    const validation = this.validatePayload(raw);
    if (!validation.valid) {
      throw new Error(
        `FutureAdapter payload invalid: ${validation.errors?.join(", ")}`
      );
    }
    return this.normalizeRequest(raw);
  }

  async heartbeat(): Promise<HeartbeatResult> {
    const start = Date.now();
    await Promise.resolve();
    return {
      agentId: "future-adapter",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
      status: this.connected ? "online" : "offline",
    };
  }
}
