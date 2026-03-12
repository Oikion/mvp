import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/consent-bypass?v=<version>
 *
 * Sets the consent_v cookie (so the middleware stops redirecting to
 * consent-required) and then sends the user to /app.
 *
 * Cookie format: "<orgId>:<policyVersion>"
 * This ties the consent to both the org and the policy version, so:
 * - Switching orgs forces a new consent check
 * - A policy version upgrade clears the cookie (via DELETE /api/consent-bypass)
 *
 * Used by the consent-required page when it determines no consent is
 * actually needed (org has no policy set, or user already consented).
 */
export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/app/sign-in", req.url));
  }

  // Only allow integer version values to prevent cookie value manipulation
  const rawVersion = req.nextUrl.searchParams.get("v") ?? "0";
  const version = Number.parseInt(rawVersion, 10) || 0;
  // Embed orgId so consent is org-scoped (switching org triggers re-check)
  const cookieValue = orgId ? `${orgId}:${version}` : String(version);

  const response = NextResponse.redirect(new URL("/app", req.url));
  const cookieOptions = {
    path: "/",
    maxAge: 86400,
    httpOnly: false, // must be readable by middleware (Edge runtime has no Node crypto)
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
  response.cookies.set("consent_v", cookieValue, cookieOptions);
  return response;
}

/**
 * DELETE /api/consent-bypass
 *
 * Clears the consent_v cookie. Called by the data-ownership policy change
 * action to force re-consent on the next page load.
 */
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("consent_v", "", {
    path: "/",
    maxAge: 0,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return response;
}
