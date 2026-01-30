"use client";

import { useEffect, useState } from "react";
import moment from "moment";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UpdateAccountForm } from "../../../accounts/components/UpdateAccountForm";
import { CreateBookingButton } from "@/components/calendar/CreateBookingButton";
import { LinkedEntitiesPanel, LinkEntityDialog } from "@/components/linking";
import { ShareModal } from "@/components/social/ShareModal";
import { ClientComments } from "./ClientComments";
import { ClientMatchingProperties } from "./ClientMatchingProperties";
import { toast } from "sonner";
import { Share2, Users } from "lucide-react";
import {
  useClientLinked,
  useLinkPropertiesToClient,
  useUnlinkPropertyFromClient,
} from "@/hooks/swr";
import { QuickExportButton } from "@/components/export";

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "N/A";
  return moment(value).format("DD/MM/YYYY, HH:mm:ss");
};

interface ClientViewProps {
  data: {
    id: string;
    client_name: string;
    client_type?: string;
    client_status?: string;
    primary_email?: string;
    office_phone?: string;
    website?: string;
    fax?: string;
    company_id?: string;
    vat?: string;
    description?: string;
    billing_street?: string;
    billing_postal_code?: string;
    billing_city?: string;
    billing_state?: string;
    billing_country?: string;
    shipping_street?: string;
    shipping_postal_code?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_country?: string;
    property_preferences?: Record<string, unknown>;
    communication_notes?: Record<string, unknown>;
    assigned_to?: string;
    assigned_to_user?: { name: string };
    annual_revenue?: string;
    member_of?: string;
    industry?: string;
    v?: number;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  defaultEditOpen?: boolean;
  isReadOnly?: boolean;
  sharePermission?: "VIEW_ONLY" | "VIEW_COMMENT" | null;
  currentUserId?: string;
  locale?: string;
}

export default function ClientView({ 
  data, 
  defaultEditOpen = false, 
  isReadOnly = false,
  sharePermission = null,
  currentUserId = "",
  locale = "en",
}: ClientViewProps) {
  const [open, setOpen] = useState(defaultEditOpen);
  const [linkPropertyDialogOpen, setLinkPropertyDialogOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Use SWR for linked data fetching
  const {
    properties,
    events,
    isLoading: isLoadingLinked,
    mutate: mutateLinked,
  } = useClientLinked(data?.id);

  // Use mutation hooks for linking/unlinking
  const { linkProperties, isLinking } = useLinkPropertiesToClient(data.id);
  const { unlinkProperty, isUnlinking } = useUnlinkPropertyFromClient(data.id);

  useEffect(() => {
    setOpen(defaultEditOpen);
  }, [defaultEditOpen]);

  const handleLinkProperties = async (propertyIds: string[]) => {
    try {
      await linkProperties(propertyIds);
      // Revalidate SWR cache
      await mutateLinked();
    } catch (error) {
      console.error("Failed to link properties:", error);
      throw error;
    }
  };

  const handleUnlinkProperty = async (propertyId: string) => {
    try {
      await unlinkProperty(propertyId);
      toast.success("Property unlinked successfully");
      // Revalidate SWR cache
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink property:", error);
      toast.error("Failed to unlink property");
    }
  };

  const Row = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
    <div className="-mx-2 flex items-start justify-between space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-sm text-muted-foreground break-all">{value ?? "N/A"}</p>
      </div>
    </div>
  );

  // Combine upcoming and past events for the events panel
  const allEvents = [...(events.upcoming || []), ...(events.past || [])];

  return (
    <div className="space-y-6">
      {/* Share with Connections Card - Only for non-shared view */}
      {!isReadOnly && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Share with Connections</CardTitle>
                  <CardDescription>Collaborate with other agents on this client</CardDescription>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShareModalOpen(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Main Client Card */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle>{data.client_name}</CardTitle>
          </div>
          {!isReadOnly && (
            <div className="flex gap-2">
              <QuickExportButton
                entityType="client"
                entityId={data.id}
                entityName={data.client_name}
                variant="outline"
                size="default"
              />
              <CreateBookingButton
                clientId={data.id}
                prefilledData={{
                  name: data.client_name || undefined,
                  email: data.primary_email || undefined,
                }}
              />
              <Sheet open={open} onOpenChange={setOpen}>
                <Button onClick={() => setOpen(true)}>Edit</Button>
                <SheetContent className="w-full sm:min-w-[600px] lg:min-w-[900px] space-y-2">
                  <SheetHeader>
                    <SheetTitle>Edit Client</SheetTitle>
                  </SheetHeader>
                  <div className="h-full overflow-y-auto p-2">
                    <UpdateAccountForm
                      initialData={{
                        id: data.id,
                        v: data.v ?? 0,
                        name: data.client_name,
                        office_phone: data.office_phone ?? "",
                        website: data.website ?? "",
                        fax: data.fax ?? "",
                        company_id: data.company_id ?? "",
                        vat: data.vat ?? "",
                        email: data.primary_email ?? "",
                        billing_street: data.billing_street ?? "",
                        billing_postal_code: data.billing_postal_code ?? "",
                        billing_city: data.billing_city ?? "",
                        billing_state: data.billing_state ?? "",
                        billing_country: data.billing_country ?? "",
                        shipping_street: data.shipping_street ?? "",
                        shipping_postal_code: data.shipping_postal_code ?? "",
                        shipping_city: data.shipping_city ?? "",
                        shipping_state: data.shipping_state ?? "",
                        shipping_country: data.shipping_country ?? "",
                        description: data.description ?? "",
                        assigned_to: data.assigned_to ?? "",
                        status: data.client_status ?? "",
                        annual_revenue: data.annual_revenue ?? "",
                        member_of: data.member_of ?? "",
                        industry: data.industry ?? "",
                      }}
                      open={setOpen}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <Row label="Email" value={data.primary_email} />
            <Row label="Phone" value={data.office_phone} />
            <Row label="Type" value={data.client_type} />
            <Row label="Status" value={data.client_status} />
            <Row label="Assigned to" value={data.assigned_to_user?.name} />
            <Row label="Created" value={formatDateTime(data.createdAt)} />
            <Row label="Updated" value={formatDateTime(data.updatedAt)} />
          </div>
          <div>
            <Row label="Description" value={data.description} />
            <Row label="Property preferences" value={data.property_preferences ? JSON.stringify(data.property_preferences) : "N/A"} />
            <Row label="Communication notes" value={data.communication_notes ? JSON.stringify(data.communication_notes) : "N/A"} />
            <Row label="Billing address" value={[data.billing_street, data.billing_city, data.billing_state, data.billing_postal_code, data.billing_country].filter(Boolean).join(", ")} />
            <Row label="Shipping address" value={[data.shipping_street, data.shipping_city, data.shipping_state, data.shipping_postal_code, data.shipping_country].filter(Boolean).join(", ")} />
            <Row label="Website" value={data.website} />
            <Row label="VAT" value={data.vat} />
          </div>
        </CardContent>
      </Card>

      {/* Matching Properties Section */}
      <ClientMatchingProperties clientId={data.id} locale={locale} />

      {/* Linked Entities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LinkedEntitiesPanel
          type="properties"
          entities={properties as unknown as Array<{ id: string; property_name: string; property_type?: string; property_status?: string; address_street?: string; address_city?: string; area?: string; price?: number; assigned_to_user?: { id: string; name: string }; }>}
          isLoading={isLoadingLinked || isLinking || isUnlinking}
          onLinkEntity={isReadOnly ? undefined : () => setLinkPropertyDialogOpen(true)}
          onUnlinkEntity={isReadOnly ? undefined : handleUnlinkProperty}
          showAddButton={!isReadOnly}
          emptyMessage="No properties linked to this client yet."
        />

        <LinkedEntitiesPanel
          type="events"
          entities={allEvents as unknown as Array<{ id: string; title: string; description?: string; startTime: string; endTime: string; location?: string; status?: string; eventType?: string; }>}
          isLoading={isLoadingLinked}
          showAddButton={false}
          emptyMessage="No calendar events for this client yet."
        />
      </div>

      {/* Comments Section - Show for org members and sharees with VIEW_COMMENT */}
      {currentUserId && (
        <ClientComments
          clientId={data.id}
          canComment={!isReadOnly || sharePermission === "VIEW_COMMENT"}
          currentUserId={currentUserId}
        />
      )}

      {/* Link Property Dialog - Only for non-shared view */}
      {!isReadOnly && (
        <LinkEntityDialog
          open={linkPropertyDialogOpen}
          onOpenChange={setLinkPropertyDialogOpen}
          entityType="property"
          sourceId={data.id}
          sourceType="client"
          alreadyLinkedIds={properties.map((p) => p.id)}
          onLink={handleLinkProperties}
          title="Link Properties to Client"
          description="Select properties that this client is interested in or owns."
        />
      )}

      {/* Share Modal - Only for non-shared view */}
      {!isReadOnly && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          entityType="CLIENT"
          entityId={data.id}
          entityName={data.client_name}
        />
      )}
    </div>
  );
}
