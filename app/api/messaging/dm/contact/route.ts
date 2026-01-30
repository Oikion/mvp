import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { generateFriendlyId } from "@/lib/friendly-id";

/**
 * POST /api/messaging/dm/contact
 * 
 * Start a conversation linked to a client contact.
 * This creates an internal discussion thread about the contact.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get the contact
    const contact = await prismadb.client_Contacts.findFirst({
      where: {
        id: contactId,
        organizationId,
      },
      select: {
        id: true,
        contact_first_name: true,
        contact_last_name: true,
        assigned_to: true,
        clientsIDs: true,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Check if there's already a conversation linked to this contact
    const existingConversation = await prismadb.conversation.findFirst({
      where: {
        entityType: "CLIENT",
        entityId: contactId,
        organizationId,
      },
    });

    if (existingConversation) {
      return NextResponse.json({
        conversationId: existingConversation.id,
      });
    }

    // Get participants (current user + assigned user if different)
    const participantIds = [currentUser.id];
    if (contact.assigned_to && contact.assigned_to !== currentUser.id) {
      participantIds.push(contact.assigned_to);
    }

    // Create conversation linked to contact
    const contactName = [contact.contact_first_name, contact.contact_last_name]
      .filter(Boolean)
      .join(" ") || "Unknown Contact";

    const conversationId = await generateFriendlyId(prismadb, "Conversation");
    const conversation = await prismadb.conversation.create({
      data: {
        id: conversationId,
        organizationId,
        name: contactName,
        isGroup: false,
        createdById: currentUser.id,
        entityType: "CLIENT",
        entityId: contactId,
        participants: {
          create: participantIds.map((userId) => ({ userId })),
        },
      },
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      for (const participantUserId of participantIds) {
        if (participantUserId !== currentUser.id) {
          await publishToChannel(
            getUserChannelName(participantUserId),
            "conversation:created",
            {
              id: conversation.id,
              name: contactName,
              isGroup: false,
              entityType: "CLIENT",
              entityId: contactId,
            }
          );
        }
      }
    } catch {
      // Ably not configured, skip real-time notification
    }

    return NextResponse.json({
      conversationId: conversation.id,
    }, { status: 201 });
  } catch (error) {
    console.error("[API] Start contact DM error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
