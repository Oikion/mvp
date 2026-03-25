import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { checkAttempt } from "@/lib/security/brute-force";

/**
 * GET /api/e2ee/pepper — Fetch authenticated user's pepper
 * This is the most security-sensitive E2EE endpoint.
 * Only returns the pepper for the authenticated user.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate-limit PIN unlock attempts before handing out the pepper
    const rateLimit = await checkAttempt("pin", userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many PIN attempts. Try again later.", retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    const record = await prismadb.userE2eePepper.findUnique({
      where: { userId },
      select: { pepper: true },
    });

    if (!record) {
      return NextResponse.json({ error: "E2EE not set up" }, { status: 404 });
    }

    return NextResponse.json({ pepper: record.pepper });
  } catch (error) {
    console.error("[E2EE Pepper GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
