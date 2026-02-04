import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getMessagingCredentials } from "@/actions/messaging/sync-user";

/**
 * GET /api/messaging/credentials
 * 
 * Returns Ably token request for the current user.
 * Used by the frontend to authenticate with Ably.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await getMessagingCredentials();

    if (!result.success) {
      // Return appropriate status based on error code
      const status = result.errorCode === "NOT_CONFIGURED" ? 503 : 500;
      return NextResponse.json(
        { 
          error: result.error || "Failed to get credentials",
          errorCode: result.errorCode,
        },
        { status }
      );
    }

    return NextResponse.json({
      userId: result.credentials?.userId,
      organizationId: result.credentials?.organizationId,
      tokenRequest: result.credentials?.tokenRequest,
    });
  } catch (error) {
    console.error("[API] Messaging credentials error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
