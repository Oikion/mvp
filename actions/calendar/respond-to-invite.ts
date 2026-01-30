"use server";

import { prismaForOrg } from "@/lib/tenant";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { createNotification } from "@/actions/notifications/create-notification";
import { revalidatePath } from "next/cache";
import { InviteStatus } from "@prisma/client";
import { requireAction } from "@/lib/permissions";

export type InviteResponse = "ACCEPTED" | "DECLINED" | "TENTATIVE";

export interface RespondToInviteParams {
  eventId: string;
  response: InviteResponse;
}

export async function respondToEventInvite({ eventId, response }: RespondToInviteParams) {
  try {
    // Permission check: Users need calendar:respond_invite permission
    const guard = await requireAction("calendar:respond_invite");
    if (guard) throw new Error(guard.error);

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    // Find the invitation
    const invitation = await prismaTenant.eventInvitee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: currentUser.id,
        },
      },
      include: {
        CalComEvent: {
          select: {
            id: true,
            title: true,
            assignedUserId: true,
            Users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Update the invitation status
    await prismaTenant.eventInvitee.update({
      where: {
        eventId_userId: {
          eventId,
          userId: currentUser.id,
        },
      },
      data: {
        status: response as InviteStatus,
        respondedAt: new Date(),
      },
    });

    // Notify the event owner about the response
    if (invitation.CalComEvent.assignedUserId && invitation.CalComEvent.assignedUserId !== currentUser.id) {
      const responseText = response === "ACCEPTED" 
        ? "accepted" 
        : response === "DECLINED" 
          ? "declined" 
          : "tentatively accepted";

      await createNotification({
        userId: invitation.CalComEvent.assignedUserId,
        type: "EVENT_RESPONSE",
        title: "Event Response",
        message: `${currentUser.name || currentUser.email} ${responseText} your invitation to "${invitation.CalComEvent.title || "an event"}"`,
        entityType: "EVENT",
        entityId: eventId,
        actorId: currentUser.id,
        actorName: currentUser.name || currentUser.email,
        metadata: {
          response,
          eventTitle: invitation.CalComEvent.title,
        },
      });
    }

    revalidatePath(`/calendar/events/${eventId}`);
    revalidatePath("/calendar");

    return {
      success: true,
      message: `Response recorded: ${response}`,
    };
  } catch (error) {
    console.error("[RESPOND_TO_INVITE]", error);
    throw error;
  }
}







