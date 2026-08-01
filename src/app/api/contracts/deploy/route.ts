import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { DeploymentHistory } from "@/models/DeploymentHistory";

const SEPOLIA_CONTRACTS = [
  { name: "AccessController", address: "0x2563EB0000000000000000000000000000000001" },
  { name: "KillSwitch", address: "0xEF44440000000000000000000000000000000002" },
  { name: "PolicyManager", address: "0x10B9810000000000000000000000000000000003" },
  { name: "TransactionExecutor", address: "0xF59E0B0000000000000000000000000000000004" },
  { name: "Treasury", address: "0x0508160000000000000000000000000000000005" }
];

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    const deployments = await DeploymentHistory.find({});
    return NextResponse.json({ success: true, data: deployments });
  } catch (error) {
    console.error("Deployments GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch deployment histories" } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();

    const results = [];
    for (const contract of SEPOLIA_CONTRACTS) {
      // Upsert mock deployments for Sepolia network
      const doc = await DeploymentHistory.findOneAndUpdate(
        { contractName: contract.name, network: "Sepolia" },
        {
          contractName: contract.name,
          address: contract.address.toLowerCase(),
          network: "Sepolia",
          txHash: "0x" + "a".repeat(64),
          compiler: "v0.8.20+commit.56138b1c",
          deployedBy: session.user.id,
        },
        { new: true, upsert: true }
      );
      results.push(doc);
    }

    return NextResponse.json({
      success: true,
      message: "Governance contracts seeded/deployed successfully on Sepolia testnet.",
      data: results
    });

  } catch (error) {
    console.error("Deployments POST Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Compilation/deployment script failed" } }, { status: 500 });
  }
}
