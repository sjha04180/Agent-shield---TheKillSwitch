import { dbConnect } from "@/lib/dbConnect";
import { AuditLog } from "@/models/AuditLog";

export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_REGISTER"
  | "AGENT_CREATED"
  | "AGENT_PAUSED"
  | "AGENT_RESUMED"
  | "AGENT_ACTIVATED"
  | "AGENT_DELETED"
  | "AGENT_AUTHENTICATED"
  | "AGENT_AUTH_FAILED"
  | "PROMPT_INJECTION_BLOCKED"
  | "WALLET_CREATED"
  | "WALLET_FROZEN"
  | "WALLET_UNFROZEN"
  | "POLICY_CREATED"
  | "POLICY_UPDATED"
  | "POLICY_DELETED"
  | "KILLSWITCH_ACTIVATE"
  | "KILLSWITCH_DEACTIVATE"
  | "TX_APPROVED"
  | "TX_BLOCKED"
  | "TX_PENDING_REVIEW"
  | "SIMULATION_RUN"
  | "CONTRACT_DEPLOYED"
  | "ADMIN_ACTION";

interface CreateAuditLogParams {
  userId: string;
  action: AuditAction;
  details: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Centralized audit log writer. All sensitive actions in the platform
 * should go through this function to ensure a consistent audit trail.
 */
export async function writeAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await dbConnect();
    await AuditLog.create({
      userId: params.userId,
      action: params.action,
      details: params.details,
      ipAddress: params.ipAddress ?? "unknown",
      metadata: params.metadata ?? {},
    });
  } catch {
    // Audit log failures must never break the primary operation
    // In production, this would go to a dead-letter queue
  }
}

/**
 * Retrieves paginated audit logs for a user or all users (admin).
 */
export async function getAuditLogs(params: {
  userId?: string;
  isAdmin: boolean;
  page?: number;
  limit?: number;
  action?: string;
}) {
  await dbConnect();

  const { userId, isAdmin, page = 1, limit = 50, action } = params;

  const filter: Record<string, unknown> = {};
  if (!isAdmin && userId) filter.userId = userId;
  if (action) filter.action = action;

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
