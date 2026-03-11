import { NextResponse } from "next/server";
import {
  getConnectionMetrics,
  getQueryStats,
  isPoolHealthy,
} from "@/lib/prisma-metrics";
import { isPlatformAdmin } from "@/lib/platform-admin";

/**
 * GET /api/health/metrics
 * Connection pool and query performance metrics
 *
 * Returns detailed metrics about database connection pool health and query performance.
 * Used for monitoring and alerting in production.
 *
 * Requires platform admin authentication. Unauthenticated callers receive 401.
 */
export async function GET() {
  // Require platform admin — metrics contain sensitive internal data
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) {
    return NextResponse.json(
      { status: "error", error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const connectionMetrics = getConnectionMetrics();
    const queryStats = getQueryStats();
    const poolHealth = isPoolHealthy();

    return NextResponse.json(
      {
        status: poolHealth.healthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        connection: {
          activeConnections: connectionMetrics.activeConnections,
          idleConnections: connectionMetrics.idleConnections,
          poolExhausted: connectionMetrics.poolExhausted,
          failedConnections: connectionMetrics.failedConnections,
        },
        queries: {
          totalQueries: queryStats.totalQueries,
          successRate: queryStats.successRate,
          averageLatency: queryStats.averageLatency,
          p50Latency: queryStats.p50Latency,
          p95Latency: queryStats.p95Latency,
          p99Latency: queryStats.p99Latency,
          failedQueries: queryStats.failedQueries,
        },
        health: {
          healthy: poolHealth.healthy,
          reason: poolHealth.reason,
        },
      },
      { status: poolHealth.healthy ? 200 : 503 }
    );
  } catch (error) {
    console.error("[METRICS_ENDPOINT_ERROR]", error);

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
