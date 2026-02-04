import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { executeToolForTesting } from "@/lib/ai-tools";
import { PLATFORM_ADMIN_TEST_ORG_ID } from "@/lib/internal-api-auth";

/**
 * POST /api/admin/ai-tools/test
 * Test execute an AI tool (platform admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();

    const body = await req.json();
    const { toolName, input, testMode = true, provider = "openai" } = body;

    if (!toolName || typeof toolName !== "string") {
      return NextResponse.json(
        { error: "Tool name is required" },
        { status: 400 }
      );
    }

    if (!input || typeof input !== "object") {
      return NextResponse.json(
        { error: "Input must be an object" },
        { status: 400 }
      );
    }

    // Use reserved admin test org ID for platform admin testing
    // testMode controls whether mock data is returned
    const result = await executeToolForTesting(
      toolName,
      input,
      admin.clerkId,
      PLATFORM_ADMIN_TEST_ORG_ID,
      testMode
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI_TOOLS_TEST]", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to test tool" },
      { status: 500 }
    );
  }
}
