"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  UserCircle,
  ShieldCheck,
  Clock,
  ChevronRight,
  AlertTriangle,
  History,
  Users,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { setOwnershipMode } from "@/actions/data-ownership/set-ownership-mode";
import { changeOwnershipMode } from "@/actions/data-ownership/change-ownership-mode";
import { toast } from "sonner";
import type { PolicyEra } from "@/lib/data-ownership/types";
import type { DataOwnershipMode } from "@prisma/client";

interface Settings {
  dataOwnershipMode: DataOwnershipMode;
  dataOwnershipSetAt: string | null;
  dataOwnershipChangedAt: string | null;
  policyVersion: number;
  policyHistory: PolicyEra[];
}

interface Props {
  settings: Settings | null;
  isOwner: boolean;
  consentedAtCurrent: number;
}

const MODE_META = {
  AGENCY: {
    icon: Building2,
    color: "text-blue-500",
    badgeVariant: "secondary" as const,
    bg: "bg-blue-500/5 border-blue-500/20",
    activeBg: "bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30",
  },
  AGENT: {
    icon: UserCircle,
    color: "text-primary",
    badgeVariant: "default" as const,
    bg: "bg-primary/5 border-primary/20",
    activeBg: "bg-primary/10 border-primary/40 ring-1 ring-primary/30",
  },
};

export function DataControlClient({ settings, isOwner, consentedAtCurrent }: Props) {
  const t = useTranslations("dataOwnership");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<DataOwnershipMode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSetUp = !!settings?.dataOwnershipSetAt;
  const currentMode = settings?.dataOwnershipMode ?? null;

  function openChangeDialog() {
    setSelectedMode(currentMode);
    setChangeDialogOpen(true);
  }

  function handleModeSelect(mode: DataOwnershipMode) {
    setSelectedMode(mode);
  }

  function handleProceed() {
    if (!selectedMode) return;
    if (isSetUp && selectedMode === currentMode) {
      setChangeDialogOpen(false);
      return;
    }
    setChangeDialogOpen(false);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    if (!selectedMode) return;
    startTransition(async () => {
      const result = isSetUp
        ? await changeOwnershipMode(selectedMode)
        : await setOwnershipMode(selectedMode);

      if (result.success) {
        toast.success(isSetUp ? "Data ownership policy updated" : "Data ownership policy set");
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update policy");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground">
            Configure how data is owned and handled when agents leave your organization.
          </p>
        </div>
      </div>

      {/* Current Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("settings.currentMode")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSetUp ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Policy not configured</p>
                <p className="text-xs text-muted-foreground">
                  Your organization hasn&apos;t set a data ownership policy. This determines what happens to data when agents leave.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mode display */}
              {currentMode && (
                <PolicyModeCard mode={currentMode} active />
              )}

              {/* Meta row */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{t("settings.policyVersion")} {settings?.policyVersion}</span>
                </div>
                {settings?.dataOwnershipChangedAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{t("settings.lastChanged")} {new Date(settings.dataOwnershipChangedAt).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>{consentedAtCurrent} member{consentedAtCurrent !== 1 ? "s" : ""} consented to current version</span>
                </div>
              </div>
            </>
          )}

          {/* Action */}
          {isOwner && (
            <Button
              variant={isSetUp ? "outline" : "default"}
              size="sm"
              className="gap-2"
              onClick={openChangeDialog}
              disabled={isPending}
            >
              {isSetUp ? (
                <><RefreshCw className="h-3.5 w-3.5" />{t("settings.changePolicy")}</>
              ) : (
                <>Set Policy</>
              )}
            </Button>
          )}
          {!isOwner && (
            <p className="text-xs text-muted-foreground italic">Only the organization owner can change this policy.</p>
          )}
        </CardContent>
      </Card>

      {/* Policy History */}
      {isSetUp && settings!.policyHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Policy History
            </CardTitle>
            <CardDescription>
              Data follows the policy that was active when it was created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {[...settings!.policyHistory].reverse().map((era, i) => {
                const meta = MODE_META[era.mode as DataOwnershipMode];
                const Icon = meta.icon;
                const isLatest = i === 0;
                return (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0",
                        isLatest ? meta.activeBg : "border-border bg-muted/30"
                      )}>
                        <Icon className={cn("h-3.5 w-3.5", isLatest ? meta.color : "text-muted-foreground")} />
                      </div>
                      {i < settings!.policyHistory.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pt-1 pb-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-sm font-medium", isLatest ? meta.color : "text-foreground")}>
                          {t(`settings.mode_${era.mode}` as any)}
                        </span>
                        {isLatest && <Badge variant="outline" className="text-[10px] h-4 px-1.5">Current</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(era.from).toLocaleDateString()}
                        {era.to ? ` → ${new Date(era.to).toLocaleDateString()}` : " → now"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departure History link */}
      <Card>
        <CardContent className="pt-5">
          <Link
            href="/app/settings/departures"
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("departures.title")}</p>
                <p className="text-xs text-muted-foreground">View departure records and data migration history</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </CardContent>
      </Card>

      {/* Change Policy Dialog */}
      <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isSetUp ? t("settings.changePolicy") : "Set Data Ownership Policy"}</DialogTitle>
            <DialogDescription>
              {isSetUp
                ? t("settings.changePolicyWarning")
                : "Choose how data is owned within your organization."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-2">
            {(["AGENCY", "AGENT"] as const).map((mode) => {
              const meta = MODE_META[mode];
              const Icon = meta.icon;
              const isSelected = selectedMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleModeSelect(mode)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-4 text-left transition-all",
                    isSelected ? meta.activeBg : "border-border hover:bg-accent/50"
                  )}
                >
                  <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", isSelected ? meta.color : "text-muted-foreground")} />
                  <div>
                    <p className={cn("font-medium text-sm", isSelected ? meta.color : "")}>{t(`settings.mode_${mode}` as any)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(`settings.description_${mode}` as any)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleProceed} disabled={!selectedMode}>
              {isSetUp && selectedMode !== currentMode ? "Continue" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Change Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Policy Change
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are changing the data ownership policy to{" "}
                  <strong>{selectedMode && t(`settings.mode_${selectedMode}` as any)}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  All members will need to re-consent. Existing data follows the policy active when it was created.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Applying…" : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyModeCard({ mode, active }: { mode: DataOwnershipMode; active?: boolean }) {
  const t = useTranslations("dataOwnership");
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4", active ? meta.activeBg : meta.bg)}>
      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", meta.color)} />
      <div>
        <div className="flex items-center gap-2">
          <p className={cn("font-medium text-sm", meta.color)}>{t(`settings.mode_${mode}` as any)}</p>
          <Badge variant={meta.badgeVariant} className="text-[10px] h-4 px-1.5">Active</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{t(`settings.description_${mode}` as any)}</p>
      </div>
    </div>
  );
}

// Separator re-export to avoid unused import warning
export { Separator };
