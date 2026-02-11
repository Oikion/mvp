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

const viberConnectSchema = z
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
    const validation = validateBody(body, viberConnectSchema);
    if (!validation.success) {
      return validation.error;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const webhookUrl = baseUrl ? `${baseUrl}/api/messaging/webhooks/viber` : "";
    if (webhookUrl) {
      const setWebhookRes = await fetch("https://chatapi.viber.com/pa/set_webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Viber-Auth-Token": validation.data.accessToken,
        },
        body: JSON.stringify({
          url: webhookUrl,
          event_types: ["delivered", "seen", "failed", "subscribed", "unsubscribed", "conversation_started", "message"],
          send_name: true,
          send_photo: true,
        }),
      });
      const setWebhookData = (await setWebhookRes.json().catch(() => null)) as { status?: number };
      if (!setWebhookRes.ok || setWebhookData.status !== 0) {
        console.error("[API] Viber set_webhook failed:", setWebhookRes.status, setWebhookData);
      }
    }

    const webhookSecret = generateWebhookSecret();
    const integration = await prismadb.messagingIntegration.create({
      data: {
        organizationId,
        platform: MessagingPlatform.VIBER,
        displayName: validation.data.displayName ?? "Viber",
        accessToken: validation.data.accessToken,
        platformAccountId: validation.data.platformAccountId,
        webhookSecret,
      },
    });

    return apiCreated({ integration });
  } catch (error) {
    console.error("[API] Viber connect error:", error);
    return apiInternalError("Failed to connect Viber", error as Error);
  }
}
