"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppToast } from "@/hooks/use-app-toast";
import { dealEditFormSchema, type DealEditFormValues } from "@/lib/validations/deals";
import { updateDeal } from "@/actions/deals";

interface EditDealFormProps {
  deal: {
    id: string;
    title?: string | null;
    dealType?: string | null;
    agreedPrice?: unknown;
    totalCommission?: unknown;
    commissionRate?: unknown;
    listingAgentSplit?: unknown;
    buyerAgentSplit?: unknown;
    monthlyRentAmount?: unknown;
    securityDeposit?: unknown;
    depositAmount?: unknown;
    leaseStartDate?: string | Date | null;
    leaseEndDate?: string | Date | null;
    leaseDurationMonths?: number | null;
    notes?: string | null;
    commissionCurrency?: string | null;
  };
  onSuccess?: () => void;
}

const DEAL_TYPE_OPTIONS = ["SALE", "RENT"] as const;

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function toDateString(v: Date | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v as unknown as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

export function EditDealForm({ deal, onSuccess }: EditDealFormProps) {
  const t = useTranslations("deals");
  const router = useRouter();
  const { toast } = useAppToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DealEditFormValues>({
    resolver: zodResolver(dealEditFormSchema),
    defaultValues: {
      id: deal.id,
      title: deal.title ?? "",
      dealType: (deal.dealType as DealEditFormValues["dealType"]) ?? null,
      agreedPrice: toNumber(deal.agreedPrice),
      totalCommission: toNumber(deal.totalCommission),
      commissionRate: toNumber(deal.commissionRate),
      listingAgentSplit: toNumber(deal.listingAgentSplit) ?? undefined,
      buyerAgentSplit: toNumber(deal.buyerAgentSplit) ?? undefined,
      monthlyRentAmount: toNumber(deal.monthlyRentAmount),
      securityDeposit: toNumber(deal.securityDeposit),
      leaseStartDate: deal.leaseStartDate ? new Date(deal.leaseStartDate) : null,
      leaseEndDate: deal.leaseEndDate ? new Date(deal.leaseEndDate) : null,
      leaseDurationMonths: toNumber(deal.leaseDurationMonths),
      notes: deal.notes ?? "",
    },
  });

  const isRental = form.watch("dealType") === "RENT";

  const onSubmit = async (values: DealEditFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateDeal(values);
      if (!result.success) {
        toast.error(result.error ?? "Update failed", { isTranslationKey: false });
        return;
      }
      toast.success("updateSuccess");
      router.refresh();
      onSuccess?.();
    } catch (err) {
      console.error("[DEAL_EDIT]", err);
      toast.error("updateFailed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 py-4 border-b">
        <SheetTitle>{t("edit.title")}</SheetTitle>
      </SheetHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <Tabs defaultValue="basic" className="flex flex-1 overflow-hidden">
            <TabsList className="flex flex-col h-full w-44 shrink-0 rounded-none border-r bg-muted/30 justify-start p-2 gap-1">
              <TabsTrigger value="basic" className="w-full justify-start">
                {t("edit.tabs.basic")}
              </TabsTrigger>
              <TabsTrigger value="financial" className="w-full justify-start">
                {t("edit.tabs.financial")}
              </TabsTrigger>
              {isRental && (
                <TabsTrigger value="rental" className="w-full justify-start">
                  {t("edit.tabs.rental")}
                </TabsTrigger>
              )}
              <TabsTrigger value="notes" className="w-full justify-start">
                {t("edit.tabs.notes")}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ── Basic ── */}
              <TabsContent value="basic" className="mt-0 space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create.title")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dealType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create.dealType")}</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("create.selectDealType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEAL_TYPE_OPTIONS.map((v) => (
                            <SelectItem key={v} value={v}>
                              {t(`dealType.${v}` as Parameters<typeof t>[0])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ── Financial ── */}
              <TabsContent value="financial" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["agreedPrice", t("create.agreedPrice")],
                      ["totalCommission", t("detail.commission.total")],
                      ["commissionRate", t("create.commissionRate")],
                      ["listingAgentSplit", t("create.listingAgentSplit")],
                      ["buyerAgentSplit", t("create.buyerAgentSplit")],
                    ] as const
                  ).map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === "" ? undefined : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* ── Rental ── */}
              <TabsContent value="rental" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["monthlyRentAmount", t("create.monthlyRent")],
                      ["securityDeposit", t("create.securityDeposit")],
                    ] as const
                  ).map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <FormField
                    control={form.control}
                    name="leaseStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("create.leaseStart")}</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={toDateString(field.value)}
                            onChange={(e) =>
                              field.onChange(e.target.value ? new Date(e.target.value) : null)
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
                            value={toDateString(field.value)}
                            onChange={(e) =>
                              field.onChange(e.target.value ? new Date(e.target.value) : null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* ── Notes ── */}
              <TabsContent value="notes" className="mt-0 space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("detail.notes")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={6}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("edit.saving") : t("edit.save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
