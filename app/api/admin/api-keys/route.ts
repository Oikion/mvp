import { NextResponse } from "next/server";
import { getCurrentUserSafe, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  createApiKey,
  listApiKeys,
  getApiUsageStats,
  ALL_SCOPES,
  SCOPE_DESCRIPTIONS,
  ApiScope,
} from "@/lib/api-auth";

/**
 * Check if user has admin access via Clerk metadata or DB flags
 */
async function hasAdminAccess(userId: string, dbUser: { is_admin: boolean; is_account_admin: boolean } | null): Promise<boolean> {
  // Check DB flags first
  if (dbUser?.is_admin || dbUser?.is_account_admin) {
    return true;
  }
  
  // Check Clerk private metadata for isPlatformAdmin
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const privateMetadata = clerkUser.privateMetadata as { isPlatformAdmin?: boolean };
    if (privateMetadata?.isPlatformAdmin === true) {
      return true;
    }
  } catch (error) {
    console.error("[ADMIN_CHECK] Error checking Clerk metadata:", error);
  }
  
  return false;
}

/**
 * GET /api/admin/api-keys
 * List API keys for the current organization
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = await getCurrentUserSafe();
    const organizationId = await getCurrentOrgIdSafe();

    // Check if user has admin access (via DB or Clerk metadata)
    const isAdmin = await hasAdminAccess(userId, user);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // If no organization context, return empty list with scopes
    if (!organizationId) {
      return NextResponse.json({
        apiKeys: [],
        availableScopes: ALL_SCOPES.map((scope) => ({
          scope,
          description: SCOPE_DESCRIPTIONS[scope],
        })),
        message: "Please select an organization to manage API keys",
      });
    }

    const { searchParams } = new URL(req.url);
    const includeStats = searchParams.get("includeStats") === "true";

    // Get API keys
    const apiKeys = await listApiKeys(organizationId);

    // Get usage stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getApiUsageStats(organizationId);
    }

    return NextResponse.json({
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes,
        lastUsedAt: key.lastUsedAt?.toISOString(),
        expiresAt: key.expiresAt?.toISOString(),
        revokedAt: key.revokedAt?.toISOString(),
        createdAt: key.createdAt.toISOString(),
        createdBy: key.createdBy,
        isActive: !key.revokedAt && (!key.expiresAt || key.expiresAt > new Date()),
      })),
      availableScopes: ALL_SCOPES.map((scope) => ({
        scope,
        description: SCOPE_DESCRIPTIONS[scope],
      })),
      ...(stats && { stats }),
    });
  } catch (error) {
    console.error("[API_KEYS_GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/api-keys
 * Create a new API key
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = await getCurrentUserSafe();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 400 }
      );
    }

    // Check if user has admin access (via DB or Clerk metadata)
    const isAdmin = await hasAdminAccess(userId, user);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Require organization context to create API keys
    if (!organizationId) {
      return NextResponse.json(
        { error: "Please select an organization to create API keys" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, scopes, expiresInDays } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: "At least one scope is required" },
        { status: 400 }
      );
    }

    // Validate scopes
    const invalidScopes = scopes.filter((s: string) => !ALL_SCOPES.includes(s as ApiScope));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (expiresInDays && typeof expiresInDays === "number" && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create API key
    const { key, id, keyPrefix } = await createApiKey({
      organizationId,
      name: name.trim(),
      scopes: scopes as ApiScope[],
      createdById: user.id,
      expiresAt,
    });

    return NextResponse.json(
      {
        apiKey: {
          id,
          name: name.trim(),
          keyPrefix,
          scopes,
          expiresAt: expiresAt?.toISOString(),
        },
        // Only show the full key once at creation time
        key,
        message: "API key created successfully. Save this key - it will not be shown again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API_KEYS_POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create API key" },
      { status: 500 }
    );
  }
}
