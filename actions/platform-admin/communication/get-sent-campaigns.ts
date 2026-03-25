"use server"

import { prismadb } from "@/lib/prisma"
import { CampaignStatus } from "@prisma/client"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { serializeCampaign, type SerializedCampaign } from "@/lib/communication/types"

interface GetSentCampaignsResult {
  campaigns: SerializedCampaign[]
  total: number
  pages: number
}

export async function getSentCampaigns(
  page: number = 1,
  pageSize: number = 20
): Promise<GetSentCampaignsResult> {
  await requirePlatformAdmin()

  const skip = (page - 1) * pageSize

  const where = {
    status: {
      in: [CampaignStatus.SENT, CampaignStatus.SENDING, CampaignStatus.FAILED],
    },
  }

  const [campaigns, total] = await Promise.all([
    prismadb.newsletterCampaign.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        organizationId: true,
        subject: true,
        previewText: true,
        content: true,
        fromName: true,
        fromEmail: true,
        replyTo: true,
        status: true,
        recipientCount: true,
        sentCount: true,
        openCount: true,
        clickCount: true,
        bounceCount: true,
        unsubscribeCount: true,
        scheduledAt: true,
        sentAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        createdVia: true,
        n8nWorkflowId: true,
        tags: true,
        resendBatchId: true,
        blocks: true,
        audienceId: true,
      },
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
