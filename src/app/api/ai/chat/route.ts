import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { AIChat } from "@/models/AIChat";
import { AIUsage } from "@/models/AIUsage";
import { AIService } from "@/services/ai/aiService";

const chatSchema = z.object({
  chatId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  message: z.string().min(1, "Message content cannot be empty"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = req.nextUrl;
    const usageOnly = searchParams.get("usageOnly");

    if (usageOnly === "true") {
      let usage = await AIUsage.findOne({ userId: session.user.id });
      if (!usage) {
        usage = await AIUsage.create({ userId: session.user.id });
      }
      return NextResponse.json({ success: true, data: usage });
    }

    const chats = await AIChat.find({ userId: session.user.id }).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: chats });

  } catch (error) {
    console.error("AI Chat GET Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load chats" } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const parsed = chatSchema.parse(body);

    // 1. Throttle / Log Usage stats
    let usage = await AIUsage.findOne({ userId: session.user.id });
    if (!usage) {
      usage = await AIUsage.create({ userId: session.user.id });
    }

    if (usage.requestsToday >= 100) {
      return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "AI Usage limit of 100 daily requests reached." } }, { status: 429 });
    }

    usage.requestsToday += 1;
    usage.tokenUsage += Math.floor(parsed.message.length / 4) + 150; // estimate token sizes
    await usage.save();

    // 2. Query Gemini / Fallback completion
    const aiResponse = await AIService.generateCompletion(session.user.id, parsed.message);

    // 3. Save to AIChat history
    let chatId = parsed.chatId;
    let chatTitle = "Security Conversation";

    if (chatId) {
      const chatDoc = await AIChat.findOne({ _id: chatId, userId: session.user.id });
      if (chatDoc) {
        chatDoc.messages.push({ role: "user", content: parsed.message, timestamp: new Date() });
        chatDoc.messages.push({ role: "model", content: aiResponse, timestamp: new Date() });
        await chatDoc.save();
      }
    } else {
      // Create new chat session
      chatTitle = parsed.message.slice(0, 30) + "...";
      const newChat = await AIChat.create({
        userId: session.user.id,
        title: chatTitle,
        messages: [
          { role: "user", content: parsed.message, timestamp: new Date() },
          { role: "model", content: aiResponse, timestamp: new Date() }
        ]
      });
      chatId = newChat._id.toString();
    }

    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse,
        chatId,
        title: chatTitle
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload parameters", details: error.errors } }, { status: 400 });
    }
    console.error("AI Chat POST Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "AI Copilot failed to formulate response" } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const chatId = searchParams.get("chatId");
    if (!chatId) {
      return NextResponse.json({ success: false, error: { code: "MISSING_PARAM", message: "Provide chatId parameter" } }, { status: 400 });
    }

    await dbConnect();
    await AIChat.deleteOne({ _id: chatId, userId: session.user.id });

    return NextResponse.json({ success: true, message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("AI Chat DELETE Error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Deletion failed" } }, { status: 500 });
  }
}
