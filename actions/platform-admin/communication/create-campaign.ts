"use server"

import { prismadb } from "@/lib/prisma"
import { serializeCampaign, type SerializedCampaign } from "./get-campaigns"

export async function createCampaign(): Promise<SerializedCampaign> {
  const campaign = await prismadb.newsletterCampaign.create({
    data: {
      organizationId: "platform",
      subject: "New Campaign",
      content: "",
      blocks: [],
      status: "DRAFT",
    },
  })

  return serializeCampaign(campaign)
}
