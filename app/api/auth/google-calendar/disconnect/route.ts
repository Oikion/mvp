import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { buildOAuthClient } from "@/lib/google-calendar/client";
import { stopWatchChannel } from "@/lib/google-calendar/watch-manager";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prismadb.users.findFirst({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const conn = await prismadb.userGoogleCalendarConnection.findUnique({
    where: { userId: user.id },
    select: { refreshToken: true },
  });
  if (!conn) {
    return NextResponse.json({ error: "No Google connection found" }, { status: 404 });
  }

  // Stop push notification channel before deleting the connection
  await stopWatchChannel(user.id).catch(() => {
    // Non-critical — channel may have already expired
  });

  // Revoke OAuth token with Google
  try {
    const oauth2Client = buildOAuthClient();
    await oauth2Client.revokeToken(decrypt(conn.refreshToken));
  } catch {
    // Continue with local cleanup even if revocation fails (network or already revoked)
  }

  const affectedEvents = await prismadb.calendarEvent.findMany({
    where: { assignedUserId: user.id, googleEventId: { not: null } },
    select: { id: true },
  });
  const affectedEventIds = affectedEvents.map((e) => e.id);

  // Clear googleEventId links and delete the connection record
  await prismadb.$transaction([
    prismadb.calendarReminder.deleteMany({
      where: { eventId: { in: affectedEventIds } },
    }),
    prismadb.calendarEvent.updateMany({
      where: { assignedUserId: user.id, googleEventId: { not: null } },
      data: { googleEventId: null },
    }),
    prismadb.userGoogleCalendarConnection.delete({
      where: { userId: user.id },
    }),
  ]);

  return NextResponse.json({ success: true });
}
