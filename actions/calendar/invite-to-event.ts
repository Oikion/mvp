"use server";

import { prismaForOrg } from "@/lib/tenant";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { createNotificationsForUsers } from "@/actions/notifications/create-notification";
import { revalidatePath } from "next/cache";
import { requireAction } from "@/lib/permissions";

export interface InviteToEventParams {
  eventId: string;
  userIds: string[];
}

export interface InviteToEventResult {
  success: boolean;
  count?: number;
  message?: string;
  error?: string;
}

export async function inviteToEvent({ eventId, userIds }: InviteToEventParams): Promise<InviteToEventResult> {
  try {
    // Permission check: Users need calendar:invite permission
    const guard = await requireAction("calendar:invite");
    if (guard) return { success: false, error: guard.error };

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    // Get the event
    const event = await prismaTenant.calendarEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        startTime: true,
        organizationId: true,
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Filter out users who are already invited
    const existingInvites = await prismaTenant.eventInvitee.findMany({
      where: {
        eventId,
        userId: { in: userIds },
      },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingInvites.map((i) => i.userId));
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return { success: true, count: 0, message: "All users already invited" };
    }

    // Create invitations
    await prismaTenant.eventInvitee.createMany({
      data: newUserIds.map((userId) => ({
        id: crypto.randomUUID(),
        eventId,
        userId,
        organizationId,
        status: "PENDING",
      })),
    });

    // Send notifications to all new invitees
    await createNotificationsForUsers(newUserIds, {
      type: "EVENT_INVITATION",
      title: "Event Invitation",
      message: `${currentUser.name || currentUser.email} invited you to "${event.title || "an event"}"`,
      entityType: "EVENT",
      entityId: eventId,
      actorId: currentUser.id,
      actorName: currentUser.name || currentUser.email,
      metadata: {
        eventTitle: event.title,
        eventStartTime: event.startTime.toISOString(),
      },
    });

    revalidatePath(`/calendar/events/${eventId}`);
    revalidatePath("/calendar");

    return {
      success: true,
      count: newUserIds.length,
      message: `${newUserIds.length} invitation(s) sent`,
    };
  } catch (error) {
    console.error("[INVITE_TO_EVENT]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite users to event",
    };
  }
}

export interface RemoveInviteeResult {
  success: boolean;
  error?: string;
}

/**
 * Remove an invitee from an event
 */
export async function removeEventInvitee(eventId: string, userId: string): Promise<RemoveInviteeResult> {
  try {
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    await prismaTenant.eventInvitee.deleteMany({
      where: {
        eventId,
        userId,
        organizationId,
      },
    });

    revalidatePath(`/calendar/events/${eventId}`);
    revalidatePath("/calendar");

    return { success: true };
  } catch (error) {
    console.error("[REMOVE_EVENT_INVITEE]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove invitee",
    };
  }
}







