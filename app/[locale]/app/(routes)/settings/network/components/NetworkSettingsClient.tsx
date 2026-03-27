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

const PRIVACY_LEVEL_STYLES: {
  value: NetworkPrivacyLevel;
  tKey: string;
  icon: React.ElementType;
  color: string;
  trackColor: string;
}[] = [
  { value: "ANONYMIZED",        tKey: "ANONYMIZED",        icon: EyeOff,  color: "text-muted-foreground", trackColor: "#6b7280" },
  { value: "AGENCY_IDENTIFIED", tKey: "AGENCY_IDENTIFIED", icon: Eye,     color: "text-blue-500",         trackColor: "#3b82f6" },
  { value: "FULL",              tKey: "FULL",              icon: ScanEye, color: "text-primary",          trackColor: "hsl(var(--primary))" },
];

const PRIVACY_INDEX: Record<NetworkPrivacyLevel, number> = {
  ANONYMIZED: 0,
  AGENCY_IDENTIFIED: 1,
  FULL: 2,
};
const PRIVACY_FROM_INDEX: NetworkPrivacyLevel[] = ["ANONYMIZED", "AGENCY_IDENTIFIED", "FULL"];

// Interpolate between two hex/rgb colors by t in [0,1]
function lerpColor(a: string, b: string, t: number): string {
  const parse = (c: string): [number, number, number] => {
    if (c.startsWith("#")) {
      const n = Number.parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = c.match(/\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

// Resolve the thumb color at a continuous position 0-2
function thumbColorAt(pos: number): string {
  if (pos <= 1) return lerpColor("#6b7280", "#3b82f6", pos);
  return lerpColor("#3b82f6", "#22c55e", pos - 1);
}

function PrivacySlider({
  value,
  onChange,
  t,
}: {
  value: NetworkPrivacyLevel;
  onChange: (v: NetworkPrivacyLevel) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const OPTIONS = PRIVACY_LEVEL_STYLES.map((opt) => ({
    ...opt,
    label: t(`privacy.${opt.tKey}` as any),
    desc: t(`privacy.${opt.tKey}Desc` as any),
  }));

  const committedIdx = PRIVACY_INDEX[value];
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const pos = dragPos ?? committedIdx;
  const pct = (pos / 2) * 100;

  // Snap index for live label highlighting during drag
  const liveIdx = Math.min(2, Math.max(0, Math.round(pos)));
  const active = OPTIONS[committedIdx];

  const getPosFromEvent = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return committedIdx;
    const { left, width } = el.getBoundingClientRect();
    const raw = (clientX - left) / width;
    return Math.min(2, Math.max(0, raw * 2));
  }, [committedIdx]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragPos(getPosFromEvent(e.clientX));
  }, [getPosFromEvent]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragPos(getPosFromEvent(e.clientX));
  }, [isDragging, getPosFromEvent]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const finalPos = getPosFromEvent(e.clientX);
    const snapped = Math.min(2, Math.max(0, Math.round(finalPos)));
    setIsDragging(false);
    setDragPos(null);
    onChange(PRIVACY_FROM_INDEX[snapped]);
  }, [isDragging, getPosFromEvent, onChange]);

  const thumbBg = isDragging ? thumbColorAt(pos) : OPTIONS[committedIdx].trackColor;

  return (
    <div className="space-y-3 select-none">
      {/* Track */}
      <div className="relative px-2.5 py-2 select-none">
        <div
          ref={trackRef}
          className="relative h-8 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={committedIdx}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(PRIVACY_FROM_INDEX[Math.max(0, committedIdx - 1)]);
            if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(PRIVACY_FROM_INDEX[Math.min(2, committedIdx + 1)]);
          }}
        >
          {/* Ghost gradient track (full width, faint) */}
          <div
            className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(to right, #6b7280 0%, #3b82f6 50%, hsl(var(--primary)) 100%)",
              opacity: 0.2,
            }}
          />
          {/* Filled progress track */}
          <div
            className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(to right, #6b7280 0%, #3b82f6 50%, hsl(var(--primary)) 100%)",
              transition: isDragging ? "none" : "width 300ms cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 h-5 w-5 rounded-full border-2 shadow-md pointer-events-none"
            style={{
              left: `${pct}%`,
              transform: `translate(-50%, -50%) scale(${isDragging ? 1.2 : 1})`,
              backgroundColor: thumbBg,
              borderColor: "hsl(var(--background))",
              transition: isDragging
                ? "transform 80ms ease, background-color 80ms ease"
                : "left 300ms cubic-bezier(0.34,1.56,0.64,1), background-color 200ms ease, transform 150ms ease",
            }}
          />
          {/* Snap tick marks */}
          {[0, 50, 100].map((p) => (
            <div
              key={p}
              className="absolute top-1/2 h-1.5 w-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${p}%`,
                backgroundColor: (p / 50) <= liveIdx ? "transparent" : "hsl(var(--muted-foreground) / 0.3)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Step labels */}
      <div className="flex justify-between px-0">
        {OPTIONS.map((opt, i) => {
          const Icon = opt.icon;
          const isActive = i === (isDragging ? liveIdx : committedIdx);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1 w-24 rounded-md px-1 py-1 transition-colors",
                "hover:bg-muted/50",
                isActive ? opt.color : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform duration-150",
                  isActive ? opt.color : "text-muted-foreground",
                  isActive && "scale-110"
                )}
              />
              <span className={cn("text-xs font-medium leading-tight", isActive ? opt.color : "text-muted-foreground")}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary pill */}
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
          committedIdx === 0 && "border-border bg-muted/30",
          committedIdx === 1 && "border-blue-500/30 bg-blue-500/5",
          committedIdx === 2 && "border-primary/30 bg-primary/5",
        )}
        style={{ transition: "background-color 250ms ease, border-color 250ms ease" }}
      >
        <active.icon className={cn("h-4 w-4 shrink-0 mt-0.5", active.color)} />
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
      setInviteError(result.error ?? t("partners.inviteError"));
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
    <div className="space-y-6 max-w-3xl w-full">
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
          <CardDescription>{t("membership.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={membership}
            onValueChange={(v) => setMembership(v as OrgNetworkMembership)}
            className="space-y-2"
          >
            {MEMBERSHIPS.map((m) => {
              const isSelected = membership === m;
              return (
                <label
                  key={m}
                  htmlFor={`membership-${m}`}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  )}
                >
                  <RadioGroupItem value={m} id={`membership-${m}`} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t(`membership.${m}`)}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{t(`membership.${m}Desc`)}</div>
                    <div className="text-xs text-muted-foreground/70 mt-1">{t(`membership.${m}Detail`)}</div>
                  </div>
                </label>
              );
            })}
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
            <CardDescription>{t("sharing.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Properties */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t("sharing.properties")}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{t("sharing.propertiesDesc")}</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">{t("sharing.propertiesDetail")}</div>
                </div>
                <Switch
                  checked={shareProperties}
                  onCheckedChange={setShareProperties}
                />
              </div>
              {shareProperties && (
                <div className="ml-4 space-y-2">
                  <Label className="text-sm font-medium">{t("privacy.propertiesLabel")}</Label>
                  <PrivacySlider value={propertyPrivacy} onChange={setPropertyPrivacy} t={t} />
                </div>
              )}
            </div>

            <Separator />

            {/* Mandates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t("sharing.mandates")}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{t("sharing.mandatesDesc")}</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">{t("sharing.mandatesDetail")}</div>
                </div>
                <Switch
                  checked={shareMandates}
                  onCheckedChange={setShareMandates}
                />
              </div>
              {shareMandates && (
                <div className="ml-4 space-y-2">
                  <Label className="text-sm font-medium">{t("privacy.mandatesLabel")}</Label>
                  <PrivacySlider value={mandatePrivacy} onChange={setMandatePrivacy} t={t} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <Button onClick={handleSave} disabled={isPending}>
        {saveSuccess ? <><Check className="h-4 w-4 mr-2" /> {t("saved")}</> : t("save")}
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
                <TabsTrigger value="discover" className="flex-1">{t("partners.discover")}</TabsTrigger>
                <TabsTrigger value="current" className="flex-1">
                  {t("partners.current")}
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
                    placeholder={t("partners.searchPlaceholder")}
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
                  <p className="text-sm text-muted-foreground text-center py-6">{t("partners.noAgenciesFound")}</p>
                ) : discoverResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">{t("partners.searchToDiscover")}</p>
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
                              <><Check className="h-3.5 w-3.5 mr-1" />{t("partners.invited")}</>
                            ) : (
                              <><Plus className="h-3.5 w-3.5 mr-1" />{t("partners.invite")}</>
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
                  <p className="text-sm text-muted-foreground text-center py-6">{t("partners.noPartners")}</p>
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
                              {partner.isInitiator ? t("partners.initiatedBy") : `${t("partners.receivedFrom")} ${partner.peer.name ?? ""}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PartnerStatusBadge status={partner.status} t={t} />
                          {!partner.isInitiator && partner.status === "PENDING" && (
                            <>
                              <Button size="sm" onClick={() => handleRespond(partner.id, true)}>
                                <Check className="h-3 w-3 mr-1" />{t("partners.accept")}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleRespond(partner.id, false)}>
                                <X className="h-3 w-3 mr-1" />{t("partners.reject")}
                              </Button>
                            </>
                          )}
                          {partner.status === "ACCEPTED" && (
                            <Button size="sm" variant="outline" onClick={() => handleRevoke(partner.id)}>
                              <Trash2 className="h-3 w-3 mr-1" />{t("partners.revoke")}
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
