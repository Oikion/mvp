import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { apiSuccess, apiUnauthorized, apiInternalError } from "@/lib/api-response";

export interface GoogleCalendarConnectionStatus {
  connected: boolean;
  googleEmail: string | null;
  status: "ACTIVE" | "NEEDS_REAUTH" | "PAUSED" | "DISCONNECTED" | null;
  lastSyncedAt: string | null;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiUnauthorized();

    const user = await prismadb.users.findFirst({
      where: { clerkUserId: userId },
      select: {
        GoogleCalendarConnection: {
          select: {
            googleEmail: true,
            status: true,
            lastSyncedAt: true,
          },
        },
      },
    });

    const conn = user?.GoogleCalendarConnection ?? null;

    const payload: GoogleCalendarConnectionStatus = {
      connected: !!conn,
      googleEmail: conn?.googleEmail ?? null,
      status: (conn?.status as GoogleCalendarConnectionStatus["status"]) ?? null,
      lastSyncedAt: conn?.lastSyncedAt?.toISOString() ?? null,
    };

    return apiSuccess(payload);
  } catch (error) {
    console.error("[GOOGLE_CALENDAR_STATUS]", error);
    return apiInternalError("Failed to fetch Google Calendar status", error);
  }
}
