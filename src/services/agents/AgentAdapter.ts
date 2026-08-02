/**
 * AgentAdapter — Base Interface & Provider Factory
 *
 * Every AI agent provider (Lyzr, Simulator, future) must implement IAgentAdapter.
 * The rest of the application communicates ONLY through this interface.
 * Direct calls to Lyzr APIs or simulator internals are forbidden outside adapters.
 */

import { AgentRequest, AgentProvider, HeartbeatResult } from "@/types/agent-adapter";

// ─── Interface ──────────────────────────────────────────────────────────────

export interface IAgentAdapter {
  /** Establish connection to the provider (register session, init auth, etc.) */
  connect(): Promise<void>;

  /** Release connection cleanly */
  disconnect(): Promise<void>;

  /**
   * Ingest a raw inbound request from the provider and return a normalized
   * AgentRequest ready for the governance pipeline.
   */
  receiveTransaction(raw: unknown): Promise<AgentRequest>;

  /**
   * Validate a raw payload against the provider's expected schema.
   * Returns { valid: true } or { valid: false, errors: [...] }
   */
  validatePayload(payload: unknown): { valid: boolean; errors?: string[] };

  /**
   * Normalize a provider-specific payload into the standard AgentRequest contract.
   * Throws if normalization is not possible.
   */
  normalizeRequest(raw: unknown): AgentRequest;

  /**
   * Normalize a provider-specific payload into the standard AgentRequest contract.
   * Alias for normalizeRequest.
   */
  normalizePayload(raw: unknown): AgentRequest;

  /**
   * Perform a liveness check. Should update lastSeen in ConnectedAgent.
   * Returns HeartbeatResult with measured latency.
   */
  heartbeat(): Promise<HeartbeatResult>;

  /**
   * Proactively request the AI agent to generate a transaction proposal.
   */
  generateTransaction(agentId: string, message: string): Promise<AgentRequest>;
}

// ─── Factory ──────────────────────────────────────────────────────────────

/**
 * Factory function: returns the correct adapter implementation for a given provider.
 * Adding a new provider requires only adding a new case here and implementing IAgentAdapter.
 */
export async function getAdapter(provider: AgentProvider): Promise<IAgentAdapter> {
  switch (provider) {
    case "lyzr": {
      const { LyzrAdapter } = await import("./LyzrAdapter");
      return new LyzrAdapter();
    }
    case "simulator": {
      const { SimulatorAdapter } = await import("./SimulatorAdapter");
      return new SimulatorAdapter();
    }
    case "future": {
      const { FutureAdapter } = await import("./FutureAdapter");
      return new FutureAdapter();
    }
    default: {
      throw new Error(`Unknown provider: ${provider}. No adapter registered.`);
    }
  }
}
