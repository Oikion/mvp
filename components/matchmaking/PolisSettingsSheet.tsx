"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Plus, ExternalLink, Search, Building2, Loader2, EyeOff, Eye, ScanEye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  updateNetworkSettings,
  inviteNetworkPartner,
  respondToPartnerInvite,
  revokeNetworkPartner,
  type UpdateNetworkSettingsInput,
} from "@/actions/network/manage-network-settings";
import { discoverAgencies } from "@/actions/network/discover-agencies";
import type { DiscoverAgencyItem } from "@/actions/network/discover-agencies";
import type {
  OrgNetworkSettings,
  OrgNetworkMembership,
  NetworkPrivacyLevel,
} from "@prisma/client";

type Partner = Awaited<
  ReturnType<typeof import("@/actions/network/manage-network-settings").getNetworkPartners>
>[number];

interface PolisSettingsSheetProps {
  initialSettings: OrgNetworkSettings | null;
  initialPartners: Partner[];
}

const MEMBERSHIPS: { value: OrgNetworkMembership; label: string; desc: string }[] = [
  { value: "NONE", label: "None", desc: "No cross-agency matching" },
  { value: "POOL", label: "Pool", desc: "Anonymous pool matching" },
  { value: "BILATERAL", label: "Bilateral", desc: "Trusted partner matching" },
  { value: "BOTH", label: "Both", desc: "Pool + bilateral partners" },
];

const PRIVACY_LEVELS: {
  value: NetworkPrivacyLevel;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  trackColor: string;
}[] = [
  { value: "ANONYMIZED", label: "Anonymized", desc: "Specs only", icon: EyeOff, color: "text-muted-foreground", trackColor: "#6b7280" },
  { value: "AGENCY_IDENTIFIED", label: "Agency shown", desc: "Specs + agency name", icon: Eye, color: "text-blue-500", trackColor: "#3b82f6" },
  { value: "FULL", label: "Full details", desc: "Specs + agent contact", icon: ScanEye, color: "text-primary", trackColor: "hsl(var(--primary))" },
];

const PRIVACY_INDEX: Record<NetworkPrivacyLevel, number> = {
  ANONYMIZED: 0,
  AGENCY_IDENTIFIED: 1,
  FULL: 2,
};
const PRIVACY_FROM_INDEX: NetworkPrivacyLevel[] = ["ANONYMIZED", "AGENCY_IDENTIFIED", "FULL"];

function lerpColor(a: string, b: string, t: number): string {
  const parse = (c: string): [number, number, number] => {
    if (c.startsWith("#")) {
      const n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = c.match(/\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

function PrivacySlider({
  value,
  onChange,
}: {
  value: NetworkPrivacyLevel;
  onChange: (v: NetworkPrivacyLevel) => void;
}) {
  const committedIdx = PRIVACY_INDEX[value];
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const pos = dragPos !== null ? dragPos : committedIdx;
  const pct = (pos / 2) * 100;
  const liveIdx = Math.min(2, Math.max(0, Math.round(pos)));
  const active = PRIVACY_LEVELS[committedIdx];
  const ActiveIcon = active.icon;

  const getPosFromEvent = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return committedIdx;
    const { left, width } = el.getBoundingClientRect();
    return Math.min(2, Math.max(0, ((clientX - left) / width) * 2));
  }, [committedIdx]);

  const thumbBg = isDragging
    ? (pos <= 1 ? lerpColor("#6b7280", "#3b82f6", pos) : lerpColor("#3b82f6", "#22c55e", pos - 1))
    : PRIVACY_LEVELS[committedIdx].trackColor;

  return (
    <div className="space-y-2">
      <div className="relative px-2 py-1 select-none">
        {/* Ghost track */}
        <div
          className="absolute inset-x-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ background: "linear-gradient(to right, #6b7280 0%, #3b82f6 50%, hsl(var(--primary)) 100%)", opacity: 0.22 }}
        />
        {/* Fill */}
        <div
          className="absolute left-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: `${pct}%`,
            maxWidth: "calc(100% - 16px)",
            background: "linear-gradient(to right, #6b7280 0%, #3b82f6 50%, hsl(var(--primary)) 100%)",
            transition: isDragging ? "none" : "width 300ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
        {/* Hit area + thumb */}
        <div
          ref={trackRef}
          className="relative h-7 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={committedIdx}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(PRIVACY_FROM_INDEX[Math.max(0, committedIdx - 1)]);
            if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(PRIVACY_FROM_INDEX[Math.min(2, committedIdx + 1)]);
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDragging(true);
            setDragPos(getPosFromEvent(e.clientX));
          }}
          onPointerMove={(e) => {
            if (!isDragging) return;
            e.preventDefault();
            setDragPos(getPosFromEvent(e.clientX));
          }}
          onPointerUp={(e) => {
            if (!isDragging) return;
            e.currentTarget.releasePointerCapture(e.pointerId);
            const snapped = Math.min(2, Math.max(0, Math.round(getPosFromEvent(e.clientX))));
            setIsDragging(false);
            setDragPos(null);
            onChange(PRIVACY_FROM_INDEX[snapped]);
          }}
          onPointerCancel={(e) => {
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            setIsDragging(false);
            setDragPos(null);
          }}
        >
          <div
            className="absolute top-1/2 h-4 w-4 rounded-full border-2 shadow-sm pointer-events-none"
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
        </div>
      </div>

      <div className="flex justify-between px-0.5">
        {PRIVACY_LEVELS.map((pl, i) => {
          const Icon = pl.icon;
          const isActive = i === (isDragging ? liveIdx : committedIdx);
          return (
            <button
              key={pl.value}
              type="button"
              onClick={() => onChange(pl.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 w-20 rounded px-1 py-1 text-center transition-colors hover:bg-muted/50",
                isActive ? pl.color : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 transition-transform duration-150", isActive ? [pl.color, "scale-110"] : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium leading-tight", isActive ? pl.color : "text-muted-foreground")}>{pl.label}</span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs",
          committedIdx === 0 && "border-border bg-muted/30",
          committedIdx === 1 && "border-blue-500/30 bg-blue-500/5",
          committedIdx === 2 && "border-primary/30 bg-primary/5",
        )}
        style={{ transition: "background-color 250ms ease, border-color 250ms ease" }}
      >
        <ActiveIcon className={cn("h-3.5 w-3.5 shrink-0", active.color)} />
        <span className={cn("font-medium", active.color)}>{active.label}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{active.desc}</span>
      </div>
    </div>
  );
}

export function PolisSettingsSheet({
  initialSettings,
  initialPartners,
}: PolisSettingsSheetProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [membership, setMembership] = useState<OrgNetworkMembership>(
    initialSettings?.membership ?? "NONE"
  );
  const [shareProperties, setShareProperties] = useState(
    initialSettings?.shareProperties ?? false
  );
  const [shareMandates, setShareMandates] = useState(
    initialSettings?.shareMandates ?? false
  );
  const [propertyPrivacy, setPropertyPrivacy] = useState<NetworkPrivacyLevel>(
    initialSettings?.propertyPrivacyLevel ?? "ANONYMIZED"
  );
  const [mandatePrivacy, setMandatePrivacy] = useState<NetworkPrivacyLevel>(
    initialSettings?.mandatePrivacyLevel ?? "ANONYMIZED"
  );
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverResults, setDiscoverResults] = useState<DiscoverAgencyItem[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [invitingSlug, setInvitingSlug] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (result.success) {
        toast.success("Polis settings saved");
      } else {
        toast.error(result.error ?? "Failed to save settings");
      }
    });
  }

  async function handleRespond(partnerId: string, accept: boolean) {
    const result = await respondToPartnerInvite(partnerId, accept);
    if (result.success) {
      setPartners((prev) =>
        prev.map((p) =>
          p.id === partnerId
            ? { ...p, status: accept ? "ACCEPTED" : "REJECTED" }
            : p
        )
      );
    } else {
      toast.error(result.error ?? "Failed to respond");
    }
  }

  async function handleRevoke(partnerId: string) {
    const result = await revokeNetworkPartner(partnerId);
    if (result.success) {
      setPartners((prev) => prev.filter((p) => p.id !== partnerId));
    } else {
      toast.error(result.error ?? "Failed to revoke");
    }
  }

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
      toast.success("Invitation sent");
    } else {
      setInviteError(result.error ?? "Failed to send invitation");
    }
  }

  const hasBilateral = membership === "BILATERAL" || membership === "BOTH";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-4 w-4" />
        Settings
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Polis Settings
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Network Membership */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Network Membership</p>
              <RadioGroup
                value={membership}
                onValueChange={(v) => setMembership(v as OrgNetworkMembership)}
                className="space-y-2"
              >
                {MEMBERSHIPS.map((m) => (
                  <div
                    key={m.value}
                    className="flex items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={m.value} id={`mb-${m.value}`} className="mt-0.5" />
                    <Label htmlFor={`mb-${m.value}`} className="flex flex-col gap-0.5 cursor-pointer">
                      <span className="font-medium text-sm">{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.desc}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {membership !== "NONE" && (
              <>
                <Separator />

                {/* Sharing Toggles */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Share with Network</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="share-props" className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">Properties</span>
                        <span className="text-xs text-muted-foreground">Share SECURE & PUBLIC properties</span>
                      </Label>
                      <Switch
                        id="share-props"
                        checked={shareProperties}
                        onCheckedChange={setShareProperties}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="share-mandates" className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">Mandates</span>
                        <span className="text-xs text-muted-foreground">Share SECURE & PUBLIC mandates</span>
                      </Label>
                      <Switch
                        id="share-mandates"
                        checked={shareMandates}
                        onCheckedChange={setShareMandates}
                      />
                    </div>
                  </div>
                </div>

                {/* Privacy Levels */}
                <div className="space-y-4">
                  <p className="text-sm font-medium">Privacy Levels</p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Properties</p>
                    <PrivacySlider value={propertyPrivacy} onChange={setPropertyPrivacy} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Mandates</p>
                    <PrivacySlider value={mandatePrivacy} onChange={setMandatePrivacy} />
                  </div>
                </div>

                {hasBilateral && (
                  <>
                    <Separator />
                    {/* Partner Management */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Bilateral Partners</p>
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
                        <TabsContent value="discover" className="mt-3 space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              placeholder="Search agencies…"
                              value={discoverQuery}
                              onChange={(e) => handleDiscoverSearch(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                          {inviteError && (
                            <p className="text-xs text-destructive">{inviteError}</p>
                          )}
                          {discovering ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : discoverResults.length === 0 && discoverQuery ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No agencies found</p>
                          ) : discoverResults.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">Search to discover agencies</p>
                          ) : (
                            <div className="space-y-2">
                              {discoverResults.map((agency) => {
                                const alreadyPartner = partners.some(
                                  (p) => p.peer?.name === agency.name && p.status !== "REJECTED" && p.status !== "REVOKED"
                                );
                                return (
                                  <div
                                    key={agency.id}
                                    className="flex items-center gap-2.5 rounded-lg border p-2.5"
                                  >
                                    {agency.logo ? (
                                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded border bg-muted">
                                        <Image src={agency.logo} alt={agency.name} fill className="object-contain" sizes="32px" />
                                      </div>
                                    ) : (
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border bg-muted">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{agency.name}</p>
                                      {(agency.city || agency.region) && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {[agency.city, agency.region].filter(Boolean).join(", ")}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={alreadyPartner ? "outline" : "default"}
                                      className="shrink-0 h-7 px-2 text-xs"
                                      disabled={alreadyPartner || invitingSlug === agency.slug}
                                      onClick={() => handleInviteAgency(agency.slug)}
                                    >
                                      {invitingSlug === agency.slug ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : alreadyPartner ? (
                                        <Check className="h-3 w-3" />
                                      ) : (
                                        <><Plus className="h-3 w-3 mr-1" />Invite</>
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </TabsContent>

                        {/* Current partners tab */}
                        <TabsContent value="current" className="mt-3 space-y-2">
                          {partners.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              No bilateral partners yet
                            </p>
                          ) : (
                            partners.map((partner) => (
                              <div
                                key={partner.id}
                                className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
                              >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {partner.peer?.name ?? "Agency"}
                                  </p>
                                  <Badge variant="outline" className="w-fit text-xs">
                                    {partner.status}
                                  </Badge>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {partner.status === "PENDING" && !partner.isInitiator && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-green-600"
                                        onClick={() => handleRespond(partner.id, true)}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-destructive"
                                        onClick={() => handleRespond(partner.id, false)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {partner.status === "ACCEPTED" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-destructive"
                                      onClick={() => handleRevoke(partner.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </>
                )}
              </>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <Link href="/app/settings/network" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                Full network settings
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
