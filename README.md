# AgentShield

AgentShield is an Enterprise AI Wallet Governance Platform designed to secure, govern, and audit financial transactions initiated by autonomous AI agents (such as Lyzr AI or internal simulators).

It acts as a mandatory governance layer between an AI Agent and a Blockchain Wallet.

## 🏛 Architecture

The platform is built on Next.js 15, MongoDB, and Ethers.js, structured into distinct modular layers:

1. **Agent Adapter Layer:** Normalizes incoming webhook payloads from different AI providers into a standard strict schema.
2. **Governance Layer (Policy Engine + Risk Engine):** Evaluates every transaction against organizational policies and dynamic risk factors.
3. **Execution Layer (Blockchain/Simulation):** If approved, the transaction is executed on-chain (Sepolia) or queued in Simulation Mode.
4. **Data Layer (MongoDB):** Maintains immutable Audit Logs, Analytics, and Connected Agent telemetry.

## 🔄 System Workflow

Every transaction follows a deterministic lifecycle:
1. **Agent Request** → Inbound payload received from Lyzr or Simulator.
2. **Authentication** → Validates `X-Agent-Id` and `X-Agent-Token` hash.
3. **Payload Validation** → Prompt Injection guard scans for jailbreak attempts (e.g., "disable kill switch").
4. **Adapter Normalization** → Parses the provider-specific payload.
5. **Organization & Wallet Lookup** → Identifies the tied Smart Wallet and Policy config.
6. **Policy Engine** → Runs static limits (Max amount, Daily limit, Weekends, etc.).
7. **Risk Engine** → Calculates dynamic 0-100 risk score based on frequency, sizes, and reputation.
8. **Decision Engine** → Outputs `APPROVED`, `PENDING_REVIEW`, or `BLOCKED`.
9. **Kill Switch Check** → Rejects all transactions immediately if the master kill switch is active.
10. **Blockchain Execution** → Signs and broadcasts via Ethers.js, or falls back to Simulation Mode.
11. **AI Copilot** → Gemini API generates human-readable explanations of the decision.
12. **Audit & Analytics** → Logs everything immutably.

## 🔌 Agent Adapter

The `IAgentAdapter` pattern ensures that AgentShield never cares about *which* AI is talking to it. 
- `LyzrAdapter.ts`: Connects to Lyzr AI agents.
- `SimulatorAdapter.ts`: Connects to the internal demo agent profiles (Treasury, Payroll, Marketing, etc.).
- Adding AutoGen or CrewAI requires simply writing a new adapter class without touching the core governance code.

## 🛡 Policy Engine

The Policy Engine enforces static business rules:
- Maximum transaction amount
- Daily and Monthly spending limits
- Allowed & Blocked recipients (Whitelists/Blacklists)
- Allowed networks (Ethereum, Polygon, Sepolia)
- Business hours restriction (e.g., 09:00 - 17:00 UTC)
- Weekend restriction (Blocks Saturday/Sunday)

## ⚠️ Risk Engine

The Risk Engine generates a dynamic score (0-100) based on contextual behavior:
- Transaction amounts nearing limits
- High frequency (rapid transactions)
- Unknown or blacklisted recipients
- Repeated policy violations within a short window
- Returns a Risk Level (`Low`, `Medium`, `High`, `Critical`) and actionable recommendations.

## 🎮 Demo Mode vs Live Mode

- **Demo Mode:** Transactions are simulated to execute instantly (800ms delay) without burning real gas. Excellent for hackathons and presentations. 
- **Live Mode:** Connects to standard EVM RPC nodes using Ethers.js to sign and broadcast real transactions. If the RPC fails, it falls back gracefully to Simulation Mode so the application never crashes.

## 🚀 Deployment

The platform is designed to be easily deployed to Vercel without complex Docker containers.

```bash
npm install
npm run dev
```

For production builds:
```bash
npm run build
npm start
```

### Environment Variables

Configure your `.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/agentshield
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
SEPOLIA_RPC_URL=https://rpc.sepolia.org
GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_DEMO_MODE=true
```

## 🛣 Future Roadmap

- **Geographic Restrictions:** Enforcing IP/Geofence constraints on Agent execution nodes.
- **Multi-Sig Approvals:** Requiring 2+ admins to approve `PENDING_REVIEW` transactions.
- **Smart Contract Policy Enforcement:** Migrating some static Policy Engine rules directly into the Solidity Smart Contract for on-chain verifiable governance.
- **Pluggable AI Models:** Replacing Gemini with OpenAI/Anthropic/Local LLMs for Copilot explanations.
