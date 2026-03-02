import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/prisma-health";

/**
 * GET /api/health/db
 * Database health check endpoint
 * 
 * Returns:
 * - 200: Database is healthy
 * - 503: Database is unhealthy
 */
export async function GET() {
  try {
    const health = await checkDatabaseHealth();

    return NextResponse.json(
      {
        status: health.healthy ? "healthy" : "unhealthy",
        timestamp: health.timestamp,
        latency: health.latency,
        details: health.error ? { error: health.error } : undefined,
      },
      { status: health.healthy ? 200 : 503 }
    );
  } catch (error) {
    console.error("[DB_HEALTH_CHECK_ERROR]", error);
    
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 503 }
    );
  }
}
