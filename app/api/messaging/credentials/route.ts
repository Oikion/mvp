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
    const { userId, orgId } = await auth();

    // Both userId AND orgId must be present — orgId is null during onboarding
    // or org-switching, which would throw inside getMessagingCredentials and
    // return a 500. Return 401 early so the client can handle it gracefully.
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized", errorCode: "NO_ORG" },
        { status: 401 }
      );
    }

    const result = await getMessagingCredentials();

    if (!result.success) {
      const status =
        result.errorCode === "NOT_CONFIGURED" ? 503 :
        result.errorCode === "NO_ORG" ? 401 :
        500;
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
