// @ts-nocheck
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
  Mail,
  MapPin,
  FileText,
  Building2,
  Clock,
  Share2,
  MessageSquare,
} from "lucide-react";
import { UpdateAccountForm } from "../../../accounts/components/UpdateAccountForm";
import { LinkedEntitiesPanel, LinkEntityDialog } from "@/components/linking";
import { EventCreateForm } from "@/components/calendar/EventCreateForm";
import { EntityQuickActions } from "@/components/entity-actions/EntityQuickActions";
import { ShareModal } from "@/components/social/ShareModal";
import { ClientComments } from "./ClientComments";

import { toast } from "sonner";
import {
  useClientLinked,
  useLinkPropertiesToClient,
  useUnlinkPropertyFromClient,
  useLinkMandatesToClient,
  useUnlinkMandateFromClient,
  useLinkDocumentsToClient,
  useUnlinkDocumentFromClient,
} from "@/hooks/swr";
import { QuickExportButton } from "@/components/export";
import { QuickAddMandate } from "@/app/[locale]/app/(routes)/mandates/components/QuickAddMandate";
import { QuickAddProperty } from "@/app/[locale]/app/(routes)/mls/components/QuickAddProperty";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientViewProps {
  data: {
    id: string;
    friendlyId?: string;
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

    communication_notes?: Record<string, unknown>;
    assigned_to?: string;
    assigned_to_user?: { name: string } | null;
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

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  LEAD: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  INACTIVE: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  CONVERTED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  LOST: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientView({
  data,
  defaultEditOpen = false,
  isReadOnly = false,
  sharePermission = null,
  currentUserId = "",
  locale = "en",
}: ClientViewProps) {
  const router = useRouter();
  const t = useTranslations("crm");
  const [editOpen, setEditOpen] = useState(defaultEditOpen);
  const [linkPropertyDialogOpen, setLinkPropertyDialogOpen] = useState(false);
  const [linkMandateDialogOpen, setLinkMandateDialogOpen] = useState(false);
  const [linkDocumentDialogOpen, setLinkDocumentDialogOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [createMandateOpen, setCreateMandateOpen] = useState(false);
  const [createPropertyOpen, setCreatePropertyOpen] = useState(false);
  const [autoLinkNewProperty, setAutoLinkNewProperty] = useState(false);
  const [autoLinkNewMandate, setAutoLinkNewMandate] = useState(false);

  // Organization users for QuickAdd components
  const { users: orgUsers } = useOrgUsers({ enabled: !isReadOnly });

  // Linked entities via SWR
  const {
    properties,
    mandates: linkedMandates,
    documents: linkedDocuments,
    events,
    isLoading: isLoadingLinked,
    mutate: mutateLinked,
  } = useClientLinked(data?.id);

  const { linkProperties, isLinking } = useLinkPropertiesToClient(data.id);
  const { unlinkProperty, isUnlinking } = useUnlinkPropertyFromClient(data.id);
  const { linkMandates, isLinking: isLinkingMandates } = useLinkMandatesToClient(data.id);
  const { unlinkMandate, isUnlinking: isUnlinkingMandates } = useUnlinkMandateFromClient(data.id);
  const { linkDocuments, isLinking: isLinkingDocuments } = useLinkDocumentsToClient(data.id);
  const { unlinkDocument, isUnlinking: isUnlinkingDocuments } = useUnlinkDocumentFromClient(data.id);

  useEffect(() => {
    setEditOpen(defaultEditOpen);
  }, [defaultEditOpen]);

  const handleLinkProperties = async (propertyIds: string[]) => {
    try {
      await linkProperties(propertyIds);
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
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink property:", error);
      toast.error("Failed to unlink property");
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

  const handleEditSave = () => {
    setEditOpen(false);
    router.refresh();
  };

  // Derived values
  const allEvents = [...(events.upcoming || []), ...(events.past || [])];
  const billingAddress = [data.billing_street, data.billing_city, data.billing_state, data.billing_postal_code, data.billing_country].filter(Boolean).join(", ");
  const shippingAddress = [data.shipping_street, data.shipping_city, data.shipping_state, data.shipping_postal_code, data.shipping_country].filter(Boolean).join(", ");

  const displayEnum = (value: string | null | undefined) => {
    if (!value) return null;
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

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
            onClick={() => router.push(`/${locale}/app/crm/clients`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {data.client_name}
              </h1>
              {data.client_status && (
                <Badge
                  className={statusColors[data.client_status] ?? statusColors.LEAD}
                  variant="secondary"
                >
                  {displayEnum(data.client_status)}
                </Badge>
              )}
              {data.client_type && (
                <Badge variant="outline">
                  {displayEnum(data.client_type)}
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
              {t("ClientView.edit")}
            </Button>
            <EntityQuickActions
              entityType="client"
              onCreateMandate={() => setCreateMandateOpen(true)}
              onCreateEvent={() => setCreateEventOpen(true)}
              onLinkProperty={() => setLinkPropertyDialogOpen(true)}
              onLinkMandate={() => setLinkMandateDialogOpen(true)}
            />
            <QuickExportButton
              entityType="client"
              entityId={data.id}
              entityName={data.client_name}
              variant="outline"
              size="default"
            />
            <Button
              variant="outline"
              leftIcon={<Share2 className="h-4 w-4" />}
              onClick={() => setShareModalOpen(true)}
            >
              {t("ClientView.share")}
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
          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                {t("ClientView.contactInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label={t("ClientView.email")} value={data.primary_email} />
                <DetailField label={t("ClientView.phone")} value={data.office_phone} />
                <DetailField label={t("ClientView.fax")} value={data.fax} />
                <DetailField label={t("ClientView.website")} value={data.website} />
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          {(billingAddress || shippingAddress) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  {t("ClientView.addresses")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label={t("ClientView.billingAddress")} value={billingAddress || null} />
                  <DetailField label={t("ClientView.shippingAddress")} value={shippingAddress || null} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business Details */}
          {(data.vat || data.company_id || data.industry || data.annual_revenue || data.member_of) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  {t("ClientView.businessDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label={t("ClientView.vat")} value={data.vat} />
                  <DetailField label={t("ClientView.companyId")} value={data.company_id} />
                  <DetailField label={t("ClientView.industry")} value={data.industry} />
                  <DetailField label={t("ClientView.annualRevenue")} value={data.annual_revenue} />
                  <DetailField label={t("ClientView.memberOf")} value={data.member_of} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {(data.description || data.communication_notes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {t("ClientView.notes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("ClientView.description")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{data.description}</p>
                  </div>
                )}

                {data.communication_notes && Object.keys(data.communication_notes).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("ClientView.communicationNotes")}
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

          {/* Comments */}
          {currentUserId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  {t("ClientView.comments")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientComments
                  clientId={data.id}
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
                {t("ClientView.statusAndAssignment")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailField
                label={t("ClientView.status")}
                value={
                  data.client_status ? (
                    <Badge
                      className={statusColors[data.client_status] ?? statusColors.LEAD}
                      variant="secondary"
                    >
                      {displayEnum(data.client_status)}
                    </Badge>
                  ) : null
                }
              />
              <DetailField
                label={t("ClientView.type")}
                value={displayEnum(data.client_type)}
              />
              <DetailField
                label={t("ClientView.assignedTo")}
                value={data.assigned_to_user?.name ?? (data.assigned_to ? "Deleted User" : undefined)}
              />

              <Separator />

              <div className="grid gap-1 text-xs text-muted-foreground">
                {data.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {t("ClientView.created")} {format(new Date(data.createdAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
                {data.updatedAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {t("ClientView.updated")} {format(new Date(data.updatedAt), "dd/MM/yyyy HH:mm")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Linked Properties */}
          <LinkedEntitiesPanel
            type="properties"
            entities={properties as unknown as Array<{ id: string; friendlyId: string; property_name: string; property_type?: string; property_status?: string; address_street?: string; address_city?: string; area?: string; price?: number; assigned_to_user?: { id: string; name: string }; }>}
            isLoading={isLoadingLinked || isLinking || isUnlinking}
            onLinkEntity={isReadOnly ? undefined : () => setLinkPropertyDialogOpen(true)}
            onUnlinkEntity={isReadOnly ? undefined : handleUnlinkProperty}
            showAddButton={!isReadOnly}
            emptyMessage="No properties linked to this client yet."
          />

          {/* Linked Mandates */}
          <LinkedEntitiesPanel
            type="mandates"
            entities={linkedMandates}
            isLoading={isLoadingLinked || isLinkingMandates || isUnlinkingMandates}
            onLinkEntity={isReadOnly ? undefined : () => setLinkMandateDialogOpen(true)}
            onUnlinkEntity={isReadOnly ? undefined : handleUnlinkMandate}
            showAddButton={!isReadOnly}
            emptyMessage="No mandates linked to this client yet."
          />

          {/* Calendar Events */}
          <LinkedEntitiesPanel
            type="events"
            entities={allEvents as unknown as Array<{ id: string; friendlyId: string; title: string; description?: string; startTime: string; endTime: string; location?: string; status?: string; eventType?: string; }>}
            isLoading={isLoadingLinked}
            showAddButton={false}
            onCreateEvent={!isReadOnly ? () => setCreateEventOpen(true) : undefined}
            emptyMessage="No calendar events for this client yet."
          />

          {/* Linked Documents */}
          <LinkedEntitiesPanel
            type="documents"
            entities={linkedDocuments as unknown as Array<{ id: string; friendlyId: string; document_name: string; document_type?: string; document_file_mimeType?: string; createdAt?: string; }>}
            isLoading={isLoadingLinked || isLinkingDocuments || isUnlinkingDocuments}
            onLinkEntity={isReadOnly ? undefined : () => setLinkDocumentDialogOpen(true)}
            onUnlinkEntity={isReadOnly ? undefined : handleUnlinkDocument}
            showAddButton={!isReadOnly}
            emptyMessage="No documents linked to this client yet."
          />
        </div>
      </div>

      {/* ================================================================== */}
      {/* Edit Sheet                                                         */}
      {/* ================================================================== */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("ClientView.editClient")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
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
              open={setEditOpen}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Event Sheet */}
      {!isReadOnly && (
        <EventCreateForm
          open={createEventOpen}
          onOpenChange={setCreateEventOpen}
          clientId={data.id}
          onSuccess={() => mutateLinked()}
        />
      )}

      {/* Link Property Dialog */}
      {!isReadOnly && (
        <LinkEntityDialog
          open={linkPropertyDialogOpen}
          onOpenChange={setLinkPropertyDialogOpen}
          entityType="property"
          sourceId={data.id}
          sourceType="client"
          alreadyLinkedIds={properties.map((p) => p.id)}
          onLink={handleLinkProperties}
          onCreate={() => {
            setLinkPropertyDialogOpen(false);
            setAutoLinkNewProperty(false);
            setCreatePropertyOpen(true);
          }}
          onCreateAndLink={() => {
            setLinkPropertyDialogOpen(false);
            setAutoLinkNewProperty(true);
            setCreatePropertyOpen(true);
          }}
          title="Link Properties to Client"
          description="Select properties that this client is interested in or owns."
        />
      )}

      {/* Link Mandate Dialog */}
      {!isReadOnly && (
        <LinkEntityDialog
          open={linkMandateDialogOpen}
          onOpenChange={setLinkMandateDialogOpen}
          entityType="mandate"
          sourceId={data.id}
          sourceType="client"
          alreadyLinkedIds={(linkedMandates ?? []).map((m: any) => m.id)}
          onLink={handleLinkMandates}
          onCreate={() => {
            setLinkMandateDialogOpen(false);
            setAutoLinkNewMandate(false);
            setCreateMandateOpen(true);
          }}
          onCreateAndLink={() => {
            setLinkMandateDialogOpen(false);
            setAutoLinkNewMandate(true);
            setCreateMandateOpen(true);
          }}
          title="Link Mandates to Client"
          description="Select mandates associated with this client."
        />
      )}

      {/* Link Document Dialog */}
      {!isReadOnly && (
        <LinkEntityDialog
          open={linkDocumentDialogOpen}
          onOpenChange={setLinkDocumentDialogOpen}
          entityType="document"
          sourceId={data.id}
          sourceType="client"
          alreadyLinkedIds={(linkedDocuments ?? []).map((d: any) => d.id)}
          onLink={handleLinkDocuments}
          title="Link Documents to Client"
          description="Select documents to associate with this client."
        />
      )}

      {/* Share Modal */}
      {!isReadOnly && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          entityType="CLIENT"
          entityId={data.id}
          entityName={data.client_name}
        />
      )}

      {/* Quick Add Mandate */}
      {!isReadOnly && (
        <QuickAddMandate
          open={createMandateOpen}
          onOpenChange={(open) => {
            setCreateMandateOpen(open);
            if (!open) setAutoLinkNewMandate(false);
          }}
          organizationUsers={orgUsers.map((u) => ({ id: u.id, name: u.name ?? "" }))}
          preLinkedClientId={autoLinkNewMandate ? data.id : undefined}
          onSuccess={() => mutateLinked()}
        />
      )}

      {/* Quick Add Property */}
      {!isReadOnly && (
        <QuickAddProperty
          open={createPropertyOpen}
          onOpenChange={(open) => {
            setCreatePropertyOpen(open);
            if (!open) setAutoLinkNewProperty(false);
          }}
          users={orgUsers}
          onSuccess={async (propertyId) => {
            if (autoLinkNewProperty && propertyId) {
              await handleLinkProperties([propertyId]);
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
  value: React.ReactNode | string | null | undefined;
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
  );
}
