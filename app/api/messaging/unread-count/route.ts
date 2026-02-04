import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getUnreadMessageCount } from "@/actions/messaging";

/**
 * GET /api/messaging/unread-count
 * 
 * Returns the unread message count for the current user.
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prismadb.users.findFirst({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ count: 0 });
    }

    const count = await getUnreadMessageCount(user.id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[API] Get unread count error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
