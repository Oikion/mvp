// @ts-nocheck
"use client";

import { z } from "zod";
import axios from "axios";
import { contactFormSchema, type ContactFormValues } from "@/lib/validations/contacts";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
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
  FormDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { ConditionalFormSection } from "@/components/form/conditional-section";

// Greek DOY (Tax Office) options
const DOY_OPTIONS = [
  "Α' ΑΘΗΝΩΝ", "Β' ΑΘΗΝΩΝ", "Γ' ΑΘΗΝΩΝ", "Δ' ΑΘΗΝΩΝ",
  "Α' ΠΕΙΡΑΙΩΣ", "Β' ΠΕΙΡΑΙΩΣ", "ΘΕΣΣΑΛΟΝΙΚΗΣ Α'", "ΘΕΣΣΑΛΟΝΙΚΗΣ Β'",
  "ΠΑΤΡΩΝ", "ΗΡΑΚΛΕΙΟΥ", "ΛΑΡΙΣΑΣ", "ΒΟΛΟΥ", "ΚΑΛΑΜΑΤΑΣ", "ΚΑΒΑΛΑΣ",
  "ΧΑΝΙΩΝ", "ΡΕΘΥΜΝΟΥ", "ΚΕΡΚΥΡΑΣ", "ΡΟΔΟΥ", "ΜΥΤΙΛΗΝΗΣ", "ΚΟΜΟΤΗΝΗΣ",
];

const CATEGORIES = [
  "OWNER", "BUYER", "TENANT", "SELLER", "INVESTOR",
  "BROKER", "COLLEAGUE", "NOTARY", "LAWYER", "ACCOUNTANT", "OTHER",
] as const;

const SOURCES = [
  "PORTAL_LEAD", "REFERRAL", "WALK_IN", "COLD_CALL", "SOCIAL_MEDIA", "WEB", "OTHER",
] as const;

type Props = {
  users: any[];
  onFinish: () => void;
};

// Extend the base form with flat address sub-fields so they are controlled via react-hook-form.
// These are composed into the addresses JSON on submit — not sent to the API directly.
type FormValues = ContactFormValues & {
  billingStreet: string;
  billingCity: string;
  billingPostalCode: string;
  billingMunicipality: string;
  billingCountry: string;
  shippingStreet: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingMunicipality: string;
  shippingCountry: string;
};

// Per-step field groups for validation
const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  1: ["isCompany", "firstName", "lastName", "companyName", "displayName", "category"],
  2: ["primaryPhone", "secondaryPhone", "officePhone", "email", "secondaryEmail", "whatsapp", "viber", "languagePreference"],
  3: ["taxId", "doy", "vatNumber", "companyGemi", "companyId", "idDocument"],
  4: ["billingStreet", "billingCity", "billingPostalCode"],
  5: ["source", "assignedAgentId", "gdprConsentGiven", "allowMarketing", "doNotContact", "visibility", "notes", "tags"],
};

export function NewContactWizard({ users, onFinish }: Readonly<Props>) {
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("crm");
  const tCommon = useTranslations("common");

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showShippingAddress, setShowShippingAddress] = useState(false);
  const hasSubmittedRef = useRef(false);

  // Wizard form schema with translated validation
  const formSchema = useMemo(
    () =>
      contactFormSchema.superRefine((data, ctx) => {
        if (data.isCompany) {
          if (!data.companyName?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["companyName"],
              message: t("contacts.wizard.validation.companyNameRequired"),
            });
          }
        } else {
          // Individual: need at least lastName or firstName
          if (!data.firstName?.trim() && !data.lastName?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["lastName"],
              message: t("contacts.wizard.validation.nameRequired"),
            });
          }
        }
        const cats = data.category ?? [];
        if (cats.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["category"],
            message: t("contacts.wizard.validation.categoryRequired"),
          });
        }
        if (data.taxId && data.taxId.length > 0 && !/^\d{9}$/.test(data.taxId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["taxId"],
            message: t("contacts.wizard.validation.taxIdInvalid"),
          });
        }
      }),
    [t]
  );

  const STEPS = useMemo(
    () => [
      { id: 1, title: t("contacts.wizard.steps.identity"), description: t("contacts.wizard.stepDescriptions.identity") },
      { id: 2, title: t("contacts.wizard.steps.contact"), description: t("contacts.wizard.stepDescriptions.contact") },
      { id: 3, title: t("contacts.wizard.steps.business"), description: t("contacts.wizard.stepDescriptions.business") },
      { id: 4, title: t("contacts.wizard.steps.address"), description: t("contacts.wizard.stepDescriptions.address") },
      { id: 5, title: t("contacts.wizard.steps.preferences"), description: t("contacts.wizard.stepDescriptions.preferences") },
    ],
    [t]
  );

  const CATEGORY_OPTIONS: MultiSelectOption[] = useMemo(
    () => CATEGORIES.map((cat) => ({ value: cat, label: t(`contacts.category.${cat}`) })),
    [t]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isCompany: false,
      firstName: "",
      lastName: "",
      displayName: "",
      companyName: "",
      category: [],
      status: "LEAD",
      source: undefined,
      visibility: "PRIVATE",
      email: "",
      secondaryEmail: "",
      primaryPhone: "",
      secondaryPhone: "",
      officePhone: "",
      whatsapp: "",
      viber: "",
      languagePreference: "el",
      taxId: "",
      doy: "",
      vatNumber: "",
      companyGemi: "",
      companyId: "",
      idDocument: "",
      addresses: null,
      billingStreet: "",
      billingCity: "",
      billingPostalCode: "",
      billingMunicipality: "",
      billingCountry: "Ελλάδα",
      shippingStreet: "",
      shippingCity: "",
      shippingPostalCode: "",
      shippingMunicipality: "",
      shippingCountry: "",
      assignedAgentId: "",
      gdprConsentGiven: false,
      allowMarketing: false,
      doNotContact: false,
      notes: "",
      tags: [],
      referredById: "",
    },
  });

  // Auto-derive displayName from name fields
  const watchedIsCompany = form.watch("isCompany");
  const watchedFirstName = form.watch("firstName");
  const watchedLastName = form.watch("lastName");
  const watchedCompanyName = form.watch("companyName");

  useEffect(() => {
    let derived: string;
    if (watchedIsCompany) {
      derived = watchedCompanyName || "";
    } else {
      derived = [watchedFirstName, watchedLastName].filter(Boolean).join(" ");
    }
    form.setValue("displayName", derived, { shouldValidate: false, shouldDirty: false });
  }, [watchedIsCompany, watchedFirstName, watchedLastName, watchedCompanyName, form]);

  // ── Step validation ──
  const validateStep = useCallback(
    async (step: number): Promise<boolean> => {
      const fields = STEP_FIELDS[step] || [];
      return form.trigger(fields as any);
    },
    [form]
  );

  const handleNext = useCallback(async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  }, [currentStep, validateStep, STEPS.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  const handleStepClick = useCallback(
    async (stepId: number) => {
      if (stepId < currentStep) {
        setCurrentStep(stepId);
        return;
      }
      const isValid = await validateStep(currentStep);
      if (isValid) setCurrentStep(stepId);
    },
    [currentStep, validateStep]
  );

  // ── Submit ──
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      // Compose flat address fields into JSON array
      const addresses: { type: string; street?: string; city?: string; postalCode?: string; municipality?: string; country?: string }[] = [];
      if (data.billingStreet || data.billingCity || data.billingPostalCode) {
        addresses.push({
          type: "billing",
          street: data.billingStreet || undefined,
          city: data.billingCity || undefined,
          postalCode: data.billingPostalCode || undefined,
          municipality: data.billingMunicipality || undefined,
          country: data.billingCountry || undefined,
        });
      }
      if (showShippingAddress && (data.shippingStreet || data.shippingCity || data.shippingPostalCode)) {
        addresses.push({
          type: "shipping",
          street: data.shippingStreet || undefined,
          city: data.shippingCity || undefined,
          postalCode: data.shippingPostalCode || undefined,
          municipality: data.shippingMunicipality || undefined,
          country: data.shippingCountry || undefined,
        });
      }

      // Clean empty strings → undefined (skip flat address fields — already composed)
      const addressFieldKeys = new Set([
        "billingStreet", "billingCity", "billingPostalCode", "billingMunicipality", "billingCountry",
        "shippingStreet", "shippingCity", "shippingPostalCode", "shippingMunicipality", "shippingCountry",
      ]);
      const cleaned = Object.fromEntries(
        Object.entries(data)
          .filter(([k]) => !addressFieldKeys.has(k))
          .map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? undefined : v])
      );

      const submitData = {
        ...cleaned,
        displayName: cleaned.displayName || cleaned.companyName || [cleaned.firstName, cleaned.lastName].filter(Boolean).join(" ") || "Unknown",
        category: data.category?.length ? data.category : ["OTHER"],
        addresses: addresses.length > 0 ? addresses : undefined,
        status: "LEAD",
      };

      await axios.post("/api/crm/contacts", submitData);

      hasSubmittedRef.current = true;
      toast.success(t("contacts.wizard.success"), { isTranslationKey: false });
      mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/crm/contacts"), undefined, { revalidate: true });
      router.refresh();
      onFinish();
    } catch (error) {
      console.error("[NEW_CONTACT_WIZARD]", error);
      toast.error(t("contacts.wizard.error"), { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step rendering ──
  const renderStepContent = () => {
    const isCompany = watchedIsCompany; // Use top-level watched value, not duplicate subscription

    switch (currentStep) {
      // ════════════════════════════════════════════════
      // STEP 1: Identity
      // ════════════════════════════════════════════════
      case 1:
        return (
          <div className="space-y-4">
            {/* Company toggle */}
            <FormField
              control={form.control}
              name="isCompany"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t("contacts.wizard.fields.isCompany")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Individual name fields */}
            <ConditionalFormSection condition={!isCompany}>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        {t("contacts.wizard.fields.firstName")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.firstNamePlaceholder")} autoComplete="given-name" />
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
                      <FormLabel required>
                        {t("contacts.wizard.fields.lastName")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.lastNamePlaceholder")} autoComplete="family-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ConditionalFormSection>

            {/* Company name field */}
            <ConditionalFormSection condition={!!isCompany}>
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      {t("contacts.wizard.fields.companyName")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.companyNamePlaceholder")} autoComplete="organization" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ConditionalFormSection>

            {/* Categories (multi-select) */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    {t("contacts.wizard.fields.category")}
                  </FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={CATEGORY_OPTIONS}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder={t("contacts.wizard.fields.categoryPlaceholder")}
                    />
                  </FormControl>
                  <FormDescription>{t("contacts.wizard.fields.categoryHelp")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      // ════════════════════════════════════════════════
      // STEP 2: Contact Details
      // ════════════════════════════════════════════════
      case 2:
        return (
          <div className="space-y-4">
            {/* Phone row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primaryPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.wizard.fields.primaryPhone")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} type="tel" placeholder={t("contacts.wizard.fields.primaryPhonePlaceholder")} autoComplete="tel" />
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
                      <Input {...field} value={field.value ?? ""} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Office phone — prominently shown for companies */}
            <ConditionalFormSection condition={!!isCompany}>
              <FormField
                control={form.control}
                name="officePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.wizard.fields.officePhone")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ConditionalFormSection>

            {/* Email row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.wizard.fields.primaryEmail")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} type="email" placeholder={t("contacts.wizard.fields.primaryEmailPlaceholder")} autoComplete="email" />
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
                      <Input {...field} value={field.value ?? ""} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Messaging apps */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.wizard.fields.whatsapp")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.whatsappPlaceholder")} />
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
                      <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.viberPlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Language */}
            <FormField
              control={form.control}
              name="languagePreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.wizard.fields.language")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="el">Ελληνικά</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      // ════════════════════════════════════════════════
      // STEP 3: Business & Legal
      // ════════════════════════════════════════════════
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contacts.wizard.fields.taxId")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.taxIdPlaceholder")} maxLength={9} />
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
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t("contacts.wizard.fields.doyPlaceholder")} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DOY_OPTIONS.map((doy) => (
                          <SelectItem key={doy} value={doy}>{doy}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* Company-only fields */}
            <ConditionalFormSection condition={!!isCompany}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyGemi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.companyGemi")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.companyGemiPlaceholder")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contacts.wizard.fields.companyId")}</FormLabel>
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
              </div>
            </ConditionalFormSection>
          </div>
        );

      // ════════════════════════════════════════════════
      // STEP 4: Address (controlled via flat FormFields)
      // ════════════════════════════════════════════════
      case 4:
        return (
          <div className="space-y-6">
            {/* Billing address */}
            <fieldset>
              <legend className="text-sm font-medium mb-3">{t("contacts.view.billingAddress")}</legend>
              <div className="space-y-3">
                <FormField control={form.control} name="billingStreet" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.billingStreet")} autoComplete="street-address" />
                    </FormControl>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="billingCity" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.billingCity")} autoComplete="address-level2" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="billingPostalCode" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.billingPostalCode")} autoComplete="postal-code" maxLength={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="billingMunicipality" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.billingMunicipality")} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="billingCountry" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.billingCountry")} autoComplete="country-name" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>
            </fieldset>

            {/* Shipping address toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-shipping"
                checked={showShippingAddress}
                onCheckedChange={(checked) => setShowShippingAddress(!!checked)}
              />
              <label htmlFor="show-shipping" className="text-sm cursor-pointer">
                {t("contacts.wizard.fields.addShippingAddress")}
              </label>
            </div>

            <ConditionalFormSection condition={showShippingAddress}>
              <fieldset>
                <legend className="text-sm font-medium mb-3">{t("contacts.view.shippingAddress")}</legend>
                <div className="space-y-3">
                  <FormField control={form.control} name="shippingStreet" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.shippingStreet")} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="shippingCity" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.shippingCity")} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="shippingPostalCode" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.shippingPostalCode")} maxLength={5} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
              </fieldset>
            </ConditionalFormSection>
          </div>
        );

      // ════════════════════════════════════════════════
      // STEP 5: Preferences & GDPR
      // ════════════════════════════════════════════════
      case 5:
        return (
          <div className="space-y-4">
            {/* Source */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.wizard.fields.source")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("contacts.wizard.fields.sourcePlaceholder")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SOURCES.map((src) => (
                        <SelectItem key={src} value={src}>{t(`contacts.source.${src}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Agent assignment */}
            <FormField
              control={form.control}
              name="assignedAgentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.wizard.fields.assignedAgent")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("contacts.wizard.fields.assignedAgentPlaceholder")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.name || user.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GDPR & Marketing */}
            <div className="space-y-3 rounded-lg border p-4">
              <FormField
                control={form.control}
                name="gdprConsentGiven"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">{t("contacts.wizard.fields.gdprConsent")}</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowMarketing"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">{t("contacts.wizard.fields.allowMarketing")}</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="doNotContact"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0 text-destructive">{t("contacts.wizard.fields.doNotContact")}</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.wizard.fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} placeholder={t("contacts.wizard.fields.notesPlaceholder")} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-10">
        <div className="w-full max-w-[800px] text-sm pb-10">
          <div className="pb-3">
            <ProgressBar
              steps={STEPS}
              currentStep={currentStep}
              onStepClick={handleStepClick}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-end gap-2 pb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
            >
              {t("contacts.wizard.buttons.previous")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" size="sm" onClick={handleNext} disabled={isLoading}>
                {t("contacts.wizard.buttons.next")}
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? tCommon("buttonStates.creating") : t("contacts.wizard.buttons.submit")}
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent key={currentStep}>
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
