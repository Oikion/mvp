"use server"

import { prismadb } from "@/lib/prisma"
import { CampaignStatus } from "@prisma/client"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { serializeCampaign } from "@/lib/communication/types"
export type { SerializedCampaign } from "@/lib/communication/types"
export { serializeCampaign } from "@/lib/communication/types"

interface GetCampaignsResult {
  campaigns: SerializedCampaign[]
  total: number
  pages: number
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
