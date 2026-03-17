import { prismadb } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { getCampaignEvents } from "@/actions/platform-admin/communication/get-campaign-events"
import { EventFeedClient } from "./components/EventFeedClient"
import type { SerializedCampaign } from "@/lib/communication/types"

function serializeCampaignStats(c: {
  id: string
  subject: string
  status: string
  sentAt: Date | null
  recipientCount: number
  sentCount: number
  openCount: number
  clickCount: number
  bounceCount: number
  unsubscribeCount: number
}): Pick<
  SerializedCampaign,
  | "id"
  | "subject"
  | "status"
  | "sentAt"
  | "recipientCount"
  | "sentCount"
  | "openCount"
  | "clickCount"
  | "bounceCount"
  | "unsubscribeCount"
> {
  return {
    ...c,
    status: c.status as SerializedCampaign["status"],
    sentAt: c.sentAt?.toISOString() ?? null,
  }
}

export default async function SentDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params

  const [campaign, { events, total, pages }] = await Promise.all([
    prismadb.newsletterCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        status: true,
        sentAt: true,
        recipientCount: true,
        sentCount: true,
        openCount: true,
        clickCount: true,
        bounceCount: true,
        unsubscribeCount: true,
      },
    }),
    getCampaignEvents(id, "ALL", 1, 50),
  ])

  if (!campaign) notFound()

  return (
    <div className="container mx-auto px-4 py-8">
      <EventFeedClient
        campaign={serializeCampaignStats(campaign)}
        initialEvents={events}
        initialTotal={total}
        initialPages={pages}
      />
    </div>
  )
}
