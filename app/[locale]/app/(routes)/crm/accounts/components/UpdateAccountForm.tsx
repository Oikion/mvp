"use client";

import React from "react";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";

import { useAppToast } from "@/hooks/use-app-toast";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { AddressFieldGroup } from "@/components/form/AddressFieldGroup";
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import SuspenseLoading from "@/components/loadings/suspense";

// Form data type that matches both initial data and form values
export interface AccountFormData {
  id: string;
  v?: number;
  name: string;
  office_phone?: string | null;
  website?: string;
  fax?: string;
  company_id?: string;
  vat?: string;
  email?: string;
  billing_street?: string;
  billing_postal_code?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  billing_municipality?: string;
  billing_area?: string;
  shipping_street?: string;
  shipping_postal_code?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_country?: string;
  description?: string | null;
  assigned_to?: string;
  status?: string | null;
  annual_revenue?: string | null;
  member_of?: string | null;
  industry?: string;
}

interface UpdateAccountFormProps {
  initialData: AccountFormData;
  open: (value: boolean) => void;
}

export function UpdateAccountForm({
  initialData,
  open,
}: UpdateAccountFormProps) {
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("crm");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const { data: users, isLoading: isLoadingUsers } = useSWR<{ id: string; name: string | null }[]>(
    "/api/user",
    fetcher
  );

  const formSchema = z.object({
    id: z.string().min(5).max(30),
    name: z.string().min(3).max(80),
    office_phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    fax: z.string().nullable().optional(),
    company_id: z.string().min(5).max(10),
    vat: z.string().min(5).max(20).nullable().optional(),
    email: z.string().email(),
    billing_street: z.string().min(3).max(50),
    billing_postal_code: z.string().min(2).max(10),
    billing_city: z.string().min(3).max(50),
    billing_state: z.string().min(3).max(50).nullable().optional(),
    billing_country: z.string().min(2).max(50).default("GR"),
    billing_municipality: z.string().min(3).max(50).nullable().optional(),
    billing_area: z.string().min(3).max(50).nullable().optional(),
    shipping_street: z.string().nullable().optional(),
    shipping_postal_code: z.string().nullable().optional(),
    shipping_city: z.string().nullable().optional(),
    shipping_state: z.string().nullable().optional(),
    shipping_country: z.string().nullable().optional(),
    description: z.string().min(3).max(250).nullable().optional(),
    assigned_to: z.string().min(3).max(50),
    status: z.string().min(3).max(50).nullable().optional(),
    annual_revenue: z.string().min(3).max(50).nullable().optional(),
    member_of: z.string().min(3).max(50).nullable().optional(),
    industry: z.string().min(3).max(50),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  const form = useForm<NewAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          id: initialData.id,
          name: initialData.name ?? "",
          office_phone: initialData.office_phone ?? null,
          website: initialData.website ?? "",
          fax: initialData.fax ?? "",
          company_id: initialData.company_id ?? "",
          vat: initialData.vat ?? "",
          email: initialData.email ?? "",
          billing_street: initialData.billing_street ?? "",
          billing_postal_code: initialData.billing_postal_code ?? "",
          billing_city: initialData.billing_city ?? "",
          billing_state: initialData.billing_state ?? "",
          billing_country: initialData.billing_country ?? "GR",
          billing_municipality: initialData.billing_municipality ?? "",
          billing_area: initialData.billing_area ?? "",
          shipping_street: initialData.shipping_street ?? "",
          shipping_postal_code: initialData.shipping_postal_code ?? "",
          shipping_city: initialData.shipping_city ?? "",
          shipping_state: initialData.shipping_state ?? "",
          shipping_country: initialData.shipping_country ?? "",
          description: initialData.description ?? "",
          assigned_to: initialData.assigned_to ?? "",
          status: initialData.status ?? "",
          annual_revenue: initialData.annual_revenue ?? "",
          member_of: initialData.member_of ?? "",
          industry: initialData.industry ?? "",
        }
      : {
          id: "",
          name: "",
          office_phone: "" as string | null,
          website: "",
          fax: "",
          company_id: "",
          vat: "",
          email: "",
          billing_street: "",
          billing_postal_code: "",
          billing_city: "",
          billing_state: "",
          billing_country: "GR",
          billing_municipality: "",
          billing_area: "",
          shipping_street: "",
          shipping_postal_code: "",
          shipping_city: "",
          shipping_state: "",
          shipping_country: "",
          description: "",
          assigned_to: "",
          status: "",
          annual_revenue: "",
          member_of: "",
          industry: "",
        },
  });

  const onSubmit = async (data: NewAccountFormValues) => {
    setIsLoading(true);
    try {
      const clientStatusMap: Record<string, string> = {
        LEAD: "LEAD", ACTIVE: "ACTIVE", INACTIVE: "INACTIVE",
        CONVERTED: "COMPLETED", LOST: "INACTIVE",
      };
      const billingFields = [data.billing_street, data.billing_city, data.billing_postal_code].some(Boolean);
      const shippingFields = [data.shipping_street, data.shipping_city, data.shipping_postal_code].some(Boolean);
      const addresses = [
        ...(billingFields ? [{ type: "billing" as const, street: data.billing_street || undefined, city: data.billing_city || data.billing_municipality || undefined, postalCode: data.billing_postal_code || undefined, municipality: data.billing_municipality || undefined, country: data.billing_country || "GR" }] : []),
        ...(shippingFields ? [{ type: "shipping" as const, street: data.shipping_street || undefined, city: data.shipping_city || undefined, postalCode: data.shipping_postal_code || undefined, country: data.shipping_country || "GR" }] : []),
      ];
      const rawStatus = data.status?.toUpperCase();
      await axios.put(`/api/crm/contacts/${data.id}`, {
        displayName: data.name,
        email: data.email || undefined,
        officePhone: data.office_phone || undefined,
        companyId: data.company_id || undefined,
        taxId: data.vat || undefined,
        ...(addresses.length > 0 && { addresses }),
        notes: data.description || undefined,
        assignedAgentId: data.assigned_to || undefined,
        ...(rawStatus && { status: clientStatusMap[rawStatus] ?? rawStatus }),
      });
      toast.success(t("accounts.updateForm.toast.updateSuccess"), { description: t("accounts.updateForm.toast.updateSuccessDesc"), isTranslationKey: false });
    } catch (error: any) {
      toast.error(t("accounts.updateForm.toast.updateError"), { description: error?.response?.data, isTranslationKey: false });
    } finally {
      setIsLoading(false);
      open(false);
      router.refresh();
    }
  };

  if (isLoadingUsers)
    return (
      <div>
        <SuspenseLoading />
      </div>
    );
  if (!users || !initialData) return <div>{t("accounts.updateForm.noData")}</div>;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full h-full px-10 bg-background"
      >
        {/*    <div>
          <pre>
            <code>{JSON.stringify(form.formState.errors, null, 2)}</code>
          </pre>
        </div> */}
        {/*       <pre>
          <code>{JSON.stringify(initialData, null, 2)}</code>
        </pre> */}

        <div className="w-full max-w-[800px] text-sm text-foreground">
          <div className="pb-5 space-y-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.updateForm.labels.clientName")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("CrmForm.fields.companyNamePlaceholder")}
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
              name="office_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.updateForm.labels.officePhone")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("accounts.updateForm.placeholders.officePhone")}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.updateForm.labels.email")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("accounts.updateForm.placeholders.email")}
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
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.updateForm.labels.website")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("accounts.updateForm.placeholders.website")}
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
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.updateForm.labels.accountId")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("accounts.updateForm.placeholders.accountId")}
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
              name="vat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accounts.updateForm.labels.accountVat")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={t("accounts.updateForm.placeholders.accountVat")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex gap-5 pb-5">
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name="billing_street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.billingStreet")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder={t("accounts.updateForm.placeholders.streetAddress")}
                        {...field}
                      value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <AddressFieldGroup
                control={form.control}
                countryFieldName="billing_country"
                municipalityFieldName="billing_municipality"
                areaFieldName="billing_area"
                postalCodeFieldName="billing_postal_code"
                defaultCountry="GR"
                disabled={isLoading}
              />
            </div>
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name="shipping_street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.shippingStreet")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder={t("accounts.updateForm.placeholders.streetAddress")}
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
                name="shipping_postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.shippingPostalCode")}</FormLabel>
                    <FormControl>
                      <Input
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
                name="shipping_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.shippingCity")}</FormLabel>
                    <FormControl>
                      <Input
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
                name="shipping_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.shippingState")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.shippingCountry")}</FormLabel>
                    <FormControl>
                      <Input
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
          </div>
          <div className="flex gap-5 pb-5">
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={isLoading}
                        placeholder={t("accounts.updateForm.placeholders.description")}
                        {...field}
                      value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name="annual_revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.annualRevenue")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder={t("accounts.updateForm.placeholders.annualRevenue")}
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
                name="member_of"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.memberOf")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder={t("accounts.updateForm.placeholders.memberOf")}
                        {...field}
                      value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* industry removed */}
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounts.updateForm.labels.assignedTo")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("accounts.updateForm.placeholders.assignUser")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="overflow-y-auto h-56">
                        {users?.map((user) => (
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
            </div>
          </div>
        </div>
        <div className="grid gap-2 py-5">
          <Button disabled={isLoading} type="submit">
            {t("accounts.updateForm.buttons.update")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
