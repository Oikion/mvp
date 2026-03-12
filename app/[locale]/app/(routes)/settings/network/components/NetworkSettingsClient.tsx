"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Users, Shield, Plus, Check, X, Trash2, Search, Building2, Loader2, EyeOff, Eye, ScanEye } from "lucide-react";
import Image from "next/image";
import {
  updateNetworkSettings,
  inviteNetworkPartner,
  respondToPartnerInvite,
  revokeNetworkPartner,
  type UpdateNetworkSettingsInput,
} from "@/actions/network/manage-network-settings";
import { discoverAgencies } from "@/actions/network/discover-agencies";
import type { DiscoverAgencyItem } from "@/actions/network/discover-agencies";
import type { OrgNetworkSettings, OrgNetworkMembership, NetworkPrivacyLevel } from "@prisma/client";

type Partner = Awaited<ReturnType<typeof import("@/actions/network/manage-network-settings").getNetworkPartners>>[number];

interface Props {
  initialSettings: OrgNetworkSettings | null;
  initialPartners: Partner[];
  locale: string;
}

const MEMBERSHIPS: OrgNetworkMembership[] = ["NONE", "POOL", "BILATERAL", "BOTH"];

const PRIVACY_LEVELS: {
  value: NetworkPrivacyLevel;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  trackColor: string;
}[] = [
  { value: "ANONYMIZED",       label: "Anonymized",    desc: "Specs only — no agency name or contact info.", icon: EyeOff,   color: "text-muted-foreground", trackColor: "#6b7280" },
  { value: "AGENCY_IDENTIFIED", label: "Agency shown",  desc: "Specs + your agency name and logo.",           icon: Eye,      color: "text-blue-500",         trackColor: "#3b82f6" },
  { value: "FULL",             label: "Full details",  desc: "Specs + agency name + listing agent contact.", icon: ScanEye,  color: "text-primary",          trackColor: "hsl(var(--primary))" },
];

const PRIVACY_INDEX: Record<NetworkPrivacyLevel, number> = {
  ANONYMIZED: 0,
  AGENCY_IDENTIFIED: 1,
  FULL: 2,
};
const PRIVACY_FROM_INDEX: NetworkPrivacyLevel[] = ["ANONYMIZED", "AGENCY_IDENTIFIED", "FULL"];

function PrivacySlider({
  value,
  onChange,
}: {
  value: NetworkPrivacyLevel;
  onChange: (v: NetworkPrivacyLevel) => void;
}) {
  const idx = PRIVACY_INDEX[value];
  const active = PRIVACY_LEVELS[idx];
  const ActiveIcon = active.icon;

  // snap to nearest step on click/drag
  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onChange(PRIVACY_FROM_INDEX[Math.min(2, Math.round(pct * 2))]);
  }

  const thumbColors = ["#6b7280", "#3b82f6", "hsl(var(--primary))"];
  const thumbPct = idx * 50; // 0, 50, 100

  return (
    <div className="space-y-2">
      {/* Track */}
      <div
        className="relative h-7 flex items-center cursor-pointer select-none"
        onClick={handleTrackClick}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={idx}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(PRIVACY_FROM_INDEX[Math.max(0, idx - 1)]);
          if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(PRIVACY_FROM_INDEX[Math.min(2, idx + 1)]);
        }}
      >
        {/* Track background */}
        <div
          className="absolute inset-x-0 h-1.5 rounded-full"
          style={{
            background: "linear-gradient(to right, #6b7280 0%, #3b82f6 50%, hsl(var(--primary)) 100%)",
            opacity: 0.25,
          }}
        />
        {/* Track fill */}
        <div
          className="absolute left-0 h-1.5 rounded-full transition-all duration-200"
          style={{
            width: `${thumbPct}%`,
            background: "linear-gradient(to right, #6b7280 0%, #3b82f6 50%, hsl(var(--primary)) 100%)",
          }}
        />
        {/* Thumb */}
        <div
          className="absolute h-4 w-4 rounded-full border-2 shadow-sm transition-all duration-200"
          style={{
            left: `calc(${thumbPct}% - 8px)`,
            backgroundColor: thumbColors[idx],
            borderColor: "hsl(var(--background))",
          }}
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-between px-0.5">
        {PRIVACY_LEVELS.map((pl, i) => {
          const Icon = pl.icon;
          const isActive = i === idx;
          return (
            <button
              key={pl.value}
              type="button"
              onClick={() => onChange(pl.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 w-24 rounded px-1 py-1 text-center transition-colors hover:bg-muted/50",
                isActive ? pl.color : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? pl.color : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium leading-tight", isActive ? pl.color : "text-muted-foreground")}>{pl.label}</span>
            </button>
          );
        })}
      </div>

      {/* Summary pill */}
      <div className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
        idx === 0 && "border-border bg-muted/30",
        idx === 1 && "border-blue-500/30 bg-blue-500/5",
        idx === 2 && "border-primary/30 bg-primary/5",
      )}>
        <ActiveIcon className={cn("h-4 w-4 shrink-0 mt-0.5", active.color)} />
        <div>
          <span className={cn("font-medium", active.color)}>{active.label}</span>
          <span className="text-muted-foreground ml-2 text-xs">{active.desc}</span>
        </div>
      </div>
    </div>
  );
}

export function NetworkSettingsClient({ initialSettings, initialPartners, locale }: Props) {
  const t = useTranslations("networkSettings");
  const [isPending, startTransition] = useTransition();

  const [membership, setMembership] = useState<OrgNetworkMembership>(
    initialSettings?.membership ?? "NONE",
  );
  const [shareProperties, setShareProperties] = useState(
    initialSettings?.shareProperties ?? false,
  );
  const [shareMandates, setShareMandates] = useState(
    initialSettings?.shareMandates ?? false,
  );
  const [propertyPrivacy, setPropertyPrivacy] = useState<NetworkPrivacyLevel>(
    initialSettings?.propertyPrivacyLevel ?? "ANONYMIZED",
  );
  const [mandatePrivacy, setMandatePrivacy] = useState<NetworkPrivacyLevel>(
    initialSettings?.mandatePrivacyLevel ?? "ANONYMIZED",
  );
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverResults, setDiscoverResults] = useState<DiscoverAgencyItem[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [invitingSlug, setInvitingSlug] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDiscoverSearch = useCallback((query: string) => {
    setDiscoverQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setDiscovering(true);
      const result = await discoverAgencies({ query: query || undefined, limit: 10 });
      setDiscoverResults(result.agencies);
      setDiscovering(false);
    }, 350);
  }, []);

  async function handleInviteAgency(slug: string) {
    setInviteError(null);
    setInvitingSlug(slug);
    const result = await inviteNetworkPartner(slug);
    setInvitingSlug(null);
    if (result.success) {
      window.location.reload();
    } else {
      setInviteError(result.error ?? "Failed to send invitation");
    }
  }

  function handleSave() {
    startTransition(async () => {
      const input: UpdateNetworkSettingsInput = {
        membership,
        shareProperties,
        shareMandates,
        propertyPrivacyLevel: propertyPrivacy,
        mandatePrivacyLevel: mandatePrivacy,
      };
      const result = await updateNetworkSettings(input);
      if (result.success) setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    });
  }

  function handleRespond(partnerId: string, accept: boolean) {
    startTransition(async () => {
      await respondToPartnerInvite(partnerId, accept);
      setPartners((prev) =>
        prev.map((p) =>
          p.id === partnerId ? { ...p, status: accept ? "ACCEPTED" : "REJECTED" } : p,
        ),
      );
    });
  }

  function handleRevoke(partnerId: string) {
    startTransition(async () => {
      await revokeNetworkPartner(partnerId);
      setPartners((prev) =>
        prev.map((p) => (p.id === partnerId ? { ...p, status: "REVOKED" } : p)),
      );
    });
  }

  const showSharingOptions = membership !== "NONE";
  const showPartners = membership === "BILATERAL" || membership === "BOTH";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t("settingsTitle")}</h1>
        <p className="text-muted-foreground mt-1">{t("settingsDescription")}</p>
      </div>

      {/* Membership */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("membership.label")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={membership}
            onValueChange={(v) => setMembership(v as OrgNetworkMembership)}
            className="space-y-3"
          >
            {MEMBERSHIPS.map((m) => (
              <div key={m} className="flex items-start gap-3">
                <RadioGroupItem value={m} id={`membership-${m}`} className="mt-1" />
                <Label htmlFor={`membership-${m}`} className="cursor-pointer">
                  <div className="font-medium">{t(`membership.${m}`)}</div>
                  <div className="text-sm text-muted-foreground">{t(`membership.${m}Desc`)}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Sharing toggles */}
      {showSharingOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("sharing.label")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Properties */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("sharing.properties")}</div>
                  <div className="text-sm text-muted-foreground">{t("sharing.propertiesDesc")}</div>
                </div>
                <Switch
                  checked={shareProperties}
                  onCheckedChange={setShareProperties}
                />
              </div>
              {shareProperties && (
                <div className="ml-4 space-y-2">
                  <Label className="text-sm font-medium">{t("privacy.propertiesLabel")}</Label>
                  <PrivacySlider value={propertyPrivacy} onChange={setPropertyPrivacy} />
                </div>
              )}
            </div>

            <Separator />

            {/* Mandates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("sharing.mandates")}</div>
                  <div className="text-sm text-muted-foreground">{t("sharing.mandatesDesc")}</div>
                </div>
                <Switch
                  checked={shareMandates}
                  onCheckedChange={setShareMandates}
                />
              </div>
              {shareMandates && (
                <div className="ml-4 space-y-2">
                  <Label className="text-sm font-medium">{t("privacy.mandatesLabel")}</Label>
                  <PrivacySlider value={mandatePrivacy} onChange={setMandatePrivacy} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <Button onClick={handleSave} disabled={isPending}>
        {saveSuccess ? <><Check className="h-4 w-4 mr-2" /> Saved</> : "Save settings"}
      </Button>

      {/* Bilateral partners */}
      {showPartners && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("partners.title")}
            </CardTitle>
            <CardDescription>{t("partners.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="discover">
              <TabsList className="w-full">
                <TabsTrigger value="discover" className="flex-1">Discover</TabsTrigger>
                <TabsTrigger value="current" className="flex-1">
                  Current
                  {partners.filter((p) => p.status === "ACCEPTED").length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                      {partners.filter((p) => p.status === "ACCEPTED").length}
                    </Badge>
                  )}
                  {partners.filter((p) => p.status === "PENDING").length > 0 && (
                    <Badge className="ml-1.5 h-4 px-1 text-xs">
                      {partners.filter((p) => p.status === "PENDING").length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Discover tab */}
              <TabsContent value="discover" className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search agencies…"
                    value={discoverQuery}
                    onChange={(e) => handleDiscoverSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
                {discovering ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : discoverResults.length === 0 && discoverQuery ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No agencies found</p>
                ) : discoverResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Search to discover agencies</p>
                ) : (
                  <div className="space-y-2">
                    {discoverResults.map((agency) => {
                      const alreadyPartner = partners.some(
                        (p) => p.peer?.name === agency.name && p.status !== "REJECTED" && p.status !== "REVOKED"
                      );
                      return (
                        <div key={agency.id} className="flex items-center gap-3 rounded-lg border p-3">
                          {agency.logo ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                              <Image src={agency.logo} alt={agency.name} fill className="object-contain" sizes="40px" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{agency.name}</p>
                            {(agency.city || agency.region) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {[agency.city, agency.region].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={alreadyPartner ? "outline" : "default"}
                            disabled={alreadyPartner || invitingSlug === agency.slug}
                            onClick={() => handleInviteAgency(agency.slug)}
                          >
                            {invitingSlug === agency.slug ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : alreadyPartner ? (
                              <><Check className="h-3.5 w-3.5 mr-1" />Invited</>
                            ) : (
                              <><Plus className="h-3.5 w-3.5 mr-1" />Invite</>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Current partners tab */}
              <TabsContent value="current" className="mt-4">
                {partners.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No bilateral partners yet</p>
                ) : (
                  <div className="space-y-2">
                    {partners.map((partner) => (
                      <div key={partner.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {partner.peer.logo && (
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded border bg-muted">
                              <Image src={partner.peer.logo} alt={partner.peer.name ?? ""} fill className="object-contain" sizes="32px" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              {partner.peer.name ?? partner.peer.organizationId}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {partner.isInitiator ? "Invited by you" : `Invited by ${partner.peer.name ?? "them"}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PartnerStatusBadge status={partner.status} t={t} />
                          {!partner.isInitiator && partner.status === "PENDING" && (
                            <>
                              <Button size="sm" onClick={() => handleRespond(partner.id, true)}>
                                <Check className="h-3 w-3 mr-1" />Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleRespond(partner.id, false)}>
                                <X className="h-3 w-3 mr-1" />Reject
                              </Button>
                            </>
                          )}
                          {partner.status === "ACCEPTED" && (
                            <Button size="sm" variant="outline" onClick={() => handleRevoke(partner.id)}>
                              <Trash2 className="h-3 w-3 mr-1" />Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PartnerStatusBadge({
  status,
  t,
}: {
  status: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "secondary",
    ACCEPTED: "default",
    REJECTED: "destructive",
    REVOKED: "outline",
  };
  return (
    <Badge variant={variants[status] ?? "outline"}>
      {t(`partners.${status.toLowerCase()}` as any)}
    </Badge>
  );
}
