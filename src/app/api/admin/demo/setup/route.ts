import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Organization } from "@/models/Organization";
import { Wallet } from "@/models/Wallet";
import { Agent } from "@/models/Agent";
import { Policy } from "@/models/Policy";
import { ConnectedAgent } from "@/models/ConnectedAgent";
import { AgentMetrics } from "@/models/AgentMetrics";
import { AgentActivity } from "@/models/AgentActivity";
import { AuditLog } from "@/models/AuditLog";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    await dbConnect();

    // 1. Check if organization already exists, if so skip or return
    let org = await Organization.findOne({ name: "Nova Finance" });
    if (!org) {
      org = await Organization.create({
        name: "Nova Finance",
        industry: "Financial & AI Tech",
        country: "Singapore",
        status: "active",
        walletCount: 1,
        agentCount: 3,
        riskScore: 10,
      });
    }

    // 2. Create Governance Policy
    let policy = await Policy.findOne({ name: "Enterprise Strict Governance" });
    if (!policy) {
      policy = await Policy.create({
        name: "Enterprise Strict Governance",
        description: "Strict limits caping, weekend bans, blacklisted addresses, and risk threshold checks.",
        status: "active",
        createdBy: session.user.id,
        maxSingleTx: 2.0, // 2.0 ETH single limit
        maxDailySpent: 5.0, // 5.0 ETH daily cap
        maxWeeklySpent: 15.0,
        maxMonthlySpent: 50.0,
        allowedWallets: [],
        blockedWallets: ["0x000000000000000000000000000000000000dead"],
        allowedContracts: [],
        blockedContracts: ["0x000000000000000000000000000000000000dead"],
        allowedTokens: ["ETH", "USDC"],
        blockedTokens: ["USDT"],
        allowedNetworks: [11155111, 8453], // Sepolia & Base
        businessHoursOnly: false,
        businessStartHour: 9,
        businessEndHour: 17,
        weekdaysOnly: false,
        noWeekends: false, // Set weekend bans false for demo flexibility, can toggle inside scenario
        timezone: "UTC",
        maxRiskScore: 75,
        requireManualApproval: false,
        emergencyFreezeEnabled: true,
        killSwitchEnabled: true,
        autoPauseAgent: true,
        autoLockWallet: true,
      });
    }

    // 3. Create Governed smart wallet
    let wallet = await Wallet.findOne({ address: "0x742d35cc6634c0532925a3b844bc454e4438f44e" });
    if (!wallet) {
      wallet = await Wallet.create({
        ownerId: session.user.id,
        address: "0x742d35cc6634c0532925a3b844bc454e4438f44e",
        name: "Enterprise smart Treasury",
        chainId: 11155111,
        walletType: "ERC4337",
        status: "active",
      });
    }

    // 4. Create local governed agents
    const demoAgents = [
      { id: "payroll-agent", name: "Payroll Agent", role: "payroll" },
      { id: "marketing-agent", name: "Marketing Agent", role: "marketing" },
      { id: "research-agent", name: "Research Agent", role: "research" },
    ];

    for (const item of demoAgents) {
      let agent = await Agent.findOne({ name: item.name, ownerId: session.user.id });
      if (!agent) {
        const rawApiKey = `agentshield_sk_${crypto.randomBytes(24).toString("hex")}`;
        const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

        agent = await Agent.create({
          ownerId: session.user.id,
          walletId: wallet._id,
          name: item.name,
          description: `Autonomous agent doing corporate ${item.role} operations.`,
          purpose: `Corporate auto-${item.role} executions.`,
          network: "Sepolia",
          spendingLimit: 2.0,
          status: "active",
          riskLevel: "low",
          allowedTokens: ["ETH", "USDC"],
          policyId: policy._id,
          apiKeyHash,
        });

        // Seed initial activity
        await AgentActivity.create({
          agentId: agent._id,
          activityType: "CREATED",
          details: `Agent ${agent.name} initialized and attached to policy ${policy.name}`,
          metadata: { createdBy: session.user.id },
        });

        // Initialize metrics
        await AgentMetrics.create({
          agentId: agent._id,
          requestsToday: 0,
          approvedCount: 0,
          rejectedCount: 0,
          blockedCount: 0,
          successRate: 100,
          averageRequestAmount: 0,
        });
      }

      // 5. Setup adapter link for the simulator tick
      let connectedAgent = await ConnectedAgent.findOne({ agentId: item.id });
      if (!connectedAgent) {
        const token = `${item.id}-secret-token`;
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        await ConnectedAgent.create({
          agentId: item.id,
          agentName: item.name,
          provider: "simulator",
          organizationId: "agentshield-org",
          secretTokenHash: tokenHash,
          role: item.role,
          status: "online",
          linkedAgentId: agent._id,
          lastSeen: new Date(),
        });
      }
    }

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    await AuditLog.create({
      userId: session.user.id,
      action: "DEMO_ENVIRONMENT_SETUP",
      details: "Initialized demo organization, strict policies, wallets, and running agents.",
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "Demo assets seeded successfully." });

  } catch (error) {
    console.error("Demo setup error:", error);
    return NextResponse.json({ success: false, error: "Failed to setup demo assets" }, { status: 500 });
  }
}
