"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Building2,
  FileText,
  User,
  Handshake,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Bed,
  MapPin,
  Euro,
  CheckCircle2,
  ExternalLink,
  RulerIcon,
  Zap,
} from "lucide-react";
import { strikeDeal } from "@/actions/matchmaking/strike-deal";
import { useAppToast } from "@/hooks/use-app-toast";
import { MatchScoreBreakdown } from "../../components/MatchScoreBreakdown";
import type { MatchDetailItem, ContactMatchBreakdown } from "@/actions/matchmaking/get-match-by-id";

type DealPartyRole =
  | "BUYER"
  | "SELLER"
  | "TENANT"
  | "LANDLORD"
  | "BUYER_AGENT"
  | "LISTING_AGENT"
  | "NOTARY"
  | "LAWYER"
  | "ACCOUNTANT"
  | "GUARANTOR"
  | "REPRESENTATIVE"
  | "OTHER";

const DEAL_PARTY_ROLES: DealPartyRole[] = [
  "BUYER",
  "SELLER",
  "TENANT",
  "LANDLORD",
  "BUYER_AGENT",
  "LISTING_AGENT",
  "NOTARY",
  "LAWYER",
  "ACCOUNTANT",
  "GUARANTOR",
  "REPRESENTATIVE",
  "OTHER",
];

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function getScoreRing(score: number): string {
  if (score >= 70) return "ring-success/30";
  if (score >= 50) return "ring-warning/30";
  return "ring-destructive/30";
}

interface Props {
  match: MatchDetailItem;
  locale: string;
}

export function MatchDetailView({ match, locale }: Props) {
  const t = useTranslations("matchmaking");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useAppToast();
  const [isPending, startTransition] = useTransition();

  // Contact selection state: contactId → role (empty by default — opt-in for a consequential action)
  const [selected, setSelected] = useState<Record<string, DealPartyRole>>({});

  // Which contact's breakdown is expanded
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);

  const selectedIds = Object.keys(selected);
  const hasSelection = selectedIds.length > 0;

  function toggleContact(contactId: string) {
    setSelected((prev) => {
      if (contactId in prev) {
        const next = { ...prev };
        delete next[contactId];
        return next;
      }
      return { ...prev, [contactId]: "BUYER" };
    });
  }

  function setRole(contactId: string, role: DealPartyRole) {
    setSelected((prev) => ({ ...prev, [contactId]: role }));
  }

  function handleCreateDeal() {
    startTransition(async () => {
      const parties = Object.entries(selected).map(([contactId, role]) => ({
        contactId,
        role,
      }));

      // Add property owner as SELLER if available
      if (match.property.owner) {
        const ownerAlreadyIncluded = parties.some((p) => p.contactId === match.property.owner!.id);
        if (!ownerAlreadyIncluded) {
          parties.push({ contactId: match.property.owner.id, role: "SELLER" });
        }
      }

      const result = await strikeDeal({
        propertyId: match.propertyId,
        requestId: match.requestId,
        parties,
      });

      if (!result.success) {
        toast.error(result.error ?? "Error", { isTranslationKey: false });
        return;
      }

      toast.success(t("strikeDeal.success"), {
        isTranslationKey: false,
        description: t("strikeDeal.successHint"),
      });
      router.push(`/${locale}/app/deals/${result.data!.friendlyId}`);
    });
  }

  const formatBudget = (min: number | null, max: number | null): string => {
    if (!min && !max) return t("common.noBudget");
    if (min && max)
      return `${format.number(min, { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} – ${format.number(max, { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`;
    if (max) return t("common.budgetUpTo", { amount: format.number(max, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) });
    return t("common.budgetFrom", { amount: format.number(min!, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) });
  };

  const { property, request } = match;
  const areas = Array.isArray(request.areasOfInterest)
    ? (request.areasOfInterest as string[]).join(", ")
    : typeof request.areasOfInterest === "string"
    ? request.areasOfInterest
    : "";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/${locale}/app/matchmaking`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("matchDetail.backToMatches")}
        </Link>
      </Button>

      {/* Hero panel */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-5 sm:p-6">
          {/* Top row: score + quality label + status */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {t("matchDetail.overallScore")}
              </p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className={`text-4xl font-bold tabular-nums ${
                    match.matchScore >= 70
                      ? "text-success"
                      : match.matchScore >= 50
                      ? "text-warning"
                      : "text-destructive"
                  }`}
                >
                  {match.matchScore}
                </span>
                <span className="text-lg text-muted-foreground font-medium">%</span>
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold ${
                    match.matchScore >= 70
                      ? "bg-success/10 text-success"
                      : match.matchScore >= 50
                      ? "bg-warning/10 text-warning"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {match.matchScore >= 70
                    ? t("matchDetail.qualityExcellent")
                    : match.matchScore >= 50
                    ? t("matchDetail.qualityGood")
                    : t("matchDetail.qualityWeak")}
                </span>
              </div>
            </div>
            <Badge
              variant={match.status === "ACTIVE" ? "default" : "secondary"}
              className="text-xs mt-1 shrink-0"
            >
              {(["ACTIVE","ARCHIVED","PENDING","EXPIRED","INACTIVE"] as const).includes(match.status as any)
                ? t(`matchDetail.status.${match.status}` as any)
                : match.status}
            </Badge>
          </div>

          {/* Two-column entity grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {/* Property column */}
            <div className="pb-4 sm:pb-0 sm:pr-6">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("matchDetail.propertyCard")}
                </span>
              </div>
              <Link
                href={`/${locale}/app/mls/properties/${property.id}`}
                className="group flex items-start gap-1 mb-3"
              >
                <span className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {property.property_name ?? property.friendlyId ?? property.id}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
              </Link>
              <div className="flex flex-wrap gap-1.5">
                {property.price != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground">
                    <Euro className="h-3 w-3 text-muted-foreground" />
                    {format.number(property.price, { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  </span>
                )}
                {property.bedrooms != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                    <Bed className="h-3 w-3" />
                    {property.bedrooms}
                  </span>
                )}
                {property.size_net_sqm != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                    <RulerIcon className="h-3 w-3" />
                    {property.size_net_sqm} {t("matchDetail.sqm")}
                  </span>
                )}
                {(property.area || property.address_city) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {property.area ?? property.address_city}
                  </span>
                )}
                {property.transaction_type && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                    {property.transaction_type === "RENT"
                      ? t("matchDetail.forRent")
                      : t("matchDetail.forSale")}
                  </span>
                )}
                {property.energy_cert_class && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    {property.energy_cert_class}
                  </span>
                )}
              </div>
            </div>

            {/* Request column */}
            <div className="pt-4 sm:pt-0 sm:pl-6">
              <div className="flex items-center gap-1.5 mb-2.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("matchDetail.requestCard")}
                </span>
              </div>
              <Link
                href={`/${locale}/app/requests/${request.id}`}
                className="group flex items-start gap-1 mb-3"
              >
                <span className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {request.name ?? request.friendlyId ?? request.id}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
              </Link>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground">
                  <Euro className="h-3 w-3 text-muted-foreground" />
                  {formatBudget(request.budgetMin, request.budgetMax)}
                </span>
                {(request.bedroomsMin != null || request.bedroomsMax != null) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                    <Bed className="h-3 w-3" />
                    {request.bedroomsMin ?? "—"}–{request.bedroomsMax ?? "—"}
                  </span>
                )}
                {areas && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground max-w-[16rem]">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-1 break-all">{areas}</span>
                  </span>
                )}
                {request.requestType && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                    {request.requestType === "RENT"
                      ? t("matchDetail.forRent")
                      : t("matchDetail.forSale")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contacts & score breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("matchDetail.contactsSection")}
          </CardTitle>
          <CardDescription>{t("matchDetail.contactsSectionDesc")}</CardDescription>
        </CardHeader>
        {/* Inline CTA footer — appears when contacts are selected so users don't need to scroll */}
        {hasSelection && (
          <div className="px-6 pb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} {t("matchDetail.selectedContacts").toLowerCase()}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={isPending} className="gap-1.5">
                  <Handshake className="h-3.5 w-3.5" />
                  {isPending ? t("matchDetail.submitting") : t("matchDetail.submit")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("matchDetail.confirmDealTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("matchDetail.confirmDealDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("matchDetail.confirmDealParties")}
                  </p>
                  {selectedIds.map((contactId) => {
                    const cb = match.contactBreakdowns.find((c) => c.contactId === contactId);
                    return cb ? (
                      <div key={contactId} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{cb.displayName}</span>
                        <span className="text-muted-foreground">
                          {t(`strikeDeal.roles.${selected[contactId]}` as any)}
                        </span>
                      </div>
                    ) : null;
                  })}
                  {property.owner && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-2 mt-2">
                      <span>
                        {property.owner.displayName ||
                          [property.owner.firstName, property.owner.lastName].filter(Boolean).join(" ") ||
                          "Owner"}
                      </span>
                      <span className="text-xs">{t("matchDetail.confirmDealOwner")}</span>
                    </div>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("matchDetail.confirmDealCancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCreateDeal} disabled={isPending}>
                    {isPending ? t("matchDetail.submitting") : t("matchDetail.confirmDealProceed")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        <CardContent>
          {match.contactBreakdowns.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t("matchDetail.noContacts")}</p>
              <p className="text-sm mt-1">{t("matchDetail.noContactsHint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Owner auto-add notice — visible during contact selection */}
              {property.owner && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 border text-sm text-muted-foreground">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                      {(property.owner.displayName ?? property.owner.firstName)
                        ? (property.owner.displayName ?? property.owner.firstName)![0].toUpperCase()
                        : <Building2 className="h-3 w-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate font-medium text-foreground">
                    {property.owner.displayName ||
                      [property.owner.firstName, property.owner.lastName].filter(Boolean).join(" ") ||
                      t("strikeDeal.propertyOwner")}
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {t("strikeDeal.autoAdded")}
                  </Badge>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {t("strikeDeal.roles.SELLER")}
                  </Badge>
                </div>
              )}
              {match.contactBreakdowns.map((cb) => (
                <ContactRow
                  key={cb.contactId}
                  cb={cb}
                  isSelected={cb.contactId in selected}
                  role={selected[cb.contactId] ?? "BUYER"}
                  isExpanded={expandedContactId === cb.contactId}
                  onToggleSelect={() => toggleContact(cb.contactId)}
                  onToggleExpand={() =>
                    setExpandedContactId((prev) =>
                      prev === cb.contactId ? null : cb.contactId
                    )
                  }
                  onRoleChange={(role) => setRole(cb.contactId, role)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deal creation panel */}
      {match.contactBreakdowns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              {t("matchDetail.createDeal")}
            </CardTitle>
            <CardDescription>{t("matchDetail.createDealDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Owner auto-add notice */}
            {property.owner && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                    {(property.owner.displayName ?? property.owner.firstName)
                      ? (property.owner.displayName ?? property.owner.firstName)![0].toUpperCase()
                      : <Building2 className="h-3.5 w-3.5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {(property.owner.displayName || [property.owner.firstName, property.owner.lastName].filter(Boolean).join(" ")) ||
                      "Owner"}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("strikeDeal.propertyOwner")}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {t("strikeDeal.autoAdded")}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t("strikeDeal.roles.SELLER")}
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("matchDetail.selectedContacts")}: <span className="font-medium text-foreground">{selectedIds.length}</span>
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isPending || !hasSelection}
                    className="gap-1.5"
                  >
                    <Handshake className="h-4 w-4" />
                    {isPending ? t("matchDetail.submitting") : t("matchDetail.submit")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("matchDetail.confirmDealTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("matchDetail.confirmDealDesc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("matchDetail.confirmDealParties")}
                    </p>
                    {selectedIds.map((contactId) => {
                      const cb = match.contactBreakdowns.find((c) => c.contactId === contactId);
                      return cb ? (
                        <div key={contactId} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{cb.displayName}</span>
                          <span className="text-muted-foreground">
                            {t(`strikeDeal.roles.${selected[contactId]}` as any)}
                          </span>
                        </div>
                      ) : null;
                    })}
                    {property.owner && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-2 mt-2">
                        <span>
                          {property.owner.displayName ||
                            [property.owner.firstName, property.owner.lastName].filter(Boolean).join(" ") ||
                            "Owner"}
                        </span>
                        <span className="text-xs">{t("matchDetail.confirmDealOwner")}</span>
                      </div>
                    )}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("matchDetail.confirmDealCancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCreateDeal} disabled={isPending}>
                      {isPending ? t("matchDetail.submitting") : t("matchDetail.confirmDealProceed")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {!hasSelection && (
              <p className="text-sm text-muted-foreground text-center py-2">
                {t("matchDetail.noneSelected")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// ContactRow — one contact with expandable breakdown
// ──────────────────────────────────────────────

interface ContactRowProps {
  cb: ContactMatchBreakdown;
  isSelected: boolean;
  role: DealPartyRole;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onRoleChange: (role: DealPartyRole) => void;
}

function ContactRow({
  cb,
  isSelected,
  role,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onRoleChange,
}: ContactRowProps) {
  const t = useTranslations("matchmaking");

  return (
    <div className={`border rounded-lg transition-colors ${isSelected ? "bg-primary/5 border-primary/30" : "bg-card"}`}>
      <div className="flex items-center gap-3 p-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="shrink-0"
        />

        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className={isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>
            {cb.displayName[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{cb.displayName}</p>
          {cb.isDisqualified && (
            <div className="flex items-center gap-1 mt-0.5">
              <AlertTriangle className="h-3 w-3 text-warning" />
              <span className="text-xs text-warning">
                {t("matchDetail.disqualified")}
                {cb.disqualificationReason && `: ${cb.disqualificationReason}`}
              </span>
            </div>
          )}
        </div>

        {/* Score bubble */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getScoreBg(cb.overallScore)}`}
        >
          {cb.overallScore}%
        </div>

        {/* Role selector — only when selected */}
        {isSelected && (
          <Select value={role} onValueChange={(v) => onRoleChange(v as DealPartyRole)}>
            <SelectTrigger className="w-32 h-8 text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEAL_PARTY_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {t(`strikeDeal.roles.${r}` as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Expand breakdown toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Animated collapsible breakdown — grid-template-rows interpolates without knowing content height */}
      <div
        className="grid transition-all duration-200 ease-out"
        style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          {cb.breakdown.length > 0 ? (
            <div className="border-t">
              <MatchScoreBreakdown breakdown={cb.breakdown} />
            </div>
          ) : (
            <div className="border-t px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {t("scoreBreakdown.title")} — N/A
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
