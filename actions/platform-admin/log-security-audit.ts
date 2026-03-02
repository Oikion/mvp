"use server";

import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { parseUserAgent } from "@/lib/user-agent-parser";

export type AdminSecurityEventType = 
  | "ACCESS_GRANTED"
  | "ACCESS_DENIED"
  | "UNAUTHORIZED"
  | "SUSPICIOUS_ACTIVITY"
  | "ERROR";

export interface LogSecurityAuditParams {
  eventType: AdminSecurityEventType;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  denialReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log security audit event for admin portal access
 *
 * CRITICAL SECURITY FUNCTION:
 * @auth-exempt: intentionally unauthenticated — must log UNAUTHORIZED/ACCESS_DENIED
 * events for users who are NOT yet authenticated. Adding auth here would break
 * the audit trail for failed auth attempts.
 * - Logs ALL access attempts (successful and failed)
 * - MUST NOT throw errors (logging failures should not break the app)
 * - Failures are logged to console for monitoring
 * - This creates an immutable audit trail
 *
 * @param params - Security audit event details
 * @returns true if logged successfully, false otherwise
 */
export async function logSecurityAudit(params: LogSecurityAuditParams): Promise<boolean> {
  const {
    eventType,
    userId,
    userEmail,
    userName,
    ipAddress,
    userAgent,
    country,
    city,
    path,
    method,
    statusCode,
    denialReason,
    metadata,
  } = params;

  try {
    // Parse user agent for browser/device info
    const deviceInfo = parseUserAgent(userAgent);

    // Create audit log entry
    await prismadb.adminSecurityAudit.create({
      data: {
        eventType,
        userId: userId || null,
        userEmail: userEmail || null,
        userName: userName || null,
        ipAddress,
        userAgent,
        browserName: deviceInfo.browserName,
        browserVersion: deviceInfo.browserVersion,
        osName: deviceInfo.osName,
        osVersion: deviceInfo.osVersion,
        deviceType: deviceInfo.deviceType,
        country,
        city,
        path,
        method,
        statusCode,
        denialReason,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    // Log to console for immediate visibility
    if (process.env.NODE_ENV !== "production") {
      console.log("[ADMIN_SECURITY_AUDIT]", {
        eventType,
        userId,
        userEmail,
        path,
        statusCode,
        denialReason,
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  } catch (error) {
    // CRITICAL: Always log failures for security monitoring
    console.error("[SECURITY_AUDIT_ERROR]", {
      error,
      eventType,
      userId,
      userEmail,
      path,
      timestamp: new Date().toISOString(),
      message: "CRITICAL: Security audit logging failed - investigate immediately",
    });
    
    // Don't throw - audit logging must not break the application
    return false;
  }
}

/**
 * Log successful admin access
 */
export async function logAdminAccessGranted(params: {
  userId: string;
  userEmail: string;
  userName?: string | null;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
}): Promise<void> {
  await logSecurityAudit({
    eventType: "ACCESS_GRANTED",
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    path: params.path,
    statusCode: 200,
  });
}

/**
 * Log denied admin access attempt
 */
export async function logAdminAccessDenied(params: {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  denialReason: string;
}): Promise<void> {
  await logSecurityAudit({
    eventType: "ACCESS_DENIED",
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    path: params.path,
    statusCode: 403,
    denialReason: params.denialReason,
  });
}

/**
 * Log unauthorized access attempt (not authenticated)
 */
export async function logUnauthorizedAccess(params: {
  ipAddress?: string;
  userAgent?: string;
  path?: string;
}): Promise<void> {
  await logSecurityAudit({
    eventType: "UNAUTHORIZED",
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    path: params.path,
    statusCode: 401,
    denialReason: "Not authenticated",
  });
}
