import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { publishToChannel, getPresenceChannelName } from "@/lib/ably";

/**
 * POST /api/messaging/presence
 * Lightweight endpoint for sendBeacon-based presence updates (page unload).
 * Only supports setting OFFLINE status — other status changes use the server action.
 */
export async function POST(req: Request) {
  try {
    const { userId: clerkUserId, orgId } = await auth();
    if (!clerkUserId || !orgId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // sendBeacon sends text/plain; use req.text() + manual parse to avoid
    // req.json() throwing on non-application/json Content-Type in some runtimes
    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return new NextResponse("Invalid request body", { status: 400 });
    }
    if (body?.status !== "OFFLINE") {
      return new NextResponse("Only OFFLINE status supported via this endpoint", { status: 400 });
    }

    // Find the internal user ID from Clerk ID
    const user = await prismadb.users.findFirst({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Update DB
    await prismadb.userPresence.upsert({
      where: { userId: user.id },
      create: { userId: user.id, status: "OFFLINE" },
      update: { status: "OFFLINE", lastSeenAt: new Date() },
    });

    // Broadcast via Ably
    await publishToChannel(
      getPresenceChannelName(orgId),
      "presence",
      { userId: user.id, status: "OFFLINE" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PRESENCE_BEACON]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
