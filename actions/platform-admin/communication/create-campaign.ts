"use server"

import { prismadb } from "@/lib/prisma"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { serializeCampaign, type SerializedCampaign } from "@/lib/communication/types"

export async function createCampaign(): Promise<SerializedCampaign> {
  await requirePlatformAdmin()

  const campaign = await prismadb.newsletterCampaign.create({
    data: {
      organizationId: "platform", // Sentinel value: platform-level campaigns don't belong to a tenant org
      subject: "New Campaign",
      content: "",
      blocks: [],
      status: "DRAFT",
    },
  })

  return serializeCampaign(campaign)
}
