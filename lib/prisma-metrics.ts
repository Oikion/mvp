/**
 * Prisma Connection Pool Metrics Collection
 * 
 * This module provides utilities for monitoring Prisma database connection pool
 * performance and health in production environments.
 */

interface ConnectionMetrics {
  timestamp: string;
  activeConnections: number;
  idleConnections: number;
  queryLatencyMs: number;
  failedConnections: number;
  poolExhausted: boolean;
}

interface QueryMetric {
  query: string;
  duration: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

// In-memory metrics storage (consider using Redis or external monitoring service)
let metrics: ConnectionMetrics = {
  timestamp: new Date().toISOString(),
  activeConnections: 0,
  idleConnections: 0,
  queryLatencyMs: 0,
  failedConnections: 0,
  poolExhausted: false,
};

let queryHistory: QueryMetric[] = [];
const MAX_QUERY_HISTORY = 100; // Keep last 100 queries

/**
 * Record a database query execution
 */
export function recordQuery(query: string, duration: number, success: boolean, error?: string) {
  const metric: QueryMetric = {
    query,
    duration,
    timestamp: new Date().toISOString(),
    success,
    error,
  };

  queryHistory.push(metric);

  // Keep history size bounded
  if (queryHistory.length > MAX_QUERY_HISTORY) {
    queryHistory.shift();
  }

  // Update average latency
  const successfulQueries = queryHistory.filter((q) => q.success);
  if (successfulQueries.length > 0) {
    metrics.queryLatencyMs =
      successfulQueries.reduce((sum, q) => sum + q.duration, 0) / successfulQueries.length;
  }

  // Track failed connections
  if (!success) {
    metrics.failedConnections++;
  }

  metrics.timestamp = new Date().toISOString();
}

/**
 * Update connection pool metrics
 * 
 * Note: Prisma does not expose internal pool metrics directly.
 * These values would need to be estimated or retrieved from Prisma Accelerate monitoring.
 */
export function updateConnectionMetrics(active: number, idle: number, exhausted: boolean) {
  metrics.activeConnections = active;
  metrics.idleConnections = idle;
  metrics.poolExhausted = exhausted;
  metrics.timestamp = new Date().toISOString();
}

/**
 * Get current connection pool metrics
 */
export function getConnectionMetrics(): ConnectionMetrics {
  return { ...metrics };
}

/**
 * Get query execution history
 */
export function getQueryHistory(limit = 50): QueryMetric[] {
  return queryHistory.slice(-limit);
}

/**
 * Calculate query statistics
 */
export function getQueryStats() {
  const totalQueries = queryHistory.length;
  const successfulQueries = queryHistory.filter((q) => q.success);
  const failedQueries = queryHistory.filter((q) => !q.success);

  if (totalQueries === 0) {
    return {
      totalQueries: 0,
      successRate: 100,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      failedQueries: 0,
    };
  }

  const sortedDurations = successfulQueries.map((q) => q.duration).sort((a, b) => a - b);

  const p50Index = Math.floor(sortedDurations.length * 0.5);
  const p95Index = Math.floor(sortedDurations.length * 0.95);
  const p99Index = Math.floor(sortedDurations.length * 0.99);

  return {
    totalQueries,
    successRate: (successfulQueries.length / totalQueries) * 100,
    averageLatency: metrics.queryLatencyMs,
    p50Latency: sortedDurations[p50Index] || 0,
    p95Latency: sortedDurations[p95Index] || 0,
    p99Latency: sortedDurations[p99Index] || 0,
    failedQueries: failedQueries.length,
  };
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics() {
  metrics = {
    timestamp: new Date().toISOString(),
    activeConnections: 0,
    idleConnections: 0,
    queryLatencyMs: 0,
    failedConnections: 0,
    poolExhausted: false,
  };
  queryHistory = [];
}

/**
 * Log metrics to console (development) or monitoring service (production)
 */
export function logMetrics() {
  const stats = getQueryStats();

  if (process.env.NODE_ENV === "production") {
    // In production, send to monitoring service (Vercel Analytics, Datadog, etc.)
    console.info("[PRISMA_METRICS]", {
      ...metrics,
      stats,
    });
  } else {
    // In development, log to console with formatting
    console.log("\n📊 Prisma Connection Pool Metrics:");
    console.log(`   Active Connections: ${metrics.activeConnections}`);
    console.log(`   Idle Connections: ${metrics.idleConnections}`);
    console.log(`   Pool Exhausted: ${metrics.poolExhausted ? "⚠️  YES" : "✅ NO"}`);
    console.log(`   Failed Connections: ${metrics.failedConnections}`);
    console.log("\n📈 Query Performance:");
    console.log(`   Total Queries: ${stats.totalQueries}`);
    console.log(`   Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`   Average Latency: ${stats.averageLatency.toFixed(2)}ms`);
    console.log(`   P50 Latency: ${stats.p50Latency}ms`);
    console.log(`   P95 Latency: ${stats.p95Latency}ms`);
    console.log(`   P99 Latency: ${stats.p99Latency}ms`);
    console.log("");
  }
}

/**
 * Check if connection pool is healthy
 */
export function isPoolHealthy(): { healthy: boolean; reason?: string } {
  if (metrics.poolExhausted) {
    return { healthy: false, reason: "Connection pool exhausted" };
  }

  if (metrics.failedConnections > 10) {
    return { healthy: false, reason: "Too many failed connections" };
  }

  const stats = getQueryStats();
  if (stats.successRate < 95) {
    return { healthy: false, reason: `Low query success rate: ${stats.successRate.toFixed(2)}%` };
  }

  if (stats.p95Latency > 1000) {
    return { healthy: false, reason: `High P95 latency: ${stats.p95Latency}ms` };
  }

  return { healthy: true };
}

/**
 * USAGE NOTES:
 * 
 * 1. Integration with Prisma:
 *    - Wrap Prisma client with middleware to automatically record metrics
 *    - Example in lib/prisma.ts:
 * 
 *      prisma.$use(async (params, next) => {
 *        const start = Date.now();
 *        try {
 *          const result = await next(params);
 *          recordQuery(params.model + '.' + params.action, Date.now() - start, true);
 *          return result;
 *        } catch (error) {
 *          recordQuery(params.model + '.' + params.action, Date.now() - start, false, error.message);
 *          throw error;
 *        }
 *      });
 * 
 * 2. Monitoring Endpoint:
 *    - Create GET /api/health/metrics to expose metrics
 * 
 * 3. Alerting:
 *    - Set up alerts when pool is exhausted or latency is high
 *    - Use isPoolHealthy() to check health status
 * 
 * 4. Production Monitoring:
 *    - Integrate with Vercel Analytics, Datadog, or New Relic
 *    - Send metrics to external service instead of console.log
 */
