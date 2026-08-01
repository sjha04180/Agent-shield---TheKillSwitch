import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Agent } from "@/models/Agent";
import { Policy } from "@/models/Policy";
import { Wallet } from "@/models/Wallet";
import { evaluatePolicy } from "@/services/engine/policyEngine";
import { signTransactionPayload } from "@/utils/signatures";
import { BlockchainTransaction } from "@/models/BlockchainTransaction";

const executeTxSchema = z.object({
  agentId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  walletId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  target: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  value: z.string().nonempty(), // in wei
  data: z.string().default("0x"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const parsed = executeTxSchema.parse(body);

    const agent = await Agent.findById(parsed.agentId);
    if (!agent) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Agent not found" } }, { status: 404 });
    }

    const wallet = await Wallet.findById(parsed.walletId);
    if (!wallet) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Wallet not found" } }, { status: 404 });
    }

    // Evaluate policies off-chain
    const policy = await Policy.findById(agent.policyId);
    if (!policy) {
      return NextResponse.json({
        success: false,
        error: { code: "NO_POLICY", message: "Configure and assign a policy ruleset to this agent first." }
      }, { status: 400 });
    }

    // Convert value in wei to human-readable ETH for policy checking
    const ethAmount = Number(parsed.value) / 1e18;

    const validation = await evaluatePolicy(agent._id.toString(), wallet._id.toString(), {
      to: parsed.target,
      amount: ethAmount,
      token: "ETH",
      network: agent.network
    }, policy);

    if (validation.decision === "Blocked") {
      return NextResponse.json({
        success: false,
        error: { code: "POLICY_BLOCKED", message: `Transaction Blocked: ${validation.reason}`, details: validation.ruleResults }
      }, { status: 403 });
    }

    // 2. approved -> Generate Auth Signature
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity
    
    // Fetch mock/real wallet nonce from DB
    const txCount = await BlockchainTransaction.countDocuments({ walletAddress: wallet.address });
    const nonce = txCount;

    // Generate ECDSA signature
    const signature = await signTransactionPayload(
      agent.address || "0x2563EB0000000000000000000000000000000001", // fallback agent contract address
      wallet.address,
      parsed.target,
      parsed.value,
      parsed.data,
      nonce,
      deadline
    );

    // Write a pending BlockchainTransaction registry log
    const simulatedTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
    const bTx = await BlockchainTransaction.create({
      hash: simulatedTxHash,
      blockNumber: Math.floor(Math.random() * 100000) + 12000000,
      gasUsed: "45000",
      status: "success",
      walletAddress: wallet.address,
      agentId: agent._id,
      policyId: policy._id,
      actionType: "Native Transfer",
    });

    return NextResponse.json({
      success: true,
      data: {
        status: validation.decision,
        signature,
        nonce,
        deadline,
        target: parsed.target,
        value: parsed.value,
        data: parsed.data,
        txHash: bTx.hash
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid execute parameters", details: error.errors } }, { status: 400 });
    }
    console.error("Blockchain execution error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to sign blockchain execution" } }, { status: 500 });
  }
}
