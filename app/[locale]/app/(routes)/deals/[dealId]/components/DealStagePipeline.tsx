// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import type { DealStage } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Ban,
  Check,
  ChevronRight,
  GitBranch,
  Loader2,
} from "lucide-react";
import { advanceDealStage } from "@/actions/deals";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  DEAL_STAGE_ORDER,
  getDealStageIndex,
  getValidDealNextStages,
  isDealStageTerminal,
} from "@/lib/validations/status-transitions";
import { DEAL_STATUS } from "@/lib/status-mappings";
import { cn } from "@/lib/utils";

interface DealStageLogEntry {
  readonly fromStage: DealStage;
  readonly toStage: DealStage;
  readonly changedAt: string | Date;
}

interface DealStagePipelineProps {
  readonly dealId: string;
  readonly currentStage: DealStage;
  readonly canAdvance: boolean;
  readonly stageLogs?: readonly DealStageLogEntry[];
  readonly onStageChanged?: () => void;
}

export default function DealStagePipeline({
  dealId,
  currentStage,
  canAdvance,
  stageLogs,
  onStageChanged,
}: DealStagePipelineProps) {
  const t = useTranslations("deals");
  const { toast } = useAppToast();

  const [pendingStage, setPendingStage] = useState<DealStage | null>(null);
  const [pendingFallenThrough, setPendingFallenThrough] = useState(false);
  const [notes, setNotes] = useState("");
  const [fallenReasonTouched, setFallenReasonTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTerminal = isDealStageTerminal(currentStage);
  const validNextStages = getValidDealNextStages(currentStage);

  // For FALLEN_THROUGH, look at stageLogs to find the highest stage reached
  // before falling through, so the visual pipeline shows progress.
  let currentIdx = getDealStageIndex(currentStage); // -1 for FALLEN_THROUGH
  if (currentStage === "FALLEN_THROUGH" && stageLogs && stageLogs.length > 0) {
    let highest = -1;
    for (const log of stageLogs) {
      if (log.fromStage !== "FALLEN_THROUGH") {
        const i = getDealStageIndex(log.fromStage);
        if (i > highest) highest = i;
      }
      if (log.toStage !== "FALLEN_THROUGH") {
        const i = getDealStageIndex(log.toStage);
        if (i > highest) highest = i;
      }
    }
    currentIdx = highest;
  }

  const fallenReasonInvalid = fallenReasonTouched && !notes.trim();

  const closeDialog = () => {
    setPendingStage(null);
    setPendingFallenThrough(false);
    setNotes("");
    setFallenReasonTouched(false);
  };

  const submitAdvance = async (toStage: DealStage, requiredNotes?: string) => {
    setIsSubmitting(true);
    try {
      const trimmedNotes = (requiredNotes ?? notes).trim();
      const result = await advanceDealStage({
        dealId,
        toStage,
        notes: trimmedNotes || undefined,
      });
      if (!result.success) {
        toast.error(result.error || t("toast.stageError"), {
          isTranslationKey: false,
        });
        return;
      }
      toast.success(t("toast.stageAdvanced"), {
        description: t("toast.stageAdvancedDesc", {
          stage: t(`stage.${toStage}`),
        }),
        isTranslationKey: false,
      });
      closeDialog();
      onStageChanged?.();
    } catch (err) {
      console.error("[DEAL_PIPELINE_ADVANCE]", err);
      toast.error(t("toast.stageError"), { isTranslationKey: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          {t("detail.pipeline")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Visual horizontal pipeline ── */}
        <nav
          aria-label={t("detail.pipeline")}
          className="overflow-x-auto pb-2"
        >
          <ol className="flex min-w-max items-center gap-1">
            {DEAL_STAGE_ORDER.map((stage, idx) => {
              const cfg = DEAL_STATUS[stage];
              const Icon = cfg?.icon;
              const isCurrent = stage === currentStage;
              const isCompleted =
                currentIdx >= 0 && idx < currentIdx;
              const isFuture =
                currentIdx >= 0 ? idx > currentIdx : true;
              const stageName = t(`stage.${stage}`);
              const stageDesc = t(`stageDescription.${stage}`);
              const positionLabel = t("detail.stagePosition", {
                current: idx + 1,
                total: DEAL_STAGE_ORDER.length,
              });

              return (
                <li key={stage} className="flex items-center">
                  <div
                    className={cn(
                      "flex flex-col items-center gap-1.5 min-w-[88px] px-2 py-1 rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                      isCurrent && "scale-105"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${positionLabel}: ${stageName} — ${stageDesc}`}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                        isCompleted &&
                          "border-primary bg-primary text-primary-foreground",
                        isCurrent &&
                          "border-primary bg-primary/15 text-primary ring-2 ring-primary/30",
                        isFuture &&
                          "border-dashed border-muted-foreground/40 bg-background text-muted-foreground/60"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : Icon ? (
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            cfg?.animate &&
                              isCurrent &&
                              "motion-safe:animate-spin",
                            isFuture && "opacity-60"
                          )}
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="text-xs font-semibold">
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium text-center leading-tight max-w-[88px]",
                        isCurrent
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {t(`stage.${stage}`)}
                    </span>
                  </div>
                  {idx < DEAL_STAGE_ORDER.length - 1 && (
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 mx-0.5 shrink-0",
                        isCompleted
                          ? "text-primary"
                          : "text-muted-foreground/40"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ── Special FALLEN_THROUGH state banner ── */}
        {currentStage === "FALLEN_THROUGH" && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2">
            <Ban
              className="h-4 w-4 text-destructive mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <div className="text-sm">
              <p className="font-medium text-destructive">
                {t("stage.FALLEN_THROUGH")}
              </p>
              <p className="text-muted-foreground">
                {t("stageDescription.FALLEN_THROUGH")}
              </p>
            </div>
          </div>
        )}

        {/* ── Current stage description ── */}
        {currentStage !== "FALLEN_THROUGH" && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">
                {t(`stage.${currentStage}`)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(`stageDescription.${currentStage}`)}
            </p>
          </div>
        )}

        {/* ── Action buttons (advance / fallen through) ── */}
        {!isTerminal && canAdvance && (
          <div className="flex flex-wrap gap-2">
            {validNextStages
              .filter((s) => s !== "FALLEN_THROUGH")
              .map((stage) => {
                const cfg = DEAL_STATUS[stage];
                const Icon = cfg?.icon;
                return (
                  <Button
                    key={stage}
                    onClick={() => setPendingStage(stage)}
                    leftIcon={
                      Icon ? <Icon className="h-4 w-4" /> : undefined
                    }
                  >
                    {t("detail.advanceTo", { stage: t(`stage.${stage}`) })}
                  </Button>
                );
              })}
            {validNextStages.includes("FALLEN_THROUGH") && (
              <Button
                variant="outline"
                onClick={() => setPendingFallenThrough(true)}
                leftIcon={<Ban className="h-4 w-4" />}
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                {t("detail.markFallenThrough")}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* ── Advance-to-stage dialog (collects optional notes) ── */}
      <Dialog
        open={pendingStage !== null}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingStage
                ? t("detail.advanceTo", {
                    stage: t(`stage.${pendingStage}`),
                  })
                : ""}
            </DialogTitle>
            <DialogDescription>
              {pendingStage
                ? t(`stageDescription.${pendingStage}`)
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="advance-notes">{t("detail.notes")}</Label>
            <Textarea
              id="advance-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("create.notesPlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              {t("create.cancel")}
            </Button>
            <Button
              onClick={() => pendingStage && submitAdvance(pendingStage)}
              disabled={isSubmitting || !pendingStage}
              leftIcon={
                isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )
              }
            >
              {pendingStage
                ? t("detail.advanceTo", {
                    stage: t(`stage.${pendingStage}`),
                  })
                : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fallen-through confirmation (REQUIRES reason) ── */}
      <AlertDialog
        open={pendingFallenThrough}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("detail.fallenThroughDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("detail.fallenThroughDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="fallen-reason">
              {t("detail.fallenThroughDialog.reason")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Textarea
              id="fallen-reason"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (!fallenReasonTouched) setFallenReasonTouched(true);
              }}
              onBlur={() => setFallenReasonTouched(true)}
              rows={3}
              required
              aria-required="true"
              aria-invalid={fallenReasonInvalid || undefined}
              aria-describedby={
                fallenReasonInvalid ? "fallen-reason-error" : undefined
              }
              placeholder={t("detail.fallenThroughDialog.reasonPlaceholder")}
            />
            {fallenReasonInvalid && (
              <p
                id="fallen-reason-error"
                role="alert"
                aria-live="polite"
                className="text-xs text-destructive"
              >
                {t("detail.fallenThroughDialog.reason")}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              {t("detail.fallenThroughDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting || !notes.trim()}
              onClick={(e) => {
                e.preventDefault();
                submitAdvance("FALLEN_THROUGH");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {t("detail.fallenThroughDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
