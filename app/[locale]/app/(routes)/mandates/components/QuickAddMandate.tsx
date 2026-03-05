"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const createQuickAddMandateSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().min(1, t("MandateForm.validation.titleRequired")).max(200),
    transaction_type: z.enum(["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"]).optional(),
    property_type: z
      .enum([
        "RESIDENTIAL",
        "COMMERCIAL",
        "LAND",
        "RENTAL",
        "VACATION",
        "APARTMENT",
        "HOUSE",
        "MAISONETTE",
        "WAREHOUSE",
        "PARKING",
        "PLOT",
        "FARM",
        "INDUSTRIAL",
        "OTHER",
      ])
      .optional(),
    budget_min: z.coerce.number().min(0).optional(),
    budget_max: z.coerce.number().min(0).optional(),
    urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    assigned_to: z.string().optional(),
  });

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationUsers: { id: string; name: string }[];
  onSuccess?: () => void;
};

export function QuickAddMandate({
  open,
  onOpenChange,
  organizationUsers,
  onSuccess,
}: Props) {
  const router = useRouter();
  const { toast } = useAppToast();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("mandates");
  const tMls = useTranslations("mls");
  const locale = useLocale();
  const tCommon = useTranslations("common");

  const quickAddMandateSchema = createQuickAddMandateSchema(t);
  type QuickAddMandateFormValues = z.infer<typeof quickAddMandateSchema>;

  const form = useForm<QuickAddMandateFormValues>({
    resolver: zodResolver(quickAddMandateSchema),
    defaultValues: {
      title: "",
      transaction_type: undefined,
      property_type: undefined,
      budget_min: undefined,
      budget_max: undefined,
      urgency: undefined,
      assigned_to: "",
    },
  });

  const onSubmit = async (data: QuickAddMandateFormValues) => {
    setIsLoading(true);
    try {
      await axios.post("/api/mandates", {
        title: data.title.trim(),
        transaction_type: data.transaction_type,
        property_type: data.property_type || undefined,
        budget_min: data.budget_min || undefined,
        budget_max: data.budget_max || undefined,
        urgency: data.urgency || undefined,
        assigned_to: data.assigned_to || undefined,
        draft_status: false,
      });

      toast.success("createSuccess", { description: tCommon("mandateCreated") });

      form.reset();
      onOpenChange(false);
      router.refresh();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error creating mandate:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data ||
        error?.message ||
        tCommon("somethingWentWrong");
      toast.error(
        typeof errorMessage === "string" ? errorMessage : String(errorMessage),
        { isTranslationKey: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onContinueToWizard = async () => {
    // Validate what we have so far (only title is truly required for draft)
    const values = form.getValues();
    const title = values.title?.trim();

    setIsLoading(true);
    try {
      const response = await axios.post("/api/mandates/draft", {
        title: title || undefined,
        transaction_type: values.transaction_type || undefined,
        property_type: values.property_type || undefined,
        budget_min: values.budget_min || undefined,
        budget_max: values.budget_max || undefined,
        urgency: values.urgency || undefined,
        assigned_to: values.assigned_to || undefined,
      });

      const draftId = response.data.id;

      form.reset();
      onOpenChange(false);

      // Navigate to the full mandate wizard with the draft ID
      router.push(`/${locale}/app/mandates/${draftId}/edit`);
    } catch (error: any) {
      console.error("Error creating mandate draft:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data ||
        error?.message ||
        tCommon("somethingWentWrong");
      toast.error(
        typeof errorMessage === "string" ? errorMessage : String(errorMessage),
        { isTranslationKey: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("QuickAdd.title")}</SheetTitle>
          <SheetDescription>{t("QuickAdd.description")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 space-y-4 mt-6"
          >
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.title")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("MandateForm.fields.titlePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transaction Type */}
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.transactionType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue
                          placeholder={tMls("PropertyForm.fields.transactionTypePlaceholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SALE">
                        {tMls("PropertyForm.transactionType.SALE")}
                      </SelectItem>
                      <SelectItem value="RENTAL">
                        {tMls("PropertyForm.transactionType.RENTAL")}
                      </SelectItem>
                      <SelectItem value="SHORT_TERM">
                        {tMls("PropertyForm.transactionType.SHORT_TERM")}
                      </SelectItem>
                      <SelectItem value="EXCHANGE">
                        {tMls("PropertyForm.transactionType.EXCHANGE")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property Type */}
            <FormField
              control={form.control}
              name="property_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.propertyType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue
                          placeholder={tMls("PropertyForm.fields.propertyTypePlaceholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="APARTMENT">
                        {tMls("PropertyForm.propertyType.APARTMENT")}
                      </SelectItem>
                      <SelectItem value="HOUSE">
                        {tMls("PropertyForm.propertyType.HOUSE")}
                      </SelectItem>
                      <SelectItem value="MAISONETTE">
                        {tMls("PropertyForm.propertyType.MAISONETTE")}
                      </SelectItem>
                      <SelectItem value="COMMERCIAL">
                        {tMls("PropertyForm.propertyType.COMMERCIAL")}
                      </SelectItem>
                      <SelectItem value="WAREHOUSE">
                        {tMls("PropertyForm.propertyType.WAREHOUSE")}
                      </SelectItem>
                      <SelectItem value="PARKING">
                        {tMls("PropertyForm.propertyType.PARKING")}
                      </SelectItem>
                      <SelectItem value="PLOT">
                        {tMls("PropertyForm.propertyType.PLOT")}
                      </SelectItem>
                      <SelectItem value="FARM">
                        {tMls("PropertyForm.propertyType.FARM")}
                      </SelectItem>
                      <SelectItem value="INDUSTRIAL">
                        {tMls("PropertyForm.propertyType.INDUSTRIAL")}
                      </SelectItem>
                      <SelectItem value="OTHER">
                        {tMls("PropertyForm.propertyType.OTHER")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Budget Min + Max */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("MandateForm.fields.budgetMin")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        disabled={isLoading}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? undefined : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budget_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("MandateForm.fields.budgetMax")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        disabled={isLoading}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? undefined : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Urgency */}
            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.urgency")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue placeholder={tCommon("placeholders.selectPriority")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW">
                        {t("MandateForm.urgency.LOW")}
                      </SelectItem>
                      <SelectItem value="MEDIUM">
                        {t("MandateForm.urgency.MEDIUM")}
                      </SelectItem>
                      <SelectItem value="HIGH">
                        {t("MandateForm.urgency.HIGH")}
                      </SelectItem>
                      <SelectItem value="CRITICAL">
                        {t("MandateForm.urgency.CRITICAL")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assigned Agent */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.assignedTo")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger disabled={isLoading}>
                        <SelectValue placeholder={tCommon("selectAgent")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="overflow-y-auto h-56">
                      {organizationUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action buttons */}
            <div className="flex justify-between gap-4 pt-4 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onContinueToWizard}
                disabled={isLoading}
              >
                {t("QuickAdd.continueToWizard")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? tCommon("creating") : t("QuickAdd.create")}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
