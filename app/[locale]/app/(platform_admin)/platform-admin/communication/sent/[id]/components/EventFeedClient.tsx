"use client"

import { useState } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import type { SerializedCampaign } from "@/lib/communication/types"
import { CommunicationEventType } from "@prisma/client"

interface MaskedEvent {
  id: string
  campaignId: string
  maskedEmail: string
  eventType: CommunicationEventType
  occurredAt: string
  metadata: unknown
  createdAt: string
}

interface EventsResponse {
  events: MaskedEvent[]
  total: number
  pages: number
}

type CampaignStats = Pick<
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
>

interface EventFeedClientProps {
  campaign: CampaignStats
  initialEvents: MaskedEvent[]
  initialTotal: number
  initialPages: number
}

const EVENT_TYPE_TABS: { label: string; value: CommunicationEventType | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Delivered", value: CommunicationEventType.DELIVERED },
  { label: "Opened", value: CommunicationEventType.OPENED },
  { label: "Clicked", value: CommunicationEventType.CLICKED },
  { label: "Bounced", value: CommunicationEventType.BOUNCED },
  { label: "Complained", value: CommunicationEventType.COMPLAINED },
  { label: "Unsubscribed", value: CommunicationEventType.UNSUBSCRIBED },
]

function eventTypeBadgeVariant(
  eventType: CommunicationEventType
): "default" | "secondary" | "destructive" | "outline" {
  switch (eventType) {
    case CommunicationEventType.DELIVERED:
      return "default"
    case CommunicationEventType.OPENED:
    case CommunicationEventType.CLICKED:
      return "secondary"
    case CommunicationEventType.BOUNCED:
    case CommunicationEventType.COMPLAINED:
      return "destructive"
    default:
      return "outline"
  }
}

function pct(numerator: number, denominator: number): string {
  if (!denominator) return "—"
  return `${Math.round((numerator / denominator) * 100)}%`
}

async function fetchEvents(url: string): Promise<EventsResponse> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch events")
  return res.json()
}

export function EventFeedClient({
  campaign,
  initialEvents,
  initialTotal,
  initialPages,
}: EventFeedClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<CommunicationEventType | "ALL">("ALL")
  const [page, setPage] = useState(1)

  const swrKey = `/api/platform-admin/campaign-events?campaignId=${campaign.id}&eventType=${activeTab}&page=${page}&pageSize=50`

  const { data, isValidating, mutate } = useSWR<EventsResponse>(
    swrKey,
    fetchEvents,
    {
      fallbackData: { events: initialEvents, total: initialTotal, pages: initialPages },
      revalidateOnFocus: true,
      revalidateOnMount: true,
    }
  )

  const events = data?.events ?? []
  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 1

  function handleTabChange(value: string) {
    setActiveTab(value as CommunicationEventType | "ALL")
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground"
            onClick={() => router.push("/platform-admin/communication/sent")}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Sent
          </Button>
          <h1 className="text-h2">{campaign.subject}</h1>
          {campaign.sentAt && (
            <p className="text-body text-muted-foreground mt-1">
              Sent {new Date(campaign.sentAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isValidating}
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Recipients", value: campaign.recipientCount.toLocaleString() },
          { label: "Delivered", value: pct(campaign.sentCount, campaign.recipientCount) },
          { label: "Opened", value: pct(campaign.openCount, campaign.sentCount) },
          { label: "Clicked", value: pct(campaign.clickCount, campaign.sentCount) },
          { label: "Bounced", value: campaign.bounceCount.toString() },
          { label: "Unsubscribed", value: campaign.unsubscribeCount.toString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border bg-card px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-h4 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Event feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h4">Event Feed</h2>
          <p className="text-caption text-muted-foreground">
            {total.toLocaleString()} event{total !== 1 ? "s" : ""}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {EVENT_TYPE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {events.length === 0 ? (
          <div className="flex h-36 items-center justify-center rounded-lg border border-dashed">
            <p className="text-body text-muted-foreground">
              {isValidating ? "Loading events..." : "No events found."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {event.maskedEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant={eventTypeBadgeVariant(event.eventType)}>
                        {event.eventType.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-caption text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-caption text-muted-foreground">
                      {event.eventType === CommunicationEventType.CLICKED &&
                      event.metadata &&
                      typeof event.metadata === "object" &&
                      "link" in event.metadata ? (
                        <span className="truncate max-w-[200px] block">
                          {String((event.metadata as { link: string }).link)}
                        </span>
                      ) : event.eventType === CommunicationEventType.BOUNCED &&
                        event.metadata &&
                        typeof event.metadata === "object" &&
                        "reason" in event.metadata ? (
                        String((event.metadata as { reason: string }).reason)
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-caption text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
