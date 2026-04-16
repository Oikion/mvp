"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  User,
  Home,
  MapPin,
  FileText,
  DollarSign,
  Clock,
  Share2,
  MessageSquare,
  Globe,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { EditPropertyForm } from "./EditPropertyForm";
import { LinkedEntitiesPanel, LinkEntityDialog } from "@/components/linking";
import { EventCreateForm } from "@/components/calendar/EventCreateForm";
import { EntityQuickActions } from "@/components/entity-actions/EntityQuickActions";
import { ShareModal } from "@/components/social/ShareModal";
import { PropertyComments } from "./PropertyComments";
import { PropertyMatchingClients } from "./PropertyMatchingClients";
import { toast } from "sonner";
import {
  usePropertyLinked,
  useLinkClientsToProperty,
  useUnlinkClientFromProperty,
  useLinkRequestsToProperty,
  useUnlinkRequestFromProperty,
  useLinkDocumentsToProperty,
  useUnlinkDocumentFromProperty,
} from "@/hooks/swr";
import { QuickExportButton, ExportHistoryPanel } from "@/components/export";
import { EntityActivityPanel } from "@/components/activity/EntityActivityPanel";
import { QuickAddRequest } from "@/app/[locale]/app/(routes)/requests/components/QuickAddRequest";
import { QuickAddClient } from "@/app/[locale]/app/(routes)/crm/components/QuickAddClient";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";
import { PropertyImageGallery } from "@/components/property-images/PropertyImageGallery";
import { ItemVisibilitySelector } from "@/components/ItemVisibilitySelector";
import { updatePropertyVisibility } from "@/actions/mls/update-property-visibility";
import { ItemVisibility } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyViewProps {
  data: {
    id: string;
    friendlyId?: string;
    property_name: string;
    property_type?: string | null;
    property_status?: string | null;
    price?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    size_net_sqm?: number | null;
    lot_size?: number | null;
    year_built?: number | null;
    description?: string | null;
    address_street?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_zip?: string | null;
    property_preferences?: unknown;
    communication_notes?: unknown;
    visibility?: ItemVisibility | null;
    assigned_to_user?: { name: string | null } | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    contacts?: unknown[];
    images?: Array<{
      id: string;
      url: string;
      caption?: string | null;
      isPrimary: boolean;
      width?: number | null;
      height?: number | null;
    }>;
  };
  defaultEditOpen?: boolean;
  isReadOnly?: boolean;
  sharePermission?: "VIEW_ONLY" | "VIEW_COMMENT" | null;
  currentUserId?: string;
  locale?: string;
}

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  DRAFT: "bg-muted text-muted-foreground",
  SOLD: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RENTED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  RESERVED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  WITHDRAWN: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  INACTIVE: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

const displayEnum = (value: string | null | undefined) => {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PropertyView({
  data,
  defaultEditOpen = false,
  isReadOnly = false,
  sharePermission = null,
  currentUserId = "",
  locale = "en",
}: PropertyViewProps) {
  const router = useRouter();
  const t = useTranslations("mls");
  const tActivities = useTranslations("activities");
  const [editOpen, setEditOpen] = useState(defaultEditOpen);
  const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false);
  const [linkRequestDialogOpen, setLinkRequestDialogOpen] = useState(false);
  const [linkDocumentDialogOpen, setLinkDocumentDialogOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [autoLinkNewClient, setAutoLinkNewClient] = useState(false);
  const [autoLinkNewRequest, setAutoLinkNewRequest] = useState(false);
  const [visibility, setVisibility] = useState<ItemVisibility>(data.visibility || "PRIVATE");
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState(`/property/${data.id}`);

  // Organization users for QuickAddRequest
  const { users: orgUsers } = useOrgUsers({ enabled: !isReadOnly });

  // Linked entities via SWR
  const {
    clients,
    mandates: linkedRequests,
    documents: linkedDocuments,
    events,
    isLoading: isLoadingLinked,
    mutate: mutateLinked,
  } = usePropertyLinked(data?.id);

  const { linkClients, isLinking } = useLinkClientsToProperty(data.id);
  const { unlinkClient, isUnlinking } = useUnlinkClientFromProperty(data.id);
  const { linkRequests, isLinking: isLinkingRequests } = useLinkRequestsToProperty(data.id);
  const { unlinkRequest, isUnlinking: isUnlinkingRequests } = useUnlinkRequestFromProperty(data.id);
  const { linkDocuments, isLinking: isLinkingDocuments } = useLinkDocumentsToProperty(data.id);
  const { unlinkDocument, isUnlinking: isUnlinkingDocuments } = useUnlinkDocumentFromProperty(data.id);

  useEffect(() => {
    setEditOpen(defaultEditOpen);
  }, [defaultEditOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/property/${data.id}`);
    }
  }, [data.id]);

  const handleLinkClients = async (clientIds: string[]) => {
    try {
      await linkClients(clientIds);
      await mutateLinked();
    } catch (error) {
      console.error("Failed to link clients:", error);
      throw error;
    }
  };

  const handleUnlinkClient = async (clientId: string) => {
    try {
      await unlinkClient(clientId);
      toast.success("Client unlinked successfully");
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink client:", error);
      toast.error("Failed to unlink client");
    }
  };

  const handleLinkRequests = async (requestIds: string[]) => {
    try {
      await linkRequests(requestIds);
      await mutateLinked();
    } catch (error) {
      console.error("Failed to link requests:", error);
      throw error;
    }
  };

  const handleUnlinkRequest = async (requestId: string) => {
    try {
      await unlinkRequest(requestId);
      toast.success("Request unlinked successfully");
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink request:", error);
      toast.error("Failed to unlink request");
    }
  };

  const handleLinkDocuments = async (documentIds: string[]) => {
    try {
      await linkDocuments(documentIds);
      await mutateLinked();
    } catch (error) {
      console.error("Failed to link documents:", error);
      throw error;
    }
  };

  const handleUnlinkDocument = async (documentId: string) => {
    try {
      await unlinkDocument(documentId);
      toast.success("Document unlinked successfully");
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink document:", error);
      toast.error("Failed to unlink document");
    }
  };

  const handleVisibilityChange = async (newVisibility: ItemVisibility) => {
    const prev = visibility;
    setVisibility(newVisibility);
    const result = await updatePropertyVisibility(data.id, newVisibility);
    if (!result.success) {
      setVisibility(prev);
      toast.error("Failed to update visibility");
    }
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Derived values
  const allEvents = [...(events.upcoming || []), ...(events.past || [])];
  const address = [data.address_street, data.address_city, data.address_state, data.address_zip].filter(Boolean).join(", ");

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
            onClick={() => router.push(`/${locale}/app/mls/properties`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {data.property_name}
              </h1>
              {data.property_status && (
                <Badge
                  className={statusColors[data.property_status] ?? statusColors.DRAFT}
                  variant="secondary"
                >
                  {displayEnum(data.property_status)}
                </Badge>
              )}
              {data.property_type && (
                <Badge variant="outline">
                  {displayEnum(data.property_type)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              ID: {data.friendlyId ?? data.id}
            </p>
          </div>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              {t("PropertyView.edit")}
            </Button>
            <EntityQuickActions
              entityType="property"
              onCreateMandate={() => setCreateRequestOpen(true)}
              onCreateEvent={() => setCreateEventOpen(true)}
              onLinkClient={() => setLinkClientDialogOpen(true)}
              onLinkMandate={() => setLinkRequestDialogOpen(true)}
            />
            <QuickExportButton
              entityType="property"
              entityId={data.id}
              entityName={data.property_name}
              publicUrl={publicUrl}
              variant="outline"
              size="default"
            />
            <Button
              variant="outline"
              leftIcon={<Share2 className="h-4 w-4" />}
              onClick={() => setShareModalOpen(true)}
            >
              {t("PropertyView.share")}
            </Button>
          </div>
        )}
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ================================================================ */}
        {/* Left column (2/3)                                                */}
        {/* ================================================================ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          {data.images && data.images.length > 0 && (
            <PropertyImageGallery images={data.images} />
          )}

          {/* Property Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                {t("PropertyView.propertyDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label={t("PropertyView.type")} value={displayEnum(data.property_type)} />
                <DetailField label={t("PropertyView.status")} value={displayEnum(data.property_status)} />
                <DetailField
                  label={t("PropertyView.price")}
                  value={data.price != null ? formatCurrency(data.price) : null}
                />
                <DetailField label={t("PropertyView.yearBuilt")} value={data.year_built} />
              </div>
            </CardContent>
          </Card>

          {/* Size & Rooms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4" />
                {t("PropertyView.sizeAndRooms")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField
                  label={t("PropertyView.netArea")}
                  value={data.size_net_sqm != null ? `${data.size_net_sqm} m\u00B2` : null}
                />
                <DetailField
                  label={t("PropertyView.lotSize")}
                  value={data.lot_size != null ? `${data.lot_size} m\u00B2` : null}
                />
                <DetailField label={t("PropertyView.bedrooms")} value={data.bedrooms} />
                <DetailField label={t("PropertyView.bathrooms")} value={data.bathrooms} />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          {address && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  {t("PropertyView.location")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label={t("PropertyView.street")} value={data.address_street} />
                  <DetailField label={t("PropertyView.city")} value={data.address_city} />
                  <DetailField label={t("PropertyView.stateRegion")} value={data.address_state} />
                  <DetailField label={t("PropertyView.zipCode")} value={data.address_zip} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {!!(data.description || data.property_preferences || data.communication_notes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {t("PropertyView.notes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("PropertyView.description")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{data.description}</p>
                  </div>
                )}
                {!!(data.property_preferences && typeof data.property_preferences === "object" && Object.keys(data.property_preferences as Record<string, unknown>).length > 0) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("PropertyView.preferences")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(data.property_preferences, null, 2)}
                    </p>
                  </div>
                )}
                {!!(data.communication_notes && typeof data.communication_notes === "object" && Object.keys(data.communication_notes as Record<string, unknown>).length > 0) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("PropertyView.communicationNotes")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {typeof data.communication_notes === "string"
                        ? data.communication_notes
                        : JSON.stringify(data.communication_notes, null, 2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Matching Clients */}
          <PropertyMatchingClients propertyId={data.id} locale={locale} />

          {/* Comments */}
          {currentUserId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  {t("PropertyView.comments")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PropertyComments
                  propertyId={data.id}
                  canComment={!isReadOnly || sharePermission === "VIEW_COMMENT"}
                  currentUserId={currentUserId}
                />
              </CardContent>
            </Card>
          )}
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
                {t("PropertyView.statusAndAssignment")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailField
                label={t("PropertyView.status")}
                value={
                  data.property_status ? (
                    <Badge
                      className={statusColors[data.property_status] ?? statusColors.DRAFT}
                      variant="secondary"
                    >
                      {displayEnum(data.property_status)}
                    </Badge>
                  ) : null
                }
              />
              <DetailField
                label={t("PropertyView.type")}
                value={displayEnum(data.property_type)}
              />
              <DetailField
                label={t("PropertyView.assignedTo")}
                value={data.assigned_to_user?.name}
              />

              <Separator />

              <div className="grid gap-1 text-xs text-muted-foreground">
                {data.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {t("PropertyView.created")} {format(new Date(data.createdAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
                {data.updatedAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {t("PropertyView.updated")} {format(new Date(data.updatedAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visibility */}
          {!isReadOnly && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4" />
                  {t("PropertyView.visibility")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ItemVisibilitySelector
                  value={visibility}
                  onChange={handleVisibilityChange}
                />
                {visibility === "PUBLIC" && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">{t("PropertyView.publicUrl")}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-background px-3 py-2 rounded border truncate">
                        {publicUrl}
                      </code>
                      <Button variant="outline" size="sm" onClick={copyPublicUrl}>
                        {copied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/property/${data.id}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Linked Contacts */}
          <LinkedEntitiesPanel
            type="contacts"
            entities={clients as unknown as Array<{ id: string; friendlyId: string; displayName: string; email?: string; primaryPhone?: string; status?: string; category?: string[]; }>}
            isLoading={isLoadingLinked || isLinking || isUnlinking}
            onLinkEntity={isReadOnly ? undefined : () => setLinkClientDialogOpen(true)}
            onUnlinkEntity={isReadOnly ? undefined : handleUnlinkClient}
            showAddButton={!isReadOnly}
            emptyMessage="No contacts linked to this property yet."
          />

          {/* Linked Requests */}
          <LinkedEntitiesPanel
            type="requests"
            entities={linkedRequests}
            isLoading={isLoadingLinked || isLinkingRequests || isUnlinkingRequests}
            onLinkEntity={isReadOnly ? undefined : () => setLinkRequestDialogOpen(true)}
            onUnlinkEntity={isReadOnly ? undefined : handleUnlinkRequest}
            showAddButton={!isReadOnly}
            emptyMessage="No requests linked to this property yet."
          />

          {/* Calendar Events */}
          <LinkedEntitiesPanel
            type="events"
            entities={allEvents as unknown as Array<{ id: string; friendlyId: string; title: string; description?: string; startTime: string; endTime: string; location?: string; status?: string; eventType?: string; }>}
            isLoading={isLoadingLinked}
            showAddButton={false}
            onCreateEvent={!isReadOnly ? () => setCreateEventOpen(true) : undefined}
            emptyMessage="No calendar events for this property yet."
          />

          {/* Linked Documents */}
          <LinkedEntitiesPanel
            type="documents"
            entities={linkedDocuments as unknown as Array<{ id: string; friendlyId: string; document_name: string; document_type?: string; document_file_mimeType?: string; createdAt?: string; }>}
            isLoading={isLoadingLinked || isLinkingDocuments || isUnlinkingDocuments}
            onLinkEntity={isReadOnly ? undefined : () => setLinkDocumentDialogOpen(true)}
            onUnlinkEntity={isReadOnly ? undefined : handleUnlinkDocument}
            showAddButton={!isReadOnly}
            emptyMessage="No documents linked to this property yet."
          />

          {/* Export History */}
          {!isReadOnly && (
            <ExportHistoryPanel
              entityType="PROPERTY"
              entityId={data.id}
              entityName={data.property_name}
              onReExport={(record) => {
                const params = new URLSearchParams({
                  format: record.exportFormat,
                  scope: "filtered",
                });
                if (record.destination) params.set("destination", record.destination);
                if (record.exportTemplate) params.set("template", record.exportTemplate);
                window.open(`/api/export/mls?${params.toString()}`, "_blank");
              }}
              maxItems={5}
            />
          )}

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                {tActivities("title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EntityActivityPanel parentType="PROPERTY" parentId={data.id} />
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
            <SheetTitle>{t("PropertyView.editProperty")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <EditPropertyForm initialData={data} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Event Sheet */}
      {!isReadOnly && (
        <EventCreateForm
          open={createEventOpen}
          onOpenChange={setCreateEventOpen}
          propertyId={data.id}
          onSuccess={() => mutateLinked()}
        />
      )}

      {/* Link Client Dialog */}
      {!isReadOnly && (
        <LinkEntityDialog
          open={linkClientDialogOpen}
          onOpenChange={setLinkClientDialogOpen}
          entityType="client"
          sourceId={data.id}
          sourceType="property"
          alreadyLinkedIds={clients.map((c) => c.id)}
          onLink={handleLinkClients}
          onCreate={() => {
            setLinkClientDialogOpen(false);
            setAutoLinkNewClient(false);
            setCreateClientOpen(true);
          }}
          onCreateAndLink={() => {
            setLinkClientDialogOpen(false);
            setAutoLinkNewClient(true);
            setCreateClientOpen(true);
          }}
          title="Link Clients to Property"
          description="Select clients who are interested in or viewing this property."
        />
      )}

      {/* Link Request Dialog */}
      {!isReadOnly && (
        <LinkEntityDialog
          open={linkRequestDialogOpen}
          onOpenChange={setLinkRequestDialogOpen}
          entityType="request"
          sourceId={data.id}
          sourceType="property"
          alreadyLinkedIds={(linkedRequests ?? []).map((m: any) => m.id)}
          onLink={handleLinkRequests}
          onCreate={() => {
            setLinkRequestDialogOpen(false);
            setAutoLinkNewRequest(false);
            setCreateRequestOpen(true);
          }}
          onCreateAndLink={() => {
            setLinkRequestDialogOpen(false);
            setAutoLinkNewRequest(true);
            setCreateRequestOpen(true);
          }}
          title="Link Requests to Property"
          description="Select requests associated with this property."
        />
      )}

      {/* Link Document Dialog */}
      {!isReadOnly && (
        <LinkEntityDialog
          open={linkDocumentDialogOpen}
          onOpenChange={setLinkDocumentDialogOpen}
          entityType="document"
          sourceId={data.id}
          sourceType="property"
          alreadyLinkedIds={(linkedDocuments ?? []).map((d: any) => d.id)}
          onLink={handleLinkDocuments}
          title="Link Documents to Property"
          description="Select documents to associate with this property."
        />
      )}

      {/* Share Modal */}
      {!isReadOnly && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          entityType="PROPERTY"
          entityId={data.id}
          entityName={data.property_name}
        />
      )}

      {/* Quick Add Request */}
      {!isReadOnly && (
        <QuickAddRequest
          open={createRequestOpen}
          onOpenChange={(open) => {
            setCreateRequestOpen(open);
            if (!open) setAutoLinkNewRequest(false);
          }}
          organizationUsers={orgUsers.map((u) => ({ id: u.id, name: u.name ?? "" }))}
          onSuccess={() => mutateLinked()}
        />
      )}

      {/* Quick Add Client */}
      {!isReadOnly && (
        <QuickAddClient
          open={createClientOpen}
          onOpenChange={(open) => {
            setCreateClientOpen(open);
            if (!open) setAutoLinkNewClient(false);
          }}
          organizationUsers={orgUsers.map((u) => ({ id: u.id, name: u.name ?? "" }))}
          onSuccess={async (clientId) => {
            if (autoLinkNewClient && clientId) {
              await handleLinkClients([clientId]);
            }
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable sub-component
// ---------------------------------------------------------------------------

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm">
        {value !== null && value !== undefined ? (
          typeof value === "string" || typeof value === "number" ? (
            <span>{value}</span>
          ) : (
            value
          )
        ) : (
          <span className="text-muted-foreground/60">-</span>
        )}
      </div>
    </div>
  );
}
