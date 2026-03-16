"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  FileEdit,
  Mail,
} from "lucide-react"
import type { SerializedCampaign } from "@/actions/platform-admin/communication/get-campaigns"
import { createCampaign } from "@/actions/platform-admin/communication/create-campaign"
import { deleteCampaign } from "@/actions/platform-admin/communication/delete-campaign"

interface CampaignsClientProps {
  campaigns: SerializedCampaign[]
  total: number
  currentPage: number
  totalPages: number
  currentStatus: string
}

const STATUS_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Sent", value: "SENT" },
  { label: "Failed", value: "FAILED" },
] as const

function getStatusBadge(status: string) {
  switch (status) {
    case "DRAFT":
      return (
        <Badge className="bg-muted text-muted-foreground hover:bg-muted">
          <FileEdit className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      )
    case "SENDING":
      return (
        <Badge className="bg-warning/10 text-warning hover:bg-warning/20">
          <Send className="h-3 w-3 mr-1 animate-pulse" />
          Sending
        </Badge>
      )
    case "SENT":
      return (
        <Badge className="bg-success/10 text-success hover:bg-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sent
        </Badge>
      )
    case "SCHEDULED":
      return (
        <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
          <Clock className="h-3 w-3 mr-1" />
          Scheduled
        </Badge>
      )
    case "FAILED":
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      )
    case "CANCELLED":
      return (
        <Badge className="bg-muted text-muted-foreground hover:bg-muted">
          <AlertCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatOpenRate(openCount: number, sentCount: number): string {
  if (sentCount === 0) return "—"
  return `${((openCount / sentCount) * 100).toFixed(1)}%`
}

export function CampaignsClient({
  campaigns,
  total,
  currentPage,
  totalPages,
  currentStatus,
}: CampaignsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SerializedCampaign | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleStatusFilter(value: string) {
    const params = new URLSearchParams()
    if (value !== "ALL") params.set("status", value)
    params.set("page", "1")
    router.push(`?${params.toString()}`)
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams()
    if (currentStatus !== "ALL") params.set("status", currentStatus)
    params.set("page", String(page))
    router.push(`?${params.toString()}`)
  }

  async function handleCreateCampaign() {
    setIsCreating(true)
    try {
      const campaign = await createCampaign()
      router.push(`/platform-admin/communication/campaigns/${campaign.id}`)
    } catch (err) {
      console.error("[CREATE_CAMPAIGN]", err)
      setIsCreating(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteCampaign(deleteTarget.id)
    if (result.success) {
      setDeleteTarget(null)
      setIsDeleting(false)
      startTransition(() => {
        router.refresh()
      })
    } else {
      setDeleteError(result.error ?? "Failed to delete campaign")
      setIsDeleting(false)
    }
  }

  const canDelete = (status: string) => status === "DRAFT" || status === "FAILED"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-h1">Campaigns</h1>
        <Button onClick={handleCreateCampaign} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? "Creating..." : "New Campaign"}
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b">
        {STATUS_FILTERS.map((filter) => {
          const isActive = currentStatus === filter.value
          return (
            <button
              key={filter.value}
              onClick={() => handleStatusFilter(filter.value)}
              className={`px-4 py-2 text-body text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {filter.label}
            </button>
          )
        })}
        <span className="ml-auto text-caption text-sm text-muted-foreground pb-2">
          {total} total
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {currentStatus === "ALL" ? "All Campaigns" : `${currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()} Campaigns`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Open Rate</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-body text-muted-foreground">
                      No campaigns yet. Create your first campaign.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.subject}</p>
                        {campaign.previewText && (
                          <p className="text-caption text-sm text-muted-foreground truncate max-w-xs">
                            {campaign.previewText}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {campaign.audienceId ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{campaign.recipientCount}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatOpenRate(campaign.openCount, campaign.sentCount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(
                              `/platform-admin/communication/campaigns/${campaign.id}`
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        {canDelete(campaign.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setDeleteError(null)
                              setDeleteTarget(campaign)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-caption text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">&ldquo;{deleteTarget?.subject}&rdquo;</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null)
                setDeleteError(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
