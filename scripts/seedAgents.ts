import mongoose from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

const ConnectedAgentSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true },
  agentName: { type: String, required: true },
  provider: { type: String, required: true },
  organizationId: { type: String, required: true },
  secretTokenHash: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, default: "offline" },
  lastSeen: { type: Date, default: Date.now },
  latencyMs: { type: Number, default: 0 },
  requestsToday: { type: Number, default: 0 },
  approvedCount: { type: Number, default: 0 },
  blockedCount: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
  averageRisk: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
});

const ConnectedAgent = mongoose.models.ConnectedAgent || mongoose.model("ConnectedAgent", ConnectedAgentSchema);

const LYZR_AGENTS = [
  { agentId: "cloud-billing-agent", name: "Cloud Billing Agent", role: "cloud_billing" },
  { agentId: "treasury-agent", name: "Treasury Agent", role: "treasury" },
];

const SIMULATOR_AGENTS = [
  { agentId: "payroll-agent", name: "Payroll Agent", role: "payroll" },
  { agentId: "marketing-agent", name: "Marketing Agent", role: "marketing" },
  { agentId: "research-agent", name: "Research Agent", role: "research" },
];

function generateHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  // Clear existing
  await ConnectedAgent.deleteMany({});
  console.log("Cleared existing connected agents.");

  const orgId = "agentshield-org";

  for (const agent of LYZR_AGENTS) {
    // In production, tokens are generated dynamically. For demo, we hardcode test tokens.
    const token = `${agent.agentId}-secret-token`;
    await ConnectedAgent.create({
      agentId: agent.agentId,
      agentName: agent.name,
      provider: "lyzr",
      organizationId: orgId,
      secretTokenHash: generateHash(token),
      role: agent.role,
      status: "online",
      lastSeen: new Date(),
    });
    console.log(`Seeded Lyzr Agent: ${agent.name} (Token: ${token})`);
  }

  for (const agent of SIMULATOR_AGENTS) {
    const token = `${agent.agentId}-secret-token`;
    await ConnectedAgent.create({
      agentId: agent.agentId,
      agentName: agent.name,
      provider: "simulator",
      organizationId: orgId,
      secretTokenHash: generateHash(token),
      role: agent.role,
      status: "online",
      lastSeen: new Date(),
    });
    console.log(`Seeded Simulator Agent: ${agent.name} (Token: ${token})`);
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
