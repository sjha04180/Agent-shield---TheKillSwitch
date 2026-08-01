import { dbConnect } from "@/lib/dbConnect";
import { AgentTransaction } from "@/models/AgentTransaction";
import { ValidationLog, IRuleResult } from "@/models/ValidationLog";
import { RiskAnalysis } from "@/models/RiskAnalysis";
import { KillSwitchEvent } from "@/models/KillSwitchEvent";
import { IPolicy } from "@/models/Policy";
import { calculateRiskScore } from "./riskEngine";

export async function isKillSwitchActive(): Promise<boolean> {
  const lastEvent = await KillSwitchEvent.findOne().sort({ timestamp: -1 });
  return lastEvent?.status === "activated";
}

interface PolicyValidationResult {
  decision: "Approved" | "Blocked" | "Pending Manual Review";
  riskScore: number;
  reason: string;
  ruleResults: IRuleResult[];
}

export async function evaluatePolicy(
  agentId: string,
  walletId: string,
  payload: { to: string; amount: number; token: string; data?: string; network: string },
  policy: IPolicy
): Promise<PolicyValidationResult> {
  await dbConnect();

  const ruleResults: IRuleResult[] = [];
  let finalDecision: "Approved" | "Blocked" | "Pending Manual Review" = "Approved";
  let overallReason = "All policy checks passed.";

  // 1. Global Kill Switch Check (Priority 1)
  const killSwitchActive = await isKillSwitchActive();
  if (killSwitchActive) {
    ruleResults.push({
      ruleName: "Emergency Kill Switch",
      status: "FAIL",
      message: "Global Emergency Kill Switch is ACTIVE. All transactions are blocked."
    });
    return {
      decision: "Blocked",
      riskScore: 100,
      reason: "Emergency Kill Switch is ACTIVE.",
      ruleResults
    };
  } else {
    ruleResults.push({
      ruleName: "Emergency Kill Switch",
      status: "PASS",
      message: "Global Kill Switch is inactive."
    });
  }

  // 2. Risk Scorer Check
  const riskResult = await calculateRiskScore(agentId, payload, policy);
  const riskScore = riskResult.score;

  // Log Risk details to DB
  const transactionId = `0x${crypto.randomUUID().replace(/-/g, "")}`; // temp identifier or standard format
  await RiskAnalysis.create({
    transactionId,
    agentId,
    riskScore,
    factorsTriggered: riskResult.factors
  });

  if (riskScore >= policy.maxRiskScore) {
    ruleResults.push({
      ruleName: "Risk Threshold",
      status: "FAIL",
      message: `Risk score (${riskScore}) exceeds max allowed limit (${policy.maxRiskScore}). Factors: ${riskResult.factors.join(", ")}`
    });
    finalDecision = "Blocked";
    overallReason = "Risk score exceeds policy limits.";
  } else if (riskScore > 50) {
    ruleResults.push({
      ruleName: "Risk Threshold",
      status: "WARNING",
      message: `Elevated risk score (${riskScore}). Flags triggered: ${riskResult.factors.join(", ")}`
    });
    finalDecision = "Pending Manual Review";
    overallReason = "Elevated risk score flagged for review.";
  } else {
    ruleResults.push({
      ruleName: "Risk Threshold",
      status: "PASS",
      message: `Risk score (${riskScore}) within safe bounds.`
    });
  }

  // 3. Max Single Transaction Limit Check
  if (policy.maxSingleTx > 0 && payload.amount > policy.maxSingleTx) {
    ruleResults.push({
      ruleName: "Max Single Limit",
      status: "FAIL",
      message: `Proposed transaction amount (${payload.amount} ${payload.token}) exceeds single transfer limit cap (${policy.maxSingleTx} ${payload.token}).`
    });
    finalDecision = "Blocked";
    overallReason = "Single transaction limit breached.";
  } else {
    ruleResults.push({
      ruleName: "Max Single Limit",
      status: "PASS",
      message: "Within single transaction bounds."
    });
  }

  // 4. Daily Spending Limit Check
  if (policy.maxDailySpent > 0) {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const executedToday = await AgentTransaction.find({
      agentId,
      status: "executed",
      timestamp: { $gte: startOfToday }
    });

    const dailySpentSum = executedToday.reduce((sum, tx) => sum + tx.amount, 0);
    if (dailySpentSum + payload.amount > policy.maxDailySpent) {
      ruleResults.push({
        ruleName: "Max Daily Limit",
        status: "FAIL",
        message: `Exceeds daily spending limit (${policy.maxDailySpent}). Current spent today: ${dailySpentSpent(dailySpentSum)}`
      });
      finalDecision = "Blocked";
      overallReason = "Daily spending limit breached.";
    } else {
      ruleResults.push({
        ruleName: "Max Daily Limit",
        status: "PASS",
        message: `Daily spending within bounds. Current spent: ${dailySpentSum.toFixed(4)}`
      });
    }
  }

  // 5. Whitelist Wallet Restriction Checks
  const targetAddress = payload.to.toLowerCase();
  const isBlockedAddress = policy.blockedWallets.map(w => w.toLowerCase()).includes(targetAddress);
  if (isBlockedAddress) {
    ruleResults.push({
      ruleName: "Address Whitelist",
      status: "FAIL",
      message: `Target address (${payload.to}) is in the blocked wallets blacklist.`
    });
    finalDecision = "Blocked";
    overallReason = "Blacklisted recipient address.";
  } else {
    const isWhitelisted = policy.allowedWallets.map(w => w.toLowerCase()).includes(targetAddress);
    if (!isWhitelisted && policy.allowedWallets.length > 0) {
      ruleResults.push({
        ruleName: "Address Whitelist",
        status: "FAIL",
        message: `Target address (${payload.to}) is not in the Whitelist list.`
      });
      finalDecision = "Blocked";
      overallReason = "Target address not in whitelists.";
    } else {
      ruleResults.push({
        ruleName: "Address Whitelist",
        status: "PASS",
        message: "Address allowed by whitelist checks."
      });
    }
  }

  // 6. Allowed Networks Chain Validation
  // If allowedNetworks is set, make sure payload's chainId or network name is whitelisted
  // We can convert network name to chainId or validate names
  let chainId = 11155111; // fallback mock
  if (payload.network.toLowerCase() === "ethereum") chainId = 1;
  if (payload.network.toLowerCase() === "polygon") chainId = 137;
  if (payload.network.toLowerCase() === "base") chainId = 8453;

  if (policy.allowedNetworks.length > 0 && !policy.allowedNetworks.includes(chainId)) {
    ruleResults.push({
      ruleName: "Network Validator",
      status: "FAIL",
      message: `Chain ID ${chainId} (${payload.network}) is not authorized in Policy configs.`
    });
    finalDecision = "Blocked";
    overallReason = "Chain network blocked.";
  } else {
    ruleResults.push({
      ruleName: "Network Validator",
      status: "PASS",
      message: "Blockchain network allowed."
    });
  }

  // 7. Time Restrictions Verification
  const currentHour = new Date().getUTCHours();
  if (policy.businessHoursOnly) {
    const isOutsideHours = currentHour < policy.businessStartHour || currentHour >= policy.businessEndHour;
    if (isOutsideHours) {
      ruleResults.push({
        ruleName: "Business Hours Lock",
        status: "FAIL",
        message: `Blocked outside business hours. Current UTC hour: ${currentHour}:00 (Limits: ${policy.businessStartHour}:00 - ${policy.businessEndHour}:00)`
      });
      finalDecision = "Blocked";
      overallReason = "Outside business hours lock.";
    } else {
      ruleResults.push({
        ruleName: "Business Hours Lock",
        status: "PASS",
        message: "Proposed during valid business hours."
      });
    }
  }

  // 8. Manual Override Flags
  if (policy.requireManualApproval && finalDecision === "Approved") {
    ruleResults.push({
      ruleName: "Manual Approval Flag",
      status: "WARNING",
      message: "Policy requires manual confirmation by owner before execution."
    });
    finalDecision = "Pending Manual Review";
    overallReason = "Manual override required by policy rules.";
  }

  // Log final Validation evaluation to DB
  await ValidationLog.create({
    agentId,
    policyId: policy._id,
    transactionId,
    recipient: payload.to,
    amount: payload.amount,
    token: payload.token,
    status: finalDecision,
    riskScore,
    rulesTriggered: ruleResults
  });

  return {
    decision: finalDecision,
    riskScore,
    reason: overallReason,
    ruleResults
  };
}

function dailySpentSpent(val: number) {
  return `${val.toFixed(4)} ETH`;
}
