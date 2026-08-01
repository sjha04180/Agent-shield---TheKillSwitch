import { dbConnect } from "@/lib/dbConnect";
import { AgentTransaction } from "@/models/AgentTransaction";
import { IPolicy } from "@/models/Policy";

interface RiskScorerResult {
  score: number;
  factors: string[];
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
      factors.push("Transaction amount exceeds 80% of single transfer threshold");
    }
  } else if (payload.amount > 5) {
    // Default fallback size warning
    score += 15;
    factors.push("Unusually large native transaction size");
  }

  // 2. Check Whitelisted Recipient status
  const addressLower = payload.to.toLowerCase();
  const isWhitelisted = policy.allowedWallets.map(w => w.toLowerCase()).includes(addressLower);
  if (!isWhitelisted && policy.allowedWallets.length > 0) {
    score += 25;
    factors.push("Unlisted target recipient address");
  }

  // 3. Blocked Contracts validation
  const isBlockedContract = policy.blockedContracts.map(w => w.toLowerCase()).includes(addressLower);
  if (isBlockedContract) {
    score += 45;
    factors.push("Attempt to transact with explicitly blacklisted contract");
  }

  // 4. Outside business hours (using current local hours)
  const currentHour = new Date().getUTCHours(); // Standardize on UTC
  const isOutsideHours = currentHour < policy.businessStartHour || currentHour >= policy.businessEndHour;
  if (policy.businessHoursOnly && isOutsideHours) {
    score += 15;
    factors.push("Transaction proposed outside configured business hour bounds");
  }

  // 5. Rapid transactions count
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recentTxCount = await AgentTransaction.countDocuments({
    agentId,
    timestamp: { $gte: twoMinutesAgo }
  });
  if (recentTxCount >= 5) {
    score += 30;
    factors.push("High frequency rate warning (rapid transactions detected)");
  }

  // 6. Repeated failures count
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentFailuresCount = await AgentTransaction.countDocuments({
    agentId,
    status: "blocked",
    timestamp: { $gte: tenMinutesAgo }
  });
  if (recentFailuresCount >= 3) {
    score += 35;
    factors.push("Frequent policy violation blocks in the last 10 minutes");
  }

  // Cap score between 0 and 100
  const finalScore = Math.min(100, score);
  
  return {
    score: finalScore,
    factors
  };
}
