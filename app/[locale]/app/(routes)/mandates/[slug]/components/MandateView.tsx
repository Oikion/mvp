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
import { Separator } from "@/components/ui/separator"
import { ItemVisibilitySelector } from "@/components/ItemVisibilitySelector"
import { updateMandateVisibility } from "@/actions/mandates/update-mandate-visibility"
import { ItemVisibility } from "@prisma/client"
import {
  ArrowLeft,
  Edit,
  User,
  MapPin,
  Home,
  DollarSign,
  Thermometer,
  Shield,
  Check,
  X,
  MessageSquare,
  FileText,
  Clock,
  Globe,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useMandateLinked } from "@/hooks/swr/useMandateLinked"
import {
  useLinkPropertiesToMandate,
  useUnlinkPropertyFromMandate,
  useLinkClientsToMandate,
  useUnlinkClientFromMandate,
  useLinkDocumentsToMandate,
  useUnlinkDocumentFromMandate,
} from "@/hooks/swr/useLinkMutations"
import { LinkedEntitiesPanel } from "@/components/linking/LinkedEntitiesPanel"
import { LinkEntityDialog } from "@/components/linking/LinkEntityDialog"
import EditMandateForm from "./EditMandateForm"
import MandateComments from "./MandateComments"
import { EventCreateForm } from "@/components/calendar/EventCreateForm"
import { EntityQuickActions } from "@/components/entity-actions/EntityQuickActions"
import { QuickAddClient } from "@/app/[locale]/app/(routes)/crm/components/QuickAddClient"
import { QuickAddProperty } from "@/app/[locale]/app/(routes)/mls/components/QuickAddProperty"
import { useOrgUsers } from "@/hooks/swr/useOrgUsers"
import { ActivityFeed } from "@/components/activity/ActivityFeed"

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
  friendlyId: string
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
  friendlyId?: string
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
  visibility?: ItemVisibility | null
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
  formatter?: (v: number) => string,
  upToLabel?: string
) {
  const fmt = formatter ?? String
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`
  if (min != null) return `${fmt(min)}+`
  if (max != null) return `${upToLabel ?? "up to"} ${fmt(max)}`
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
  // Sheet state (edit form)
  const [editOpen, setEditOpen] = useState(false)
  const [createEventOpen, setCreateEventOpen] = useState(false)

  // Linked entities
  const {
    properties: linkedProperties,
    clients: linkedClients,
    documents: linkedDocuments,
    events,
    isLoading: isLoadingLinked,
    mutate: mutateLinked,
  } = useMandateLinked(mandate.id)

  const allEvents = [...(events.upcoming || []), ...(events.past || [])]
  const { linkProperties, isLinking: isLinkingProperties } = useLinkPropertiesToMandate(mandate.id)
  const { unlinkProperty, isUnlinking: isUnlinkingProperties } = useUnlinkPropertyFromMandate(mandate.id)
  const { linkClients, isLinking: isLinkingClients } = useLinkClientsToMandate(mandate.id)
  const { unlinkClient, isUnlinking: isUnlinkingClients } = useUnlinkClientFromMandate(mandate.id)
  const { linkDocuments, isLinking: isLinkingDocuments } = useLinkDocumentsToMandate(mandate.id)
  const { unlinkDocument, isUnlinking: isUnlinkingDocuments } = useUnlinkDocumentFromMandate(mandate.id)

  const [linkPropertyDialogOpen, setLinkPropertyDialogOpen] = useState(false)
  const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false)
  const [linkDocumentDialogOpen, setLinkDocumentDialogOpen] = useState(false)
  const [createClientOpen, setCreateClientOpen] = useState(false)
  const [createPropertyOpen, setCreatePropertyOpen] = useState(false)
  const [autoLinkNewClient, setAutoLinkNewClient] = useState(false)
  const [autoLinkNewProperty, setAutoLinkNewProperty] = useState(false)

  const { users: orgUsers } = useOrgUsers()

  const [visibility, setVisibility] = useState<ItemVisibility>(mandate.visibility || "PRIVATE")

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

  const handleEditSave = () => {
    setEditOpen(false)
    router.refresh()
  }

  // --- Derived values ---
  const upTo = t("budget.upTo")
  const budgetRange = formatRange(mandate.budget_min, mandate.budget_max, formatCurrency, upTo)
  const sizeRange = formatRange(
    mandate.size_min_sqm,
    mandate.size_max_sqm,
    (v) => `${v} m\u00B2`,
    upTo
  )
  const plotSizeRange = formatRange(
    mandate.plot_size_min_sqm,
    mandate.plot_size_max_sqm,
    (v) => `${v} m\u00B2`,
    upTo
  )
  const bedroomsRange = formatRange(mandate.bedrooms_min, mandate.bedrooms_max, undefined, upTo)
  const bathroomsRange = formatRange(
    mandate.bathrooms_min,
    mandate.bathrooms_max,
    undefined,
    upTo
  )
  const floorRange = formatRange(mandate.floor_min, mandate.floor_max, undefined, upTo)
  const yearRange = formatRange(mandate.year_built_min, mandate.year_built_max, undefined, upTo)

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
                {t(`MandateForm.status.${mandate.status}` as Parameters<typeof t>[0])}
              </Badge>
              {mandate.urgency && (
                <Badge
                  className={
                    urgencyColors[mandate.urgency] ?? urgencyColors.MEDIUM
                  }
                  variant="secondary"
                >
                  {t(`MandateForm.urgency.${mandate.urgency}` as Parameters<typeof t>[0])}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              ID: {mandate.friendlyId ?? mandate.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            {t("MandateView.edit")}
          </Button>
          <EntityQuickActions
            entityType="mandate"
            onCreateEvent={() => setCreateEventOpen(true)}
            onLinkProperty={() => setLinkPropertyDialogOpen(true)}
            onLinkClient={() => setLinkClientDialogOpen(true)}
          />
        </div>
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
                        {t("MandateView.communicationNotes")}
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

          {/* Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                {t("MandateView.activity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed parentType="REQUEST" parentId={mandate.id} unified />
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
                    {t(`MandateForm.status.${mandate.status}` as Parameters<typeof t>[0])}
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
                      {t(`MandateForm.urgency.${mandate.urgency}` as Parameters<typeof t>[0])}
                    </Badge>
                  ) : null
                }
              />
              <DetailField
                label={t("MandateForm.fields.assignedTo")}
                value={
                  mandate.assigned_to ? (
                    <span className="text-sm">
                      {mandate.assigned_to_user?.name ??
                        mandate.assigned_to_user?.email ??
                        "Deleted User"}
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
                    {t("MandateView.created")} {format(new Date(mandate.createdAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
                {mandate.updatedAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {t("MandateView.updated")} {format(new Date(mandate.updatedAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                {t("MandateView.visibility")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ItemVisibilitySelector
                value={visibility}
                onChange={async (newVisibility) => {
                  const prev = visibility;
                  setVisibility(newVisibility);
                  const result = await updateMandateVisibility(mandate.id, newVisibility);
                  if (!result.success) {
                    setVisibility(prev);
                    toast.error("Failed to update visibility");
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Linked Clients */}
          <LinkedEntitiesPanel
            type="clients"
            entities={linkedClients}
            isLoading={isLoadingLinked || isLinkingClients || isUnlinkingClients}
            onLinkEntity={() => setLinkClientDialogOpen(true)}
            onUnlinkEntity={(clientId) => unlinkClient(clientId)}
            emptyMessage={t("linkedEntities.noClients") ?? "No clients linked yet"}
          />

          {/* Linked Properties */}
          <LinkedEntitiesPanel
            type="properties"
            entities={linkedProperties}
            isLoading={isLoadingLinked || isLinkingProperties || isUnlinkingProperties}
            onLinkEntity={() => setLinkPropertyDialogOpen(true)}
            onUnlinkEntity={(propertyId) => unlinkProperty(propertyId)}
            emptyMessage={t("linkedEntities.noProperties") ?? "No properties linked yet"}
          />

          {/* Calendar Events */}
          <LinkedEntitiesPanel
            type="events"
            entities={allEvents as unknown as Array<{ id: string; friendlyId: string; title: string; description?: string; startTime: string; endTime: string; location?: string; status?: string; eventType?: string; }>}
            isLoading={isLoadingLinked}
            showAddButton={false}
            onCreateEvent={() => setCreateEventOpen(true)}
            emptyMessage={t("MandateView.noCalendarEvents")}
          />

          {/* Linked Documents */}
          <LinkedEntitiesPanel
            type="documents"
            entities={linkedDocuments as unknown as Array<{ id: string; friendlyId: string; document_name: string; document_type?: string; document_file_mimeType?: string; createdAt?: string }>}
            isLoading={isLoadingLinked || isLinkingDocuments || isUnlinkingDocuments}
            onLinkEntity={() => setLinkDocumentDialogOpen(true)}
            onUnlinkEntity={(documentId) => unlinkDocument(documentId)}
            emptyMessage={t("linkedEntities.noDocuments") ?? "No documents linked yet"}
          />
        </div>
      </div>

      {/* Create Event Sheet - pre-linked to mandate's client if available */}
      <EventCreateForm
        open={createEventOpen}
        onOpenChange={setCreateEventOpen}
        clientId={mandate.clientId ?? undefined}
        onSuccess={() => mutateLinked()}
      />

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
      <LinkEntityDialog
        open={linkClientDialogOpen}
        onOpenChange={setLinkClientDialogOpen}
        entityType="client"
        sourceId={mandate.id}
        sourceType="mandate"
        alreadyLinkedIds={linkedClients.map((c: any) => c.id)}
        onLink={async (ids: string[]) => { await linkClients(ids); }}
        onCreate={() => {
          setLinkClientDialogOpen(false)
          setAutoLinkNewClient(false)
          setCreateClientOpen(true)
        }}
        onCreateAndLink={() => {
          setLinkClientDialogOpen(false)
          setAutoLinkNewClient(true)
          setCreateClientOpen(true)
        }}
      />

      {/* ================================================================== */}
      {/* Link Property Dialog                                               */}
      {/* ================================================================== */}
      <LinkEntityDialog
        open={linkPropertyDialogOpen}
        onOpenChange={setLinkPropertyDialogOpen}
        entityType="property"
        sourceId={mandate.id}
        sourceType="mandate"
        alreadyLinkedIds={linkedProperties.map((p: any) => p.id)}
        onLink={async (ids: string[]) => { await linkProperties(ids); }}
        onCreate={() => {
          setLinkPropertyDialogOpen(false)
          setAutoLinkNewProperty(false)
          setCreatePropertyOpen(true)
        }}
        onCreateAndLink={() => {
          setLinkPropertyDialogOpen(false)
          setAutoLinkNewProperty(true)
          setCreatePropertyOpen(true)
        }}
      />

      {/* ================================================================== */}
      {/* Link Document Dialog                                               */}
      {/* ================================================================== */}
      <LinkEntityDialog
        open={linkDocumentDialogOpen}
        onOpenChange={setLinkDocumentDialogOpen}
        entityType="document"
        sourceId={mandate.id}
        sourceType="mandate"
        alreadyLinkedIds={(linkedDocuments ?? []).map((d: any) => d.id)}
        onLink={async (ids: string[]) => { await linkDocuments(ids); }}
      />

      {/* Quick Add Client */}
      <QuickAddClient
        open={createClientOpen}
        onOpenChange={(open) => {
          setCreateClientOpen(open)
          if (!open) setAutoLinkNewClient(false)
        }}
        organizationUsers={orgUsers.map((u) => ({ id: u.id, name: u.name ?? "" }))}
        onSuccess={async (clientId) => {
          if (autoLinkNewClient && clientId) {
            await linkClients([clientId])
            await mutateLinked()
          }
        }}
      />

      {/* Quick Add Property */}
      <QuickAddProperty
        open={createPropertyOpen}
        onOpenChange={(open) => {
          setCreatePropertyOpen(open)
          if (!open) setAutoLinkNewProperty(false)
        }}
        users={orgUsers}
        onSuccess={async (propertyId) => {
          if (autoLinkNewProperty && propertyId) {
            await linkProperties([propertyId])
            await mutateLinked()
          }
        }}
      />
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
