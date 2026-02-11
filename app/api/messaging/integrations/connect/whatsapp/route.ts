import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { MessagingPlatform } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import {
  apiBadRequest,
  apiCreated,
  apiInternalError,
  apiUnauthorized,
  validateBody,
} from "@/lib/api-response";
import { generateWebhookSecret } from "@/lib/webhooks";

const GRAPH_VERSION = "v18.0";

/** Body when using Embedded Signup: code + ids from WA_EMBEDDED_SIGNUP message event */
const whatsappCodeSchema = z
  .object({
    code: z.string().min(1),
    phoneNumberId: z.string().min(1),
    wabaId: z.string().min(1).optional(),
    displayPhoneNumber: z.string().optional(),
  })
  .strict();

/** Body when using manual token (e.g. dev): accessToken + optional ids */
const whatsappTokenSchema = z
  .object({
    accessToken: z.string().min(1),
    displayName: z.string().min(1).optional(),
    platformAccountId: z.string().min(1).optional(),
    phoneNumber: z.string().min(1).optional(),
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
    if (!body || typeof body !== "object") {
      return apiBadRequest("Invalid body");
    }

    let accessToken: string;
    let platformAccountId: string | undefined;
    let phoneNumber: string | undefined;
    let displayName: string | undefined;

    if ("code" in body && body.code) {
      const validation = validateBody(body, whatsappCodeSchema);
      if (!validation.success) {
        return validation.error;
      }
      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;
      const redirectUri =
        process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost";
      if (!appId || !appSecret) {
        return apiBadRequest("WhatsApp Embedded Signup is not configured");
      }
      const tokenUrl = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(validation.data.code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = (await tokenRes.json().catch(() => null)) as {
        access_token?: string;
        error?: { message?: string };
      };
      if (!tokenRes.ok || !tokenData.access_token) {
        return apiBadRequest(
          tokenData.error?.message ?? "Failed to exchange code for token"
        );
      }
      accessToken = tokenData.access_token;
      platformAccountId = validation.data.phoneNumberId;
      phoneNumber = validation.data.displayPhoneNumber;
      displayName = "WhatsApp";
    } else {
      const validation = validateBody(body, whatsappTokenSchema);
      if (!validation.success) {
        return validation.error;
      }
      accessToken = validation.data.accessToken;
      platformAccountId = validation.data.platformAccountId;
      phoneNumber = validation.data.phoneNumber;
      displayName = validation.data.displayName ?? "WhatsApp";
    }

    const webhookSecret = generateWebhookSecret();
    const integration = await prismadb.messagingIntegration.create({
      data: {
        organizationId,
        platform: MessagingPlatform.WHATSAPP,
        displayName,
        accessToken,
        platformAccountId,
        phoneNumber,
        webhookSecret,
      },
    });

    return apiCreated({ integration });
  } catch (error) {
    console.error("[API] WhatsApp connect error:", error);
    return apiInternalError("Failed to connect WhatsApp", error as Error);
  }
}
