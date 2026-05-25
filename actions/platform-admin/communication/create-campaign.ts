"use server"

import { prismadb } from "@/lib/prisma"
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin"
import { serializeCampaign, type SerializedCampaign } from "@/lib/communication/types"

export async function createCampaign(): Promise<SerializedCampaign> {
  const admin = await requirePlatformAdmin()

  const campaign = await prismadb.newsletterCampaign.create({
    data: {
      organizationId: "platform", // Sentinel value: platform-level campaigns don't belong to a tenant org
      subject: "New Campaign",
      content: "",
      blocks: [],
      status: "DRAFT",
    },
  })

  await logAdminAction(admin.id, "CREATE_CAMPAIGN", campaign.id, {
    name: campaign.subject,
  }).catch((e) => console.error("[AUDIT_LOG]", e))

  return serializeCampaign(campaign)
}
