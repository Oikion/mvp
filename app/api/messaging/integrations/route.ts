import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import {
  apiCreated,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  validateBody,
} from "@/lib/api-response";
import { messagingIntegrationCreateSchema } from "@/lib/validations/messaging";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    const organizationId = await getCurrentOrgId();
    
    // Check if MessagingIntegration model exists in schema
    // Return empty array if model doesn't exist yet (schema migration pending)
    try {
      const integrations = await prismadb.messagingIntegration.findMany({
        where: { organizationId },
        include: {
          _count: {
            select: { externalContacts: true },
          },
        },
        orderBy: { connectedAt: "desc" },
      });
      return apiSuccess({ integrations });
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
        return apiSuccess({ integrations: [] });
      }
      throw modelError;
    }
  } catch (error) {
    console.error("[API] Messaging integrations GET error:", error);
    return apiInternalError("Failed to load integrations", error as Error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    const organizationId = await getCurrentOrgId();
    const body = await req.json().catch(() => null);
    const validation = validateBody(body, messagingIntegrationCreateSchema);
    if (!validation.success) {
      return validation.error;
    }

    const data = validation.data;
    const integration = await prismadb.messagingIntegration.create({
      data: {
        organizationId,
        platform: data.platform,
        displayName: data.displayName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : undefined,
        webhookSecret: data.webhookSecret,
        platformAccountId: data.platformAccountId,
        phoneNumber: data.phoneNumber,
        isActive: data.isActive ?? true,
      },
    });

    return apiCreated({ integration });
  } catch (error) {
    console.error("[API] Messaging integrations POST error:", error);
    return apiInternalError("Failed to create integration", error as Error);
  }
}
