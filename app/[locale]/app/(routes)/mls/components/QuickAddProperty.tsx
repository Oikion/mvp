"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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
import { FormSelectWithOther } from "@/components/ui/form-select-with-other";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const createQuickAddSchema = (t: (key: string) => string, tCommon: (key: string) => string) => z.object({
  property_name: z.string().optional(),
  property_type: z.enum(["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE", "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"], {
    required_error: t("PropertyForm.validation.propertyTypeRequired"),
  }),
  property_type_other: z.string().optional(),
  transaction_type: z.enum(["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"], {
    required_error: t("PropertyForm.validation.transactionTypeRequired"),
  }),
  municipality: z.string().min(1, t("PropertyForm.validation.municipalityRequired")),
  area: z.string().optional(),
  postal_code: z.string().optional(),
  size_net_sqm: z.coerce.number().optional(),
  plot_size_sqm: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  floor: z.string().optional(),
  price: z.coerce.number().min(0, t("PropertyForm.validation.priceRequired")),
  assigned_to: z.string().min(1, tCommon("selectAgent")),
}).superRefine((data, ctx) => {
  // Validate area/postal code
  if (!data.area && !data.postal_code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: t("PropertyForm.validation.areaOrPostalCodeRequired"),
      path: ["area"],
    });
  }

  // Validate size based on type
  const isResidentialOrCommercial = ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE"].includes(data.property_type);
  const isLand = ["PLOT", "FARM"].includes(data.property_type);

  if (isResidentialOrCommercial && (!data.size_net_sqm || data.size_net_sqm <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: t("PropertyForm.validation.sizeRequired"),
      path: ["size_net_sqm"],
    });
  }

  if (isLand && (!data.plot_size_sqm || data.plot_size_sqm <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: t("PropertyForm.validation.sizeRequired"),
      path: ["plot_size_sqm"],
    });
  }
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
  onContinueToFull?: (propertyId: string) => void;
};

export function QuickAddProperty({ open, onOpenChange, users, onContinueToFull }: Props) {
  const router = useRouter();
  const { toast } = useAppToast();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("mls");
  const tCommon = useTranslations("common");

  const quickAddSchema = createQuickAddSchema(t, tCommon);
  type QuickAddFormValues = z.infer<typeof quickAddSchema>;

  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      property_name: "",
      property_type: undefined,
      property_type_other: "",
      transaction_type: undefined,
      municipality: "",
      area: "",
      postal_code: "",
      size_net_sqm: undefined,
      plot_size_sqm: undefined,
      bedrooms: undefined,
      floor: undefined,
      price: undefined,
      assigned_to: "",
    },
  });

  const propertyType = form.watch("property_type");
  const isResidentialOrCommercial = ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE"].includes(propertyType || "");
  const isResidential = ["APARTMENT", "HOUSE", "MAISONETTE"].includes(propertyType || "");
  const isApartment = propertyType === "APARTMENT";
  const isLand = ["PLOT", "FARM"].includes(propertyType || "");

  const onSubmit = async (data: QuickAddFormValues) => {
    setIsLoading(true);
    try {
      // Use provided name or generate one
      const property_name = data.property_name?.trim() 
        || `${data.property_type || "Property"} - ${data.municipality || ""} ${data.area || ""}`.trim();

      const response = await axios.post("/api/mls/properties", {
        ...data,
        property_name,
        draft_status: false, // Quick add creates final property
      });

      const propertyId = response.data.newProperty.id;

      toast.success(tCommon, { description: tCommon, isTranslationKey: false });

      form.reset();
      onOpenChange(false);
      router.refresh();

      // If callback provided, call it with the new property ID
      if (onContinueToFull) {
        onContinueToFull(propertyId);
      }
    } catch (error: any) {
      console.error("Error creating property:", error);
      const errorMessage = error?.response?.data?.error || error?.response?.data || error?.message || tCommon("somethingWentWrong");
      toast.error(tCommon, { description: typeof, isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>{t("QuickAdd.property.title")}</SheetTitle>
          <SheetDescription>
            {t("QuickAdd.property.description")}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="property_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.propertyName")}</FormLabel>
                  <FormControl>
                    <Input 
                      disabled={isLoading} 
                      placeholder={t("PropertyForm.fields.propertyNamePlaceholder")} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelectWithOther<QuickAddFormValues, "property_type">
                name="property_type"
                otherFieldName="property_type_other"
                label={`${t("PropertyForm.fields.propertyType")} *`}
                placeholder={t("PropertyForm.fields.propertyTypePlaceholder")}
                otherLabel={t("PropertyForm.fields.specifyOther")}
                otherPlaceholder={t("PropertyForm.fields.specifyOtherPlaceholder")}
                disabled={isLoading}
                options={[
                  { value: "APARTMENT", label: t("PropertyForm.propertyType.APARTMENT") },
                  { value: "HOUSE", label: t("PropertyForm.propertyType.HOUSE") },
                  { value: "MAISONETTE", label: t("PropertyForm.propertyType.MAISONETTE") },
                  { value: "COMMERCIAL", label: t("PropertyForm.propertyType.COMMERCIAL") },
                  { value: "WAREHOUSE", label: t("PropertyForm.propertyType.WAREHOUSE") },
                  { value: "PARKING", label: t("PropertyForm.propertyType.PARKING") },
                  { value: "PLOT", label: t("PropertyForm.propertyType.PLOT") },
                  { value: "FARM", label: t("PropertyForm.propertyType.FARM") },
                  { value: "INDUSTRIAL", label: t("PropertyForm.propertyType.INDUSTRIAL") },
                  { value: "OTHER", label: t("PropertyForm.propertyType.OTHER") },
                ]}
              />
              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.transactionType")} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("PropertyForm.fields.transactionTypePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SALE">{t("PropertyForm.transactionType.SALE")}</SelectItem>
                        <SelectItem value="RENTAL">{t("PropertyForm.transactionType.RENTAL")}</SelectItem>
                        <SelectItem value="SHORT_TERM">{t("PropertyForm.transactionType.SHORT_TERM")}</SelectItem>
                        <SelectItem value="EXCHANGE">{t("PropertyForm.transactionType.EXCHANGE")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.municipality")} *</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("PropertyForm.fields.municipalityPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.area")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("PropertyForm.fields.areaPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.postalCode")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("PropertyForm.fields.postalCodePlaceholder")} maxLength={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isResidentialOrCommercial && (
              <FormField
                control={form.control}
                name="size_net_sqm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.sizeNetSqm")} *</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="0" {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isResidential && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("PropertyForm.fields.bedrooms")}</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} type="number" placeholder="0" {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isApartment && (
                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("PropertyForm.fields.floor")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("PropertyForm.fields.floorPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BASEMENT">{t("PropertyForm.floor.BASEMENT")}</SelectItem>
                            <SelectItem value="GROUND">{t("PropertyForm.floor.GROUND")}</SelectItem>
                            <SelectItem value="1ST">{t("PropertyForm.floor.1ST")}</SelectItem>
                            <SelectItem value="2ND">{t("PropertyForm.floor.2ND")}</SelectItem>
                            <SelectItem value="3RD">{t("PropertyForm.floor.3RD")}</SelectItem>
                            <SelectItem value="4TH">{t("PropertyForm.floor.4TH")}</SelectItem>
                            <SelectItem value="5TH">{t("PropertyForm.floor.5TH")}</SelectItem>
                            <SelectItem value="6TH">{t("PropertyForm.floor.6TH")}</SelectItem>
                            <SelectItem value="7TH">{t("PropertyForm.floor.7TH")}</SelectItem>
                            <SelectItem value="8TH">{t("PropertyForm.floor.8TH")}</SelectItem>
                            <SelectItem value="9TH">{t("PropertyForm.floor.9TH")}</SelectItem>
                            <SelectItem value="10TH">{t("PropertyForm.floor.10TH")}</SelectItem>
                            <SelectItem value="PENTHOUSE">{t("PropertyForm.floor.PENTHOUSE")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {isLand && (
              <FormField
                control={form.control}
                name="plot_size_sqm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.plotSizeSqm")} *</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="0" {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.price")} (€) *</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} type="number" placeholder="0" {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.agentOwner")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={tCommon("selectAgent")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="overflow-y-auto h-56">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? tCommon("creating") : t("PropertyForm.buttons.quickAdd")}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

