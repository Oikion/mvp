"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Handshake, User, Star } from "lucide-react";
import { strikeDeal } from "@/actions/matchmaking/strike-deal";
import { useAppToast } from "@/hooks/use-app-toast";
import type { PersistedMatchItem } from "@/actions/matchmaking/get-persisted-matches";

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

interface PartyEntry {
  contactId: string;
  name: string;
  role: DealPartyRole;
  isOwner: boolean;
}

function getContactDisplayName(
  displayName: string | null,
  firstName: string | null,
  lastName: string | null
): string {
  if (displayName) return displayName;
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}

interface Props {
  match: PersistedMatchItem;
  locale: string;
}

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

export function StrikeDealDialog({ match, locale }: Props) {
  const t = useTranslations("matchmaking");
  const router = useRouter();
  const { toast } = useAppToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function buildInitialParties(): PartyEntry[] {
    const parties: PartyEntry[] = [];

    for (const rc of match.request.requestContacts) {
      parties.push({
        contactId: rc.contact.id,
        name: getContactDisplayName(rc.contact.displayName, rc.contact.firstName, rc.contact.lastName),
        role: "BUYER",
        isOwner: false,
      });
    }

    if (match.property.owner) {
      const ownerAlreadyAdded = parties.some((p) => p.contactId === match.property.owner!.id);
      if (!ownerAlreadyAdded) {
        parties.push({
          contactId: match.property.owner.id,
          name: getContactDisplayName(
            match.property.owner.displayName,
            match.property.owner.firstName,
            match.property.owner.lastName
          ),
          role: "SELLER",
          isOwner: true,
        });
      }
    }

    return parties;
  }

  const [parties, setParties] = useState<PartyEntry[]>(buildInitialParties);

  function handleOpenChange(value: boolean) {
    if (value) setParties(buildInitialParties());
    setOpen(value);
  }

  function updateRole(contactId: string, role: DealPartyRole) {
    setParties((prev) =>
      prev.map((p) => (p.contactId === contactId ? { ...p, role } : p))
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await strikeDeal({
        propertyId: match.propertyId,
        requestId: match.requestId,
        parties: parties.map((p) => ({ contactId: p.contactId, role: p.role })),
      });

      if (!result.success) {
        toast.error(result.error ?? "Error", { isTranslationKey: false });
        return;
      }

      toast.success(t("strikeDeal.success"), {
        isTranslationKey: false,
        description: t("strikeDeal.successHint"),
      });
      setOpen(false);
      router.push(`/${locale}/app/deals/${result.data!.friendlyId}`);
    });
  }

  const hasParties = parties.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Handshake className="h-4 w-4" />
          {t("strikeDeal.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            {t("strikeDeal.dialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("strikeDeal.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("strikeDeal.partiesSection")}
          </p>

          {!hasParties && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("strikeDeal.noBuyers")}
            </p>
          )}

          <div className="space-y-2">
            {parties.map((party) => (
              <div
                key={party.contactId}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={party.isOwner ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}>
                    {party.isOwner ? (
                      <Star className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{party.name}</p>
                  {party.isOwner && (
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {t("strikeDeal.autoAdded")}
                    </Badge>
                  )}
                </div>

                <Select
                  value={party.role}
                  onValueChange={(v) => updateRole(party.contactId, v as DealPartyRole)}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_PARTY_ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="text-xs">
                        {t(`strikeDeal.roles.${role}` as any)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {t("strikeDeal.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !hasParties}
            className="gap-1.5"
          >
            <Handshake className="h-4 w-4" />
            {isPending ? t("strikeDeal.submitting") : t("strikeDeal.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
