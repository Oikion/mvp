import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/prisma-health";
import { isPlatformAdmin } from "@/lib/platform-admin";

/**
 * GET /api/health/db
 * Database health check endpoint
 *
 * Returns:
 * - 200: Database is healthy
 * - 503: Database is unhealthy
 *
 * Error details are only included for platform admin callers.
 */
export async function GET() {
  const isAdmin = await isPlatformAdmin();

  try {
    const health = await checkDatabaseHealth();

    return NextResponse.json(
      {
        status: health.healthy ? "healthy" : "unhealthy",
        timestamp: health.timestamp,
        latency: health.latency,
        // Only expose error details to platform admins
        details: health.error && isAdmin ? { error: health.error } : undefined,
      },
      { status: health.healthy ? 200 : 503 }
    );
  } catch (error) {
    console.error("[DB_HEALTH_CHECK_ERROR]", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        // Only expose error details to platform admins
        details: isAdmin
          ? { error: error instanceof Error ? error.message : "Unknown error" }
          : undefined,
      },
      { status: 503 }
    );
  }
}
