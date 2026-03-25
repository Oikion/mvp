"use server"

import { prismadb } from "@/lib/prisma"
import { maskEmail } from "@/lib/communication/types"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { CommunicationEventType } from "@prisma/client"

interface MaskedCommunicationEvent {
  id: string
  campaignId: string
  maskedEmail: string
  eventType: CommunicationEventType
  occurredAt: string
  metadata: unknown
  createdAt: string
}

interface GetCampaignEventsResult {
  events: MaskedCommunicationEvent[]
  total: number
  pages: number
}

export async function getCampaignEvents(
  campaignId: string,
  eventType: CommunicationEventType | "ALL" = "ALL",
  page: number = 1,
  pageSize: number = 50
): Promise<GetCampaignEventsResult> {
  await requirePlatformAdmin()

  const skip = (page - 1) * pageSize

  const where = {
    campaignId,
    ...(eventType !== "ALL" && { eventType: eventType as CommunicationEventType }),
  }

  const [events, total] = await Promise.all([
    prismadb.communicationEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        campaignId: true,
        email: true,
        eventType: true,
        occurredAt: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prismadb.communicationEvent.count({ where }),
  ])

  const pages = Math.ceil(total / pageSize)

  return {
    events: events.map((e) => ({
      id: e.id,
      campaignId: e.campaignId,
      maskedEmail: maskEmail(e.email),
      eventType: e.eventType,
      occurredAt: e.occurredAt.toISOString(),
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    pages,
  }
}
