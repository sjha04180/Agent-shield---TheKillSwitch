/**
 * SimulatorAdapter — Internal AI Agent Simulator
 *
 * Generates realistic transaction proposals for 5 internal agents:
 *
 *   Live Agents (provider: lyzr but run internally here for demo):
 *   1. Cloud Billing Agent — AWS/Azure/GCP/OpenAI/Gemini billing
 *   2. Treasury Agent      — Vendor payments, large fund transfers
 *
 *   Simulator-Only Agents:
 *   3. Payroll Agent       — Employee payroll processing
 *   4. Marketing Agent     — Campaign spend, ad budget
 *   5. Research Agent      — Compute infra, API credits
 *
 * Each agent has a behavior profile that controls how much it
 * requests, how often, and what recipients it targets.
 */

import crypto from "crypto";
import { IAgentAdapter } from "./AgentAdapter";
import {
  AgentRequest,
  AgentRequestSchema,
  HeartbeatResult,
} from "@/types/agent-adapter";

// ─── Agent Profiles ─────────────────────────────────────────────────────────

export interface AgentProfile {
  agentId: string;
  agentName: string;
  role: string;
  organizationId: string;
  network: string;
  token: string;
  /** Typical transaction range [min, max] in ETH */
  amountRange: [number, number];
  /** Known recipient addresses for this agent */
  recipients: string[];
  /** Transaction purpose templates */
  purposes: string[];
  /** Base risk hint range [min, max] */
  riskHintRange: [number, number];
}

export const SIMULATOR_AGENTS: AgentProfile[] = [
  {
    agentId: "cloud-billing-agent",
    agentName: "Cloud Billing Agent",
    role: "cloud_billing",
    organizationId: "agentshield-org",
    network: "sepolia",
    token: "ETH",
    amountRange: [0.01, 2.5],
    recipients: [
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "0x1234567890AbcdEF1234567890AbCDef12345678",
    ],
    purposes: [
      "AWS Monthly Invoice Payment — EC2 + S3 usage",
      "Azure Subscription Renewal — Compute tier",
      "Google Cloud Platform billing — BigQuery usage",
      "OpenAI API Credits refill — GPT-4o quota",
      "Gemini API Credits — Vertex AI usage",
      "Cloudflare Pro Plan renewal",
      "Vercel Pro Team subscription",
    ],
    riskHintRange: [5, 35],
  },
  {
    agentId: "treasury-agent",
    agentName: "Treasury Agent",
    role: "treasury",
    organizationId: "agentshield-org",
    network: "sepolia",
    token: "ETH",
    amountRange: [0.5, 15.0],
    recipients: [
      "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
      "0x9876543210fEdCbA9876543210FedCBA98765432",
    ],
    purposes: [
      "Vendor payment — SaaS licensing quarterly",
      "Treasury transfer to reserve wallet",
      "Large fund allocation — infrastructure budget",
      "Inter-org settlement — Q4 reconciliation",
      "Reserve wallet top-up — liquidity management",
    ],
    riskHintRange: [20, 65],
  },
  {
    agentId: "payroll-agent",
    agentName: "Payroll Agent",
    role: "payroll",
    organizationId: "agentshield-org",
    network: "sepolia",
    token: "ETH",
    amountRange: [0.1, 5.0],
    recipients: [
      "0xDeAdBeEf000000000000000000000000DeAdBeEf",
      "0x1111111111111111111111111111111111111111",
    ],
    purposes: [
      "Monthly payroll disbursement — engineering team",
      "Contractor payment — design sprint",
      "Payroll tax settlement — Q1",
      "Employee bonus distribution — performance cycle",
    ],
    riskHintRange: [10, 40],
  },
  {
    agentId: "marketing-agent",
    agentName: "Marketing Agent",
    role: "marketing",
    organizationId: "agentshield-org",
    network: "sepolia",
    token: "ETH",
    amountRange: [0.05, 3.0],
    recipients: [
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
    ],
    purposes: [
      "Google Ads campaign budget — product launch",
      "LinkedIn sponsored content — enterprise outreach",
      "Twitter/X ad spend — developer campaign",
      "Influencer partnership payment",
      "Content agency retainer — monthly",
    ],
    riskHintRange: [5, 30],
  },
  {
    agentId: "research-agent",
    agentName: "Research Agent",
    role: "research",
    organizationId: "agentshield-org",
    network: "sepolia",
    token: "ETH",
    amountRange: [0.02, 1.5],
    recipients: [
      "0x4444444444444444444444444444444444444444",
      "0x5555555555555555555555555555555555555555",
    ],
    purposes: [
      "GPU compute cluster — model training run",
      "Research paper license access — IEEE",
      "Dataset purchase — NLP benchmark",
      "Compute credits — Colab Pro subscription",
      "API credits — specialized ML endpoint",
    ],
    riskHintRange: [5, 25],
  },
];

// ─── Helper Utilities ────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10000) / 10000;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── SimulatorAdapter ────────────────────────────────────────────────────────

export class SimulatorAdapter implements IAgentAdapter {
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  validatePayload(payload: unknown): { valid: boolean; errors?: string[] } {
    if (typeof payload !== "object" || payload === null) {
      return { valid: false, errors: ["Payload must be a JSON object"] };
    }
    const p = payload as Record<string, unknown>;
    if (!p.agentId || typeof p.agentId !== "string") {
      return { valid: false, errors: ["agentId is required for simulator"] };
    }
    const known = SIMULATOR_AGENTS.map((a) => a.agentId);
    if (!known.includes(p.agentId as string)) {
      return { valid: false, errors: [`Unknown simulator agentId: ${p.agentId}`] };
    }
    return { valid: true };
  }

  normalizeRequest(raw: unknown): AgentRequest {
    const p = raw as Record<string, unknown>;
    const agentId = p.agentId as string;
    const profile = SIMULATOR_AGENTS.find((a) => a.agentId === agentId);
    if (!profile) throw new Error(`Simulator agent not found: ${agentId}`);

    // Generate a realistic transaction from the profile
    const amount =
      typeof p.amount === "number"
        ? p.amount
        : randomBetween(...profile.amountRange);

    const recipientAddress =
      typeof p.recipientAddress === "string"
        ? p.recipientAddress
        : pickRandom(profile.recipients);

    const purpose =
      typeof p.purpose === "string" ? p.purpose : pickRandom(profile.purposes);

    const riskHint =
      typeof p.riskHint === "number"
        ? p.riskHint
        : randomBetween(...profile.riskHintRange);

    const normalized = {
      agentId: profile.agentId,
      agentName: profile.agentName,
      provider: "simulator" as const,
      organizationId: profile.organizationId,
      walletAddress:
        typeof p.walletAddress === "string"
          ? p.walletAddress
          : "0x0000000000000000000000000000000000000001",
      recipientAddress,
      network: profile.network,
      token: profile.token,
      amount,
      currency: profile.token,
      purpose,
      priority: (p.priority as AgentRequest["priority"]) ?? "normal",
      riskHint,
      metadata: {
        _source: "simulator",
        role: profile.role,
        simulatedAt: new Date().toISOString(),
        ...(typeof p.metadata === "object" && p.metadata !== null ? p.metadata : {}),
      },
      timestamp: typeof p.timestamp === "string" ? p.timestamp : new Date().toISOString(),
    };

    return AgentRequestSchema.parse(normalized);
  }

  async receiveTransaction(raw: unknown): Promise<AgentRequest> {
    if (!this.connected) await this.connect();
    const validation = this.validatePayload(raw);
    if (!validation.valid) {
      throw new Error(`Simulator payload invalid: ${validation.errors?.join(", ")}`);
    }
    return this.normalizeRequest(raw);
  }

  async heartbeat(): Promise<HeartbeatResult> {
    return {
      agentId: "simulator-adapter",
      timestamp: new Date().toISOString(),
      latencyMs: Math.floor(Math.random() * 5), // simulator is always local
      status: "online",
    };
  }

  /**
   * Generate a single random transaction request for any of the 5 simulator agents.
   * Used by the `/api/simulator/tick` endpoint for auto-simulation.
   */
  generateRandomRequest(walletAddress: string): AgentRequest {
    const profile = pickRandom(SIMULATOR_AGENTS);
    return this.normalizeRequest({
      agentId: profile.agentId,
      walletAddress,
    });
  }

  /**
   * Returns the static list of simulator agent profiles.
   */
  getAgentProfiles(): AgentProfile[] {
    return SIMULATOR_AGENTS;
  }
}
