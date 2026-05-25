"use server"

import { z } from "zod"
import { prismadb } from "@/lib/prisma"
import resendHelper from "@/lib/resend"
import { EMAIL_CONFIG } from "@/lib/resend-segments"
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin"
import { renderCampaignBlocks } from "./render-campaign-blocks"
import type { EmailBlock } from "@/lib/communication/types"

interface SendTestEmailResult {
  success: boolean
  error?: string
}

const emailSchema = z.string().email()

export async function sendTestEmail(
  campaignId: string,
  testEmail: string
): Promise<SendTestEmailResult> {
  const admin = await requirePlatformAdmin()

  const emailParse = emailSchema.safeParse(testEmail)
  if (!emailParse.success) {
    return { success: false, error: "Invalid test email address" }
  }

  try {
    // Load campaign
    const campaign = await prismadb.newsletterCampaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    // Render blocks to HTML
    const blocks = (campaign.blocks ?? []) as EmailBlock[]
    const { html, error: renderError } = await renderCampaignBlocks(
      blocks,
      campaign.previewText ?? undefined
    )

    if (renderError || !html) {
      return { success: false, error: `Failed to render email: ${renderError}` }
    }

    // Personalize with test values
    const personalizedHtml = html
      .replace(/\{\{firstName\}\}/g, "Test")
      .replace(/\{\{lastName\}\}/g, "User")
      .replace(/\{\{email\}\}/g, testEmail)
      .replace(/\{\{name\}\}/g, "Test User")

    // Send single test email
    const resend = await resendHelper()
    const { error } = await resend.emails.send({
      from: EMAIL_CONFIG.FROM,
      to: testEmail,
      subject: `[TEST] ${campaign.subject}`,
      html: personalizedHtml,
    })

    if (error) {
      console.error("[SEND_TEST_EMAIL] Resend error:", error)
      return { success: false, error: error.message ?? "Failed to send test email" }
    }

    await logAdminAction(admin.id, "SEND_TEST_EMAIL", campaignId, {
      subject: campaign.subject,
    }).catch((e) => console.error("[AUDIT_LOG]", e))

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[SEND_TEST_EMAIL]", error)
    return { success: false, error: message }
  }
}
