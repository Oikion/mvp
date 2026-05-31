"use client";

/**
 * QuickAddDeal — minimal Sheet form for fast deal creation (Phase 3 v2.0).
 *
 * Captures the 4 most-essential fields:
 *   1. Property (required)
 *   2. Deal Type (SALE / RENT)
 *   3. Agent Role (LISTING_SIDE / BUYER_SIDE / DUAL_AGENCY)
 *   4. Title (optional)
 *
 * On submit calls the v2.0 `createDeal` server action and revalidates the
 * SWR `/api/deals` cache. For the full multi-step flow the user can click
 * "Continue to full wizard" which closes this sheet and lets the parent open
 * the NewDealWizard.
 */

import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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
import { Button } from "@/components/ui/button";
import { SinglePropertySelector } from "@/components/entity-selector/PropertySelector";
import { useAppToast } from "@/hooks/use-app-toast";
import { createDeal } from "@/actions/deals";

// ──────────────────────────────────────────────────────────
// Local schema (subset of createDealSchema; only the fields the
// quick-add form actually collects)
// ──────────────────────────────────────────────────────────

const quickAddDealSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  dealType: z.enum(["SALE", "RENT"]).optional(),
  agentRole: z.enum(["LISTING_SIDE", "BUYER_SIDE", "DUAL_AGENCY"]).optional(),
  title: z.string().max(500).optional(),
});

type QuickAddDealValues = z.infer<typeof quickAddDealSchema>;

// ──────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────

interface QuickAddDealProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: open the full wizard instead of submitting */
  onContinueToFull?: () => void;
  /** Optional: callback after successful create (deal id passed back) */
  onSuccess?: (dealId: string) => void;
}

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export function QuickAddDeal({
  open,
  onOpenChange,
  onContinueToFull,
  onSuccess,
}: Readonly<QuickAddDealProps>) {
  // Reuse existing key from crm namespace ("Continue to Full Form")
  // — avoids touching deals.json (out of scope for this component).
  const crmT = useTranslations("crm");
  const commonT = useTranslations("common");
  const t = useTranslations("deals");
  const { toast } = useAppToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<QuickAddDealValues>({
    resolver: zodResolver(quickAddDealSchema),
    defaultValues: {
      propertyId: "",
      dealType: undefined,
      agentRole: undefined,
      title: "",
    },
  });

  const onSubmit = async (values: QuickAddDealValues) => {
    setIsLoading(true);
    try {
      const result = await createDeal({
        propertyId: values.propertyId,
        dealType: values.dealType ?? null,
        agentRole: values.agentRole ?? null,
        title: values.title?.trim() || null,
      });

      if (result.success) {
        toast.success(t("toast.created"), {
          description: t("toast.createdDesc"),
          isTranslationKey: false,
        });
        form.reset();
        // Refresh deals list cache (covers /api/deals and /api/deals?stage=…)
        globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/deals"),
          undefined,
          { revalidate: true },
        );
        onOpenChange(false);
        if (onSuccess && result.data?.id) {
          onSuccess(result.data.id);
        }
      } else {
        toast.error(
          result.error || t("toast.createError"),
          { isTranslationKey: false },
        );
      }
    } catch (error) {
      console.error("[QUICK_ADD_DEAL]", error);
      toast.error(t("toast.createError"), { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[500px] flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>{t("create.quickAdd")}</SheetTitle>
          <SheetDescription>{t("create.description")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden mt-6"
          >
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Property (required) */}
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

            {/* Deal Type */}
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

            {/* Agent Role */}
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

            {/* Title (optional) */}
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

            </div>

            {/* Footer */}
            <div className="flex justify-between gap-4 pt-4 border-t">
              {onContinueToFull && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={onContinueToFull}
                >
                  {crmT("contacts.quickAdd.continueToWizard")}
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => onOpenChange(false)}
                >
                  {commonT("cancel")}
                </Button>
                <Button type="submit" disabled={isLoading} aria-busy={isLoading}>
                  {isLoading ? commonT("creating") : t("create.createDeal")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default QuickAddDeal;
