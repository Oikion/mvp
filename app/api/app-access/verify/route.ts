import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_COOKIE_NAME,
  computeAccessToken,
  verifyAccessCookie,
} from "@/lib/app-access";
import { timingSafeEqual } from "crypto";

export async function POST(req: NextRequest) {
  const code = process.env.APP_ACCESS_CODE;
  const secret = process.env.APP_ACCESS_COOKIE_SECRET;

  // Gate disabled — grant access immediately
  if (!code || !secret) {
    return NextResponse.json({ success: true });
  }

  // Already verified — no need to re-check
  const existingCookie = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (verifyAccessCookie(existingCookie)) {
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

  // Constant-time comparison to prevent timing attacks
  let matches = false;
  try {
    const a = Buffer.from(code, "utf8");
    const b = Buffer.from(submitted.padEnd(code.length, "\0"), "utf8");
    // Only safe-compare if lengths match; length check itself leaks nothing sensitive
    if (submitted.length === code.length) {
      matches = timingSafeEqual(a, b);
    }
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
