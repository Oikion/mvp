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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  contactEditFormSchema,
  type ContactEditFormValues,
} from "@/lib/validations/contacts";
import { updateContact } from "@/actions/contacts/update-contact";

const CONTACT_STATUS_OPTIONS = [
  "LEAD",
  "CONTACTED",
  "QUALIFIED",
  "ACTIVE",
  "UNDER_CONTRACT",
  "COMPLETED",
  "ON_HOLD",
  "INACTIVE",
] as const;

const CONTACT_SOURCE_OPTIONS = [
  "PORTAL_LEAD",
  "REFERRAL",
  "WALK_IN",
  "COLD_CALL",
  "SOCIAL_MEDIA",
  "WEB",
  "OTHER",
] as const;

const CONTACT_CATEGORY_OPTIONS = [
  "OWNER",
  "BUYER",
  "TENANT",
  "SELLER",
  "INVESTOR",
  "BROKER",
  "COLLEAGUE",
  "NOTARY",
  "LAWYER",
  "ACCOUNTANT",
  "OTHER",
] as const;

interface EditContactFormProps {
  contact: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    isCompany?: boolean | null;
    companyName?: string | null;
    category?: string[];
    status?: string | null;
    source?: string | null;
    email?: string | null;
    secondaryEmail?: string | null;
    primaryPhone?: string | null;
    secondaryPhone?: string | null;
    officePhone?: string | null;
    whatsapp?: string | null;
    viber?: string | null;
    taxId?: string | null;
    doy?: string | null;
    vatNumber?: string | null;
    companyGemi?: string | null;
    idDocument?: string | null;
    assignedAgentId?: string | null;
    tags?: string[];
    leadScore?: number | null;
    doNotContact?: boolean | null;
    gdprConsentGiven?: boolean | null;
    allowMarketing?: boolean | null;
    notes?: string | null;
  };
  onSuccess?: () => void;
}

export function EditContactForm({ contact, onSuccess }: EditContactFormProps) {
  const t = useTranslations("crm");
  const router = useRouter();
  const { toast } = useAppToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactEditFormValues>({
    resolver: zodResolver(contactEditFormSchema),
    defaultValues: {
      id: contact.id,
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      displayName: contact.displayName ?? "",
      isCompany: contact.isCompany ?? false,
      companyName: contact.companyName ?? "",
      category: (contact.category as ContactEditFormValues["category"]) ?? [],
      status: (contact.status as ContactEditFormValues["status"]) ?? "LEAD",
      source: (contact.source as ContactEditFormValues["source"]) ?? null,
      email: contact.email ?? "",
      secondaryEmail: contact.secondaryEmail ?? "",
      primaryPhone: contact.primaryPhone ?? "",
      secondaryPhone: contact.secondaryPhone ?? "",
      officePhone: contact.officePhone ?? "",
      whatsapp: contact.whatsapp ?? "",
      viber: contact.viber ?? "",
      taxId: contact.taxId ?? "",
      doy: contact.doy ?? "",
      vatNumber: contact.vatNumber ?? "",
      companyGemi: contact.companyGemi ?? "",
      idDocument: contact.idDocument ?? "",
      assignedAgentId: contact.assignedAgentId ?? null,
      tags: contact.tags ?? [],
      leadScore: contact.leadScore ?? null,
      doNotContact: contact.doNotContact ?? false,
      gdprConsentGiven: contact.gdprConsentGiven ?? false,
      allowMarketing: contact.allowMarketing ?? false,
      notes: contact.notes ?? "",
    },
  });

  const isCompany = form.watch("isCompany");

  const onSubmit = async (values: ContactEditFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateContact(values);
      if (!result.success) {
        toast.error(result.error ?? "Update failed", { isTranslationKey: false });
        return;
      }
      toast.success("updateSuccess");
      router.refresh();
      onSuccess?.();
    } catch (err) {
      console.error("[CONTACT_EDIT]", err);
      toast.error("updateFailed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 py-4 border-b">
        <SheetTitle>{t("contacts.edit.title")}</SheetTitle>
      </SheetHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <Tabs defaultValue="basic" className="flex flex-1 overflow-hidden">
            {/* Vertical sidebar nav */}
            <TabsList className="flex flex-col h-full w-40 shrink-0 rounded-none border-r bg-muted/30 justify-start p-2 gap-1">
              <TabsTrigger value="basic" className="w-full justify-start text-sm">
                {t("contacts.edit.tabs.basic")}
              </TabsTrigger>
              <TabsTrigger value="contact" className="w-full justify-start text-sm">
                {t("contacts.edit.tabs.contact")}
              </TabsTrigger>
              <TabsTrigger value="business" className="w-full justify-start text-sm">
                {t("contacts.edit.tabs.business")}
              </TabsTrigger>
              <TabsTrigger value="crm" className="w-full justify-start text-sm">
                {t("contacts.edit.tabs.crm")}
              </TabsTrigger>
              <TabsTrigger value="privacy" className="w-full justify-start text-sm">
                {t("contacts.edit.tabs.privacy")}
              </TabsTrigger>
            </TabsList>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* ── Basic Info ── */}
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.firstName")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.lastName")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.edit.fields.displayName")} *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isCompany"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer font-normal">
                        {t("contacts.wizard.fields.isCompany")}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {isCompany && (
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.companyName")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.edit.fields.status")}</FormLabel>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTACT_STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {t(`contacts.status.${s}` as Parameters<typeof t>[0])}
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
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.source")}</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => field.onChange(v || null)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("contacts.wizard.fields.sourcePlaceholder")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTACT_SOURCE_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {t(`contacts.source.${s}` as Parameters<typeof t>[0])}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Category checkboxes */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.wizard.fields.category")} *</FormLabel>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                        {CONTACT_CATEGORY_OPTIONS.map((cat) => (
                          <div key={cat} className="flex items-center gap-1.5">
                            <Checkbox
                              id={`cat-${cat}`}
                              checked={(field.value ?? []).includes(cat)}
                              onCheckedChange={(checked) => {
                                const current = field.value ?? [];
                                field.onChange(
                                  checked
                                    ? [...current, cat]
                                    : current.filter((c) => c !== cat)
                                );
                              }}
                            />
                            <label
                              htmlFor={`cat-${cat}`}
                              className="text-sm cursor-pointer"
                            >
                              {t(`contacts.category.${cat}` as Parameters<typeof t>[0])}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ── Contact Info ── */}
              <TabsContent value="contact" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.primaryEmail")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
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
                    name="secondaryEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.secondaryEmail")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
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
                    name="primaryPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.primaryPhone")}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
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
                    name="secondaryPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.secondaryPhone")}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
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
                    name="officePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.officePhone")}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
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
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.whatsapp")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="viber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.viber")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* ── Business / Greek fields ── */}
              <TabsContent value="business" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.taxId")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder={t("contacts.wizard.fields.taxIdPlaceholder")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="doy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.doy")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="idDocument"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.idDocument")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {isCompany && (
                    <>
                      <FormField
                        control={form.control}
                        name="vatNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contacts.wizard.fields.vatNumber")}</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="companyGemi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contacts.wizard.fields.companyGemi")}</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </TabsContent>

              {/* ── CRM / Notes ── */}
              <TabsContent value="crm" className="mt-0 space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contacts.wizard.fields.notes")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={6}
                          className="resize-none"
                          placeholder={t("contacts.wizard.fields.notesPlaceholder")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ── Privacy / GDPR ── */}
              <TabsContent value="privacy" className="mt-0 space-y-4">
                {(
                  [
                    ["doNotContact", "contacts.wizard.fields.doNotContact"],
                    ["gdprConsentGiven", "contacts.wizard.fields.gdprConsent"],
                    ["allowMarketing", "contacts.wizard.fields.allowMarketing"],
                  ] as const
                ).map(([name, key]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer font-normal leading-snug">
                          {t(key as Parameters<typeof t>[0])}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </TabsContent>
            </div>
          </Tabs>

          {/* Sticky footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("contacts.edit.saving")
                : t("contacts.edit.save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
