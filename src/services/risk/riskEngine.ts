import { dbConnect } from "@/lib/dbConnect";
import { AgentTransaction } from "@/models/AgentTransaction";
import { IPolicy } from "@/models/Policy";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

interface RiskScorerResult {
  score: number;
  level: RiskLevel;
  factors: string[];
  recommendations: string[];
}

export async function calculateRiskScore(
  agentId: string,
  payload: { to: string; amount: number; token: string; data?: string },
  policy: IPolicy
): Promise<RiskScorerResult> {
  await dbConnect();

  let score = 0;
  const factors: string[] = [];

  // 1. Check transaction size relative to limits
  if (policy.maxSingleTx > 0) {
    const ratio = payload.amount / policy.maxSingleTx;
    if (ratio > 0.8) {
      score += 25;
      factors.push(`Transaction amount (${payload.amount}) exceeds 80% of single transfer threshold (${policy.maxSingleTx})`);
    }
  } else if (payload.amount > 5) {
    score += 15;
    factors.push(`Unusually large native transaction size (${payload.amount} ${payload.token})`);
  }

  // 2. Check whitelisted recipient status
  const addressLower = payload.to.toLowerCase();
  const isWhitelisted = policy.allowedWallets
    .map((w) => w.toLowerCase())
    .includes(addressLower);
  if (!isWhitelisted && policy.allowedWallets.length > 0) {
    score += 25;
    factors.push(`Unlisted target recipient address: ${payload.to}`);
  }

  // 3. Blocked contracts validation
  const isBlockedContract = policy.blockedContracts
    .map((w) => w.toLowerCase())
    .includes(addressLower);
  if (isBlockedContract) {
    score += 45;
    factors.push(`Attempt to transact with explicitly blacklisted contract: ${payload.to}`);
  }

  // 4. Outside business hours (standardized to UTC)
  const currentHour = new Date().getUTCHours();
  const isOutsideHours =
    currentHour < policy.businessStartHour || currentHour >= policy.businessEndHour;
  if (policy.businessHoursOnly && isOutsideHours) {
    score += 15;
    factors.push(`Transaction proposed outside configured business hour bounds (${policy.businessStartHour}:00 - ${policy.businessEndHour}:00 UTC)`);
  }

  // 5. Rapid transaction frequency check
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recentTxCount = await AgentTransaction.countDocuments({
    agentId,
    timestamp: { $gte: twoMinutesAgo },
  });
  if (recentTxCount >= 5) {
    score += 30;
    factors.push(`High frequency rate warning (${recentTxCount} rapid transactions in the last 2 minutes)`);
  }

  // 6. Repeated policy violation failures check
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentFailuresCount = await AgentTransaction.countDocuments({
    agentId,
    status: "blocked",
    timestamp: { $gte: tenMinutesAgo },
  });
  if (recentFailuresCount >= 3) {
    score += 35;
    factors.push(`Frequent policy violation blocks (${recentFailuresCount} in the last 10 minutes)`);
  }

  // Cap score at 100
  const finalScore = Math.min(100, Math.max(0, score));
  
  // Determine level and recommendations
  let level: RiskLevel = "Low";
  const recommendations: string[] = [];

  if (finalScore >= 80) {
    level = "Critical";
    recommendations.push("Immediately review agent activity logs.");
    recommendations.push("Consider manually freezing the wallet if this pattern continues.");
  } else if (finalScore >= 50) {
    level = "High";
    recommendations.push("Require manual approval for this transaction.");
    recommendations.push("Verify recipient address legitimacy.");
  } else if (finalScore >= 25) {
    level = "Medium";
    recommendations.push("Monitor agent for subsequent transactions today.");
  } else {
    level = "Low";
    recommendations.push("Transaction appears safe to proceed autonomously.");
  }

  return {
    score: finalScore,
    level,
    factors,
    recommendations,
  };
}
