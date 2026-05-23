/**
 * lib/app-access.ts
 *
 * Utilities for the app access code gate.
 *
 * The gate is a 6-digit PIN stored in APP_ACCESS_CODE env var.
 * When a user enters the correct code, they receive a signed HttpOnly cookie
 * that proves they've been granted access. The cookie cannot be forged without
 * knowing both the access code AND the APP_ACCESS_COOKIE_SECRET.
 *
 * Cookie format: HMAC-SHA256(APP_ACCESS_CODE, APP_ACCESS_COOKIE_SECRET) as hex
 *
 * To invalidate all sessions: rotate APP_ACCESS_COOKIE_SECRET.
 * To change the access code:  update APP_ACCESS_CODE (also invalidates all sessions).
 * To disable the gate:         unset APP_ACCESS_CODE.
 */

import { createHmac, timingSafeEqual } from "crypto";

export const ACCESS_COOKIE_NAME = "oik_access";
/** 24 hours in seconds */
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24;

/**
 * Compute the expected cookie token for the given code and secret.
 * Returns a hex-encoded HMAC-SHA256 digest.
 */
export function computeAccessToken(code: string, secret: string): string {
  return createHmac("sha256", secret).update(code).digest("hex");
}

/**
 * Verify whether the given cookie value is the valid access token.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * Returns false if either env var is missing or the value doesn't match.
 */
export function verifyAccessCookie(cookieValue: string | undefined): boolean {
  const code = process.env.APP_ACCESS_CODE;
  const secret = process.env.APP_ACCESS_COOKIE_SECRET;

  if (!code || !secret) return false;
  if (!cookieValue) return false;

  const expected = computeAccessToken(code, secret);

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(cookieValue, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Returns true if the app access gate is enabled (APP_ACCESS_CODE is set).
 */
export function isAccessGateEnabled(): boolean {
  return !!process.env.APP_ACCESS_CODE;
}

// ============================================
// Staging gate aliases (v2.0 naming)
// ============================================

export const STAGING_COOKIE_NAME = "oik_staging";
/** 24 hours in seconds — same as ACCESS_COOKIE_MAX_AGE */
export const STAGING_COOKIE_MAX_AGE = ACCESS_COOKIE_MAX_AGE;

/**
 * Compute a staging cookie token (HMAC-SHA256 of code with secret).
 */
export function computeStagingToken(code: string, secret: string): string {
  return computeAccessToken(code, secret);
}

/**
 * Verify whether the given cookie value is the valid staging access token.
 * Alias for verifyAccessCookie — uses STAGING_ACCESS_CODE / STAGING_COOKIE_SECRET env vars.
 */
export function verifyStagingCookie(cookieValue: string | undefined): boolean {
  const code = (process.env.STAGING_PASSCODE ?? process.env.STAGING_ACCESS_CODE ?? process.env.APP_ACCESS_CODE)?.trim();
  const secret = (process.env.STAGING_PASSCODE_SECRET ?? process.env.STAGING_COOKIE_SECRET ?? process.env.APP_ACCESS_COOKIE_SECRET)?.trim();

  if (!code || !secret) return false;
  if (!cookieValue) return false;

  const expected = computeAccessToken(code, secret);

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(cookieValue, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Returns true if the staging access gate is enabled.
 */
export function isStagingGateEnabled(): boolean {
  return !!(process.env.STAGING_PASSCODE ?? process.env.STAGING_ACCESS_CODE ?? process.env.APP_ACCESS_CODE);
}
