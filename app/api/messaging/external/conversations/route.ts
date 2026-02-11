import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import {
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    const organizationId = await getCurrentOrgId();
    
    // Check if ExternalContact model exists in schema
    // Return empty array if model doesn't exist yet (schema migration pending)
    try {
      const contacts = await prismadb.externalContact.findMany({
        where: {
          integration: {
            organizationId,
          },
        },
        include: {
          integration: {
            select: {
              id: true,
              platform: true,
              displayName: true,
              isActive: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              createdAt: true,
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      });

      const conversations = contacts.map((contact) => ({
        id: contact.id,
        integrationId: contact.integrationId,
        platform: contact.integration.platform,
        displayName: contact.displayName ?? contact.phoneNumber ?? contact.platformUserId,
        avatarUrl: contact.avatarUrl,
        lastMessage: contact.messages[0]
          ? {
              id: contact.messages[0].id,
              content: contact.messages[0].content,
              createdAt: contact.messages[0].createdAt,
            }
          : null,
        unreadCount: 0,
        isActive: contact.integration.isActive,
      }));

      return apiSuccess({ conversations });
    } catch (modelError: unknown) {
      // Model/table doesn't exist yet - return empty array
      // P2021: Table does not exist, P2022: Column does not exist
      const prismaError = modelError as { code?: string; message?: string };
      if (
        prismaError.code === "P2021" ||
        prismaError.code === "P2022" ||
        prismaError.message?.includes("does not exist") ||
        prismaError.message?.includes("Unknown arg")
      ) {
        return apiSuccess({ conversations: [] });
      }
      throw modelError;
    }
  } catch (error) {
    console.error("[API] External conversations GET error:", error);
    return apiInternalError("Failed to load external conversations", error as Error);
  }
}
