"use client";

import { useState, useTransition } from "react";
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
import { Check, X, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  updateNetworkSettings,
  inviteNetworkPartner,
  respondToPartnerInvite,
  revokeNetworkPartner,
  type UpdateNetworkSettingsInput,
} from "@/actions/network/manage-network-settings";
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

const PRIVACY_LEVELS: { value: NetworkPrivacyLevel; label: string }[] = [
  { value: "ANONYMIZED", label: "Anonymized" },
  { value: "AGENCY_IDENTIFIED", label: "Agency shown" },
  { value: "FULL", label: "Full details" },
];

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
  const [inviteSlug, setInviteSlug] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  async function handleInvite() {
    setInviteError(null);
    if (!inviteSlug.trim()) return;
    const result = await inviteNetworkPartner(inviteSlug.trim());
    if (result.success) {
      setInviteSlug("");
      toast.success("Invitation sent — refresh to see updated partner list");
    } else {
      setInviteError(result.error ?? "Failed to send invitation");
    }
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
                <div className="space-y-3">
                  <p className="text-sm font-medium">Privacy Levels</p>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Properties</p>
                    <div className="flex gap-2 flex-wrap">
                      {PRIVACY_LEVELS.map((pl) => (
                        <Button
                          key={pl.value}
                          variant={propertyPrivacy === pl.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPropertyPrivacy(pl.value)}
                        >
                          {pl.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Mandates</p>
                    <div className="flex gap-2 flex-wrap">
                      {PRIVACY_LEVELS.map((pl) => (
                        <Button
                          key={pl.value}
                          variant={mandatePrivacy === pl.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMandatePrivacy(pl.value)}
                        >
                          {pl.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {hasBilateral && (
                  <>
                    <Separator />
                    {/* Partner Management */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Partner Organizations</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Partner agency slug"
                          value={inviteSlug}
                          onChange={(e) => setInviteSlug(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={handleInvite} disabled={!inviteSlug.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {inviteError && (
                        <p className="text-xs text-destructive">{inviteError}</p>
                      )}
                      <div className="space-y-2">
                        {partners.map((partner) => (
                          <div
                            key={partner.id}
                            className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {partner.peer?.name ?? "Agency"}
                              </p>
                              <Badge
                                variant="outline"
                                className="w-fit text-xs"
                              >
                                {partner.status}
                              </Badge>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {partner.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-success"
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
                        ))}
                        {partners.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            No partner organizations yet
                          </p>
                        )}
                      </div>
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
