import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_COOKIE_NAME,
  computeAccessToken,
} from "@/lib/app-access";
import { timingSafeEqual } from "crypto";

export async function POST(req: NextRequest) {
  const code = process.env.APP_ACCESS_CODE;
  const secret = process.env.APP_ACCESS_COOKIE_SECRET;

  // Gate disabled — grant access immediately
  if (!code || !secret) {
    if (code && !secret) {
      console.error("[APP_ACCESS] APP_ACCESS_COOKIE_SECRET is not configured");
      return NextResponse.json({ error: "Access gate misconfigured" }, { status: 503 });
    }
    return NextResponse.json({ success: true });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const submitted = (body.code ?? "").trim();
  if (!submitted) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  // Always validate the submitted code — never bypass via existing cookie.
  // The proxy handles cookie-based access; this endpoint must verify the code.
  // Constant-time comparison to prevent timing attacks.
  let matches = false;
  try {
    // Pad both to equal length to prevent timingSafeEqual from throwing,
    // while the length check prevents padded values from matching.
    const maxLen = Math.max(code.length, submitted.length);
    const a = Buffer.from(code.padEnd(maxLen, "\0"), "utf8");
    const b = Buffer.from(submitted.padEnd(maxLen, "\0"), "utf8");
    // Evaluate both checks independently so timingSafeEqual always runs — short-circuiting
    // `length === length && timingSafeEqual(...)` would leak secret length via timing.
    const lengthMatch = code.length === submitted.length;
    const bufferMatch = timingSafeEqual(a, b);
    matches = lengthMatch && bufferMatch;
  } catch {
    matches = false;
  }

  if (!matches) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  // Set the signed access cookie
  const token = computeAccessToken(code, secret);
  const response = NextResponse.json({ success: true });
  response.cookies.set(ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
