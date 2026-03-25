"use client"

import { useRouter } from "next/navigation"
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
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import type { SerializedCampaign } from "@/lib/communication/types"

interface SentClientProps {
  campaigns: SerializedCampaign[]
  total: number
  currentPage: number
  totalPages: number
}

function pct(numerator: number, denominator: number): string {
  if (!denominator) return "—"
  return `${Math.round((numerator / denominator) * 100)}%`
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "SENT") return "default"
  if (status === "SENDING") return "secondary"
  if (status === "FAILED") return "destructive"
  return "outline"
}

export function SentClient({
  campaigns,
  total,
  currentPage,
  totalPages,
}: SentClientProps) {
  const router = useRouter()

  function goToPage(page: number) {
    const params = new URLSearchParams()
    params.set("page", String(page))
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2">Sent Campaigns</h1>
        <p className="text-body text-muted-foreground mt-1">
          {total} campaign{total !== 1 ? "s" : ""} sent
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
          <p className="text-body text-muted-foreground">No sent campaigns yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Opened</TableHead>
                <TableHead className="text-right">Clicked</TableHead>
                <TableHead className="text-right">Bounced</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/platform-admin/communication/sent/${c.id}`)
                  }
                >
                  <TableCell>
                    <p className="font-medium text-caption">{c.subject}</p>
                    {c.sentAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(c.sentAt).toLocaleDateString()}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-caption">
                    {c.recipientCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-caption">
                    {pct(c.sentCount, c.recipientCount)}
                  </TableCell>
                  <TableCell className="text-right text-caption">
                    {pct(c.openCount, c.sentCount)}
                  </TableCell>
                  <TableCell className="text-right text-caption">
                    {pct(c.clickCount, c.sentCount)}
                  </TableCell>
                  <TableCell className="text-right text-caption">
                    {c.bounceCount > 0 ? (
                      <span className="text-destructive">{c.bounceCount}</span>
                    ) : (
                      "0"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-caption text-muted-foreground">
                    {c.sentAt
                      ? new Date(c.sentAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-caption text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
