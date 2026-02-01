/**
 * Internal API Authentication
 * 
 * Helper to authenticate internal API calls from the AI tools executor
 * These routes can be called either via:
 * 1. Normal user session (Clerk)
 * 2. Internal tool execution (X-Tool-Context headers)
 */

import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";

// Reserved organization ID for platform admin testing
// When this org ID is used, tools operate in test/sandbox mode
export const PLATFORM_ADMIN_TEST_ORG_ID = "org_platform_admin_test";

export interface InternalApiContext {
  userId: string;
  organizationId: string;
  source: "user_session" | "tool_executor";
  isAdminTest: boolean;
}

/**
 * Get context from either user session or tool executor headers
 */
export async function getInternalApiContext(
  request: NextRequest
): Promise<InternalApiContext | null> {
  // First, check for tool executor headers
  const toolOrgId = request.headers.get("X-Tool-Context-Org");
  const toolUserId = request.headers.get("X-Tool-Context-User");
  const toolSource = request.headers.get("X-Tool-Context-Source");
  const toolTestMode = request.headers.get("X-Tool-Context-Test-Mode");

  if (toolOrgId && toolUserId && toolSource) {
    // This is an internal tool execution call
    // testMode header explicitly controls whether to return mock data
    // If header is not present, fall back to checking org ID
    const isAdminTest = toolTestMode !== null 
      ? toolTestMode === "true"
      : toolOrgId === PLATFORM_ADMIN_TEST_ORG_ID;
    
    return {
      userId: toolUserId,
      organizationId: toolOrgId,
      source: "tool_executor",
      isAdminTest,
    };
  }

  // Fall back to normal user session
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (user && organizationId) {
      return {
        userId: user.id,
        organizationId,
        source: "user_session",
        isAdminTest: false,
      };
    }
  } catch (error) {
    // Session not available
    console.error("[INTERNAL_API_AUTH] Session error:", error);
  }

  return null;
}
