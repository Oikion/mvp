"use server"

import { prismadb } from "@/lib/prisma"
import resendHelper from "@/lib/resend"
import { EMAIL_CONFIG } from "@/lib/resend-segments"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { renderCampaignBlocks } from "./render-campaign-blocks"
import type { EmailBlock } from "@/lib/communication/types"

interface SendCampaignResult {
  success: boolean
  sentCount?: number
  error?: string
}

function personalizeHtml(
  html: string,
  vars: { firstName: string; lastName: string; email: string; name: string }
): string {
  return html
    .replace(/\{\{firstName\}\}/g, vars.firstName)
    .replace(/\{\{lastName\}\}/g, vars.lastName)
    .replace(/\{\{email\}\}/g, vars.email)
    .replace(/\{\{name\}\}/g, vars.name)
}

export async function sendCampaign(campaignId: string): Promise<SendCampaignResult> {
  await requirePlatformAdmin()

  try {
    // 1. Load campaign
    const campaign = await prismadb.newsletterCampaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
      return {
        success: false,
        error: `Campaign must be DRAFT or SCHEDULED to send (current: ${campaign.status})`,
      }
    }

    if (!campaign.audienceId) {
      return { success: false, error: "Campaign has no audienceId set" }
    }

    // 2. Render HTML from blocks
    const blocks = (campaign.blocks ?? []) as EmailBlock[]
    const { html, error: renderError } = await renderCampaignBlocks(
      blocks,
      campaign.previewText ?? undefined
    )

    if (renderError || !html) {
      return { success: false, error: `Failed to render email: ${renderError}` }
    }

    // 3. Fetch all active (unsubscribed=false) contacts
    const resend = await resendHelper()
    const { data: contactsData, error: contactsError } = await resend.contacts.list({
      audienceId: campaign.audienceId,
    })

    if (contactsError || !contactsData) {
      return { success: false, error: `Failed to fetch contacts: ${contactsError?.message}` }
    }

    const activeContacts = contactsData.data.filter((c) => !c.unsubscribed)

    // 4. Set status to SENDING
    await prismadb.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SENDING",
        recipientCount: activeContacts.length,
        sentAt: new Date(),
      },
    })

    // 5. Batch send — 100 per batch
    const BATCH_SIZE = 100
    const allBatchIds: string[] = []
    let totalSent = 0

    try {
      for (let i = 0; i < activeContacts.length; i += BATCH_SIZE) {
        const batch = activeContacts.slice(i, i + BATCH_SIZE)

        const emails = batch.map((contact) => {
          const firstName = contact.first_name ?? ""
          const lastName = contact.last_name ?? ""
          const name = [firstName, lastName].filter(Boolean).join(" ") || contact.email

          return {
            from: EMAIL_CONFIG.FROM,
            to: contact.email,
            subject: campaign.subject,
            html: personalizeHtml(html, {
              firstName,
              lastName,
              email: contact.email,
              name,
            }),
            headers: {
              "X-Campaign-Id": campaignId,
            },
          }
        })

        const { data: batchData, error: batchError } = await resend.batch.send(emails)

        if (batchError) {
          console.error("[SEND_CAMPAIGN] Batch error:", batchError)
          // Set campaign to FAILED — per plan: "On any error: set status FAILED"
          await prismadb.newsletterCampaign.update({
            where: { id: campaignId },
            data: { status: "FAILED" },
          })
          return { success: false, error: `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${batchError.message}` }
        } else if (batchData) {
          const batchIds = batchData.data.map((r: { id: string }) => r.id).filter(Boolean)
          allBatchIds.push(...batchIds)
          totalSent += emails.length
        }
      }
    } catch (batchErr) {
      console.error("[SEND_CAMPAIGN] Fatal batch error:", batchErr)
      await prismadb.newsletterCampaign.update({
        where: { id: campaignId },
        data: { status: "FAILED" },
      })
      return { success: false, error: batchErr instanceof Error ? batchErr.message : "Batch send failed" }
    }

    // 6. Update campaign as SENT
    await prismadb.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SENT",
        sentCount: totalSent,
        completedAt: new Date(),
        resendBatchId: allBatchIds.join(",") || null,
      },
    })

    return { success: true, sentCount: totalSent }
  } catch (error) {
    console.error("[SEND_CAMPAIGN]", error)

    // Attempt to mark as FAILED
    try {
      await prismadb.newsletterCampaign.update({
        where: { id: campaignId },
        data: { status: "FAILED" },
      })
    } catch {
      // Ignore secondary failure
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
