import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { DeploymentHistory } from "@/models/DeploymentHistory";

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
    console.error("Contracts GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch deployment histories" } }, { status: 500 });
  }
}
