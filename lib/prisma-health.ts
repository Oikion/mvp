import { prismadb } from "./prisma";

/**
 * Database Health Check Utility
 * 
 * Provides health check functionality for monitoring database connectivity
 * and performance. Useful for:
 * - Health check endpoints (/api/health)
 * - Startup validation
 * - Monitoring and alerting
 */

export interface DatabaseHealthResult {
  healthy: boolean;
  latency: number;
  error?: string;
  timestamp: string;
}

/**
 * Check database health by running a simple query
 * @returns Health status with latency
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // Run a simple query to check connectivity (Accelerate-compatible)
    await prismadb.idSequence.findFirst({ select: { id: true } });
    
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency,
      timestamp,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("[DATABASE_HEALTH_CHECK] Failed:", errorMessage);
    
    return {
      healthy: false,
      latency,
      error: errorMessage,
      timestamp,
    };
  }
}

/**
 * Check if database connection is ready
 * Throws error if connection fails
 */
export async function ensureDatabaseConnected(): Promise<void> {
  try {
    await prismadb.$connect();
  } catch (error) {
    console.error("[DATABASE] Connection failed:", error);
    throw new Error("Database connection failed");
  }
}

/**
 * Gracefully disconnect from database
 * Useful for cleanup in tests or graceful shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prismadb.$disconnect();
    console.log("[DATABASE] Disconnected successfully");
  } catch (error) {
    console.error("[DATABASE] Disconnect error:", error);
  }
}
