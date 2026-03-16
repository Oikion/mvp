"use server"

import { prismadb } from "@/lib/prisma"
import resendHelper from "@/lib/resend"
import { EMAIL_CONFIG } from "@/lib/resend-segments"
import { renderCampaignBlocks } from "./render-campaign-blocks"
import type { EmailBlock } from "@/lib/communication/types"

interface SendTestEmailResult {
  success: boolean
  error?: string
}

export async function sendTestEmail(
  campaignId: string,
  testEmail: string
): Promise<SendTestEmailResult> {
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

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[SEND_TEST_EMAIL]", error)
    return { success: false, error: message }
  }
}
