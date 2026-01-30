"use client";

import { useEffect, useState } from "react";
import moment from "moment";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditPropertyForm } from "./EditPropertyForm";
import { CreateBookingButton } from "@/components/calendar/CreateBookingButton";
import { LinkedEntitiesPanel, LinkEntityDialog } from "@/components/linking";
import { ShareModal } from "@/components/social/ShareModal";
import { toast } from "sonner";
import axios from "axios";
import Link from "next/link";
import {
  Globe,
  Eye,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Lock,
  Users,
} from "lucide-react";
import { PropertyComments } from "./PropertyComments";
import { PropertyMatchingClients } from "./PropertyMatchingClients";
import {
  usePropertyLinked,
  useLinkClientsToProperty,
  useUnlinkClientFromProperty,
  useExportHistory,
} from "@/hooks/swr";
import { QuickExportButton, ExportHistoryPanel } from "@/components/export";

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "N/A";
  return moment(value).format("DD/MM/YYYY, HH:mm:ss");
};

interface PropertyViewProps {
  data: {
    id: string;
    property_name: string;
    property_type?: string | null;
    property_status?: string | null;
    price?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    square_feet?: number | null;
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

export default function PropertyView({ 
  data, 
  defaultEditOpen = false, 
  isReadOnly = false,
  sharePermission = null,
  currentUserId = "",
  locale = "en",
}: PropertyViewProps) {
  const [open, setOpen] = useState(defaultEditOpen);
  const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [visibility, setVisibility] = useState(data.portal_visibility || "PRIVATE");
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState(`/property/${data.id}`);

  // Use SWR for linked data fetching
  const { 
    clients, 
    events, 
    isLoading: isLoadingLinked, 
    mutate: mutateLinked 
  } = usePropertyLinked(data?.id);

  // Use mutation hooks for linking/unlinking
  const { linkClients, isLinking } = useLinkClientsToProperty(data.id);
  const { unlinkClient, isUnlinking } = useUnlinkClientFromProperty(data.id);

  useEffect(() => {
    setOpen(defaultEditOpen);
  }, [defaultEditOpen]);

  // Set public URL after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/property/${data.id}`);
    }
  }, [data.id]);

  const handleLinkClients = async (clientIds: string[]) => {
    try {
      await linkClients(clientIds);
      // Revalidate SWR cache
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
      // Revalidate SWR cache
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink client:", error);
      toast.error("Failed to unlink client");
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
    // publicUrl is already set to full URL after mount, safe to use here
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const Row = ({ label, value }: { label: string; value: string | number | undefined | null | Record<string, unknown> }) => {
    const displayValue = value === null || value === undefined
      ? "N/A"
      : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
    return (
      <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-sm text-muted-foreground break-all">{displayValue}</p>
        </div>
      </div>
    );
  };

  // Combine upcoming and past events for the events panel
  const allEvents = [...(events.upcoming || []), ...(events.past || [])];

  return (
    <div className="space-y-6">
      {/* Public Visibility Card - Only show for non-shared (owner) view */}
      {!isReadOnly && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Public Visibility</CardTitle>
                  <CardDescription>Control who can see this property</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {visibility === "PUBLIC" ? (
                  <Badge className="bg-success/15 text-success dark:text-success hover:bg-success/20">
                    <Eye className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                ) : visibility === "SELECTED" ? (
                  <Badge className="bg-primary/15 text-primary dark:text-primary hover:bg-primary/20">
                    <Users className="h-3 w-3 mr-1" />
                    Connections Only
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Visibility Options */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={visibility === "PRIVATE" ? "default" : "outline"}
                size="sm"
                onClick={() => handleVisibilityChange("PRIVATE")}
                disabled={isUpdatingVisibility}
              >
                <Lock className="h-4 w-4 mr-1" />
                Private
              </Button>
              <Button
                variant={visibility === "SELECTED" ? "default" : "outline"}
                size="sm"
                onClick={() => handleVisibilityChange("SELECTED")}
                disabled={isUpdatingVisibility}
              >
                <Users className="h-4 w-4 mr-1" />
                Connections Only
              </Button>
              <Button
                variant={visibility === "PUBLIC" ? "default" : "outline"}
                size="sm"
                onClick={() => handleVisibilityChange("PUBLIC")}
                disabled={isUpdatingVisibility}
              >
                <Globe className="h-4 w-4 mr-1" />
                Public
              </Button>
            </div>

            {/* Public URL Preview */}
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

            {/* Share with Connections */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-sm font-medium">Share with Connections</p>
                <p className="text-xs text-muted-foreground">
                  Share this property with your agent network
                </p>
              </div>
              <Button variant="outline" onClick={() => setShareModalOpen(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Property Card */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle>{data.property_name}</CardTitle>
          </div>
          {!isReadOnly && (
            <div className="flex gap-2">
              <QuickExportButton
                entityType="property"
                entityId={data.id}
                entityName={data.property_name}
                publicUrl={publicUrl}
                variant="outline"
                size="default"
              />
              <CreateBookingButton
                propertyId={data.id}
                eventType="property-viewing"
                prefilledData={{
                  notes: `Property: ${data.property_name}${data.address_street ? ` - ${data.address_street}` : ''}`,
                }}
              />
              <Sheet open={open} onOpenChange={setOpen}>
                <Button onClick={() => setOpen(true)}>Edit</Button>
                <SheetContent className="w-full sm:min-w-[600px] lg:min-w-[900px] space-y-2">
                  <SheetHeader>
                    <SheetTitle>Edit Property</SheetTitle>
                  </SheetHeader>
                  <div className="h-full overflow-y-auto p-2">
                    <EditPropertyForm initialData={data} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <Row label="Type" value={data.property_type} />
            <Row label="Status" value={data.property_status} />
            <Row label="Assigned to" value={data.assigned_to_user?.name} />
            <Row label="Price" value={data.price} />
            <Row label="Bedrooms" value={data.bedrooms} />
            <Row label="Bathrooms" value={data.bathrooms} />
            <Row label="Square feet" value={data.square_feet} />
            <Row label="Lot size" value={data.lot_size} />
            <Row label="Year built" value={data.year_built} />
            <Row label="Created" value={formatDateTime(data.createdAt)} />
            <Row label="Updated" value={formatDateTime(data.updatedAt)} />
          </div>
          <div>
            <Row label="Description" value={data.description} />
            <Row label="Address" value={[data.address_street, data.address_city, data.address_state, data.address_zip].filter(Boolean).join(", ")} />
            <Row label="Preferences" value={data.property_preferences as Record<string, unknown> | null | undefined} />
            <Row label="Notes" value={data.communication_notes as Record<string, unknown> | null | undefined} />
          </div>
        </CardContent>
      </Card>

      {/* Matching Clients Section */}
      <PropertyMatchingClients propertyId={data.id} locale={locale} />

      {/* Linked Entities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LinkedEntitiesPanel
          type="clients"
          entities={clients as unknown as Array<{ id: string; client_name: string; client_type?: string; client_status?: string; primary_email?: string; primary_phone?: string; intent?: string; assigned_to_user?: { id: string; name: string }; }>}
          isLoading={isLoadingLinked || isLinking || isUnlinking}
          onLinkEntity={isReadOnly ? undefined : () => setLinkClientDialogOpen(true)}
          onUnlinkEntity={isReadOnly ? undefined : handleUnlinkClient}
          showAddButton={!isReadOnly}
          emptyMessage="No clients linked to this property yet."
        />

        <LinkedEntitiesPanel
          type="events"
          entities={allEvents as unknown as Array<{ id: string; title: string; description?: string; startTime: string; endTime: string; location?: string; status?: string; eventType?: string; }>}
          isLoading={isLoadingLinked}
          showAddButton={false}
          emptyMessage="No calendar events for this property yet."
        />
      </div>

      {/* Export History Section - Only for non-shared view */}
      {!isReadOnly && (
        <ExportHistoryPanel
          entityType="PROPERTY"
          entityId={data.id}
          entityName={data.property_name}
          onReExport={(record) => {
            // Trigger re-export with same format and destination
            const params = new URLSearchParams({
              format: record.exportFormat,
              scope: "filtered",
            });
            if (record.destination) params.set("destination", record.destination);
            if (record.exportTemplate) params.set("template", record.exportTemplate);
            
            // Navigate to export or trigger download
            window.open(`/api/export/mls?${params.toString()}`, "_blank");
          }}
          maxItems={5}
        />
      )}

      {/* Comments Section - Show for org members and sharees with VIEW_COMMENT */}
      {currentUserId && (
        <PropertyComments
          propertyId={data.id}
          canComment={!isReadOnly || sharePermission === "VIEW_COMMENT"}
          currentUserId={currentUserId}
        />
      )}

      {/* Link Client Dialog - Only for non-shared view */}
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

      {/* Share Modal - Only for non-shared view */}
      {!isReadOnly && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          entityType="PROPERTY"
          entityId={data.id}
          entityName={data.property_name}
        />
      )}
    </div>
  );
}
