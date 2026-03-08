"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Eye,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Users,
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
import axios from "axios";
import {
  usePropertyLinked,
  useLinkClientsToProperty,
  useUnlinkClientFromProperty,
  useLinkMandatesToProperty,
  useUnlinkMandateFromProperty,
} from "@/hooks/swr";
import { QuickExportButton, ExportHistoryPanel } from "@/components/export";
import { QuickAddMandate } from "@/app/[locale]/app/(routes)/mandates/components/QuickAddMandate";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setPropertyNetworkVisible } from "@/actions/network/manage-network-settings";

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
    portal_visibility?: string | null;
    networkVisible?: boolean | null;
    assigned_to_user?: { name: string | null } | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    contacts?: unknown[];
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
  const [editOpen, setEditOpen] = useState(defaultEditOpen);
  const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false);
  const [linkMandateDialogOpen, setLinkMandateDialogOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [createMandateOpen, setCreateMandateOpen] = useState(false);
  const [visibility, setVisibility] = useState(data.portal_visibility || "PRIVATE");
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [networkVisible, setNetworkVisible] = useState(data.networkVisible ?? false);
  const [isUpdatingNetwork, setIsUpdatingNetwork] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState(`/property/${data.id}`);

  // Organization users for QuickAddMandate
  const { users: orgUsers } = useOrgUsers({ enabled: !isReadOnly });

  // Linked entities via SWR
  const {
    clients,
    mandates: linkedMandates,
    events,
    isLoading: isLoadingLinked,
    mutate: mutateLinked,
  } = usePropertyLinked(data?.id);

  const { linkClients, isLinking } = useLinkClientsToProperty(data.id);
  const { unlinkClient, isUnlinking } = useUnlinkClientFromProperty(data.id);
  const { linkMandates, isLinking: isLinkingMandates } = useLinkMandatesToProperty(data.id);
  const { unlinkMandate, isUnlinking: isUnlinkingMandates } = useUnlinkMandateFromProperty(data.id);

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

  const handleLinkMandates = async (mandateIds: string[]) => {
    try {
      await linkMandates(mandateIds);
      await mutateLinked();
    } catch (error) {
      console.error("Failed to link mandates:", error);
      throw error;
    }
  };

  const handleUnlinkMandate = async (mandateId: string) => {
    try {
      await unlinkMandate(mandateId);
      toast.success("Mandate unlinked successfully");
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink mandate:", error);
      toast.error("Failed to unlink mandate");
    }
  };

  const handleVisibilityChange = async (newVisibility: string) => {
    setIsUpdatingVisibility(true);
    try {
      await axios.put("/api/mls/properties", {
        id: data.id,
        portal_visibility: newVisibility,
      });
      setVisibility(newVisibility);
      toast.success(
        newVisibility === "PUBLIC"
          ? "Property is now public!"
          : newVisibility === "SELECTED"
          ? "Property visible to connections only"
          : "Property is now private"
      );
    } catch (error) {
      console.error("Failed to update visibility:", error);
      toast.error("Failed to update visibility");
    } finally {
      setIsUpdatingVisibility(false);
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
              Edit
            </Button>
            <EntityQuickActions
              entityType="property"
              onCreateMandate={() => setCreateMandateOpen(true)}
              onCreateEvent={() => setCreateEventOpen(true)}
              onLinkClient={() => setLinkClientDialogOpen(true)}
              onLinkMandate={() => setLinkMandateDialogOpen(true)}
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
              Share
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
          {/* Property Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Type" value={displayEnum(data.property_type)} />
                <DetailField label="Status" value={displayEnum(data.property_status)} />
                <DetailField
                  label="Price"
                  value={data.price != null ? formatCurrency(data.price) : null}
                />
                <DetailField label="Year Built" value={data.year_built} />
              </div>
            </CardContent>
          </Card>

          {/* Size & Rooms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4" />
                Size & Rooms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField
                  label="Net Area"
                  value={data.size_net_sqm != null ? `${data.size_net_sqm} m\u00B2` : null}
                />
                <DetailField
                  label="Lot Size"
                  value={data.lot_size != null ? `${data.lot_size} m\u00B2` : null}
                />
                <DetailField label="Bedrooms" value={data.bedrooms} />
                <DetailField label="Bathrooms" value={data.bathrooms} />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          {address && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Street" value={data.address_street} />
                  <DetailField label="City" value={data.address_city} />
                  <DetailField label="State / Region" value={data.address_state} />
                  <DetailField label="ZIP Code" value={data.address_zip} />
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
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{data.description}</p>
                  </div>
                )}
                {!!(data.property_preferences && typeof data.property_preferences === "object" && Object.keys(data.property_preferences as Record<string, unknown>).length > 0) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Preferences
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(data.property_preferences, null, 2)}
                    </p>
                  </div>
                )}
                {!!(data.communication_notes && typeof data.communication_notes === "object" && Object.keys(data.communication_notes as Record<string, unknown>).length > 0) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Communication Notes
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
                  Comments
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
                Status & Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailField
                label="Status"
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
                label="Type"
                value={displayEnum(data.property_type)}
              />
              <DetailField
                label="Assigned to"
                value={data.assigned_to_user?.name}
              />

              <Separator />

              <div className="grid gap-1 text-xs text-muted-foreground">
                {data.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Created: {format(new Date(data.createdAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
                {data.updatedAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Updated: {format(new Date(data.updatedAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Portal Visibility - Only for owner view */}
          {!isReadOnly && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4" />
                  Public Visibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {visibility === "PUBLIC" ? (
                    <Badge className="bg-success/15 text-success dark:text-success hover:bg-success/20 flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Public
                    </Badge>
                  ) : visibility === "SELECTED" ? (
                    <Badge className="bg-primary/15 text-primary dark:text-primary hover:bg-primary/20 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Connections Only
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={visibility === "PRIVATE" ? "default" : "outline"}
                    size="sm"
                    leftIcon={<Lock className="h-4 w-4" />}
                    onClick={() => handleVisibilityChange("PRIVATE")}
                    disabled={isUpdatingVisibility}
                  >
                    Private
                  </Button>
                  <Button
                    variant={visibility === "SELECTED" ? "default" : "outline"}
                    size="sm"
                    leftIcon={<Users className="h-4 w-4" />}
                    onClick={() => handleVisibilityChange("SELECTED")}
                    disabled={isUpdatingVisibility}
                  >
                    Connections
                  </Button>
                  <Button
                    variant={visibility === "PUBLIC" ? "default" : "outline"}
                    size="sm"
                    leftIcon={<Globe className="h-4 w-4" />}
                    onClick={() => handleVisibilityChange("PUBLIC")}
                    disabled={isUpdatingVisibility}
                  >
                    Public
                  </Button>
                </div>

                {visibility === "PUBLIC" && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Public URL</p>
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
                      <Link href={`/property/${data.id}`} target="_blank">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Oikion Network visibility */}
          {!isReadOnly && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4" />
                  Oikion Network
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="network-visible-property" className="flex flex-col gap-1 cursor-pointer">
                    <span className="font-medium text-sm">Share in network</span>
                    <span className="text-xs text-muted-foreground">
                      {networkVisible
                        ? "Visible to network peers for cross-agency matching."
                        : "Not shared with the network."}
                    </span>
                  </Label>
                  <Switch
                    id="network-visible-property"
                    checked={networkVisible}
                    disabled={isUpdatingNetwork}
                    onCheckedChange={async (checked) => {
                      setIsUpdatingNetwork(true);
                      const prev = networkVisible;
                      setNetworkVisible(checked);
                      const result = await setPropertyNetworkVisible(data.id, checked);
                      if (!result.success) {
                        setNetworkVisible(prev);
                        toast.error("Failed to update network visibility");
                      }
                      setIsUpdatingNetwork(false);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Clients */}
          <LinkedEntitiesPanel
            type="clients"
            entities={clients as unknown as Array<{ id: string; friendlyId: string; client_name: string; client_type?: string; client_status?: string; primary_email?: string; primary_phone?: string; assigned_to_user?: { id: string; name: string }; }>}
            isLoading={isLoadingLinked || isLinking || isUnlinking}
            onLinkEntity={isReadOnly ? undefined : () => setLinkClientDialogOpen(true)}
            onUnlinkEntity={isReadOnly ? undefined : handleUnlinkClient}
            showAddButton={!isReadOnly}
            emptyMessage="No clients linked to this property yet."
          />

          {/* Linked Mandates */}
          <LinkedEntitiesPanel
            type="mandates"
            entities={linkedMandates}
            isLoading={isLoadingLinked || isLinkingMandates || isUnlinkingMandates}
            onLinkEntity={isReadOnly ? undefined : () => setLinkMandateDialogOpen(true)}
            onUnlinkEntity={isReadOnly ? undefined : handleUnlinkMandate}
            showAddButton={!isReadOnly}
            emptyMessage="No mandates linked to this property yet."
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
        </div>
      </div>

      {/* ================================================================== */}
      {/* Edit Sheet                                                         */}
      {/* ================================================================== */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Property</SheetTitle>
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
          title="Link Clients to Property"
          description="Select clients who are interested in or viewing this property."
        />
      )}

      {/* Link Mandate Dialog */}
      {!isReadOnly && (
        <LinkEntityDialog
          open={linkMandateDialogOpen}
          onOpenChange={setLinkMandateDialogOpen}
          entityType="mandate"
          sourceId={data.id}
          sourceType="property"
          alreadyLinkedIds={(linkedMandates ?? []).map((m: any) => m.id)}
          onLink={handleLinkMandates}
          title="Link Mandates to Property"
          description="Select mandates associated with this property."
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

      {/* Quick Add Mandate */}
      {!isReadOnly && (
        <QuickAddMandate
          open={createMandateOpen}
          onOpenChange={setCreateMandateOpen}
          organizationUsers={orgUsers.map((u) => ({ id: u.id, name: u.name ?? "" }))}
          preLinkedPropertyId={data.id}
          onSuccess={() => mutateLinked()}
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
