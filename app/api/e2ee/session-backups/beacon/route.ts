import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * POST /api/e2ee/session-backups/beacon
 *
 * Receives best-effort session markers from navigator.sendBeacon during page unload.
 * Since ECIES encryption requires async WebCrypto (incompatible with synchronous sendBeacon),
 * the beacon only receives session key identifiers, not encrypted data.
 *
 * The primary backup mechanism is the 5-second debounced flush() in SessionBackupManager.
 * This endpoint exists as a signal that some sessions may need backup on next login.
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return new NextResponse(null, { status: 401 });
    }

    // Parse text/plain body from sendBeacon
    const text = await req.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return new NextResponse(null, { status: 400 });
    }

    // Log for observability — these markers indicate stale backups
    if (payload && typeof payload === "object" && "pendingSessions" in payload) {
      const sessions = (payload as { pendingSessions: unknown[] }).pendingSessions;
      console.info(`[E2EE_BEACON] User ${userId} has ${Array.isArray(sessions) ? sessions.length : 0} pending session backups`);
    }

    // sendBeacon ignores responses, but return 200 for completeness
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[E2EE_BEACON]", error);
    return new NextResponse(null, { status: 500 });
  }
}
