"use server"

import { prismadb } from "@/lib/prisma"
import { CampaignStatus } from "@prisma/client"
import { requirePlatformAdmin } from "@/lib/platform-admin"

interface GetCampaignsResult {
  campaigns: SerializedCampaign[]
  total: number
  pages: number
}

export interface SerializedCampaign {
  id: string
  organizationId: string
  subject: string
  previewText: string | null
  content: string
  fromName: string | null
  fromEmail: string | null
  replyTo: string | null
  status: CampaignStatus
  recipientCount: number
  sentCount: number
  openCount: number
  clickCount: number
  bounceCount: number
  unsubscribeCount: number
  scheduledAt: string | null
  sentAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  createdVia: string | null
  n8nWorkflowId: string | null
  tags: string[]
  resendBatchId: string | null
  blocks: unknown
  audienceId: string | null
}

export async function getCampaigns(
  status: CampaignStatus | "ALL" = "ALL",
  page: number = 1,
  pageSize: number = 20
): Promise<GetCampaignsResult> {
  await requirePlatformAdmin()

  const skip = (page - 1) * pageSize

  const where =
    status === "ALL"
      ? {}
      : { status: status as CampaignStatus }

  const [campaigns, total] = await Promise.all([
    prismadb.newsletterCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prismadb.newsletterCampaign.count({ where }),
  ])

  const pages = Math.ceil(total / pageSize)

  return {
    campaigns: campaigns.map(serializeCampaign),
    total,
    pages,
  }
}

export function serializeCampaign(c: {
  id: string
  organizationId: string
  subject: string
  previewText: string | null
  content: string
  fromName: string | null
  fromEmail: string | null
  replyTo: string | null
  status: CampaignStatus
  recipientCount: number
  sentCount: number
  openCount: number
  clickCount: number
  bounceCount: number
  unsubscribeCount: number
  scheduledAt: Date | null
  sentAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdVia: string | null
  n8nWorkflowId: string | null
  tags: string[]
  resendBatchId: string | null
  blocks: unknown
  audienceId: string | null
}): SerializedCampaign {
  return {
    ...c,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    sentAt: c.sentAt?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}
