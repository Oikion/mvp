"use server";

import { prismadb } from "@/lib/prisma";
import { UAParser } from "ua-parser-js";

/**
 * Session window in minutes - how often to log a new session
 */
const SESSION_WINDOW_MINUTES = 30;

/**
 * Generate a unique session ID based on user ID and time window
 * Sessions are considered the same within the window period
 */
function generateSessionId(userId: string, windowMinutes: number = SESSION_WINDOW_MINUTES): string {
  const now = new Date();
  // Round down to nearest window
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  const windowDate = new Date(windowStart);
  
  // Format: userId_YYYYMMDD_HHmm (where HHmm is the start of the window)
  const dateStr = windowDate.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = windowDate.toISOString().slice(11, 16).replace(":", "");
  
  return `${userId}_${dateStr}_${timeStr}`;
}

/**
 * Parse user agent string to extract browser, OS, and device info
 */
function parseUserAgent(userAgent: string | undefined): {
  browserName: string | undefined;
  browserVersion: string | undefined;
  osName: string | undefined;
  osVersion: string | undefined;
  deviceType: string | undefined;
} {
  if (!userAgent) {
    return {
      browserName: undefined,
      browserVersion: undefined,
      osName: undefined,
      osVersion: undefined,
      deviceType: undefined,
    };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  let deviceType = "desktop";
  if (result.device.type) {
    deviceType = result.device.type; // mobile, tablet, etc.
  } else if (result.os.name?.toLowerCase().includes("android") || 
             result.os.name?.toLowerCase().includes("ios")) {
    deviceType = "mobile";
  }

  return {
    browserName: result.browser.name || undefined,
    browserVersion: result.browser.version || undefined,
    osName: result.os.name || undefined,
    osVersion: result.os.version || undefined,
    deviceType,
  };
}

export interface LogAdminAccessParams {
  adminUserId: string;
  adminEmail: string;
  adminName: string | null;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

/**
 * Log admin access to the platform admin portal
 * Uses session-based logging - only logs once per session window
 * 
 * @param params - Admin access details
 * @returns true if a new session was logged, false if session already exists
 */
export async function logAdminAccess(params: LogAdminAccessParams): Promise<boolean> {
  const {
    adminUserId,
    adminEmail,
    adminName,
    ipAddress,
    userAgent,
    country,
    city,
  } = params;

  try {
    // Generate session ID for this time window
    const sessionId = generateSessionId(adminUserId);

    // Check if session already exists
    const existingSession = await prismadb.adminAccessLog.findUnique({
      where: { sessionId },
      select: { id: true },
    });

    // If session exists, don't create a new log
    if (existingSession) {
      return false;
    }

    // Parse user agent for browser/device info
    const deviceInfo = parseUserAgent(userAgent);

    // Create new access log entry
    await prismadb.adminAccessLog.create({
      data: {
        adminUserId,
        adminEmail,
        adminName,
        ipAddress,
        userAgent,
        browserName: deviceInfo.browserName,
        browserVersion: deviceInfo.browserVersion,
        osName: deviceInfo.osName,
        osVersion: deviceInfo.osVersion,
        deviceType: deviceInfo.deviceType,
        country,
        city,
        sessionId,
      },
    });

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[ADMIN_ACCESS_LOG]", {
        adminEmail,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  } catch (error) {
    // Don't throw - logging should not break the admin portal
    console.error("[LOG_ADMIN_ACCESS_ERROR]", error);
    return false;
  }
}
