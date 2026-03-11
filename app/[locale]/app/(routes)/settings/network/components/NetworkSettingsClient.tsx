"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Globe, Users, Shield, Plus, Check, X, Trash2 } from "lucide-react";
import {
  updateNetworkSettings,
  inviteNetworkPartner,
  respondToPartnerInvite,
  revokeNetworkPartner,
  type UpdateNetworkSettingsInput,
} from "@/actions/network/manage-network-settings";
import type { OrgNetworkSettings, OrgNetworkMembership, NetworkPrivacyLevel } from "@prisma/client";

type Partner = Awaited<ReturnType<typeof import("@/actions/network/manage-network-settings").getNetworkPartners>>[number];

interface Props {
  initialSettings: OrgNetworkSettings | null;
  initialPartners: Partner[];
  locale: string;
}

const MEMBERSHIPS: OrgNetworkMembership[] = ["NONE", "POOL", "BILATERAL", "BOTH"];
const PRIVACY_LEVELS: NetworkPrivacyLevel[] = ["ANONYMIZED", "AGENCY_IDENTIFIED", "FULL"];

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
  const [inviteSlug, setInviteSlug] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  function handleInvite() {
    if (!inviteSlug.trim()) return;
    setInviteError(null);
    startTransition(async () => {
      const result = await inviteNetworkPartner(inviteSlug.trim());
      if (result.success) {
        setInviteSlug("");
        // Refresh partners list by reloading page data
        window.location.reload();
      } else {
        setInviteError(result.error ?? t("partners.inviteError"));
      }
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
                  <RadioGroup
                    value={propertyPrivacy}
                    onValueChange={(v) => setPropertyPrivacy(v as NetworkPrivacyLevel)}
                    className="space-y-2"
                  >
                    {PRIVACY_LEVELS.map((level) => (
                      <div key={level} className="flex items-start gap-2">
                        <RadioGroupItem value={level} id={`prop-privacy-${level}`} className="mt-0.5" />
                        <Label htmlFor={`prop-privacy-${level}`} className="cursor-pointer">
                          <span className="font-medium text-sm">{t(`privacy.${level}`)}</span>
                          <span className="text-xs text-muted-foreground ml-2">{t(`privacy.${level}Desc`)}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
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
                  <RadioGroup
                    value={mandatePrivacy}
                    onValueChange={(v) => setMandatePrivacy(v as NetworkPrivacyLevel)}
                    className="space-y-2"
                  >
                    {PRIVACY_LEVELS.map((level) => (
                      <div key={level} className="flex items-start gap-2">
                        <RadioGroupItem value={level} id={`mand-privacy-${level}`} className="mt-0.5" />
                        <Label htmlFor={`mand-privacy-${level}`} className="cursor-pointer">
                          <span className="font-medium text-sm">{t(`privacy.${level}`)}</span>
                          <span className="text-xs text-muted-foreground ml-2">{t(`privacy.${level}Desc`)}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
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
          <CardContent className="space-y-4">
            {/* Invite form */}
            <div className="flex gap-2">
              <Input
                placeholder={t("partners.invitePlaceholder")}
                value={inviteSlug}
                onChange={(e) => setInviteSlug(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <Button variant="outline" onClick={handleInvite} disabled={isPending || !inviteSlug.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                {t("partners.invite")}
              </Button>
            </div>
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}

            {/* Partner list */}
            {partners.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("partners.noPartners")}</p>
            ) : (
              <div className="space-y-2">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {partner.peer.logo && (
                        <img src={partner.peer.logo} alt="" className="h-8 w-8 rounded object-cover" />
                      )}
                      <div>
                        <div className="font-medium text-sm">
                          {partner.peer.name ?? partner.peer.organizationId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {partner.isInitiator
                            ? t("partners.initiatedBy")
                            : `${t("partners.receivedFrom")} ${partner.peer.name ?? ""}`}
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
