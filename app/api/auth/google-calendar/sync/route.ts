import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { syncAllEventsFromGoogle } from "@/lib/google-calendar/sync-from-google";
import { apiUnauthorized, apiInternalError } from "@/lib/api-response";

export async function POST() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return apiUnauthorized();

  const user = await prismadb.users.findFirst({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!user) return apiUnauthorized();

  const conn = await prismadb.userGoogleCalendarConnection.findUnique({
    where: { userId: user.id },
    select: { organizationId: true, status: true, syncEnabled: true },
  });

  if (!conn || !conn.syncEnabled || conn.status === "DISCONNECTED") {
    return NextResponse.json({ error: "No active Google Calendar connection" }, { status: 400 });
  }

  try {
    const result = await syncAllEventsFromGoogle(user.id, conn.organizationId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[GOOGLE_CALENDAR_SYNC]", error);
    return apiInternalError("Sync failed", error);
  }
}
