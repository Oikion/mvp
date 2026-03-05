import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAiAssistantAccessInfo } from "@/lib/ai/access";

/**
 * GET /api/ai/config
 * 
 * Check if the current organization has access to the AI Assistant feature.
 * Returns access status and optional expiration info.
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get detailed access info
    const accessInfo = await getAiAssistantAccessInfo(orgId);

    return NextResponse.json({
      hasAccess: accessInfo.hasAccess,
      grantedAt: accessInfo.grantedAt,
      expiresAt: accessInfo.expiresAt,
      isExpired: accessInfo.isExpired
    });

  } catch (error) {
    console.error("[AI_CONFIG_GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to check AI access" },
      { status: 500 }
    );
  }
}
