import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import {
  apiInternalError,
  apiNoContent,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  validateBody,
} from "@/lib/api-response";
import { messagingIntegrationUpdateSchema } from "@/lib/validations/messaging";

interface Params {
  params: Promise<{
    integrationId: string;
  }>;
}

export async function GET(_: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    const organizationId = await getCurrentOrgId();
    const { integrationId } = await params;
    const integration = await prismadb.messagingIntegration.findFirst({
      where: { id: integrationId, organizationId },
      include: {
        _count: {
          select: { externalContacts: true },
        },
      },
    });

    if (!integration) {
      return apiNotFound("Integration");
    }

    return apiSuccess({ integration });
  } catch (error) {
    console.error("[API] Messaging integration GET error:", error);
    return apiInternalError("Failed to load integration", error as Error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    const organizationId = await getCurrentOrgId();
    const { integrationId } = await params;
    const body = await req.json().catch(() => null);
    const validation = validateBody(body, messagingIntegrationUpdateSchema);
    if (!validation.success) {
      return validation.error;
    }

    const data = validation.data;
    const integration = await prismadb.messagingIntegration.updateMany({
      where: { id: integrationId, organizationId },
      data: {
        displayName: data.displayName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : undefined,
        webhookSecret: data.webhookSecret,
        platformAccountId: data.platformAccountId,
        phoneNumber: data.phoneNumber,
        isActive: data.isActive,
      },
    });

    if (integration.count === 0) {
      return apiNotFound("Integration");
    }

    return apiSuccess({ updated: true });
  } catch (error) {
    console.error("[API] Messaging integration PATCH error:", error);
    return apiInternalError("Failed to update integration", error as Error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    const organizationId = await getCurrentOrgId();
    const { integrationId } = await params;
    const result = await prismadb.messagingIntegration.deleteMany({
      where: { id: integrationId, organizationId },
    });

    if (result.count === 0) {
      return apiNotFound("Integration");
    }

    return apiNoContent();
  } catch (error) {
    console.error("[API] Messaging integration DELETE error:", error);
    return apiInternalError("Failed to delete integration", error as Error);
  }
}
