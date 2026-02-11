import { z } from "zod";
import { MessagingPlatform } from "@prisma/client";

export const messagingIntegrationCreateSchema = z
  .object({
    platform: z.nativeEnum(MessagingPlatform),
    displayName: z.string().min(1).max(120).optional(),
    accessToken: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional(),
    tokenExpiresAt: z.string().datetime().optional(),
    webhookSecret: z.string().min(1).optional(),
    platformAccountId: z.string().min(1).optional(),
    phoneNumber: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const messagingIntegrationUpdateSchema = messagingIntegrationCreateSchema
  .omit({ platform: true })
  .partial()
  .strict();

export const externalMessageSendSchema = z
  .object({
    integrationId: z.string().min(1),
    contactId: z.string().min(1),
    content: z.string().min(1).max(10000),
  })
  .strict();
