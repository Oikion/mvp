"use server"

import { prismadb } from "@/lib/prisma"
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin"

interface DeleteCampaignResult {
  success: boolean
  error?: string
}

export async function deleteCampaign(id: string): Promise<DeleteCampaignResult> {
  const admin = await requirePlatformAdmin()

  try {
    const existing = await prismadb.newsletterCampaign.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!existing) {
      return { success: false, error: "Campaign not found" }
    }

    if (existing.status !== "DRAFT" && existing.status !== "FAILED") {
      return {
        success: false,
        error: `Cannot delete a campaign with status "${existing.status}". Only DRAFT or FAILED campaigns can be deleted.`,
      }
    }

    await prismadb.newsletterCampaign.delete({ where: { id } })

    await logAdminAction(admin.id, "DELETE_CAMPAIGN", id, {}).catch((e) =>
      console.error("[AUDIT_LOG]", e)
    )

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[DELETE_CAMPAIGN]", error)
    return { success: false, error: message }
  }
}
