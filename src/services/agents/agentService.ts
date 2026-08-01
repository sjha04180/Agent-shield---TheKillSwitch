import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { AgentActivity } from "@/models/AgentActivity";
import { AgentMetrics } from "@/models/AgentMetrics";
import { AuditLog } from "@/models/AuditLog";
import crypto from "crypto";

/**
 * Creates a new AI Agent with initial activity log and metrics container.
 */
export async function createAgent(params: {
  ownerId: string;
  walletId: string;
  name: string;
  description: string;
  purpose: string;
  network: string;
  spendingLimit: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  allowedTokens: string[];
  avatar?: string;
  tags?: string[];
}) {
  await dbConnect();

  const rawApiKey = `agentshield_sk_${crypto.randomBytes(24).toString("hex")}`;
  const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

  const agent = await Agent.create({
    ...params,
    status: "draft",
    apiKeyHash,
  });

  await AgentActivity.create({
    agentId: agent._id,
    activityType: "CREATED",
    details: `Agent ${agent.name} deployed as Draft status.`,
    metadata: { createdBy: params.ownerId },
  });

  await AgentMetrics.create({
    agentId: agent._id,
    requestsToday: 0,
    approvedCount: 0,
    rejectedCount: 0,
    blockedCount: 0,
    successRate: 100,
    averageRequestAmount: 0,
  });

  return { agent, rawApiKey };
}

/**
 * Pauses an agent, logging the reason to activity + audit trail.
 */
export async function pauseAgent(
  agentId: string,
  userId: string,
  reason: string,
  ip?: string
) {
  await dbConnect();

  const agent = await Agent.findById(agentId);
  if (!agent) throw new Error("Agent not found");

  agent.status = "paused";
  await agent.save();

  await AgentActivity.create({
    agentId: agent._id,
    activityType: "PAUSED",
    details: `Agent paused. Reason: ${reason}`,
    metadata: { pausedBy: userId },
  });

  await AuditLog.create({
    userId,
    action: "AGENT_PAUSED",
    details: `Agent "${agent.name}" paused. Reason: ${reason}`,
    ipAddress: ip ?? "unknown",
  });

  return agent;
}

/**
 * Resumes a paused agent back to active status.
 */
export async function resumeAgent(agentId: string, userId: string, ip?: string) {
  await dbConnect();

  const agent = await Agent.findById(agentId);
  if (!agent) throw new Error("Agent not found");

  agent.status = "active";
  await agent.save();

  await AgentActivity.create({
    agentId: agent._id,
    activityType: "RESUMED",
    details: "Agent resumed and set to active status.",
    metadata: { resumedBy: userId },
  });

  await AuditLog.create({
    userId,
    action: "AGENT_RESUMED",
    details: `Agent "${agent.name}" resumed.`,
    ipAddress: ip ?? "unknown",
  });

  return agent;
}

/**
 * Permanently deletes an agent and its associated records.
 */
export async function deleteAgent(agentId: string, userId: string, ip?: string) {
  await dbConnect();

  const agent = await Agent.findByIdAndDelete(agentId);
  if (!agent) throw new Error("Agent not found");

  await AgentActivity.deleteMany({ agentId });
  await AgentMetrics.deleteMany({ agentId });

  await AuditLog.create({
    userId,
    action: "AGENT_DELETED",
    details: `Agent "${agent.name}" permanently deleted.`,
    ipAddress: ip ?? "unknown",
  });

  return true;
}

/**
 * Activates a draft agent to live status.
 */
export async function activateAgent(agentId: string, userId: string, ip?: string) {
  await dbConnect();

  const agent = await Agent.findById(agentId);
  if (!agent) throw new Error("Agent not found");

  agent.status = "active";
  await agent.save();

  await AgentActivity.create({
    agentId: agent._id,
    activityType: "ACTIVATED",
    details: "Agent activated to live status.",
    metadata: { activatedBy: userId },
  });

  await AuditLog.create({
    userId,
    action: "AGENT_ACTIVATED",
    details: `Agent "${agent.name}" activated to live.`,
    ipAddress: ip ?? "unknown",
  });

  return agent;
}
