// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Loader2,
  Plus,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { addDealParty, removeDealParty } from "@/actions/deals";
import { useAppToast } from "@/hooks/use-app-toast";
import { useContactSearch } from "@/hooks/swr/useUnifiedEntitySearch";

// All DealPartyRole enum values from the schema (kept as a const tuple for safety).
const DEAL_PARTY_ROLES = [
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
] as const;

type DealPartyRole = (typeof DEAL_PARTY_ROLES)[number];

interface DealPartyContact {
  readonly id: string;
  readonly friendlyId?: string | null;
  readonly displayName?: string | null;
  readonly email?: string | null;
  readonly primaryPhone?: string | null;
  readonly isCompany?: boolean | null;
}

interface DealParty {
  readonly id: string;
  readonly role: DealPartyRole;
  readonly notes?: string | null;
  readonly contact: DealPartyContact;
}

interface DealPartiesPanelProps {
  readonly dealId: string;
  readonly parties: readonly DealParty[];
  readonly canManage: boolean;
  readonly onPartiesChanged?: () => void;
}

export default function DealPartiesPanel({
  dealId,
  parties,
  canManage,
  onPartiesChanged,
}: DealPartiesPanelProps) {
  const t = useTranslations("deals");
  const tCommon = useTranslations("common");
  const { toast } = useAppToast();

  // Add-party dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [contactQuery, setContactQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<DealPartyRole>("BUYER");
  const [partyNotes, setPartyNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Remove confirmation
  const [removingPartyId, setRemovingPartyId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Contact search (entity-search API)
  const { groupedResults, isSearching } = useContactSearch(contactQuery, {
    limit: 10,
    enabled: addOpen,
  });
  const contactResults = groupedResults.contact ?? [];

  const resetAddDialog = () => {
    setSelectedContactId("");
    setContactQuery("");
    setSelectedRole("BUYER");
    setPartyNotes("");
  };

  const handleAddParty = async () => {
    if (!selectedContactId) return;
    setIsAdding(true);
    try {
      const result = await addDealParty({
        dealId,
        contactId: selectedContactId,
        role: selectedRole,
        notes: partyNotes.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error || t("toast.partyError"), {
          isTranslationKey: false,
        });
        return;
      }
      toast.success(t("toast.partyAdded"), {
        description: t("toast.partyAddedDesc"),
        isTranslationKey: false,
      });
      setAddOpen(false);
      resetAddDialog();
      onPartiesChanged?.();
    } catch (err) {
      console.error("[DEAL_PARTY_ADD]", err);
      toast.error(t("toast.partyError"), { isTranslationKey: false });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveParty = async () => {
    if (!removingPartyId) return;
    setIsRemoving(true);
    try {
      const result = await removeDealParty(removingPartyId);
      if (!result.success) {
        toast.error(result.error || t("toast.partyError"), {
          isTranslationKey: false,
        });
        return;
      }
      toast.success(t("toast.partyRemoved"), {
        description: t("toast.partyRemovedDesc"),
        isTranslationKey: false,
      });
      setRemovingPartyId(null);
      onPartiesChanged?.();
    } catch (err) {
      console.error("[DEAL_PARTY_REMOVE]", err);
      toast.error(t("toast.partyError"), { isTranslationKey: false });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" aria-hidden="true" />
            {t("detail.parties")}
            {parties.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {parties.length}
              </Badge>
            )}
          </CardTitle>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(true)}
              leftIcon={<Plus className="h-3 w-3" />}
            >
              {t("detail.addParty")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {parties.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {t("detail.noParties")}
          </div>
        ) : (
          <ul className="space-y-2">
            {parties.map((party) => (
              <li
                key={party.id}
                className="group relative rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {party.contact.isCompany ? (
                      <Building2
                        className="h-4 w-4 text-amber-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <UserCircle
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {party.contact.friendlyId ? (
                        <Link
                          href={`/app/crm/contacts/${party.contact.friendlyId}`}
                          className="text-sm font-medium hover:underline truncate"
                        >
                          {party.contact.displayName || "—"}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium truncate">
                          {party.contact.displayName || "—"}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] h-5">
                        {t(`partyRole.${party.role}`)}
                      </Badge>
                    </div>
                    {(party.contact.email || party.contact.primaryPhone) && (
                      <div className="text-xs text-muted-foreground truncate">
                        {party.contact.email ?? party.contact.primaryPhone}
                      </div>
                    )}
                    {party.notes && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {party.notes}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("detail.removeParty")}
                      className="min-h-[44px] min-w-[44px] sm:opacity-100 transition-opacity"
                      onClick={() => setRemovingPartyId(party.id)}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* ── Add Party Dialog ── */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.addPartyDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("detail.addPartyDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Role selector */}
            <div className="space-y-2">
              <Label htmlFor="party-role">
                {t("detail.addPartyDialog.role")}
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as DealPartyRole)}
              >
                <SelectTrigger id="party-role">
                  <SelectValue
                    placeholder={t("detail.addPartyDialog.selectRole")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_PARTY_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`partyRole.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact search */}
            <div className="space-y-2">
              <Label htmlFor="party-contact-search">
                {t("detail.addPartyDialog.contact")}
              </Label>
              <Input
                id="party-contact-search"
                type="text"
                value={contactQuery}
                onChange={(e) => setContactQuery(e.target.value)}
                placeholder={t("detail.searchContacts")}
                aria-label={t("detail.searchContacts")}
              />

              <div
                className="max-h-56 overflow-y-auto rounded-md border bg-popover"
                role="listbox"
                aria-label={t("detail.contacts")}
              >
                {isSearching ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {tCommon("loading")}
                  </div>
                ) : contactResults.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    {t("detail.addPartyDialog.noContacts")}
                  </div>
                ) : (
                  contactResults.map((c) => {
                    const isSelected = c.value === selectedContactId;
                    return (
                      <button
                        type="button"
                        key={c.value}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => setSelectedContactId(c.value)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none ${
                          isSelected ? "bg-accent" : ""
                        }`}
                      >
                        <div className="font-medium truncate">{c.label}</div>
                        {c.metadata?.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {String(c.metadata.subtitle)}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="party-notes">
                {t("detail.addPartyDialog.notes")}
              </Label>
              <Textarea
                id="party-notes"
                value={partyNotes}
                onChange={(e) => setPartyNotes(e.target.value)}
                rows={2}
                placeholder={t("detail.addPartyDialog.notesPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false);
                resetAddDialog();
              }}
              disabled={isAdding}
            >
              {t("detail.addPartyDialog.cancel")}
            </Button>
            <Button
              onClick={handleAddParty}
              disabled={isAdding || !selectedContactId}
              leftIcon={
                isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )
              }
            >
              {t("detail.addPartyDialog.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Party Confirmation ── */}
      <AlertDialog
        open={removingPartyId !== null}
        onOpenChange={(open) => !open && setRemovingPartyId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("detail.removePartyDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("detail.removePartyDialog.description", {
                name:
                  parties.find((p) => p.id === removingPartyId)?.contact
                    .displayName ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              {t("detail.removePartyDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={(e) => {
                e.preventDefault();
                handleRemoveParty();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {t("detail.removePartyDialog.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
