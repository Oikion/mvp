"use client";

import { z } from "zod";
import axios from "axios";
import { clientFormSchema, type ClientFormValues } from "@/lib/validations/crm";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { ConditionalFormSection } from "@/components/form/conditional-section";

// Greek DOY (Tax Office) options - common ones
const DOY_OPTIONS = [
  "Α' ΑΘΗΝΩΝ", "Β' ΑΘΗΝΩΝ", "Γ' ΑΘΗΝΩΝ", "Δ' ΑΘΗΝΩΝ",
  "Α' ΠΕΙΡΑΙΩΣ", "Β' ΠΕΙΡΑΙΩΣ", "ΘΕΣΣΑΛΟΝΙΚΗΣ Α'", "ΘΕΣΣΑΛΟΝΙΚΗΣ Β'",
  "ΠΑΤΡΩΝ", "ΗΡΑΚΛΕΙΟΥ", "ΛΑΡΙΣΑΣ", "ΒΟΛΟΥ", "ΚΑΛΑΜΑΤΑΣ", "ΚΑΒΑΛΑΣ"
];

type Props = {
  users: any[];
  onFinish: () => void;
  initialDraftId?: string;
};

// Schema shape without validation messages (those are added inside the component)
const baseSchema = clientFormSchema;
type FormValues = ClientFormValues;

export function NewClientWizard({ users, onFinish, initialDraftId }: Readonly<Props>) {
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("crm");
  const tCommon = useTranslations("common");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const hasSubmittedRef = useRef(false);
  const draftIdRef = useRef<string | undefined>(initialDraftId);

  // Build schema with translated validation messages
  const formSchema = useMemo(() => baseSchema
    .refine(
      (data) => {
        if (data.afm && data.afm.length > 0) return /^\d{9}$/.test(data.afm);
        return true;
      },
      { path: ["afm"], message: t("CrmForm.validation.afmInvalid") }
    )
    .superRefine((data, ctx) => {
      if (!data.person_type) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["person_type"], message: t("CrmForm.validation.personTypeRequired") });
      } else if (data.person_type === "COMPANY") {
        if (!data.company_name || data.company_name.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["company_name"], message: t("CrmForm.validation.nameRequired") });
        }
      } else {
        if (!data.full_name || data.full_name.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["full_name"], message: t("CrmForm.validation.nameRequired") });
        }
      }
    }),
    [t]
  );

  const STEPS = useMemo(() => [
    { id: 1, title: t("CrmForm.steps.basics"), description: t("CrmForm.stepDescriptions.basics") },
    { id: 2, title: t("CrmForm.steps.contact"), description: t("CrmForm.stepDescriptions.contact") },
    { id: 3, title: t("CrmForm.steps.legal"), description: t("CrmForm.stepDescriptions.legal") },
    { id: 4, title: t("CrmForm.steps.consent"), description: t("CrmForm.stepDescriptions.consent") },
  ], [t]);

  const CHANNEL_OPTIONS: MultiSelectOption[] = useMemo(() => [
    { value: "CALL", label: t("CrmForm.channels.CALL") },
    { value: "SMS", label: t("CrmForm.channels.SMS") },
    { value: "WHATSAPP", label: t("CrmForm.channels.WHATSAPP") },
    { value: "VIBER", label: t("CrmForm.channels.VIBER") },
    { value: "EMAIL", label: t("CrmForm.channels.EMAIL") },
  ], [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: "",
      person_type: undefined,
      full_name: "",
      company_name: "",
      primary_phone: "",
      primary_email: "",
      secondary_phone: "",
      secondary_email: "",
      channels: [],
      language: "el",
      afm: "",
      doy: "",
      id_doc: "",
      company_gemi: "",
      gdpr_consent: false,
      allow_marketing: false,
      lead_source: undefined,
      assigned_to: "",
    },
  });

  // Load draft data when initialDraftId is provided
  useEffect(() => {
    const loadDraft = async () => {
      if (initialDraftId && !draftId) {
        try {
          const response = await axios.get(`/api/crm/clients/${initialDraftId}`);
          if (response.data?.client) {
            const draft = response.data.client;
            form.reset({
              client_name: draft.client_name || "",
              person_type: draft.person_type || undefined,
              full_name: draft.full_name || "",
              company_name: draft.company_name || "",
              primary_phone: draft.primary_phone || "",
              primary_email: draft.primary_email || "",
              secondary_phone: draft.secondary_phone || "",
              secondary_email: draft.secondary_email || "",
              channels: Array.isArray(draft.channels) ? draft.channels : [],
              language: draft.language || "el",
              afm: draft.afm || "",
              doy: draft.doy || "",
              id_doc: draft.id_doc || "",
              company_gemi: draft.company_gemi || "",
              gdpr_consent: draft.gdpr_consent || false,
              allow_marketing: draft.allow_marketing || false,
              lead_source: draft.lead_source || undefined,
              assigned_to: draft.assigned_to || "",
            });
            setDraftId(initialDraftId);
            draftIdRef.current = initialDraftId;
          }
        } catch (error) {
          console.error("Failed to load draft:", error);
        }
      }
    };
    loadDraft();
  }, [initialDraftId, draftId, form]);

  // Derive client_name from the contextual name field so autosave and submit always have it
  const watchedPersonType = form.watch("person_type");
  const watchedFullName = form.watch("full_name");
  const watchedCompanyName = form.watch("company_name");
  useEffect(() => {
    const derived = watchedPersonType === "COMPANY" ? watchedCompanyName : watchedFullName;
    form.setValue("client_name", derived ?? "", { shouldValidate: false, shouldDirty: false });
  }, [watchedPersonType, watchedFullName, watchedCompanyName, form]);

  // Save draft on exit (component unmount or window close) — prevents draft spam
  useEffect(() => {
    const saveDraftOnExit = () => {
      if (hasSubmittedRef.current) return;
      const values = form.getValues();
      const hasData = values.client_name || values.full_name || values.company_name || values.primary_phone || values.primary_email;
      if (!hasData) return;
      const payload = JSON.stringify({
        id: draftIdRef.current,
        ...values,
        draft_status: true,
      });
      navigator.sendBeacon("/api/crm/clients/draft", new Blob([payload], { type: "application/json" }));
    };

    window.addEventListener("beforeunload", saveDraftOnExit);
    return () => {
      window.removeEventListener("beforeunload", saveDraftOnExit);
      saveDraftOnExit();
    };
  }, [form]);

  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    switch (step) {
      case 1: fieldsToValidate = ["person_type", "full_name", "company_name", "primary_phone", "primary_email"]; break;
      case 2: fieldsToValidate = ["secondary_phone", "secondary_email", "channels", "language"]; break;
      case 3: fieldsToValidate = ["afm", "doy", "id_doc", "company_gemi"]; break;
      case 4: fieldsToValidate = ["gdpr_consent", "allow_marketing", "lead_source", "assigned_to"]; break;
    }
    return form.trigger(fieldsToValidate as any);
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepClick = async (stepId: number) => {
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      return;
    }
    const isValid = await validateStep(currentStep);
    if (isValid) setCurrentStep(stepId);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      // Convert empty strings to undefined so the API schema (which expects UUID
      // for assigned_to, email format for emails, etc.) doesn't reject them
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? undefined : v])
      );
      const submitData = { ...cleaned, draft_status: false };

      if (draftId) {
        await axios.put(`/api/crm/clients/${draftId}`, submitData);
      } else {
        await axios.post("/api/crm/clients", submitData);
      }

      hasSubmittedRef.current = true;
      toast.success("createSuccess", { description: t("CrmForm.wizard.success") });
      router.refresh();
      onFinish();
    } catch (error) {
      console.error("Failed to create client:", error);
      toast.error("createFailed", { description: t("CrmForm.wizard.error") });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    const personType = form.watch("person_type");

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="person_type" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.personType")} <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.fields.personTypePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">{t("CrmForm.personType.INDIVIDUAL")}</SelectItem>
                    <SelectItem value="COMPANY">{t("CrmForm.personType.COMPANY")}</SelectItem>
                    <SelectItem value="INVESTOR">{t("CrmForm.personType.INVESTOR")}</SelectItem>
                    <SelectItem value="BROKER">{t("CrmForm.personType.BROKER")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <ConditionalFormSection condition={personType === "INDIVIDUAL" || personType === "INVESTOR" || personType === "BROKER"}>
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.fullName")} <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder={t("CrmForm.fields.fullNamePlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </ConditionalFormSection>

            <ConditionalFormSection condition={personType === "COMPANY"}>
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.companyName")} <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder={t("CrmForm.fields.companyNamePlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </ConditionalFormSection>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="primary_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.primaryPhone")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("CrmForm.fields.primaryPhonePlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="primary_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.primaryEmail")}</FormLabel>
                  <FormControl><Input {...field} type="email" placeholder={t("CrmForm.fields.primaryEmailPlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="secondary_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.secondaryPhone")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="secondary_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.secondaryEmail")}</FormLabel>
                  <FormControl><Input {...field} type="email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="channels" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.channels")}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={CHANNEL_OPTIONS}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder={t("CrmForm.fields.channelsPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="language" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.language")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="el">Ελληνικά</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="afm" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.afm")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("CrmForm.fields.afmPlaceholder")} maxLength={9} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="doy" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.doy")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.fields.doyPlaceholder")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {DOY_OPTIONS.map((doy) => (
                        <SelectItem key={doy} value={doy}>{doy}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="id_doc" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.idDoc")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <ConditionalFormSection condition={personType === "COMPANY"}>
              <FormField control={form.control} name="company_gemi" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.companyGemi")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("CrmForm.fields.companyGemiPlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </ConditionalFormSection>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="gdpr_consent" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">{t("CrmForm.fields.gdprConsent")}</FormLabel>
              </FormItem>
            )} />

            <FormField control={form.control} name="allow_marketing" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">{t("CrmForm.fields.allowMarketing")}</FormLabel>
              </FormItem>
            )} />

            <FormField control={form.control} name="lead_source" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.leadSource")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.fields.leadSourcePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="REFERRAL">{t("CrmForm.leadSource.REFERRAL")}</SelectItem>
                    <SelectItem value="WEB">{t("CrmForm.leadSource.WEB")}</SelectItem>
                    <SelectItem value="PORTAL">{t("CrmForm.leadSource.PORTAL")}</SelectItem>
                    <SelectItem value="WALK_IN">{t("CrmForm.leadSource.WALK_IN")}</SelectItem>
                    <SelectItem value="SOCIAL">{t("CrmForm.leadSource.SOCIAL")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="assigned_to" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.agentOwner")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={tCommon("selectAgent")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.name || user.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );

      default:
        return null;
    }
  };

  // personType needed outside renderStepContent for step 3 conditional
  const personType = form.watch("person_type");

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
              {t("CrmForm.buttons.previous")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" size="sm" onClick={handleNext} disabled={isLoading}>
                {t("CrmForm.buttons.next")}
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? tCommon("buttonStates.creating") : t("CrmForm.buttons.submit")}
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
