"use server"

import { prismadb } from "@/lib/prisma"
import { serializeCampaign, type SerializedCampaign } from "./get-campaigns"
import type { EmailBlock } from "@/lib/communication/types"

interface UpdateCampaignData {
  subject?: string
  previewText?: string
  content?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  blocks?: EmailBlock[]
  audienceId?: string
  tags?: string[]
}

export async function updateCampaign(
  id: string,
  data: UpdateCampaignData
): Promise<SerializedCampaign> {
  // Verify the campaign exists and is in an editable state
  const existing = await prismadb.newsletterCampaign.findUnique({
    where: { id },
    select: { status: true },
  })

  if (!existing) {
    throw new Error("Campaign not found")
  }

  if (existing.status !== "DRAFT" && existing.status !== "SCHEDULED") {
    throw new Error(
      `Cannot update a campaign with status "${existing.status}". Only DRAFT or SCHEDULED campaigns can be updated.`
    )
  }

  const campaign = await prismadb.newsletterCampaign.update({
    where: { id },
    data: {
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.previewText !== undefined && { previewText: data.previewText }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.fromName !== undefined && { fromName: data.fromName }),
      ...(data.fromEmail !== undefined && { fromEmail: data.fromEmail }),
      ...(data.replyTo !== undefined && { replyTo: data.replyTo }),
      ...(data.blocks !== undefined && { blocks: data.blocks }),
      ...(data.audienceId !== undefined && { audienceId: data.audienceId }),
      ...(data.tags !== undefined && { tags: data.tags }),
    },
  })

  return serializeCampaign(campaign)
}
