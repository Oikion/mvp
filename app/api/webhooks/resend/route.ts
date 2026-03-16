import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"
import { prismadb } from "@/lib/prisma"
import { CommunicationEventType } from "@prisma/client"

// Map Resend event types to CommunicationEventType enum values
const EVENT_TYPE_MAP: Record<string, CommunicationEventType> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
  "email.opened": "OPENED",
  "email.clicked": "CLICKED",
  "email.unsubscribed": "UNSUBSCRIBED",
}

// Fields incremented per event type
const COUNTER_FIELD: Partial<Record<CommunicationEventType, string>> = {
  OPENED: "openCount",
  CLICKED: "clickCount",
  BOUNCED: "bounceCount",
  UNSUBSCRIBED: "unsubscribeCount",
}

export async function POST(req: NextRequest) {
  // 1. Read raw body as text
  const body = await req.text()

  // 2. Verify svix signature
  const secret = process.env.RESEND_WEBHOOK_SECRET || ""
  const wh = new Webhook(secret)

  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  }

  let payload: Record<string, unknown>
  try {
    payload = wh.verify(body, headers) as Record<string, unknown>
  } catch (err) {
    console.error("[RESEND_WEBHOOK] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // 3. Map event type
  const resendEventType = payload.type as string
  const eventType = EVENT_TYPE_MAP[resendEventType]

  if (!eventType) {
    // Unknown event type — ignore gracefully
    return NextResponse.json({ received: true })
  }

  // 4. Extract campaignId from email headers
  const data = payload.data as Record<string, unknown>
  const emailHeaders = (data.headers as Record<string, string> | undefined) ?? {}
  const campaignId = emailHeaders["X-Campaign-Id"] ?? emailHeaders["x-campaign-id"]

  if (!campaignId) {
    // Not a campaign email — ignore
    return NextResponse.json({ received: true })
  }

  // 5. Load campaign to get organizationId
  const campaign = await prismadb.newsletterCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, organizationId: true },
  })

  if (!campaign) {
    // Campaign no longer exists — ignore
    return NextResponse.json({ received: true })
  }

  // Extract email address from payload
  const toField = data.to as string | string[] | undefined
  const email =
    Array.isArray(toField)
      ? toField[0] ?? ""
      : (toField ?? (data.email as string | undefined) ?? "")

  // External event ID — unique per email per event type
  const emailId = (data.email_id as string | undefined) ?? crypto.randomUUID()
  const externalEventId = `${emailId}_${eventType}`

  // Occurred at timestamp
  const occurredAt =
    typeof payload.created_at === "string"
      ? new Date(payload.created_at)
      : new Date()

  // Metadata (click URL, bounce reason, etc.)
  const metadata: Record<string, unknown> = {}
  if (data.click) metadata.click = data.click
  if (data.bounce) metadata.bounce = data.bounce
  if (data.user_agent) metadata.userAgent = data.user_agent

  // 6. Upsert CommunicationEvent
  try {
    await prismadb.communicationEvent.upsert({
      where: { externalEventId },
      create: {
        id: crypto.randomUUID(),
        campaignId: campaign.id,
        organizationId: campaign.organizationId,
        externalEventId,
        email,
        eventType,
        occurredAt,
        metadata: Object.keys(metadata).length > 0 ? (metadata as object) : undefined,
      },
      update: {}, // no-op on duplicate — idempotent
    })
  } catch (err) {
    console.error("[RESEND_WEBHOOK] Failed to upsert event:", err)
    // Return 200 so Resend doesn't retry — we log the failure
    return NextResponse.json({ received: true })
  }

  // 7. Update campaign aggregate counter atomically
  const counterField = COUNTER_FIELD[eventType]
  if (counterField) {
    try {
      await prismadb.newsletterCampaign.update({
        where: { id: campaign.id },
        data: {
          [counterField]: { increment: 1 },
        },
      })
    } catch (err) {
      console.error("[RESEND_WEBHOOK] Failed to update counter:", err)
      // Non-fatal — event was recorded
    }
  }

  // 8. Return success
  return NextResponse.json({ received: true })
}
