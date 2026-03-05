"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAppToast } from "@/hooks/use-app-toast"
import {
  ArrowLeft,
  Edit,
  Link2,
  Unlink,
  User,
  MapPin,
  Home,
  DollarSign,
  Thermometer,
  Shield,
  Check,
  X,
  ChevronsUpDown,
  MessageSquare,
  FileText,
  Clock,
} from "lucide-react"
import { format } from "date-fns"
import { useClients } from "@/hooks/swr/useClients"
import EditMandateForm from "./EditMandateForm"
import MandateComments from "./MandateComments"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MandateUser {
  id: string
  name: string | null
  email: string
  avatar: string | null
}

interface MandateClient {
  id: string
  friendlyId?: string
  client_name: string
  primary_email?: string | null
  primary_phone?: string | null
  client_status?: string | null
}

interface MandateCommentData {
  id: string
  content: string
  createdAt: string
  Users?: MandateUser
  user?: MandateUser
}

interface Mandate {
  id: string
  title: string
  status: string
  urgency?: string | null
  transaction_type: string
  property_type?: string | null
  property_purpose?: string | null
  areas_of_interest?: string[] | null
  municipality?: string | null
  region?: string | null
  size_min_sqm?: number | null
  size_max_sqm?: number | null
  plot_size_min_sqm?: number | null
  plot_size_max_sqm?: number | null
  budget_min?: number | null
  budget_max?: number | null
  bedrooms_min?: number | null
  bedrooms_max?: number | null
  bathrooms_min?: number | null
  bathrooms_max?: number | null
  floor_min?: number | null
  floor_max?: number | null
  ground_floor_only?: boolean | null
  condition?: string[] | null
  year_built_min?: number | null
  year_built_max?: number | null
  heating_type?: string[] | null
  energy_cert_min?: string | null
  furnished?: string | null
  elevator?: boolean | null
  parking?: boolean | null
  pets_allowed?: boolean | null
  amenities?: string[] | null
  inside_city_plan?: boolean | null
  legalization_ok?: boolean | null
  timeline?: string | null
  expires_at?: string | null
  notes?: string | null
  communication_notes?: string | Record<string, unknown> | null
  assigned_to?: string | null
  assigned_to_user?: MandateUser | null
  clientId?: string | null
  client?: MandateClient | null
  client_linked_at?: string | null
  draft_status?: boolean | null
  createdAt?: string
  updatedAt?: string | null
  comments?: MandateCommentData[]
}

interface MandateViewProps {
  mandate: Mandate
  initialAction?: string
}

// ---------------------------------------------------------------------------
// Status / Urgency badge styles
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  PAUSED:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  FULFILLED:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  EXPIRED:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  CANCELLED:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const urgencyColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  CRITICAL:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)

function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  formatter?: (v: number) => string
) {
  const fmt = formatter ?? String
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`
  if (min != null) return `${fmt(min)}+`
  if (max != null) return `up to ${fmt(max)}`
  return null
}

function BooleanIcon({ value }: { value: boolean | null | undefined }) {
  if (value === true)
    return <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
  if (value === false)
    return <X className="h-4 w-4 text-muted-foreground" />
  return <span className="text-muted-foreground">-</span>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MandateView({
  mandate,
  initialAction,
}: MandateViewProps) {
  const router = useRouter()
  const t = useTranslations("mandates")
  const { toast } = useAppToast()

  // Sheet state (edit form)
  const [editOpen, setEditOpen] = useState(false)

  // Client link dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)

  // Clients list for linking
  const { clients, isLoading: isLoadingClients } = useClients({
    enabled: linkDialogOpen,
  })

  // Open edit sheet if action=edit was passed via URL
  useEffect(() => {
    if (initialAction === "edit") {
      setEditOpen(true)
    }
  }, [initialAction])

  // --- Display helpers ---
  const displayEnum = (value: string | null | undefined) => {
    if (!value) return null
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // --- Mutations ---
  const handleLinkClient = async () => {
    if (!selectedClientId) return
    setIsLinking(true)
    try {
      const res = await fetch(`/api/mandates/${mandate.id}/link-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to link client")
      }
      toast.success("updateSuccess")
      setLinkDialogOpen(false)
      setSelectedClientId(null)
      router.refresh()
    } catch (err) {
      toast.error("linkEntitiesFailed", {
        description:
          err instanceof Error ? err.message : "Failed to link client",
      })
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkClient = async () => {
    setIsUnlinking(true)
    try {
      const res = await fetch(`/api/mandates/${mandate.id}/link-client`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to unlink client")
      }
      toast.success("unlinkSuccess")
      setUnlinkDialogOpen(false)
      router.refresh()
    } catch (err) {
      toast.error("unlinkFailed", {
        description:
          err instanceof Error ? err.message : "Failed to unlink client",
      })
    } finally {
      setIsUnlinking(false)
    }
  }

  const handleEditSave = () => {
    setEditOpen(false)
    router.refresh()
  }

  // --- Derived values ---
  const budgetRange = formatRange(mandate.budget_min, mandate.budget_max, formatCurrency)
  const sizeRange = formatRange(
    mandate.size_min_sqm,
    mandate.size_max_sqm,
    (v) => `${v} m\u00B2`
  )
  const plotSizeRange = formatRange(
    mandate.plot_size_min_sqm,
    mandate.plot_size_max_sqm,
    (v) => `${v} m\u00B2`
  )
  const bedroomsRange = formatRange(mandate.bedrooms_min, mandate.bedrooms_max)
  const bathroomsRange = formatRange(
    mandate.bathrooms_min,
    mandate.bathrooms_max
  )
  const floorRange = formatRange(mandate.floor_min, mandate.floor_max)
  const yearRange = formatRange(mandate.year_built_min, mandate.year_built_max)

  const areas = Array.isArray(mandate.areas_of_interest)
    ? mandate.areas_of_interest
    : []
  const conditions = Array.isArray(mandate.condition) ? mandate.condition : []
  const heatingTypes = Array.isArray(mandate.heating_type)
    ? mandate.heating_type
    : []
  const amenities = Array.isArray(mandate.amenities) ? mandate.amenities : []

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/app/mandates")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {mandate.title}
              </h1>
              <Badge
                className={
                  statusColors[mandate.status] ?? statusColors.DRAFT
                }
                variant="secondary"
              >
                {t(`MandateForm.status.${mandate.status}`)}
              </Badge>
              {mandate.urgency && (
                <Badge
                  className={
                    urgencyColors[mandate.urgency] ?? urgencyColors.MEDIUM
                  }
                  variant="secondary"
                >
                  {t(`MandateForm.urgency.${mandate.urgency}`)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              ID: {mandate.id}
            </p>
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          {t("MandateView.edit")}
        </Button>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ================================================================ */}
        {/* Left column (2/3)                                                */}
        {/* ================================================================ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brief Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {t("MandateView.briefSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label={t("MandateForm.fields.transactionType")}
                  value={displayEnum(mandate.transaction_type)}
                />
                <DetailField
                  label={t("MandateForm.fields.propertyType")}
                  value={displayEnum(mandate.property_type)}
                />
                <DetailField
                  label={t("MandateForm.fields.propertyPurpose")}
                  value={displayEnum(mandate.property_purpose)}
                />
                <DetailField
                  label={t("MandateForm.fields.timeline")}
                  value={displayEnum(mandate.timeline)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                {t("MandateView.location")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {areas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {t("MandateForm.fields.areasOfInterest")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {areas.map((area) => (
                      <Badge key={area} variant="outline">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label={t("MandateForm.fields.municipality")}
                  value={mandate.municipality}
                />
                <DetailField
                  label={t("MandateForm.fields.region")}
                  value={mandate.region}
                />
              </div>
            </CardContent>
          </Card>

          {/* Size & Rooms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4" />
                {t("MandateView.sizeAndRooms")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label={t("MandateForm.fields.sizeMinSqm") + " / " + t("MandateForm.fields.sizeMaxSqm")}
                  value={sizeRange}
                />
                <DetailField
                  label={
                    t("MandateForm.fields.plotSizeMinSqm") +
                    " / " +
                    t("MandateForm.fields.plotSizeMaxSqm")
                  }
                  value={plotSizeRange}
                />
                <DetailField
                  label={t("MandateForm.fields.bedroomsMin") + " / " + t("MandateForm.fields.bedroomsMax")}
                  value={bedroomsRange}
                />
                <DetailField
                  label={
                    t("MandateForm.fields.bathroomsMin") +
                    " / " +
                    t("MandateForm.fields.bathroomsMax")
                  }
                  value={bathroomsRange}
                />
                <DetailField
                  label={t("MandateForm.fields.floorMin") + " / " + t("MandateForm.fields.floorMax")}
                  value={floorRange}
                />
                <DetailField
                  label={t("MandateForm.fields.groundFloorOnly")}
                  value={
                    <BooleanIcon value={mandate.ground_floor_only} />
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Budget & Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                {t("MandateView.budgetAndTimeline")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label={t("MandateForm.fields.budgetMin") + " / " + t("MandateForm.fields.budgetMax")}
                  value={budgetRange}
                />
                <DetailField
                  label={t("MandateForm.fields.timeline")}
                  value={displayEnum(mandate.timeline)}
                />
                <DetailField
                  label={t("MandateForm.fields.yearBuiltMin") + " / " + t("MandateForm.fields.yearBuiltMax")}
                  value={yearRange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Features & Preferences */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Thermometer className="h-4 w-4" />
                {t("MandateView.featuresAndPreferences")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {conditions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("MandateForm.fields.condition")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {conditions.map((c) => (
                        <Badge key={c} variant="outline">
                          {displayEnum(c)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {heatingTypes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("MandateForm.fields.heatingType")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {heatingTypes.map((h) => (
                        <Badge key={h} variant="outline">
                          {displayEnum(h)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField
                  label={t("MandateForm.fields.energyCertMin")}
                  value={displayEnum(mandate.energy_cert_min)}
                />
                <DetailField
                  label={t("MandateForm.fields.furnished")}
                  value={displayEnum(mandate.furnished)}
                />
                <DetailField
                  label={t("MandateForm.fields.elevator")}
                  value={<BooleanIcon value={mandate.elevator} />}
                />
                <DetailField
                  label={t("MandateForm.fields.parking")}
                  value={<BooleanIcon value={mandate.parking} />}
                />
                <DetailField
                  label={t("MandateForm.fields.petsAllowed")}
                  value={<BooleanIcon value={mandate.pets_allowed} />}
                />
              </div>

              {amenities.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {t("MandateForm.fields.amenities")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {amenities.map((a) => (
                      <Badge key={a} variant="outline">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legal */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                {t("MandateView.legal")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label={t("MandateForm.fields.insideCityPlan")}
                  value={<BooleanIcon value={mandate.inside_city_plan} />}
                />
                <DetailField
                  label={t("MandateForm.fields.legalizationOk")}
                  value={<BooleanIcon value={mandate.legalization_ok} />}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(mandate.notes || mandate.communication_notes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {t("MandateForm.fields.notes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mandate.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("MandateForm.fields.notes")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {mandate.notes}
                    </p>
                  </div>
                )}
                {mandate.communication_notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Communication Notes
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {typeof mandate.communication_notes === "string"
                          ? mandate.communication_notes
                          : JSON.stringify(mandate.communication_notes, null, 2)}
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                {t("MandateView.comments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MandateComments mandateId={mandate.id} />
            </CardContent>
          </Card>
        </div>

        {/* ================================================================ */}
        {/* Right column (1/3) - sidebar cards                               */}
        {/* ================================================================ */}
        <div className="space-y-6">
          {/* Status & Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {t("MandateView.statusAndAssignment")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailField
                label={t("MandateForm.fields.status")}
                value={
                  <Badge
                    className={
                      statusColors[mandate.status] ?? statusColors.DRAFT
                    }
                    variant="secondary"
                  >
                    {t(`MandateForm.status.${mandate.status}`)}
                  </Badge>
                }
              />
              <DetailField
                label={t("MandateForm.fields.urgency")}
                value={
                  mandate.urgency ? (
                    <Badge
                      className={
                        urgencyColors[mandate.urgency] ??
                        urgencyColors.MEDIUM
                      }
                      variant="secondary"
                    >
                      {t(`MandateForm.urgency.${mandate.urgency}`)}
                    </Badge>
                  ) : null
                }
              />
              <DetailField
                label={t("MandateForm.fields.assignedTo")}
                value={
                  mandate.assigned_to_user ? (
                    <span className="text-sm">
                      {mandate.assigned_to_user.name ??
                        mandate.assigned_to_user.email}
                    </span>
                  ) : null
                }
              />
              <DetailField
                label={t("MandateForm.fields.expiresAt")}
                value={
                  mandate.expires_at
                    ? format(new Date(mandate.expires_at), "dd/MM/yyyy")
                    : null
                }
              />

              <Separator />

              <div className="grid gap-1 text-xs text-muted-foreground">
                {mandate.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Created: {format(new Date(mandate.createdAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
                {mandate.updatedAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Updated: {format(new Date(mandate.updatedAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4" />
                {t("MandateView.linkedClient")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mandate.client ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        className="text-sm font-medium hover:underline truncate block text-left"
                        onClick={() =>
                          router.push(
                            `/app/crm/clients/${mandate.client!.friendlyId ?? mandate.client!.id}`
                          )
                        }
                      >
                        {mandate.client.client_name}
                      </button>
                      {mandate.client.client_status && (
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {displayEnum(mandate.client.client_status)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {mandate.client_linked_at && (
                    <p className="text-xs text-muted-foreground">
                      {t("MandateView.linkedOn")}:{" "}
                      {format(
                        new Date(mandate.client_linked_at),
                        "dd/MM/yyyy"
                      )}
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => setUnlinkDialogOpen(true)}
                  >
                    <Unlink className="mr-2 h-4 w-4" />
                    {t("MandateView.unlinkClient")}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <div className="flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("MandateForm.fields.noClient")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setLinkDialogOpen(true)}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {t("MandateView.linkClient")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Edit Sheet                                                         */}
      {/* ================================================================== */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("MandateForm.editTitle")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <EditMandateForm mandate={mandate} onSave={handleEditSave} />
          </div>
        </SheetContent>
      </Sheet>

      {/* ================================================================== */}
      {/* Link Client Dialog                                                 */}
      {/* ================================================================== */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("MandateView.linkClientTitle")}</DialogTitle>
            <DialogDescription>
              {t("MandateView.linkClientDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Popover
              open={clientPopoverOpen}
              onOpenChange={setClientPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPopoverOpen}
                  className="w-full justify-between"
                >
                  {selectedClientId
                    ? clients.find((c) => c.value === selectedClientId)
                        ?.label ?? "Select client..."
                    : t("MandateView.searchClients")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("MandateView.searchClients")} />
                  <CommandList>
                    <CommandEmpty>
                      {isLoadingClients
                        ? "Loading..."
                        : t("MandateView.noClientsFound")}
                    </CommandEmpty>
                    <CommandGroup>
                      {clients.map((client) => (
                        <CommandItem
                          key={client.value}
                          value={client.label}
                          onSelect={() => {
                            setSelectedClientId(client.value)
                            setClientPopoverOpen(false)
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedClientId === client.value
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          {client.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLinkDialogOpen(false)
                setSelectedClientId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkClient}
              disabled={!selectedClientId || isLinking}
            >
              {isLinking ? "Linking..." : t("MandateView.linkClient")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Unlink Client Confirmation Dialog                                   */}
      {/* ================================================================== */}
      <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("MandateView.unlinkConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("MandateView.unlinkConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnlinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlinkClient}
              disabled={isUnlinking}
            >
              {isUnlinking ? "Unlinking..." : t("MandateView.unlinkClient")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reusable sub-component
// ---------------------------------------------------------------------------

function DetailField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode | string | null | undefined
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm">
        {value !== null && value !== undefined ? (
          typeof value === "string" ? (
            <span>{value}</span>
          ) : (
            value
          )
        ) : (
          <span className="text-muted-foreground/60">-</span>
        )}
      </div>
    </div>
  )
}
