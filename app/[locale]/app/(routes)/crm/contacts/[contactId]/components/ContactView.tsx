"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  Clock,
  Mail,
  Phone,
  User,
  Calendar,
  Shield,
  Tag,
  MessageSquare,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LinkedEntitiesPanel } from "@/components/linking/LinkedEntitiesPanel";
import { useAppToast } from "@/hooks/use-app-toast";
import { EntityActivityPanel } from "@/components/activity/EntityActivityPanel";
import { useContactLinked, getContactLinkedKey } from "@/hooks/swr/useContactLinked";
import {
  useLinkRequestsToContact,
  useUnlinkRequestFromContact,
  useLinkPropertiesToContact,
  useUnlinkPropertyFromContact,
} from "@/hooks/swr/useLinkMutations";
import { LinkEntityDialog } from "@/components/linking/LinkEntityDialog";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";

// ── Status colors (consistent with list view — Gestalt: similarity) ──
const STATUS_COLORS: Record<string, string> = {
  LEAD: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  CONTACTED: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  QUALIFIED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  UNDER_CONTRACT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  COMPLETED: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  ON_HOLD: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  INACTIVE: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

// ── Reusable detail field (Nielsen #8: Aesthetic and minimalist design) ──
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
        {value !== null && value !== undefined && value !== "" ? (
          typeof value === "string" ? <span>{value}</span> : value
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </div>
    </div>
  );
}

// ── Address renderer ──
function AddressDisplay({ address }: { address: any }) {
  if (!address) return <span className="text-muted-foreground/60">—</span>;
  const parts = [
    address.street,
    address.city,
    address.municipality,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return <span>{parts.join(", ") || "—"}</span>;
}

interface ContactViewProps {
  contact: any;
}

export default function ContactView({ contact }: ContactViewProps) {
  const t = useTranslations("crm");
  const tActivities = useTranslations("activities");
  const { toast } = useAppToast();

  const addresses = contact.addresses || [];
  const billingAddress = addresses.find?.((a: any) => a.type === "billing");
  const shippingAddress = addresses.find?.((a: any) => a.type === "shipping");

  // Linked entities via SWR (for real-time updates after mutations)
  const {
    requests: linkedRequests,
    properties: linkedProperties,
    documents: linkedDocuments,
    events: linkedEvents,
    isLoading: isLoadingLinked,
    mutate: mutateLinked,
  } = useContactLinked(contact.id);

  // Link/unlink hooks
  const { linkRequests, isLinking: isLinkingRequests } = useLinkRequestsToContact(contact.id);
  const { unlinkRequest, isUnlinking: isUnlinkingRequests } = useUnlinkRequestFromContact(contact.id);
  const { linkProperties, isLinking: isLinkingProperties } = useLinkPropertiesToContact(contact.id);
  const { unlinkProperty, isUnlinking: isUnlinkingProperties } = useUnlinkPropertyFromContact(contact.id);

  // Dialog state
  const [linkRequestDialogOpen, setLinkRequestDialogOpen] = useState(false);
  const [linkPropertyDialogOpen, setLinkPropertyDialogOpen] = useState(false);

  // Use SWR data if available, fall back to server-fetched data
  const displayRequests = linkedRequests.length > 0 || isLoadingLinked
    ? linkedRequests
    : (contact.requestContacts || []).map((rc: any) => ({
        id: rc.request?.id || rc.id,
        friendlyId: rc.request?.friendlyId,
        requestType: rc.request?.requestType || "BUY",
        status: rc.request?.status,
        urgency: rc.request?.urgency,
        budgetMin: rc.request?.budgetMin ? Number(rc.request.budgetMin) : undefined,
        budgetMax: rc.request?.budgetMax ? Number(rc.request.budgetMax) : undefined,
        locationDisplayName: rc.request?.locationDisplayName,
        municipality: rc.request?.municipality,
      }));

  const displayProperties = linkedProperties.length > 0 || isLoadingLinked
    ? linkedProperties
    : (contact.ownedProperties || []).map((p: any) => ({
        id: p.id,
        friendlyId: p.friendlyId,
        property_name: p.property_name || p.friendlyId,
        property_type: p.property_type,
        property_status: p.property_status,
        address_city: p.address_city,
        price: p.price ? Number(p.price) : undefined,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
      }));

  // Handlers
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
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink request:", error);
    }
  };

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
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink property:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header (Nielsen #3: User control — back navigation) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/app/crm/contacts">
            <Button variant="ghost" size="icon" aria-label={t("contacts.view.backToContacts") ?? "Back to contacts"}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                contact.isCompany
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-primary/10"
              )}
              aria-hidden="true"
            >
              {contact.isCompany ? (
                <Building2 className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {contact.displayName || "—"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {contact.friendlyId}
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              "ml-2",
              STATUS_COLORS[contact.status] || STATUS_COLORS.LEAD
            )}
            variant="secondary"
          >
            {t(`contacts.status.${contact.status}` as Parameters<typeof t>[0])}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            {t("contacts.view.share")}
          </Button>
          <Button size="sm">
            {t("contacts.view.edit")}
          </Button>
        </div>
      </div>

      {/* ── Main content: tabs + 2/3 + 1/3 grid (Gestalt: proximity grouping) ── */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("contacts.view.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="activity">{t("contacts.view.tabs.activity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {t("contacts.view.contactInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label={t("contacts.view.email")}
                  value={
                    contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-primary hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : null
                  }
                />
                <DetailField
                  label={t("contacts.view.secondaryEmail")}
                  value={contact.secondaryEmail}
                />
                <DetailField
                  label={t("contacts.view.phone")}
                  value={
                    contact.primaryPhone ? (
                      <a
                        href={`tel:${contact.primaryPhone}`}
                        className="text-primary hover:underline"
                      >
                        {contact.primaryPhone}
                      </a>
                    ) : null
                  }
                />
                <DetailField
                  label={t("contacts.view.secondaryPhone")}
                  value={contact.secondaryPhone}
                />
                <DetailField
                  label={t("contacts.view.officePhone")}
                  value={contact.officePhone}
                />
                <DetailField
                  label={t("contacts.view.whatsapp")}
                  value={contact.whatsapp}
                />
                <DetailField
                  label={t("contacts.view.viber")}
                  value={contact.viber}
                />
                <DetailField
                  label={t("contacts.view.language")}
                  value={contact.languagePreference}
                />
              </div>
            </CardContent>
          </Card>

          {/* Addresses Card */}
          {(billingAddress || shippingAddress) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {t("contacts.view.addresses")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField
                    label={t("contacts.view.billingAddress")}
                    value={<AddressDisplay address={billingAddress} />}
                  />
                  <DetailField
                    label={t("contacts.view.shippingAddress")}
                    value={<AddressDisplay address={shippingAddress} />}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business Details Card */}
          {(contact.taxId ||
            contact.doy ||
            contact.companyGemi ||
            contact.companyId ||
            contact.idDocument) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  {t("contacts.view.businessDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField
                    label={t("contacts.view.taxId")}
                    value={contact.taxId}
                  />
                  <DetailField
                    label={t("contacts.view.doy")}
                    value={contact.doy}
                  />
                  <DetailField
                    label={t("contacts.view.vatNumber")}
                    value={contact.vatNumber}
                  />
                  <DetailField
                    label={t("contacts.view.companyGemi")}
                    value={contact.companyGemi}
                  />
                  <DetailField
                    label={t("contacts.view.companyId")}
                    value={contact.companyId}
                  />
                  <DetailField
                    label={t("contacts.view.idDocument")}
                    value={contact.idDocument}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Card */}
          {(contact.notes || contact.communicationNotes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {t("contacts.view.notes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("contacts.view.description")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {contact.notes}
                    </p>
                  </div>
                )}
                {contact.communicationNotes && (
                  <>
                    {contact.notes && <Separator />}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {t("contacts.view.communicationNotes")}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {typeof contact.communicationNotes === "string"
                          ? contact.communicationNotes
                          : JSON.stringify(contact.communicationNotes, null, 2)}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Relationships Card */}
          {contact.relationships?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" aria-hidden="true" />
                  {t("contacts.view.relationships")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contact.relationships.map((rel: any) => (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div>
                          <Link
                            href={`/app/crm/contacts/${rel.relatedContact?.friendlyId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {rel.relatedContact?.displayName || "—"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {t(
                              `contacts.relationshipType.${rel.relationshipType}` as Parameters<typeof t>[0]
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — 1/3 sidebar */}
        <div className="space-y-6">
          {/* Status & Assignment Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" aria-hidden="true" />
                {t("contacts.view.statusAndAssignment")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailField
                label={t("contacts.view.status")}
                value={
                  <Badge
                    className={cn(
                      STATUS_COLORS[contact.status] || STATUS_COLORS.LEAD
                    )}
                    variant="secondary"
                  >
                    {t(`contacts.status.${contact.status}` as Parameters<typeof t>[0])}
                  </Badge>
                }
              />
              <DetailField
                label={t("contacts.view.categories")}
                value={
                  contact.category?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(contact.category as string[]).map((cat) => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {t(`contacts.category.${cat}` as Parameters<typeof t>[0])}
                        </Badge>
                      ))}
                    </div>
                  ) : null
                }
              />
              <DetailField
                label={t("contacts.view.source")}
                value={
                  contact.source
                    ? t(`contacts.source.${contact.source}` as Parameters<typeof t>[0])
                    : null
                }
              />
              <DetailField
                label={t("contacts.view.assignedTo")}
                value={contact.assignedAgent?.name}
              />
              <DetailField
                label={t("contacts.view.visibility")}
                value={contact.visibility}
              />
              <Separator />
              <DetailField
                label={t("contacts.view.created")}
                value={
                  contact.createdAt
                    ? format(new Date(contact.createdAt), "dd/MM/yyyy HH:mm")
                    : null
                }
              />
              <DetailField
                label={t("contacts.view.updated")}
                value={
                  contact.updatedAt
                    ? format(new Date(contact.updatedAt), "dd/MM/yyyy HH:mm")
                    : null
                }
              />
            </CardContent>
          </Card>

          {/* GDPR & Compliance Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {t("contacts.view.gdprConsent")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailField
                label={t("contacts.view.gdprConsent")}
                value={
                  <Badge
                    variant={
                      contact.gdprConsentGiven ? "success" : "destructive"
                    }
                    className="text-xs"
                  >
                    {contact.gdprConsentGiven ? t("contacts.view.yes") : t("contacts.view.no")}
                  </Badge>
                }
              />
              <DetailField
                label={t("contacts.view.marketingConsent")}
                value={
                  <Badge
                    variant={
                      contact.allowMarketing ? "success" : "secondary"
                    }
                    className="text-xs"
                  >
                    {contact.allowMarketing ? t("contacts.view.yes") : t("contacts.view.no")}
                  </Badge>
                }
              />
              {contact.doNotContact && (
                <DetailField
                  label={t("contacts.view.doNotContact")}
                  value={
                    <Badge variant="destructive" className="text-xs">
                      {t("contacts.view.doNotContact")}
                    </Badge>
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* Tags Card */}
          {contact.tags?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  {t("contacts.view.tags")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {(contact.tags as string[]).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Requests */}
          <LinkedEntitiesPanel
            type="requests"
            entities={displayRequests}
            isLoading={isLoadingLinked || isLinkingRequests || isUnlinkingRequests}
            onLinkEntity={() => setLinkRequestDialogOpen(true)}
            onUnlinkEntity={handleUnlinkRequest}
            showAddButton={true}
          />

          {/* Linked Properties (owned) */}
          <LinkedEntitiesPanel
            type="properties"
            entities={displayProperties}
            isLoading={isLoadingLinked || isLinkingProperties || isUnlinkingProperties}
            onLinkEntity={() => setLinkPropertyDialogOpen(true)}
            onUnlinkEntity={handleUnlinkProperty}
            showAddButton={true}
          />

          {/* Calendar Events */}
          <LinkedEntitiesPanel
            type="events"
            entities={linkedEvents}
            isLoading={isLoadingLinked}
            showAddButton={false}
          />

          {/* Linked Documents */}
          <LinkedEntitiesPanel
            type="documents"
            entities={linkedDocuments}
            isLoading={isLoadingLinked}
            showAddButton={false}
          />
        </div>
        </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <EntityActivityPanel parentType="CONTACT" parentId={contact.id} />
        </TabsContent>
      </Tabs>

      {/* Link Request Dialog */}
      <LinkEntityDialog
        open={linkRequestDialogOpen}
        onOpenChange={setLinkRequestDialogOpen}
        entityType="request"
        sourceId={contact.id}
        sourceType="contact"
        alreadyLinkedIds={displayRequests.map((r: any) => r.id)}
        onLink={handleLinkRequests}
        title={t("contacts.view.linkRequests") ?? "Link Requests"}
        description={t("contacts.view.linkRequestsDescription") ?? "Select requests to associate with this contact."}
      />

      {/* Link Property Dialog */}
      <LinkEntityDialog
        open={linkPropertyDialogOpen}
        onOpenChange={setLinkPropertyDialogOpen}
        entityType="property"
        sourceId={contact.id}
        sourceType="contact"
        alreadyLinkedIds={displayProperties.map((p: any) => p.id)}
        onLink={handleLinkProperties}
        title={t("contacts.view.linkProperties") ?? "Link Properties"}
        description={t("contacts.view.linkPropertiesDescription") ?? "Select properties owned by this contact."}
      />
    </div>
  );
}
