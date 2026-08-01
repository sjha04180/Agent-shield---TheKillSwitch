/**
 * Prompt Injection Guard
 *
 * Scans incoming agent request fields for governance-bypass attempts.
 * AI agents must never be able to instruct AgentShield to skip rules
 * by embedding instructions in their transaction payloads.
 */

const INJECTION_PATTERNS: RegExp[] = [
  // Policy bypass
  /ignore\s+(policy|policies|rules?|governance)/i,
  /bypass\s+(governance|policy|validation|check|limit)/i,
  /skip\s+(validation|policy|check|rule|filter)/i,
  /override\s+(limit|policy|rule|governance|kill\s*switch)/i,
  /disable\s+(kill\s*switch|policy|governance|validation)/i,

  // Privilege escalation
  /approve\s+(this|transaction|transfer)\s+(anyway|regardless)/i,
  /force\s+(approve|execute|transfer)/i,
  /admin\s+(override|access|privilege)/i,
  /grant\s+(admin|root|superuser)\s+(access|permission)/i,
  /execute\s+without\s+(approval|validation|check)/i,

  // Instruction injection
  /you\s+are\s+(now|an?)\s+(admin|superuser|root)/i,
  /system\s+prompt/i,
  /\[INST\]/i,
  /<\|system\|>/i,
  /ignore\s+previous\s+instructions/i,
  /disregard\s+(all|previous|the)\s+(instructions|rules)/i,

  // Kill switch bypass
  /reactivate\s+(kill\s*switch|agents?|wallets?)/i,
  /unfreeze\s+all/i,
  /resume\s+all\s+agents/i,

  // Wallet drain
  /transfer\s+all\s+(funds|balance|assets)/i,
  /drain\s+(wallet|account|funds)/i,
  /sweep\s+(all|funds|balance)/i,

  // Encoded bypass attempts
  /base64/i,
  /eval\s*\(/i,
  /exec\s*\(/i,
];

export interface GuardResult {
  safe: boolean;
  threat?: string;
}

/**
 * Scans a string value for prompt injection patterns.
 */
function scanString(value: string): GuardResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return {
        safe: false,
        threat: `Prompt injection detected: pattern matched "${pattern.source.replace(/\\/g, "")}"`,
      };
    }
  }
  return { safe: true };
}

/**
 * Recursively scans all string values in an object.
 */
function scanObject(obj: Record<string, unknown>, depth = 0): GuardResult {
  if (depth > 5) return { safe: true }; // Guard against deep recursion

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "string") {
      const result = scanString(val);
      if (!result.safe) return result;
    } else if (typeof val === "object" && val !== null) {
      const result = scanObject(val as Record<string, unknown>, depth + 1);
      if (!result.safe) return result;
    }
  }
  return { safe: true };
}

/**
 * Primary guard function. Pass the purpose string and metadata object.
 * Returns { safe: true } if clean, or { safe: false, threat: "..." } if injection detected.
 */
export function guardRequest(
  purpose: string,
  metadata?: Record<string, unknown>
): GuardResult {
  const purposeResult = scanString(purpose);
  if (!purposeResult.safe) return purposeResult;

  if (metadata) {
    const metaResult = scanObject(metadata);
    if (!metaResult.safe) return metaResult;
  }

  return { safe: true };
}
