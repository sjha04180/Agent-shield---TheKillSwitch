import { z } from "zod";

// ─── Supported Providers ───────────────────────────────────────────────────

export const PROVIDERS = ["lyzr", "simulator", "future"] as const;
export type AgentProvider = (typeof PROVIDERS)[number];

export const AGENT_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export type AgentPriority = (typeof AGENT_PRIORITIES)[number];

// ─── Standard Inbound Request Contract ─────────────────────────────────────
// Every agent — whether Lyzr, Simulator, or future provider — must normalize
// its payload into this schema before the governance pipeline can process it.

export const AgentRequestSchema = z.object({
  agentId: z.string().min(1, "agentId is required"),
  agentName: z.string().min(1, "agentName is required"),
  provider: z.enum(PROVIDERS),
  organizationId: z.string().min(1, "organizationId is required"),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM wallet address"),
  recipientAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM recipient address"),
  network: z.string().min(1, "network is required"),
  token: z.string().default("ETH"),
  amount: z.number().positive("amount must be > 0"),
  currency: z.string().default("ETH"),
  purpose: z.string().min(3, "purpose must be at least 3 characters"),
  priority: z.enum(AGENT_PRIORITIES).default("normal"),
  riskHint: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
  timestamp: z.string().datetime({ message: "timestamp must be ISO 8601" }),
});

export type AgentRequest = z.infer<typeof AgentRequestSchema>;

// ─── Standard Outbound Response Contract ───────────────────────────────────

export interface AgentResponseApproved {
  status: "APPROVED";
  transactionId: string;
  risk: number;
  reason: string;
  ruleResults?: RuleResult[];
}

export interface AgentResponseBlocked {
  status: "BLOCKED";
  risk: number;
  reason: string;
  ruleResults?: RuleResult[];
}

export interface AgentResponsePending {
  status: "PENDING_REVIEW";
  risk: number;
  reason: string;
  ruleResults?: RuleResult[];
}

export type AgentResponse =
  | AgentResponseApproved
  | AgentResponseBlocked
  | AgentResponsePending;

// ─── Rule Result (mirrors governance engine output) ────────────────────────

export interface RuleResult {
  ruleName: string;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
}

// ─── Heartbeat ─────────────────────────────────────────────────────────────

export interface HeartbeatResult {
  agentId: string;
  timestamp: string;
  latencyMs: number;
  status: "online" | "offline";
}

// ─── Provider Health ────────────────────────────────────────────────────────

export type ServiceStatus = "healthy" | "unstable" | "down";

export interface SystemHealthSnapshot {
  mongodb: ServiceStatus;
  gemini: ServiceStatus;
  lyzr: ServiceStatus;
  blockchain: ServiceStatus;
  metaMask: ServiceStatus;
  simulator: ServiceStatus;
  version: string;
  apiLatencyMs: number;
  timestamp: string;
}

// ─── Connected Agent Info (for dashboard) ───────────────────────────────────

export interface ConnectedAgentInfo {
  agentId: string;
  agentName: string;
  provider: AgentProvider;
  status: "online" | "offline" | "disconnected" | "disabled";
  requestsToday: number;
  approvedCount: number;
  blockedCount: number;
  pendingCount: number;
  averageRisk: number;
  lastSeen: string;
  latencyMs: number;
}
