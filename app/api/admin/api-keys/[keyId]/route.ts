import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revokeApiKey, getApiUsageStats } from "@/lib/api-auth";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";

interface RouteParams {
  params: Promise<{ keyId: string }>;
}

/**
 * GET /api/admin/api-keys/[keyId]
 * Get details and usage stats for a specific API key
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { keyId } = await params;

    // Check if user is admin
    if (!user.is_admin && !user.is_account_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Check action-level permission for viewing API keys
    const guard = await requireAction("admin:manage_webhooks");
    if (guard) return handleGuardError(guard);

    // Get API key
    const apiKey = await prismadb.apiKey.findFirst({
      where: {
        id: keyId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // Get usage stats for this key
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const stats = await getApiUsageStats(organizationId, {
      keyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        lastUsedAt: apiKey.lastUsedAt?.toISOString(),
        expiresAt: apiKey.expiresAt?.toISOString(),
        revokedAt: apiKey.revokedAt?.toISOString(),
        createdAt: apiKey.createdAt.toISOString(),
        createdBy: apiKey.createdBy,
        isActive: !apiKey.revokedAt && (!apiKey.expiresAt || apiKey.expiresAt > new Date()),
      },
      stats,
    });
  } catch (error) {
    console.error("[API_KEY_GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch API key" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/api-keys/[keyId]
 * Update an API key (name only - scopes cannot be changed)
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { keyId } = await params;

    // Check if user is admin
    if (!user.is_admin && !user.is_account_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Check action-level permission for updating API keys
    const guard = await requireAction("admin:manage_webhooks");
    if (guard) return handleGuardError(guard);

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Update API key
    const apiKey = await prismadb.apiKey.updateMany({
      where: {
        id: keyId,
        organizationId,
      },
      data: {
        name: name.trim(),
      },
    });

    if (apiKey.count === 0) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "API key updated successfully",
    });
  } catch (error) {
    console.error("[API_KEY_PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update API key" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/api-keys/[keyId]
 * Revoke an API key
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { keyId } = await params;

    // Check if user is admin
    if (!user.is_admin && !user.is_account_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Check action-level permission for revoking API keys
    const guard = await requireAction("admin:manage_webhooks");
    if (guard) return handleGuardError(guard);

    // Revoke API key
    const revoked = await revokeApiKey(keyId, organizationId);

    if (!revoked) {
      return NextResponse.json(
        { error: "API key not found or already revoked" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "API key revoked successfully",
    });
  } catch (error) {
    console.error("[API_KEY_DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
