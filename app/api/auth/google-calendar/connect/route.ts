import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildOAuthUrl } from "@/lib/google-calendar/client";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

const ALLOWED_RETURN_PREFIX = "/app/";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };

  cookieStore.set("gcal_oauth_state", state, cookieOptions);

  // Store an optional returnTo path so the callback can redirect back to the caller.
  // Validate it is an internal path to prevent open-redirect.
  const returnTo = req.nextUrl.searchParams.get("returnTo");
  if (returnTo && returnTo.startsWith(ALLOWED_RETURN_PREFIX) && !returnTo.includes("//")) {
    cookieStore.set("gcal_return_to", returnTo, cookieOptions);
  }

  const url = buildOAuthUrl(state);
  return NextResponse.redirect(url);
}
