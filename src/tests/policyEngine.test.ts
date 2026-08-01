import { IPolicy } from "@/models/Policy";

// Mock implementation of Policy evaluation rules for testing loops
function mockEvaluatePolicy(
  payload: { to: string; amount: number; token: string; network: string; businessHoursOnly: boolean; currentHour: number },
  policy: Partial<IPolicy> & { name: string; maxSingleTx: number; allowedWallets: string[]; maxRiskScore: number },
  killSwitchActive: boolean
) {
  const ruleResults: any[] = [];
  let decision: "Approved" | "Blocked" = "Approved";

  // 1. Kill Switch Check
  if (killSwitchActive) {
    ruleResults.push({ rule: "Emergency Kill Switch", status: "FAIL" });
    return { decision: "Blocked", ruleResults };
  }
  ruleResults.push({ rule: "Emergency Kill Switch", status: "PASS" });

  // 2. Single Tx Limits
  if (policy.maxSingleTx > 0 && payload.amount > policy.maxSingleTx) {
    ruleResults.push({ rule: "Max Single Limit", status: "FAIL" });
    decision = "Blocked";
  } else {
    ruleResults.push({ rule: "Max Single Limit", status: "PASS" });
  }

  // 3. Whitelist Addresses
  const targetLower = payload.to.toLowerCase();
  const whitelisted = policy.allowedWallets.map(w => w.toLowerCase()).includes(targetLower);
  if (policy.allowedWallets.length > 0 && !whitelisted) {
    ruleResults.push({ rule: "Address Whitelist", status: "FAIL" });
    decision = "Blocked";
  } else {
    ruleResults.push({ rule: "Address Whitelist", status: "PASS" });
  }

  // 4. Hours Lock
  if (payload.businessHoursOnly) {
    const start = policy.businessStartHour ?? 9;
    const end = policy.businessEndHour ?? 17;
    const outside = payload.currentHour < start || payload.currentHour >= end;
    if (outside) {
      ruleResults.push({ rule: "Business Hours Lock", status: "FAIL" });
      decision = "Blocked";
    } else {
      ruleResults.push({ rule: "Business Hours Lock", status: "PASS" });
    }
  }

  return { decision, ruleResults };
}

// Runnable test cases
async function runTests() {
  console.log("=========================================");
  console.log("RUNNING AGENTSHIELD POLICY GOVERNANCE TESTS");
  console.log("=========================================");

  let testPassed = 0;
  let testFailed = 0;

  const mockPolicy = {
    name: "Safe Sandbox Policy",
    maxSingleTx: 2.0, // 2 ETH cap
    allowedWallets: ["0x71c54b1c2de8401140d3a3fc26338b556b6a37fc"],
    maxRiskScore: 80,
    businessStartHour: 9,
    businessEndHour: 17
  };

  // Case 1: Within limits transaction
  const case1 = mockEvaluatePolicy(
    { to: "0x71c54b1c2de8401140d3a3fc26338b556b6a37fc", amount: 0.5, token: "ETH", network: "Sepolia", businessHoursOnly: false, currentHour: 12 },
    mockPolicy as any,
    false
  );
  if (case1.decision === "Approved") {
    console.log("✓ TEST 1 PASS: Allowed valid small transaction within limits.");
    testPassed++;
  } else {
    console.error("✕ TEST 1 FAIL");
    testFailed++;
  }

  // Case 2: Breach single tx limit
  const case2 = mockEvaluatePolicy(
    { to: "0x71c54b1c2de8401140d3a3fc26338b556b6a37fc", amount: 5.0, token: "ETH", network: "Sepolia", businessHoursOnly: false, currentHour: 12 },
    mockPolicy as any,
    false
  );
  if (case2.decision === "Blocked") {
    console.log("✓ TEST 2 PASS: Blocked transaction exceeding 2 ETH limit.");
    testPassed++;
  } else {
    console.error("✕ TEST 2 FAIL");
    testFailed++;
  }

  // Case 3: Destination not in whitelist
  const case3 = mockEvaluatePolicy(
    { to: "0x000000000000000000000000000000000000dead", amount: 0.2, token: "ETH", network: "Sepolia", businessHoursOnly: false, currentHour: 12 },
    mockPolicy as any,
    false
  );
  if (case3.decision === "Blocked") {
    console.log("✓ TEST 3 PASS: Blocked transaction to unwhitelisted target address.");
    testPassed++;
  } else {
    console.error("✕ TEST 3 FAIL");
    testFailed++;
  }

  // Case 4: Outside business hours lock
  const case4 = mockEvaluatePolicy(
    { to: "0x71c54b1c2de8401140d3a3fc26338b556b6a37fc", amount: 0.5, token: "ETH", network: "Sepolia", businessHoursOnly: true, currentHour: 22 },
    mockPolicy as any,
    false
  );
  if (case4.decision === "Blocked") {
    console.log("✓ TEST 4 PASS: Blocked out-of-hours transaction request at 22:00.");
    testPassed++;
  } else {
    console.error("✕ TEST 4 FAIL");
    testFailed++;
  }

  // Case 5: Kill Switch active override
  const case5 = mockEvaluatePolicy(
    { to: "0x71c54b1c2de8401140d3a3fc26338b556b6a37fc", amount: 0.1, token: "ETH", network: "Sepolia", businessHoursOnly: false, currentHour: 12 },
    mockPolicy as any,
    true
  );
  if (case5.decision === "Blocked") {
    console.log("✓ TEST 5 PASS: Blocked transaction due to active Emergency Kill Switch.");
    testPassed++;
  } else {
    console.error("✕ TEST 5 FAIL");
    testFailed++;
  }

  console.log("=========================================");
  console.log(`TEST EXECUTION SUMMARY: ${testPassed} Passed | ${testFailed} Failed`);
  console.log("=========================================");
}

runTests();
