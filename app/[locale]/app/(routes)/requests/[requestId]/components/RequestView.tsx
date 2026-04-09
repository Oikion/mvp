"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LinkedEntitiesPanel } from "@/components/linking/LinkedEntitiesPanel";
import { LinkEntityDialog } from "@/components/linking/LinkEntityDialog";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { QuickLogActivity } from "@/components/activity/QuickLogActivity";
import { useAppToast } from "@/hooks/use-app-toast";
import { useRequestLinked } from "@/hooks/swr/useRequestLinked";
import {
  useLinkContactsToRequest,
  useUnlinkContactFromRequest,
  useLinkPropertiesToRequest,
  useUnlinkPropertyFromRequest,
} from "@/hooks/swr/useLinkMutations";
import {
  ArrowLeft,
  DollarSign,
  Shield,
  Search,
  Building2,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ── Status colors ──
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  MATCHED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  UNDER_OFFER: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  PAUSED: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
};

const TYPE_COLORS: Record<string, string> = {
  BUY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RENT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
};

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

function RangeField({ label, min, max, unit }: { label: string; min: any; max: any; unit?: string }) {
  if (min == null && max == null) return null;
  const fMin = min != null ? `${Number(min).toLocaleString()}` : "—";
  const fMax = max != null ? `${Number(max).toLocaleString()}` : "—";
  const suffix = unit ? ` ${unit}` : "";
  return <DetailField label={label} value={`${fMin} – ${fMax}${suffix}`} />;
}

function BoolField({ label, value, t }: { label: string; value: boolean | null | undefined; t: any }) {
  if (value == null) return null;
  return (
    <DetailField
      label={label}
      value={
        <Badge variant={value ? "success" : "secondary"} className="text-xs">
          {value ? t("view.yes") : t("view.no")}
        </Badge>
      }
    />
  );
}

interface RequestViewProps {
  request: any;
}

export default function RequestView({ request }: RequestViewProps) {
  const t = useTranslations("requests");
  const tActivities = useTranslations("activities");
  const { toast } = useAppToast();

  // Linked entities via SWR (for real-time updates after mutations)
  const {
    contacts: linkedContacts,
    properties: linkedProperties,
    documents: linkedDocuments,
    events: linkedEvents,
    isLoading: isLoadingLinked,
    mutate: mutateLinked,
  } = useRequestLinked(request.friendlyId);

  // Link/unlink hooks — use friendlyId since the API resolves it
  const { linkContacts, isLinking: isLinkingContacts } = useLinkContactsToRequest(request.friendlyId);
  const { unlinkContact, isUnlinking: isUnlinkingContacts } = useUnlinkContactFromRequest(request.friendlyId);
  const { linkProperties, isLinking: isLinkingProperties } = useLinkPropertiesToRequest(request.friendlyId);
  const { unlinkProperty, isUnlinking: isUnlinkingProperties } = useUnlinkPropertyFromRequest(request.friendlyId);

  // Dialog state
  const [linkContactDialogOpen, setLinkContactDialogOpen] = useState(false);
  const [linkPropertyDialogOpen, setLinkPropertyDialogOpen] = useState(false);

  // Use SWR data if available, fall back to server-fetched data
  const displayContacts = linkedContacts.length > 0 || isLoadingLinked
    ? linkedContacts
    : (request.requestContacts || []).map((rc: any) => ({
        id: rc.contact?.id || rc.id,
        friendlyId: rc.contact?.friendlyId,
        displayName: rc.contact?.displayName || "—",
        isCompany: rc.contact?.isCompany,
        email: rc.contact?.email,
        primaryPhone: rc.contact?.primaryPhone,
        category: rc.contact?.category,
        role: rc.role,
      }));

  const displayProperties = linkedProperties.length > 0 || isLoadingLinked
    ? linkedProperties
    : (request.propertyMatches || []).map((match: any) => ({
        id: match.property?.id,
        friendlyId: match.property?.friendlyId,
        property_name: match.property?.property_name || match.property?.friendlyId,
        property_type: match.property?.property_type,
        address_city: match.property?.address_city,
        price: match.property?.price ? Number(match.property.price) : undefined,
        bedrooms: match.property?.bedrooms,
        bathrooms: match.property?.bathrooms,
      }));

  // Handlers
  const handleLinkContacts = async (contactIds: string[]) => {
    try {
      await linkContacts(contactIds);
      await mutateLinked();
    } catch (error) {
      console.error("Failed to link contacts:", error);
      throw error;
    }
  };

  const handleUnlinkContact = async (contactId: string) => {
    try {
      await unlinkContact(contactId);
      await mutateLinked();
    } catch (error) {
      console.error("Failed to unlink contact:", error);
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
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/app/requests">
            <Button variant="ghost" size="icon" aria-label={t("view.backToRequests")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10" aria-hidden="true">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{request.friendlyId}</h1>
              <p className="text-sm text-muted-foreground">
                {request.requestContacts?.length > 0
                  ? request.requestContacts.map((rc: any) => rc.contact?.displayName).filter(Boolean).join(", ")
                  : "—"}
              </p>
            </div>
          </div>
          <Badge className={cn("ml-2", TYPE_COLORS[request.requestType])} variant="secondary">
            {t(`requestType.${request.requestType}` as Parameters<typeof t>[0])}
          </Badge>
          <Badge className={cn(STATUS_COLORS[request.status] || STATUS_COLORS.ACTIVE)} variant="secondary">
            {t(`status.${request.status}` as Parameters<typeof t>[0])}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">{t("view.share")}</Button>
          <Button size="sm">{t("view.edit")}</Button>
        </div>
      </div>

      {/* ── Main content: 2/3 + 1/3 grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Criteria Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" aria-hidden="true" />
                {t("view.searchCriteria")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <RangeField label={t("view.budget")} min={request.budgetMin} max={request.budgetMax} unit="€" />
                <RangeField label={t("view.surface")} min={request.surfaceMin} max={request.surfaceMax} unit="sqm" />
                <RangeField label={t("view.plotSize")} min={request.plotSizeMin} max={request.plotSizeMax} unit="sqm" />
                <RangeField label={t("view.bedrooms")} min={request.bedroomsMin} max={request.bedroomsMax} />
                <RangeField label={t("view.bathrooms")} min={request.bathroomsMin} max={request.bathroomsMax} />
                <RangeField label={t("view.floor")} min={request.floorMin} max={request.floorMax} />
                <RangeField label={t("view.constructionYear")} min={request.constructionYearMin} max={request.constructionYearMax} />
              </div>
            </CardContent>
          </Card>

          {/* Location Preferences Card */}
          {(request.locationDisplayName || request.municipality || request.region) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {t("view.locationPreferences")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label={t("wizard.fields.locationDisplayName")} value={request.locationDisplayName} />
                  <DetailField label={t("wizard.fields.municipality")} value={request.municipality} />
                  <DetailField label={t("wizard.fields.region")} value={request.region} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feature Requirements Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {t("view.featureRequirements")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <BoolField label={t("view.elevator")} value={request.requiresElevator} t={t} />
                <BoolField label={t("view.parking")} value={request.requiresParking} t={t} />
                <BoolField label={t("view.storage")} value={request.requiresStorage} t={t} />
                <BoolField label={t("view.garden")} value={request.requiresGarden} t={t} />
                <BoolField label={t("view.pets")} value={request.petFriendly} t={t} />
                <BoolField label={t("view.ac")} value={request.requiresAC} t={t} />
                <BoolField label={t("view.insideCityPlan")} value={request.insideCityPlan} t={t} />
                <BoolField label={t("view.legalization")} value={request.legalizationOk} t={t} />
                <DetailField label={t("view.furnished")} value={request.furnished} />
                <DetailField label={t("view.energyClass")} value={request.energyClassMin} />
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {request.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {t("view.notes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
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
                {t("view.statusAndAssignment")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailField
                label={t("view.status")}
                value={
                  <Badge className={cn(STATUS_COLORS[request.status])} variant="secondary">
                    {t(`status.${request.status}` as Parameters<typeof t>[0])}
                  </Badge>
                }
              />
              <DetailField
                label={t("view.requestType")}
                value={
                  <Badge className={cn(TYPE_COLORS[request.requestType])} variant="secondary">
                    {t(`requestType.${request.requestType}` as Parameters<typeof t>[0])}
                  </Badge>
                }
              />
              <DetailField label={t("view.urgency")} value={request.urgency ? t(`urgency.${request.urgency}` as Parameters<typeof t>[0]) : null} />
              <DetailField label={t("view.propertyCategory")} value={request.propertyCategory ? t(`propertyPurpose.${request.propertyCategory}` as Parameters<typeof t>[0]) : null} />
              <DetailField label={t("view.timeline")} value={request.timeline ? t(`timeline.${request.timeline}` as Parameters<typeof t>[0]) : null} />
              <DetailField label={t("view.assignedTo")} value={request.assignedAgent?.name} />
              <DetailField label={t("view.visibility")} value={request.visibility} />
              <Separator />
              <DetailField
                label={t("view.created")}
                value={request.createdAt ? format(new Date(request.createdAt), "dd/MM/yyyy HH:mm") : null}
              />
              <DetailField
                label={t("view.updated")}
                value={request.updatedAt ? format(new Date(request.updatedAt), "dd/MM/yyyy HH:mm") : null}
              />
            </CardContent>
          </Card>

          {/* Linked Contacts */}
          <LinkedEntitiesPanel
            type="contacts"
            entities={displayContacts}
            isLoading={isLoadingLinked || isLinkingContacts || isUnlinkingContacts}
            onLinkEntity={() => setLinkContactDialogOpen(true)}
            onUnlinkEntity={handleUnlinkContact}
            showAddButton={true}
          />

          {/* Linked Property Matches */}
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

          {/* Investment Card */}
          {(request.isInvestmentPurpose || request.financingStatus || request.goldenVisaEligible) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" aria-hidden="true" />
                  {t("view.investmentContext")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <BoolField label={t("view.investment")} value={request.isInvestmentPurpose} t={t} />
                <BoolField label={t("view.goldenVisa")} value={request.goldenVisaEligible} t={t} />
                <DetailField label={t("view.financing")} value={request.financingStatus ? t(`financingStatus.${request.financingStatus}` as Parameters<typeof t>[0]) : null} />
                <BoolField label={t("view.auction")} value={request.auctionInterest} t={t} />
              </CardContent>
            </Card>
          )}

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                {tActivities("title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuickLogActivity
                parentType="REQUEST"
                parentId={request.id}
                onSuccess={() => {}}
              />
              <ActivityFeed parentType="REQUEST" parentId={request.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Link Contact Dialog */}
      <LinkEntityDialog
        open={linkContactDialogOpen}
        onOpenChange={setLinkContactDialogOpen}
        entityType="contact"
        sourceId={request.id}
        sourceType="request"
        alreadyLinkedIds={displayContacts.map((c: any) => c.id).filter(Boolean)}
        onLink={handleLinkContacts}
        title={t("view.linkContacts") ?? "Link Contacts"}
        description={t("view.linkContactsDescription") ?? "Select contacts to associate with this request."}
      />

      {/* Link Property Dialog */}
      <LinkEntityDialog
        open={linkPropertyDialogOpen}
        onOpenChange={setLinkPropertyDialogOpen}
        entityType="property"
        sourceId={request.id}
        sourceType="request"
        alreadyLinkedIds={displayProperties.map((p: any) => p.id).filter(Boolean)}
        onLink={handleLinkProperties}
        title={t("view.linkProperties") ?? "Link Properties"}
        description={t("view.linkPropertiesDescription") ?? "Select properties to match with this request."}
      />
    </div>
  );
}
