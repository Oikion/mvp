// @ts-nocheck
"use client";

/**
 * NewDealWizard — full multi-step deal creation flow (Phase 3 v2.0).
 *
 * 5 steps:
 *   1. Property & Request   — link entities and pick deal type / agent role
 *   2. Parties & Agents     — listing/buyer agents and notary contact
 *   3. Financial            — conditional on deal type (SALE vs RENT)
 *   4. Notes                — title + free-form notes
 *   5. Review               — read-only summary before submit
 *
 * Important implementation notes (see memory/MEMORY.md → Multi-Step Wizard Bugs):
 *   • `<CardContent key={currentStep}>` is REQUIRED to remount step content
 *   • `shouldUnregister: false` preserves form values across remount
 *   • All Selects use `value={field.value ?? ""}` for controlled mode
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useFormatter } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { mutate as globalMutate } from "swr";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Separator } from "@/components/ui/separator";

import { SinglePropertySelector } from "@/components/entity-selector/PropertySelector";
import { UnifiedEntitySelector } from "@/components/entity-selector/UnifiedEntitySelector";

import { useAppToast } from "@/hooks/use-app-toast";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";

import { dealFormSchema, createDealSchema } from "@/lib/validations/deals";
import type { z } from "zod";
import { createDeal } from "@/actions/deals";
import type { Deal } from "@prisma/client";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

type DealFormValues = z.infer<typeof dealFormSchema>;

interface NewDealWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (deal: Deal) => void;
}

// Per-step validation field groups
const STEP_FIELDS: Record<number, (keyof DealFormValues)[]> = {
  1: ["propertyId", "requestId", "dealType", "agentRole"],
  2: ["listingAgentId", "buyerAgentId", "notaryContactId"],
  3: [
    "agreedPrice",
    "commissionRate",
    "totalCommission",
    "listingAgentSplit",
    "buyerAgentSplit",
    "monthlyRentAmount",
    "securityDeposit",
    "leaseStartDate",
    "leaseEndDate",
    "leaseDurationMonths",
  ],
  4: ["title", "notes"],
  5: [],
};

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export function NewDealWizard({
  open,
  onOpenChange,
  onCreated,
}: Readonly<NewDealWizardProps>) {
  const t = useTranslations("deals");
  const tCommon = useTranslations("common");
  const tCrm = useTranslations("crm");
  const format = useFormatter();
  const { toast } = useAppToast();
  const { user: clerkUser } = useUser();
  const { users: orgUsers } = useOrgUsers({ enabled: open });

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  const STEPS = useMemo(
    () => [
      {
        id: 1,
        title: t("create.steps.propertyRequest"),
        description: t("create.stepDescriptions.propertyRequest"),
      },
      {
        id: 2,
        title: t("create.steps.parties"),
        description: t("create.stepDescriptions.parties"),
      },
      {
        id: 3,
        title: t("create.steps.financial"),
        description: t("create.stepDescriptions.financial"),
      },
      {
        id: 4,
        title: t("create.steps.notes"),
        description: t("create.stepDescriptions.notes"),
      },
      {
        id: 5,
        title: t("create.steps.review"),
        description: t("create.stepDescriptions.review"),
      },
    ],
    [t],
  );

  const totalSteps = STEPS.length;

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    shouldUnregister: false,
    defaultValues: {
      propertyId: "",
      requestId: null,
      dealType: null,
      agentRole: null,
      stage: "INTEREST",
      listingAgentId: null,
      buyerAgentId: null,
      notaryContactId: null,
      agreedPrice: null,
      totalCommission: null,
      commissionRate: null,
      listingAgentSplit: 50,
      buyerAgentSplit: 50,
      monthlyRentAmount: null,
      securityDeposit: null,
      leaseStartDate: null,
      leaseEndDate: null,
      leaseDurationMonths: null,
      title: "",
      notes: "",
    },
  });

  const watchedDealType = form.watch("dealType");
  const watchedAgentRole = form.watch("agentRole");
  const watchedListingSplit = form.watch("listingAgentSplit");
  const watchedBuyerSplit = form.watch("buyerAgentSplit");

  // Auto-suggest current user as the relevant agent based on agentRole
  useEffect(() => {
    if (!clerkUser || !orgUsers?.length || !watchedAgentRole) return;
    const me = orgUsers.find(
      (u) =>
        u.id === clerkUser.id ||
        u.email === clerkUser.primaryEmailAddress?.emailAddress,
    );
    if (!me) return;

    if (
      (watchedAgentRole === "LISTING_SIDE" ||
        watchedAgentRole === "DUAL_AGENCY") &&
      !form.getValues("listingAgentId")
    ) {
      form.setValue("listingAgentId", me.id, { shouldDirty: false });
    }
    if (
      (watchedAgentRole === "BUYER_SIDE" ||
        watchedAgentRole === "DUAL_AGENCY") &&
      !form.getValues("buyerAgentId")
    ) {
      form.setValue("buyerAgentId", me.id, { shouldDirty: false });
    }
  }, [watchedAgentRole, clerkUser, orgUsers, form]);

  // Reset wizard whenever it is closed
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Navigation ──
  const validateStep = useCallback(
    async (step: number) => {
      const fields = STEP_FIELDS[step] || [];

      // Step 1: propertyId is required (manual guard)
      if (step === 1) {
        const propertyId = form.getValues("propertyId");
        if (!propertyId) {
          form.setError("propertyId", {
            type: "manual",
            message: t("create.validation.propertyRequired"),
          });
          form.setFocus("propertyId");
          toast.error(t("create.validation.propertyRequired"), {
            isTranslationKey: false,
          });
          return false;
        }
      }

      // Step 3 SALE: split must total 100
      if (step === 3 && form.getValues("dealType") === "SALE") {
        const total =
          Number(form.getValues("listingAgentSplit") ?? 0) +
          Number(form.getValues("buyerAgentSplit") ?? 0);
        if (Math.abs(total - 100) > 0.01) {
          form.setError("listingAgentSplit", {
            type: "manual",
            message: t("create.validation.splitMustTotal100"),
          });
          form.setFocus("listingAgentSplit");
          toast.error(t("create.validation.splitMustTotal100"), {
            isTranslationKey: false,
          });
          return false;
        }
      }

      if (fields.length === 0) return true;
      const ok = await form.trigger(
        fields as Array<keyof DealFormValues>,
      );
      if (!ok) {
        const firstInvalid = fields.find(
          (f) => form.getFieldState(f).error,
        );
        if (firstInvalid) {
          form.setFocus(firstInvalid);
        }
      }
      return ok;
    },
    [form, t, toast],
  );

  const handleNext = useCallback(async () => {
    const ok = await validateStep(currentStep);
    if (!ok) {
      toast.error(t("create.validation.fixErrors"), {
        isTranslationKey: false,
      });
      return;
    }
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  }, [currentStep, t, toast, validateStep, totalSteps]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  const handleStepClick = useCallback(
    async (stepId: number) => {
      if (stepId < currentStep) {
        setCurrentStep(stepId);
        return;
      }
      // Forward-jump only allowed if every previous step validates
      for (let s = currentStep; s < stepId; s++) {
        const ok = await validateStep(s);
        if (!ok) return;
      }
      setCurrentStep(stepId);
    },
    [currentStep, validateStep],
  );

  // ── Submit ──
  const onSubmit = async (values: DealFormValues) => {
    setIsLoading(true);
    try {
      // Build a payload that matches createDealSchema. Strip empty strings to
      // null so the strict schema is happy, and only include rental fields
      // when dealType === RENT (and vice versa for sale fields).
      const isSale = values.dealType === "SALE";
      const isRent = values.dealType === "RENT";

      const payload: Partial<z.infer<typeof createDealSchema>> = {
        propertyId: values.propertyId,
        requestId: values.requestId || null,
        notaryContactId: values.notaryContactId || null,
        listingAgentId: values.listingAgentId || null,
        buyerAgentId: values.buyerAgentId || null,
        stage: values.stage ?? "INTEREST",
        dealType: values.dealType ?? null,
        agentRole: values.agentRole ?? null,
        title: values.title?.toString().trim() || null,
        notes: values.notes?.toString().trim() || null,
      };

      if (isSale) {
        payload.agreedPrice = values.agreedPrice ?? null;
        payload.commissionRate = values.commissionRate ?? null;
        payload.totalCommission = values.totalCommission ?? null;
        payload.listingAgentSplit = values.listingAgentSplit ?? 50;
        payload.buyerAgentSplit = values.buyerAgentSplit ?? 50;
      }

      if (isRent) {
        payload.monthlyRentAmount = values.monthlyRentAmount ?? null;
        payload.securityDeposit = values.securityDeposit ?? null;
        payload.leaseStartDate = values.leaseStartDate ?? null;
        payload.leaseEndDate = values.leaseEndDate ?? null;
        payload.leaseDurationMonths = values.leaseDurationMonths ?? null;
      }

      const result = await createDeal(payload);

      if (result.success) {
        toast.success(t("toast.created"), {
          description: t("toast.createdDesc"),
          isTranslationKey: false,
        });
        // Refresh deals list cache (covers /api/deals and /api/deals?stage=…)
        globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/deals"),
          undefined,
          { revalidate: true },
        );
        onCreated?.(result.data as Deal);
        onOpenChange(false);
      } else {
        toast.error(result.error || t("toast.createError"), {
          isTranslationKey: false,
        });
      }
    } catch (error) {
      console.error("[NEW_DEAL_WIZARD]", error);
      toast.error(t("toast.createError"), { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Helpers ──
  const formatCurrency = (value?: number | null) =>
    typeof value === "number"
      ? format.number(value, { style: "currency", currency: "EUR" })
      : "—";

  const userLabel = (id?: string | null) => {
    if (!id) return "—";
    const u = orgUsers?.find((x) => x.id === id);
    return u ? u.name || u.email : id;
  };

  // ── Step content ──
  const renderStepContent = () => {
    switch (currentStep) {
      // ════════════════════════════════════════════════
      // STEP 1: Property & Request
      // ════════════════════════════════════════════════
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("create.property")}</FormLabel>
                  <FormControl>
                    <SinglePropertySelector
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("create.selectProperty")}
                      searchPlaceholder={t("create.selectProperty")}
                      disabled={isLoading}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requestId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create.request")}</FormLabel>
                  <FormControl>
                    <UnifiedEntitySelector
                      mode="single"
                      entityTypes={["request"]}
                      value={field.value ?? ""}
                      onChange={(v) =>
                        field.onChange(typeof v === "string" ? v || null : null)
                      }
                      placeholder={t("create.selectRequest")}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("create.dealType")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger
                          disabled={isLoading}
                          aria-label={t("create.dealType")}
                        >
                          <SelectValue
                            placeholder={t("create.selectDealType")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SALE">
                          {t("dealType.SALE")}
                        </SelectItem>
                        <SelectItem value="RENT">
                          {t("dealType.RENT")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agentRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("create.agentRole")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger
                          disabled={isLoading}
                          aria-label={t("create.agentRole")}
                        >
                          <SelectValue
                            placeholder={t("create.selectAgentRole")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LISTING_SIDE">
                          {t("agentRole.LISTING_SIDE")}
                        </SelectItem>
                        <SelectItem value="BUYER_SIDE">
                          {t("agentRole.BUYER_SIDE")}
                        </SelectItem>
                        <SelectItem value="DUAL_AGENCY">
                          {t("agentRole.DUAL_AGENCY")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      // ════════════════════════════════════════════════
      // STEP 2: Parties & Agents
      // ════════════════════════════════════════════════
      case 2:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="listingAgentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create.listingAgent")}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v || null)}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger
                        disabled={isLoading}
                        aria-label={t("create.listingAgent")}
                      >
                        <SelectValue
                          placeholder={t("create.selectAgent")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orgUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buyerAgentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create.buyerAgent")}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v || null)}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger
                        disabled={isLoading}
                        aria-label={t("create.buyerAgent")}
                      >
                        <SelectValue
                          placeholder={t("create.selectAgent")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orgUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notaryContactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create.notary")}</FormLabel>
                  <FormControl>
                    {/* TODO: filter contacts by NOTARY category once UnifiedEntitySelector supports a contact-category filter */}
                    <UnifiedEntitySelector
                      mode="single"
                      entityTypes={["contact"]}
                      value={field.value ?? ""}
                      onChange={(v) =>
                        field.onChange(typeof v === "string" ? v || null : null)
                      }
                      placeholder={t("create.selectNotary")}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      // ════════════════════════════════════════════════
      // STEP 3: Financial — conditional on dealType
      // ════════════════════════════════════════════════
      case 3:
        if (!watchedDealType) {
          return (
            <p className="text-sm text-muted-foreground">
              {t("create.pickDealTypeFirst")}
            </p>
          );
        }
        if (watchedDealType === "SALE") {
          return (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="agreedPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("create.agreedPrice")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={isLoading}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create.commissionRate")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          disabled={isLoading}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalCommission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create.totalCommission")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={isLoading}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="listingAgentSplit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create.listingAgentSplit")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="1"
                          disabled={isLoading}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyerAgentSplit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create.buyerAgentSplit")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="1"
                          disabled={isLoading}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {(() => {
                const splitTotal =
                  Number(watchedListingSplit ?? 0) +
                  Number(watchedBuyerSplit ?? 0);
                const splitOk = Math.abs(splitTotal - 100) < 0.01;
                return (
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-xs text-muted-foreground flex items-center gap-1"
                  >
                    {splitOk ? (
                      <CheckCircle2
                        className="h-4 w-4 text-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <AlertTriangle
                        className="h-4 w-4 text-destructive"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={
                        splitOk ? "text-success" : "text-destructive"
                      }
                    >
                      {splitTotal}%
                    </span>
                    <span>
                      {splitOk ? t("create.splitOk") : t("create.splitHint")}
                    </span>
                  </p>
                );
              })()}
            </div>
          );
        }

        // RENT
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyRentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("create.monthlyRent")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={isLoading}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="securityDeposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("create.securityDeposit")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={isLoading}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leaseStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("create.leaseStart")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={isLoading}
                        value={
                          field.value
                            ? new Date(field.value as any)
                                .toISOString()
                                .slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leaseEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("create.leaseEnd")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={isLoading}
                        value={
                          field.value
                            ? new Date(field.value as any)
                                .toISOString()
                                .slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="leaseDurationMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create.leaseDuration")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      disabled={isLoading}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      // ════════════════════════════════════════════════
      // STEP 4: Notes
      // ════════════════════════════════════════════════
      case 4:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create.title")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("create.titlePlaceholder")}
                      disabled={isLoading}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      disabled={isLoading}
                      placeholder={t("create.notesPlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      // ════════════════════════════════════════════════
      // STEP 5: Review
      // ════════════════════════════════════════════════
      case 5: {
        const v = form.getValues();
        const dateLabel = (d?: Date | string | null) =>
          d ? format.dateTime(new Date(d as any), { dateStyle: "medium" }) : "—";
        return (
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-medium mb-2">
                {t("create.steps.propertyRequest")}
              </h3>
              <Separator className="mb-3" />
              <dl className="grid grid-cols-2 gap-y-1">
                <dt className="text-muted-foreground">{t("create.property")}</dt>
                <dd>{v.propertyId || "—"}</dd>
                <dt className="text-muted-foreground">{t("create.dealType")}</dt>
                <dd>
                  {v.dealType ? t(`dealType.${v.dealType}` as any) : "—"}
                </dd>
                <dt className="text-muted-foreground">{t("create.agentRole")}</dt>
                <dd>
                  {v.agentRole
                    ? t(`agentRole.${v.agentRole}` as any)
                    : "—"}
                </dd>
              </dl>
            </section>

            <section>
              <h3 className="font-medium mb-2">{t("create.steps.parties")}</h3>
              <Separator className="mb-3" />
              <dl className="grid grid-cols-2 gap-y-1">
                <dt className="text-muted-foreground">
                  {t("create.listingAgent")}
                </dt>
                <dd>{userLabel(v.listingAgentId)}</dd>
                <dt className="text-muted-foreground">
                  {t("create.buyerAgent")}
                </dt>
                <dd>{userLabel(v.buyerAgentId)}</dd>
                <dt className="text-muted-foreground">{t("create.notary")}</dt>
                <dd>{v.notaryContactId || "—"}</dd>
              </dl>
            </section>

            <section>
              <h3 className="font-medium mb-2">
                {t("create.steps.financial")}
              </h3>
              <Separator className="mb-3" />
              {v.dealType === "SALE" && (
                <dl className="grid grid-cols-2 gap-y-1">
                  <dt className="text-muted-foreground">
                    {t("create.agreedPrice")}
                  </dt>
                  <dd>{formatCurrency(v.agreedPrice)}</dd>
                  <dt className="text-muted-foreground">
                    {t("create.commissionRate")}
                  </dt>
                  <dd>
                    {v.commissionRate != null ? `${v.commissionRate}%` : "—"}
                  </dd>
                  <dt className="text-muted-foreground">
                    {t("create.totalCommission")}
                  </dt>
                  <dd>{formatCurrency(v.totalCommission)}</dd>
                  <dt className="text-muted-foreground">
                    {t("create.listingAgentSplit")}
                  </dt>
                  <dd>{v.listingAgentSplit ?? 0}%</dd>
                  <dt className="text-muted-foreground">
                    {t("create.buyerAgentSplit")}
                  </dt>
                  <dd>{v.buyerAgentSplit ?? 0}%</dd>
                </dl>
              )}
              {v.dealType === "RENT" && (
                <dl className="grid grid-cols-2 gap-y-1">
                  <dt className="text-muted-foreground">
                    {t("create.monthlyRent")}
                  </dt>
                  <dd>{formatCurrency(v.monthlyRentAmount)}</dd>
                  <dt className="text-muted-foreground">
                    {t("create.securityDeposit")}
                  </dt>
                  <dd>{formatCurrency(v.securityDeposit)}</dd>
                  <dt className="text-muted-foreground">
                    {t("create.leaseStart")}
                  </dt>
                  <dd>{dateLabel(v.leaseStartDate)}</dd>
                  <dt className="text-muted-foreground">
                    {t("create.leaseEnd")}
                  </dt>
                  <dd>{dateLabel(v.leaseEndDate)}</dd>
                  <dt className="text-muted-foreground">
                    {t("create.leaseDuration")}
                  </dt>
                  <dd>{v.leaseDurationMonths ?? "—"}</dd>
                </dl>
              )}
              {!v.dealType && (
                <p className="text-muted-foreground">—</p>
              )}
            </section>

            <section>
              <h3 className="font-medium mb-2">{t("create.steps.notes")}</h3>
              <Separator className="mb-3" />
              <dl className="grid grid-cols-2 gap-y-1">
                <dt className="text-muted-foreground">{t("create.title")}</dt>
                <dd>{v.title?.toString().trim() || "—"}</dd>
              </dl>
              {v.notes?.toString().trim() && (
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                  {v.notes}
                </p>
              )}
            </section>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:min-w-[600px] lg:min-w-[900px] xl:min-w-[1000px] flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>{t("create.fullWizard")}</SheetTitle>
          <SheetDescription>{t("create.description")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && currentStep < totalSteps) {
                e.preventDefault();
              }
            }}
            className="h-full px-10 overflow-y-auto"
          >
            <div className="w-full max-w-[800px] text-sm pb-10">
              <div className="pb-3">
                <ProgressBar
                  steps={STEPS}
                  currentStep={currentStep}
                  onStepClick={handleStepClick}
                />
              </div>

              <div className="flex justify-end gap-2 pb-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || isLoading}
                >
                  {tCrm("contacts.wizard.buttons.previous")}
                </Button>
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    className="min-h-[44px]"
                    onClick={handleNext}
                    disabled={isLoading}
                  >
                    {tCrm("contacts.wizard.buttons.next")}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="min-h-[44px]"
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    {isLoading
                      ? tCommon("buttonStates.creating")
                      : t("create.createDeal")}
                  </Button>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle ref={headingRef} tabIndex={-1}>
                    {STEPS[currentStep - 1].title}
                  </CardTitle>
                  <CardDescription>
                    {STEPS[currentStep - 1].description}
                  </CardDescription>
                </CardHeader>
                <CardContent key={currentStep}>{renderStepContent()}</CardContent>
              </Card>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default NewDealWizard;
