// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  STAGING_COOKIE_MAX_AGE,
  STAGING_COOKIE_NAME,
  computeStagingToken,
} from "@/lib/app-access";
import { timingSafeEqual } from "crypto";

export async function POST(req: NextRequest) {
  const code = process.env.STAGING_PASSCODE;
  const secret = process.env.STAGING_PASSCODE_SECRET;

  // Gate disabled — grant access immediately
  if (!code || !secret) {
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
    const maxLen = Math.max(code.length, submitted.length);
    const a = Buffer.from(code.padEnd(maxLen, "\0"), "utf8");
    const b = Buffer.from(submitted.padEnd(maxLen, "\0"), "utf8");
    matches = code.length === submitted.length && timingSafeEqual(a, b);
  } catch {
    matches = false;
  }

  if (!matches) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  // Set the signed staging cookie
  const token = computeStagingToken(code, secret);
  const response = NextResponse.json({ success: true });
  response.cookies.set(STAGING_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: STAGING_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
