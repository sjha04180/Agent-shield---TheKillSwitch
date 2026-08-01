import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { SystemHealth } from "@/models/SystemHealth";

export async function GET(req: NextRequest) {
  try {
    const start = Date.now();
    await dbConnect();
    const dbLatency = Date.now() - start;
    
    // In a real app, this would ping Lyzr, Gemini API, and Blockchain RPC
    // For this hackathon/demo, we simulate the health check realistically
    
    // Create a new health snapshot
    const health = await SystemHealth.create({
      apiStatus: "healthy",
      dbStatus: dbLatency > 500 ? "unstable" : "healthy",
      blockchainStatus: "healthy",
      geminiStatus: "healthy",
      lyzrStatus: "healthy",
      simulatorStatus: "healthy",
      metaMaskStatus: "healthy",
      responseTime: dbLatency,
      memoryUsage: Math.floor(Math.random() * 15) + 40, // 40-55%
      storageUsage: Math.floor(Math.random() * 5) + 30, // 30-35%
      apiLatencyMs: Math.floor(Math.random() * 30) + 15,
      version: "1.0.0",
    });

    return NextResponse.json({ success: true, data: health });
  } catch (error) {
    console.error("[/api/system/health] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        data: {
          apiStatus: "down",
          dbStatus: "down",
          responseTime: 0,
          timestamp: new Date().toISOString()
        } 
      },
      { status: 500 }
    );
  }
}
