# AgentShield: Secure AI Wallet Governance Platform

AgentShield is a production-ready, enterprise-grade AI Wallet Governance Platform designed to mitigate the risks associated with autonomous AI agent transaction spending (API keys purchases, crypto transfers, SaaS billings). It introduces a secure off-chain policy validation gatekeeper co-signing transactions on-chain via smart contract wallets.

---

## Technical Architecture Overview

AgentShield splits transaction verification between a deterministic off-chain **Policy Engine** and on-chain **Solidity Smart Contracts**:

```
User (Owner/Admin)
     │
     ▼ (Configures Rules)
Policy Engine Proxy (Next.js Gateway) ◄─── AI Agent (Simulated Tx proposal)
     │
     ├─── Evaluates Limits, Whitelists, Timeframes & Risk Scores
     │
     ├─── [Approved] ──► Generates ECDSA Gateway Signature
     │
     ▼
TransactionExecutor.sol (On-chain Gateway Contract)
     │
     ├─── Verifies Signatures, Nonce replay protection, & halts
     │
     ▼ (Executes payload)
AgentWallet.sol (AI Agent's contract account) ──► Target Smart Contract / Recipient
```

---

## Smart Contract Directory (`contracts/`)

- **`AccessController.sol`**: Manages granular roles (Admin, Owner, Auditor, Operator) on-chain.
- **`KillSwitch.sol`**: State register tracking emergency freeze halts for wallets or agents.
- **`PolicyManager.sol`**: Binds AI agents to active policy hashes.
- **`AgentWallet.sol`**: Isolated smart contract wallet owned by the AI Agent, accepting executions only from the TransactionExecutor.
- **`TransactionExecutor.sol`**: Central gatekeeper contract checking ECDSA signatures against the policy gateway.
- **`Treasury.sol`**: Vault holding demo project funds.

---

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, TailwindCSS, Zustand stores.
- **Database**: MongoDB (Mongoose Object modeling).
- **Web3**: Hardhat solidity framework, Ethers.js v6, MetaMask.
- **AI**: Google Gemini API model integration (with deterministic fallbacks).

---

## Installation & Setup

1. **Clone repository & install npm dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables** in `.env.local`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/agentshield
   NEXTAUTH_SECRET=44efee81a029db5e6db24bf2003ea172
   NEXTAUTH_URL=http://localhost:3000
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Compile Smart Contracts locally**:
   ```bash
   npx hardhat compile
   ```

4. **Launch development server**:
   ```bash
   npm run dev
   ```

---

## Test Execution

Run the standalone policy engine unit tests:
```bash
npx ts-node src/tests/policyEngine.test.ts
```
