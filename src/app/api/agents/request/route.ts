import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/dbConnect";
import { getAdapter } from "@/services/agents/AgentAdapter";
import { guardRequest } from "@/services/agents/promptGuard";
import { processTransactionRequest } from "@/services/policy/pipelineService";
import { AgentCredentials } from "@/models/AgentCredentials";

const RequestSchema = z.object({
  agentId: z.string().min(1),
  agentName: z.string().optional(),
  provider: z.enum(["lyzr", "simulator", "future"]),
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

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  try {
    await dbConnect();

    // 1. Extract credentials from headers
    const agentId = req.headers.get("x-agent-id");
    const agentToken = req.headers.get("x-agent-token");

    if (!agentId || !agentToken) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: "Missing X-Agent-Id or X-Agent-Token headers.",
        },
        { status: 401 }
      );
    }

    // 2. Query AgentCredentials validation check
    const credential = await AgentCredentials.findOne({ agentId, status: "active" });
    if (!credential || credential.agentToken !== agentToken) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: "Unauthorized: Invalid agentId or agentToken.",
        },
        { status: 401 }
      );
    }

    // 3. Parse request body
    const body = await req.json();
    const parsedBody = RequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: "Invalid request schema.",
          errors: parsedBody.error.errors,
        },
        { status: 400 }
      );
    }

    // 4. Prompt injection guard
    const guard = guardRequest(
      parsedBody.data.purpose ?? "",
      parsedBody.data.metadata as Record<string, unknown> | undefined
    );
    if (!guard.safe) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: "Policy violation detected. Request rejected.",
          detail: guard.threat,
        },
        { status: 400 }
      );
    }

    // 5. Normalize via provider adapter
    const provider = parsedBody.data.provider;
    const adapter = await getAdapter(provider);
    await adapter.connect();

    let normalizedPayload;
    try {
      normalizedPayload = await adapter.receiveTransaction({
        ...parsedBody.data,
        agentId,
      });
    } catch (normErr) {
      return NextResponse.json(
        {
          status: "BLOCKED",
          risk: 100,
          reason: `Payload normalization failed: ${normErr instanceof Error ? normErr.message : "Unknown"}`,
        },
        { status: 400 }
      );
    } finally {
      await adapter.disconnect();
    }

    // 6. Route through unified pipeline service
    const result = await processTransactionRequest(
      normalizedPayload,
      { token: agentToken, bypassAuth: true }, // Auth check is already performed at step 2 above
      ip
    );

    // Map status response
    if (result.status === "APPROVED") {
      return NextResponse.json({
        status: "APPROVED",
        transactionId: result.transactionId,
        risk: result.risk,
        reason: result.reason,
        explanation: result.explanation,
        ruleResults: result.ruleResults,
      });
    } else if (result.status === "PENDING_REVIEW") {
      return NextResponse.json({
        status: "PENDING_REVIEW",
        risk: result.risk,
        reason: result.reason,
        explanation: result.explanation,
        ruleResults: result.ruleResults,
      });
    } else {
      return NextResponse.json({
        status: "BLOCKED",
        risk: result.risk,
        reason: result.reason,
        explanation: result.explanation,
        ruleResults: result.ruleResults,
      });
    }

  } catch (error) {
    console.error("[/api/agents/request] Error in request route:", error);
    return NextResponse.json(
      {
        status: "BLOCKED",
        risk: 100,
        reason: error instanceof Error ? error.message : "Internal governance error.",
      },
      { status: 500 }
    );
  }
}
