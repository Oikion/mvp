"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
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
  property_type: z.enum(["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE", "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"], {
    required_error: t("PropertyForm.validation.propertyTypeRequired"),
  }),
  transaction_type: z.enum(["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"], {
    required_error: t("PropertyForm.validation.transactionTypeRequired"),
  }),
  municipality: z.string().min(1, t("PropertyForm.validation.municipalityRequired")),
  area: z.string().optional(),
  postal_code: z.string().optional(),
  size_net_sqm: z.coerce.number().optional(),
  plot_size_sqm: z.coerce.number().optional(),
  price: z.coerce.number().min(0, t("PropertyForm.validation.priceRequired")),
  assigned_to: z.string().min(1, tCommon("selectAgent")),
}).refine(
  (data) => {
    return !!(data.area && data.area.length) || !!(data.postal_code && data.postal_code.length);
  },
  {
    path: ["area"],
    message: t("PropertyForm.validation.areaOrPostalCodeRequired"),
  }
).refine(
  (data) => {
    const isResidentialOrCommercial = ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE"].includes(data.property_type);
    const isLand = ["PLOT", "FARM"].includes(data.property_type);
    
    if (isResidentialOrCommercial) {
      return !!(data.size_net_sqm && data.size_net_sqm > 0);
    }
    if (isLand) {
      return !!(data.plot_size_sqm && data.plot_size_sqm > 0);
    }
    return true;
  },
  {
    path: ["size_net_sqm"],
    message: t("PropertyForm.validation.sizeRequired"),
  }
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
  onContinueToFull?: (propertyId: string) => void;
};

export function QuickAddProperty({ open, onOpenChange, users, onContinueToFull }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("mls");
  const tCommon = useTranslations("common");
  
  const quickAddSchema = createQuickAddSchema(t, tCommon);
  type QuickAddFormValues = z.infer<typeof quickAddSchema>;

  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      property_type: undefined,
      transaction_type: undefined,
      municipality: "",
      area: "",
      postal_code: "",
      size_net_sqm: undefined,
      plot_size_sqm: undefined,
      price: undefined,
      assigned_to: "",
    },
  });

  const propertyType = form.watch("property_type");
  const isResidentialOrCommercial = ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE"].includes(propertyType || "");
  const isLand = ["PLOT", "FARM"].includes(propertyType || "");

  const onSubmit = async (data: QuickAddFormValues) => {
    setIsLoading(true);
    try {
      const property_name = `${data.property_type || "Property"} - ${data.municipality || ""} ${data.area || ""}`.trim();

      const response = await axios.post("/api/mls/properties", {
        ...data,
        property_name,
        draft_status: false, // Quick add creates final property
      });

      const propertyId = response.data.newProperty.id;

      toast({
        variant: "success",
        title: tCommon("success"),
        description: tCommon("propertyCreated"),
      });

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
      toast({
        variant: "destructive",
        title: tCommon("error"),
        description: typeof errorMessage === 'string' ? errorMessage : tCommon("propertyCreationFailed"),
      });
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.propertyType")} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("PropertyForm.fields.propertyTypePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="APARTMENT">{t("PropertyForm.propertyType.APARTMENT")}</SelectItem>
                        <SelectItem value="HOUSE">{t("PropertyForm.propertyType.HOUSE")}</SelectItem>
                        <SelectItem value="MAISONETTE">{t("PropertyForm.propertyType.MAISONETTE")}</SelectItem>
                        <SelectItem value="COMMERCIAL">{t("PropertyForm.propertyType.COMMERCIAL")}</SelectItem>
                        <SelectItem value="WAREHOUSE">{t("PropertyForm.propertyType.WAREHOUSE")}</SelectItem>
                        <SelectItem value="PARKING">{t("PropertyForm.propertyType.PARKING")}</SelectItem>
                        <SelectItem value="PLOT">{t("PropertyForm.propertyType.PLOT")}</SelectItem>
                        <SelectItem value="FARM">{t("PropertyForm.propertyType.FARM")}</SelectItem>
                        <SelectItem value="INDUSTRIAL">{t("PropertyForm.propertyType.INDUSTRIAL")}</SelectItem>
                        <SelectItem value="OTHER">{t("PropertyForm.propertyType.OTHER")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
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

