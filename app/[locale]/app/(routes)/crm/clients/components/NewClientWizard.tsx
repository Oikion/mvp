"use client";

import { z } from "zod";
import axios from "axios";
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { ConditionalFormSection } from "@/components/form/conditional-section";
import { AutosaveIndicator, AutosaveStatus } from "@/components/form/autosave-indicator";
import useDebounce from "@/hooks/useDebounce";

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
const baseSchema = z.object({
  // Step 1
  person_type: z.enum(["INDIVIDUAL", "COMPANY", "INVESTOR", "BROKER"]).optional(),
  full_name: z.string().optional(),
  company_name: z.string().optional(),
  primary_phone: z.string().optional(),
  primary_email: z.string().email().optional().or(z.literal("")),
  intent: z.enum(["BUY", "RENT", "SELL", "LEASE", "INVEST"]).optional(),
  // Step 2
  secondary_phone: z.string().optional().or(z.literal("")),
  secondary_email: z.string().email().optional().or(z.literal("")),
  channels: z.array(z.string()).optional().default([]),
  language: z.enum(["el", "en", "cz", "de", "uk"]).optional(),
  // Step 3
  afm: z.string().optional().or(z.literal("")),
  doy: z.string().optional().or(z.literal("")),
  id_doc: z.string().optional().or(z.literal("")),
  company_gemi: z.string().optional().or(z.literal("")),
  // Step 4
  purpose: z.enum(["RESIDENTIAL", "COMMERCIAL", "LAND", "PARKING", "OTHER"]).optional(),
  purpose_other: z.string().optional(),
  areas_of_interest: z.array(z.string()).optional().default([]),
  budget_min: z.coerce.number().optional(),
  budget_max: z.coerce.number().optional(),
  timeline: z.enum(["IMMEDIATE", "ONE_THREE_MONTHS", "THREE_SIX_MONTHS", "SIX_PLUS_MONTHS"]).optional(),
  // Step 5
  bedrooms_min: z.coerce.number().optional(),
  bedrooms_max: z.coerce.number().optional(),
  bathrooms_min: z.coerce.number().optional(),
  bathrooms_max: z.coerce.number().optional(),
  size_min_sqm: z.coerce.number().optional(),
  size_max_sqm: z.coerce.number().optional(),
  floor_min: z.coerce.number().optional(),
  floor_max: z.coerce.number().optional(),
  ground_floor_only: z.boolean().optional().default(false),
  requires_elevator: z.boolean().optional().default(false),
  requires_parking: z.boolean().optional().default(false),
  requires_pet_friendly: z.boolean().optional().default(false),
  furnished_preference: z.enum(["NO", "PARTIALLY", "FULLY", "ANY"]).optional(),
  heating_preferences: z.array(z.string()).optional().default([]),
  energy_class_min: z.enum(["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H"]).optional(),
  condition_preferences: z.array(z.string()).optional().default([]),
  amenities_required: z.array(z.string()).optional().default([]),
  amenities_preferred: z.array(z.string()).optional().default([]),
  // Step 6
  financing_type: z.enum(["CASH", "MORTGAGE", "PREAPPROVAL_PENDING"]).optional(),
  preapproval_bank: z.string().optional().or(z.literal("")),
  needs_mortgage_help: z.boolean().optional().default(false),
  notes: z.string().optional().or(z.literal("")),
  // Step 7
  gdpr_consent: z.boolean().optional().default(false),
  allow_marketing: z.boolean().optional().default(false),
  lead_source: z.enum(["REFERRAL", "WEB", "PORTAL", "WALK_IN", "SOCIAL"]).optional(),
  assigned_to: z.string().optional(),
});

type FormValues = z.infer<typeof baseSchema>;

export function NewClientWizard({ users, onFinish, initialDraftId }: Readonly<Props>) {
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("crm");
  const tCommon = useTranslations("common");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedData, setLastSavedData] = useState<Partial<FormValues>>({});

  // Build schema with translated validation messages
  const formSchema = useMemo(() => baseSchema
    .refine(
      (data) => {
        if (data.afm && data.afm.length > 0) return /^\d{9}$/.test(data.afm);
        return true;
      },
      { path: ["afm"], message: t("CrmForm.validation.afmInvalid") }
    ),
    [t]
  );

  const STEPS = useMemo(() => [
    { id: 1, title: t("CrmForm.steps.basics"), description: t("CrmForm.stepDescriptions.basics") },
    { id: 2, title: t("CrmForm.steps.contact"), description: t("CrmForm.stepDescriptions.contact") },
    { id: 3, title: t("CrmForm.steps.legal"), description: t("CrmForm.stepDescriptions.legal") },
    { id: 4, title: t("CrmForm.steps.preferences"), description: t("CrmForm.stepDescriptions.preferences") },
    { id: 5, title: t("CrmForm.steps.propertyDetails"), description: t("CrmForm.stepDescriptions.propertyDetails") },
    { id: 6, title: t("CrmForm.steps.financing"), description: t("CrmForm.stepDescriptions.financing") },
    { id: 7, title: t("CrmForm.steps.consent"), description: t("CrmForm.stepDescriptions.consent") },
  ], [t]);

  const CHANNEL_OPTIONS: MultiSelectOption[] = useMemo(() => [
    { value: "CALL", label: t("CrmForm.channels.CALL") },
    { value: "SMS", label: t("CrmForm.channels.SMS") },
    { value: "WHATSAPP", label: t("CrmForm.channels.WHATSAPP") },
    { value: "VIBER", label: t("CrmForm.channels.VIBER") },
    { value: "EMAIL", label: t("CrmForm.channels.EMAIL") },
  ], [t]);

  const HEATING_OPTIONS: MultiSelectOption[] = useMemo(() => [
    { value: "AUTONOMOUS", label: t("CrmForm.heating.AUTONOMOUS") },
    { value: "CENTRAL", label: t("CrmForm.heating.CENTRAL") },
    { value: "NATURAL_GAS", label: t("CrmForm.heating.NATURAL_GAS") },
    { value: "HEAT_PUMP", label: t("CrmForm.heating.HEAT_PUMP") },
    { value: "ELECTRIC", label: t("CrmForm.heating.ELECTRIC") },
    { value: "NONE", label: t("CrmForm.heating.NONE") },
  ], [t]);

  const CONDITION_OPTIONS: MultiSelectOption[] = useMemo(() => [
    { value: "EXCELLENT", label: t("CrmForm.condition.EXCELLENT") },
    { value: "VERY_GOOD", label: t("CrmForm.condition.VERY_GOOD") },
    { value: "GOOD", label: t("CrmForm.condition.GOOD") },
    { value: "NEEDS_RENOVATION", label: t("CrmForm.condition.NEEDS_RENOVATION") },
  ], [t]);

  const AMENITIES_OPTIONS: MultiSelectOption[] = useMemo(() => [
    { value: "pool", label: t("CrmForm.amenities.pool") },
    { value: "gym", label: t("CrmForm.amenities.gym") },
    { value: "garden", label: t("CrmForm.amenities.garden") },
    { value: "terrace", label: t("CrmForm.amenities.terrace") },
    { value: "balcony", label: t("CrmForm.amenities.balcony") },
    { value: "storage", label: t("CrmForm.amenities.storage") },
    { value: "security", label: t("CrmForm.amenities.security") },
    { value: "fireplace", label: t("CrmForm.amenities.fireplace") },
    { value: "air_conditioning", label: t("CrmForm.amenities.air_conditioning") },
    { value: "solar_panels", label: t("CrmForm.amenities.solar_panels") },
    { value: "smart_home", label: t("CrmForm.amenities.smart_home") },
    { value: "alarm", label: t("CrmForm.amenities.alarm") },
    { value: "ev_charging", label: t("CrmForm.amenities.ev_charging") },
  ], [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      person_type: undefined,
      full_name: "",
      company_name: "",
      primary_phone: "",
      primary_email: "",
      intent: undefined,
      secondary_phone: "",
      secondary_email: "",
      channels: [],
      language: "el",
      afm: "",
      doy: "",
      id_doc: "",
      company_gemi: "",
      purpose: undefined,
      purpose_other: "",
      areas_of_interest: [],
      budget_min: undefined,
      budget_max: undefined,
      timeline: undefined,
      bedrooms_min: undefined,
      bedrooms_max: undefined,
      bathrooms_min: undefined,
      bathrooms_max: undefined,
      size_min_sqm: undefined,
      size_max_sqm: undefined,
      floor_min: undefined,
      floor_max: undefined,
      ground_floor_only: false,
      requires_elevator: false,
      requires_parking: false,
      requires_pet_friendly: false,
      furnished_preference: undefined,
      heating_preferences: [],
      energy_class_min: undefined,
      condition_preferences: [],
      amenities_required: [],
      amenities_preferred: [],
      financing_type: undefined,
      preapproval_bank: "",
      needs_mortgage_help: false,
      notes: "",
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
            const prefs = draft.property_preferences || {};
            form.reset({
              person_type: draft.person_type || undefined,
              full_name: draft.full_name || "",
              company_name: draft.company_name || "",
              primary_phone: draft.primary_phone || "",
              primary_email: draft.primary_email || "",
              intent: draft.intent || undefined,
              secondary_phone: draft.secondary_phone || "",
              secondary_email: draft.secondary_email || "",
              channels: Array.isArray(draft.channels) ? draft.channels : [],
              language: draft.language || "el",
              afm: draft.afm || "",
              doy: draft.doy || "",
              id_doc: draft.id_doc || "",
              company_gemi: draft.company_gemi || "",
              purpose: draft.purpose || undefined,
              purpose_other: draft.purpose_other || "",
              areas_of_interest: Array.isArray(draft.areas_of_interest) ? draft.areas_of_interest : [],
              budget_min: draft.budget_min || undefined,
              budget_max: draft.budget_max || undefined,
              timeline: draft.timeline || undefined,
              bedrooms_min: prefs.bedrooms_min || undefined,
              bedrooms_max: prefs.bedrooms_max || undefined,
              bathrooms_min: prefs.bathrooms_min || undefined,
              bathrooms_max: prefs.bathrooms_max || undefined,
              size_min_sqm: prefs.size_min_sqm || undefined,
              size_max_sqm: prefs.size_max_sqm || undefined,
              floor_min: prefs.floor_min || undefined,
              floor_max: prefs.floor_max || undefined,
              ground_floor_only: prefs.ground_floor_only || false,
              requires_elevator: prefs.requires_elevator || false,
              requires_parking: prefs.requires_parking || false,
              requires_pet_friendly: prefs.requires_pet_friendly || false,
              furnished_preference: prefs.furnished_preference || undefined,
              heating_preferences: Array.isArray(prefs.heating_preferences) ? prefs.heating_preferences : [],
              energy_class_min: prefs.energy_class_min || undefined,
              condition_preferences: Array.isArray(prefs.condition_preferences) ? prefs.condition_preferences : [],
              amenities_required: Array.isArray(prefs.amenities_required) ? prefs.amenities_required : [],
              amenities_preferred: Array.isArray(prefs.amenities_preferred) ? prefs.amenities_preferred : [],
              financing_type: draft.financing_type || undefined,
              preapproval_bank: draft.preapproval_bank || "",
              needs_mortgage_help: draft.needs_mortgage_help || false,
              notes: draft.notes || "",
              gdpr_consent: draft.gdpr_consent || false,
              allow_marketing: draft.allow_marketing || false,
              lead_source: draft.lead_source || undefined,
              assigned_to: draft.assigned_to || "",
            });
            setDraftId(initialDraftId);
            setLastSavedData(form.getValues());
          }
        } catch (error) {
          console.error("Failed to load draft:", error);
        }
      }
    };
    loadDraft();
  }, [initialDraftId, draftId, form]);

  const formValues = form.watch();
  const debouncedValues = useDebounce(JSON.stringify(formValues), 500);

  const saveDraft = useCallback(async (data: Partial<FormValues>) => {
    if (Object.keys(data).length === 0) return;
    setAutosaveStatus("saving");
    try {
      const response = await axios.post("/api/crm/clients/draft", { id: draftId, ...data });
      if (response.data?.client?.id && !draftId) {
        setDraftId(response.data.client.id);
      }
      setAutosaveStatus("saved");
      setTimeout(() => setAutosaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save draft:", error);
      setAutosaveStatus("failed");
      setTimeout(() => setAutosaveStatus("idle"), 3000);
    }
  }, [draftId]);

  useEffect(() => {
    if (debouncedValues && currentStep > 0) {
      const currentData = form.getValues();
      const changedData: Partial<FormValues> = {};
      Object.keys(currentData).forEach((key) => {
        const typedKey = key as keyof FormValues;
        if (JSON.stringify(currentData[typedKey]) !== JSON.stringify(lastSavedData[typedKey])) {
          (changedData as any)[typedKey] = currentData[typedKey];
        }
      });
      if (Object.keys(changedData).length > 0) {
        saveDraft(changedData);
        setLastSavedData(currentData);
      }
    }
  }, [debouncedValues, currentStep, form, saveDraft, lastSavedData]);

  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    switch (step) {
      case 1: fieldsToValidate = ["person_type", "full_name", "company_name", "primary_phone", "primary_email", "intent"]; break;
      case 2: fieldsToValidate = ["secondary_phone", "secondary_email", "channels", "language"]; break;
      case 3: fieldsToValidate = ["afm", "doy", "id_doc", "company_gemi"]; break;
      case 4: fieldsToValidate = ["purpose", "areas_of_interest", "budget_min", "budget_max", "timeline"]; break;
      case 5: fieldsToValidate = ["bedrooms_min", "bedrooms_max", "size_min_sqm", "size_max_sqm"]; break;
      case 6: fieldsToValidate = ["financing_type", "preapproval_bank", "needs_mortgage_help", "notes"]; break;
      case 7: fieldsToValidate = ["gdpr_consent", "allow_marketing", "lead_source", "assigned_to"]; break;
    }
    return form.trigger(fieldsToValidate as any);
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) {
      const currentData = form.getValues();
      if (Object.keys(currentData).length > 0) {
        await saveDraft(currentData);
        setLastSavedData(currentData);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepClick = async (stepId: number) => {
    const currentData = form.getValues();
    if (Object.keys(currentData).length > 0) {
      saveDraft(currentData);
      setLastSavedData(currentData);
    }
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      return;
    }
    const isValid = await validateStep(currentStep);
    if (isValid) setCurrentStep(stepId);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const currentData = form.getValues();
      if (Object.keys(currentData).length > 0) {
        saveDraft(currentData);
        setLastSavedData(currentData);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const property_preferences = {
        bedrooms_min: data.bedrooms_min,
        bedrooms_max: data.bedrooms_max,
        bathrooms_min: data.bathrooms_min,
        bathrooms_max: data.bathrooms_max,
        size_min_sqm: data.size_min_sqm,
        size_max_sqm: data.size_max_sqm,
        floor_min: data.floor_min,
        floor_max: data.floor_max,
        ground_floor_only: data.ground_floor_only,
        requires_elevator: data.requires_elevator,
        requires_parking: data.requires_parking,
        requires_pet_friendly: data.requires_pet_friendly,
        furnished_preference: data.furnished_preference,
        heating_preferences: data.heating_preferences,
        energy_class_min: data.energy_class_min,
        condition_preferences: data.condition_preferences,
        amenities_required: data.amenities_required,
        amenities_preferred: data.amenities_preferred,
      };

      const {
        bedrooms_min, bedrooms_max, bathrooms_min, bathrooms_max,
        size_min_sqm, size_max_sqm, floor_min, floor_max, ground_floor_only,
        requires_elevator, requires_parking, requires_pet_friendly,
        furnished_preference, heating_preferences, energy_class_min,
        condition_preferences, amenities_required, amenities_preferred,
        ...restData
      } = data;

      // Convert empty strings to undefined so the API schema (which expects UUID
      // for assigned_to, email format for emails, etc.) doesn't reject them
      const cleaned = Object.fromEntries(
        Object.entries(restData).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? undefined : v])
      );
      const submitData = { ...cleaned, property_preferences, draft_status: false };

      if (draftId) {
        await axios.put(`/api/crm/clients/${draftId}`, submitData);
      } else {
        await axios.post("/api/crm/clients", submitData);
      }

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
    const intent = form.watch("intent");
    const showFinancing = intent === "BUY" || intent === "INVEST";

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="person_type" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.personType")}</FormLabel>
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
                  <FormLabel>{t("CrmForm.fields.fullName")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("CrmForm.fields.fullNamePlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </ConditionalFormSection>

            <ConditionalFormSection condition={personType === "COMPANY"}>
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.companyName")}</FormLabel>
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

            <FormField control={form.control} name="intent" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.intent")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.fields.intentPlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="BUY">{t("CrmForm.intents.BUY")}</SelectItem>
                    <SelectItem value="RENT">{t("CrmForm.intents.RENT")}</SelectItem>
                    <SelectItem value="SELL">{t("CrmForm.intents.SELL")}</SelectItem>
                    <SelectItem value="LEASE">{t("CrmForm.intents.LEASE")}</SelectItem>
                    <SelectItem value="INVEST">{t("CrmForm.intents.INVEST")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
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
            <FormSelectWithOther<FormValues, "purpose">
              name="purpose"
              otherFieldName="purpose_other"
              label={t("CrmForm.fields.purpose")}
              placeholder={t("CrmForm.fields.purposePlaceholder")}
              otherLabel={t("CrmForm.fields.specifyOther")}
              otherPlaceholder={t("CrmForm.fields.specifyOtherPlaceholder")}
              options={[
                { value: "RESIDENTIAL", label: t("CrmForm.purpose.RESIDENTIAL") },
                { value: "COMMERCIAL", label: t("CrmForm.purpose.COMMERCIAL") },
                { value: "LAND", label: t("CrmForm.purpose.LAND") },
                { value: "PARKING", label: t("CrmForm.purpose.PARKING") },
                { value: "OTHER", label: t("CrmForm.purpose.OTHER") },
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="budget_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.budgetMin")}</FormLabel>
                  <FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="budget_max" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.budgetMax")}</FormLabel>
                  <FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="timeline" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.timeline")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.fields.timelinePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">{t("CrmForm.timeline.IMMEDIATE")}</SelectItem>
                    <SelectItem value="ONE_THREE_MONTHS">{t("CrmForm.timeline.ONE_THREE_MONTHS")}</SelectItem>
                    <SelectItem value="THREE_SIX_MONTHS">{t("CrmForm.timeline.THREE_SIX_MONTHS")}</SelectItem>
                    <SelectItem value="SIX_PLUS_MONTHS">{t("CrmForm.timeline.SIX_PLUS_MONTHS")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-3">{t("CrmForm.propertyPrefs.rooms")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="bedrooms_min" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.propertyPrefs.bedroomsMin")}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? Number.parseInt(v) : undefined)} value={field.value != null ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.propertyPrefs.any")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bedrooms_max" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.propertyPrefs.bedroomsMax")}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? Number.parseInt(v) : undefined)} value={field.value != null ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.propertyPrefs.any")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FormField control={form.control} name="bathrooms_min" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.propertyPrefs.bathroomsMin")}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? Number.parseInt(v) : undefined)} value={field.value != null ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.propertyPrefs.any")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bathrooms_max" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.propertyPrefs.bathroomsMax")}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? Number.parseInt(v) : undefined)} value={field.value != null ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.propertyPrefs.any")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">{t("CrmForm.propertyPrefs.size")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="size_min_sqm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.propertyPrefs.sizeMin")}</FormLabel>
                    <FormControl><Input type="number" placeholder="50" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="size_max_sqm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.propertyPrefs.sizeMax")}</FormLabel>
                    <FormControl><Input type="number" placeholder="150" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">{t("CrmForm.propertyPrefs.floor")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="floor_min" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.propertyPrefs.floorFrom")}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? Number.parseInt(v) : undefined)} value={field.value != null ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.propertyPrefs.any")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="-1">{t("CrmForm.propertyPrefs.basement")}</SelectItem>
                        <SelectItem value="0">{t("CrmForm.propertyPrefs.ground")}</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="floor_max" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.propertyPrefs.floorTo")}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? Number.parseInt(v) : undefined)} value={field.value != null ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.propertyPrefs.any")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="0">{t("CrmForm.propertyPrefs.ground")}</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="ground_floor_only" render={({ field }) => (
                <FormItem className="flex items-center space-x-2 mt-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">{t("CrmForm.propertyPrefs.groundFloorOnly")}</FormLabel>
                </FormItem>
              )} />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">{t("CrmForm.propertyPrefs.requirements")}</h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="requires_elevator" render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">{t("CrmForm.propertyPrefs.elevator")}</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="requires_parking" render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">{t("CrmForm.propertyPrefs.parking")}</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="requires_pet_friendly" render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">{t("CrmForm.propertyPrefs.petFriendly")}</FormLabel>
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="furnished_preference" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.propertyPrefs.furnished")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.propertyPrefs.any")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="ANY">{t("CrmForm.propertyPrefs.any")}</SelectItem>
                      <SelectItem value="NO">{t("CrmForm.propertyPrefs.furnishedNo")}</SelectItem>
                      <SelectItem value="PARTIALLY">{t("CrmForm.propertyPrefs.furnishedPartially")}</SelectItem>
                      <SelectItem value="FULLY">{t("CrmForm.propertyPrefs.furnishedFully")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="energy_class_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.propertyPrefs.energyClass")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.propertyPrefs.any")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="A_PLUS">A+</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="heating_preferences" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.propertyPrefs.heatingType")}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={HEATING_OPTIONS}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder={t("CrmForm.propertyPrefs.heatingPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="condition_preferences" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.propertyPrefs.conditionLabel")}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={CONDITION_OPTIONS}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder={t("CrmForm.propertyPrefs.conditionPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="amenities_required" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.propertyPrefs.amenitiesRequired")}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={AMENITIES_OPTIONS}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder={t("CrmForm.propertyPrefs.amenitiesRequiredPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="amenities_preferred" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.propertyPrefs.amenitiesPreferred")}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={AMENITIES_OPTIONS}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder={t("CrmForm.propertyPrefs.amenitiesPreferredPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );

      case 6:
        if (!showFinancing) {
          return <p className="text-muted-foreground text-sm py-4">{t("CrmForm.wizard.financingNotApplicable")}</p>;
        }
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="financing_type" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.financingType")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("CrmForm.fields.financingTypePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">{t("CrmForm.financingType.CASH")}</SelectItem>
                    <SelectItem value="MORTGAGE">{t("CrmForm.financingType.MORTGAGE")}</SelectItem>
                    <SelectItem value="PREAPPROVAL_PENDING">{t("CrmForm.financingType.PREAPPROVAL_PENDING")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="preapproval_bank" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.preapprovalBank")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="needs_mortgage_help" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">{t("CrmForm.fields.needsMortgageHelp")}</FormLabel>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("CrmForm.fields.notes")}</FormLabel>
                <FormControl><Textarea {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );

      case 7:
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
            <div className="flex justify-end mb-2">
              <AutosaveIndicator status={autosaveStatus} />
            </div>
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
