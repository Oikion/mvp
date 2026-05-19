import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildOAuthUrl } from "@/lib/google-calendar/client";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const url = buildOAuthUrl(state);
  return NextResponse.redirect(url);
}
