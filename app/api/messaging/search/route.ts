import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchMessages } from "@/actions/messaging";

/**
 * GET /api/messaging/search?q=xxx&channelId=xxx&conversationId=xxx&limit=50
 * 
 * Search messages across channels and conversations.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("q");
    const channelId = url.searchParams.get("channelId") || undefined;
    const conversationId = url.searchParams.get("conversationId") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50");

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const result = await searchMessages({
      query,
      channelId,
      conversationId,
      limit,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Search failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      results: result.results,
      totalCount: result.totalCount,
    });
  } catch (error) {
    console.error("[API] Search messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
