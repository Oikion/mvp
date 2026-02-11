import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { MessagingPlatform } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import {
  apiCreated,
  apiInternalError,
  apiUnauthorized,
  validateBody,
} from "@/lib/api-response";
import { generateWebhookSecret } from "@/lib/webhooks";

const messengerConnectSchema = z
  .object({
    accessToken: z.string().min(1),
    displayName: z.string().min(1).optional(),
    platformAccountId: z.string().min(1).optional(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    const organizationId = await getCurrentOrgId();
    const body = await req.json().catch(() => null);
    const validation = validateBody(body, messengerConnectSchema);
    if (!validation.success) {
      return validation.error;
    }

    const webhookSecret = generateWebhookSecret();
    const integration = await prismadb.messagingIntegration.create({
      data: {
        organizationId,
        platform: MessagingPlatform.MESSENGER,
        displayName: validation.data.displayName ?? "Messenger",
        accessToken: validation.data.accessToken,
        platformAccountId: validation.data.platformAccountId,
        webhookSecret,
      },
    });

    return apiCreated({ integration });
  } catch (error) {
    console.error("[API] Messenger connect error:", error);
    return apiInternalError("Failed to connect Messenger", error as Error);
  }
}
