"use server"

import { render } from "@react-email/render"
import * as React from "react"
import CampaignEmail from "@/emails/campaigns/CampaignEmail"
import type { EmailBlock } from "@/lib/communication/types"

interface RenderCampaignBlocksResult {
  html: string
  error?: string
}

export async function renderCampaignBlocks(
  blocks: EmailBlock[],
  previewText?: string
): Promise<RenderCampaignBlocksResult> {
  try {
    const html = await render(
      React.createElement(CampaignEmail, { blocks, previewText })
    )
    return { html }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[RENDER_CAMPAIGN_BLOCKS]", error)
    return { html: "", error: message }
  }
}
