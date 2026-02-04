"use client";

import { z } from "zod";
import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
// Import all translation files for the new structure
import commonEl from "@/locales/el/common.json";
import crmEl from "@/locales/el/crm.json";
import mlsEl from "@/locales/el/mls.json";
import validationEl from "@/locales/el/validation.json";
import rootEl from "@/locales/el/root.json";
import navigationEl from "@/locales/el/navigation.json";
import dashboardEl from "@/locales/el/dashboard.json";
import reportsEl from "@/locales/el/reports.json";
import adminEl from "@/locales/el/admin.json";
import emailEl from "@/locales/el/email.json";
import setLanguageEl from "@/locales/el/setLanguage.json";
import feedbackEl from "@/locales/el/feedback.json";
import registerEl from "@/locales/el/register.json";

// Merge all translations into a single object matching the new structure
const greekTranslations: any = {
  common: commonEl,
  crm: crmEl,
  mls: mlsEl,
  validation: validationEl,
  RootLayout: rootEl,
  navigation: navigationEl,
  dashboard: dashboardEl,
  reports: reportsEl,
  admin: adminEl,
  email: emailEl,
  setLanguage: setLanguageEl,
  feedback: feedbackEl,
  register: registerEl,
};

// Translation helper
const t = (key: string, fallback: string = ""): string => {
  const keys = key.split(".");
  let value: any = greekTranslations;
  for (const k of keys) {
    value = value?.[k];
    if (!value) return fallback;
  }
  return typeof value === "string" ? value : fallback;
};

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

const formSchema = z.object({
  // Step 1: Βασικά
  person_type: z.enum(["INDIVIDUAL", "COMPANY", "INVESTOR", "BROKER"], {
    required_error: t("crm.crm.CrmForm.validation.personTypeRequired"),
  }),
  full_name: z.string().optional(),
  company_name: z.string().optional(),
  primary_phone: z.string().optional(),
  primary_email: z.string().email(t("validation.emailInvalid")).optional().or(z.literal("")),
  intent: z.enum(["BUY", "RENT", "SELL", "LEASE", "INVEST"], {
    required_error: t("crm.crm.CrmForm.validation.intentRequired"),
  }),
  
  // Step 2: Επικοινωνία
  secondary_phone: z.string().optional().or(z.literal("")),
  secondary_email: z.string().email().optional().or(z.literal("")),
  channels: z.array(z.string()).optional().default([]),
  language: z.enum(["el", "en", "cz", "de", "uk"]).optional(),
  
  // Step 3: Νομικά
  afm: z.string().optional().or(z.literal("")),
  doy: z.string().optional().or(z.literal("")),
  id_doc: z.string().optional().or(z.literal("")),
  company_gemi: z.string().optional().or(z.literal("")),
  
  // Step 4: Ανάγκες/Προτιμήσεις
  purpose: z.enum(["RESIDENTIAL", "COMMERCIAL", "LAND", "PARKING", "OTHER"]).optional(),
  purpose_other: z.string().optional(),
  areas_of_interest: z.array(z.string()).optional().default([]),
  budget_min: z.coerce.number().optional(),
  budget_max: z.coerce.number().optional(),
  timeline: z.enum(["IMMEDIATE", "ONE_THREE_MONTHS", "THREE_SIX_MONTHS", "SIX_PLUS_MONTHS"]).optional(),
  
  // Step 5: Προτιμήσεις Ακινήτου (Property Preferences for Matchmaking)
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
  
  // Step 6: Χρηματοδότηση (conditional)
  financing_type: z.enum(["CASH", "MORTGAGE", "PREAPPROVAL_PENDING"]).optional(),
  preapproval_bank: z.string().optional().or(z.literal("")),
  needs_mortgage_help: z.boolean().optional().default(false),
  notes: z.string().optional().or(z.literal("")),
  
  // Step 7: Συναίνεση & GDPR
  gdpr_consent: z.boolean().optional().default(false),
  allow_marketing: z.boolean().optional().default(false),
  lead_source: z.enum(["REFERRAL", "WEB", "PORTAL", "WALK_IN", "SOCIAL"]).optional(),
  assigned_to: z.string().min(1, t("validation.assignedAgentRequired")),
}).refine(
  (data) => {
    // Require phone OR email
    return !!(data.primary_phone && data.primary_phone.length) || !!(data.primary_email && data.primary_email.length);
  },
  {
    path: ["primary_email"],
    message: t("crm.CrmForm.validation.phoneOrEmailRequired"),
  }
).refine(
  (data) => {
    // Require full_name if INDIVIDUAL, company_name if COMPANY
    if (data.person_type === "INDIVIDUAL") {
      return !!(data.full_name && data.full_name.length);
    }
    if (data.person_type === "COMPANY") {
      return !!(data.company_name && data.company_name.length);
    }
    return true;
  },
  {
    path: ["full_name"],
    message: t("crm.CrmForm.validation.nameRequired"),
  }
).refine(
  (data) => {
    // AFM validation: 9 digits if provided
    if (data.afm && data.afm.length > 0) {
      return /^\d{9}$/.test(data.afm);
    }
    return true;
  },
  {
    path: ["afm"],
    message: t("crm.CrmForm.validation.afmInvalid"),
  }
);

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, title: "Βασικά", description: "Βασικές πληροφορίες πελάτη" },
  { id: 2, title: "Επικοινωνία", description: "Προτιμήσεις επικοινωνίας" },
  { id: 3, title: "Νομικά", description: "Νομικά στοιχεία (προαιρετικά)" },
  { id: 4, title: "Ανάγκες / Προτιμήσεις", description: "Ανάγκες και προτιμήσεις ακινήτου" },
  { id: 5, title: "Χαρακτηριστικά Ακινήτου", description: "Λεπτομερή κριτήρια για matchmaking" },
  { id: 6, title: "Χρηματοδότηση", description: "Στοιχεία χρηματοδότησης" },
  { id: 7, title: "Συναίνεση & GDPR", description: "Συναίνεση και προσωπικά δεδομένα" },
];

const CHANNEL_OPTIONS: MultiSelectOption[] = [
  { value: "CALL", label: t("crm.CrmForm.channels.CALL") },
  { value: "SMS", label: t("crm.CrmForm.channels.SMS") },
  { value: "WHATSAPP", label: t("crm.CrmForm.channels.WHATSAPP") },
  { value: "VIBER", label: t("crm.CrmForm.channels.VIBER") },
  { value: "EMAIL", label: t("crm.CrmForm.channels.EMAIL") },
];

// Property preference options for matchmaking
const HEATING_OPTIONS: MultiSelectOption[] = [
  { value: "AUTONOMOUS", label: "Αυτόνομη" },
  { value: "CENTRAL", label: "Κεντρική" },
  { value: "NATURAL_GAS", label: "Φυσικό αέριο" },
  { value: "HEAT_PUMP", label: "Αντλία θερμότητας" },
  { value: "ELECTRIC", label: "Ηλεκτρική" },
  { value: "NONE", label: "Χωρίς θέρμανση" },
];

const CONDITION_OPTIONS: MultiSelectOption[] = [
  { value: "EXCELLENT", label: "Άριστη" },
  { value: "VERY_GOOD", label: "Πολύ καλή" },
  { value: "GOOD", label: "Καλή" },
  { value: "NEEDS_RENOVATION", label: "Χρειάζεται ανακαίνιση" },
];

const AMENITIES_OPTIONS: MultiSelectOption[] = [
  { value: "pool", label: "Πισίνα" },
  { value: "gym", label: "Γυμναστήριο" },
  { value: "garden", label: "Κήπος" },
  { value: "terrace", label: "Βεράντα" },
  { value: "balcony", label: "Μπαλκόνι" },
  { value: "storage", label: "Αποθήκη" },
  { value: "security", label: "Φύλαξη" },
  { value: "fireplace", label: "Τζάκι" },
  { value: "air_conditioning", label: "Κλιματισμός" },
  { value: "solar_panels", label: "Ηλιακοί θερμοσίφωνες" },
  { value: "smart_home", label: "Έξυπνο σπίτι" },
  { value: "alarm", label: "Συναγερμός" },
  { value: "ev_charging", label: "Φόρτιση EV" },
];

export function NewClientWizard({ users, onFinish, initialDraftId }: Props) {
  const router = useRouter();
  const { toast } = useAppToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedData, setLastSavedData] = useState<Partial<FormValues>>({});

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
      // Property preferences for matchmaking
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
      // Financing
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
            // Unpack property_preferences JSON
            const prefs = draft.property_preferences || {};
            // Reset form with draft data
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
              // Property preferences from JSON
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
              // Financing
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

  // Autosave on blur/change
  const saveDraft = useCallback(async (data: Partial<FormValues>) => {
    if (Object.keys(data).length === 0) return;
    
    setAutosaveStatus("saving");
    try {
      const response = await axios.post("/api/crm/clients/draft", {
        id: draftId,
        ...data,
      });
      
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
      
      // Only save fields that have changed
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
      case 1:
        fieldsToValidate = ["person_type", "full_name", "company_name", "primary_phone", "primary_email", "intent"];
        break;
      case 2:
        fieldsToValidate = ["secondary_phone", "secondary_email", "channels", "language"];
        break;
      case 3:
        fieldsToValidate = ["afm", "doy", "id_doc", "company_gemi"];
        break;
      case 4:
        fieldsToValidate = ["purpose", "areas_of_interest", "budget_min", "budget_max", "timeline"];
        break;
      case 5:
        // Property preferences - all optional, no strict validation needed
        fieldsToValidate = ["bedrooms_min", "bedrooms_max", "size_min_sqm", "size_max_sqm"];
        break;
      case 6:
        fieldsToValidate = ["financing_type", "preapproval_bank", "needs_mortgage_help", "notes"];
        break;
      case 7:
        fieldsToValidate = ["gdpr_consent", "allow_marketing", "lead_source", "assigned_to"];
        break;
    }

    const result = await form.trigger(fieldsToValidate as any);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) {
      // Save current form state before moving to next step
      const currentData = form.getValues();
      if (Object.keys(currentData).length > 0) {
        await saveDraft(currentData);
        setLastSavedData(currentData);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepClick = async (stepId: number) => {
    // Save current form state before navigating
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
    if (isValid) {
      setCurrentStep(stepId);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      // Save current form state before moving to previous step
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
      // Package property preferences into the JSON field
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

      // Remove the individual fields and add the packaged JSON
      const { 
        bedrooms_min, bedrooms_max, bathrooms_min, bathrooms_max,
        size_min_sqm, size_max_sqm, floor_min, floor_max, ground_floor_only,
        requires_elevator, requires_parking, requires_pet_friendly,
        furnished_preference, heating_preferences, energy_class_min,
        condition_preferences, amenities_required, amenities_preferred,
        ...restData 
      } = data;

      const submitData = {
        ...restData,
        property_preferences,
        draft_status: false,
      };

      // If we have a draft, update it to final; otherwise create new
      if (draftId) {
        await axios.put(`/api/crm/clients/${draftId}`, submitData);
      } else {
        await axios.post("/api/crm/clients", submitData);
      }
      
      toast.success("createSuccess", { description: t("wizard.success") });
      
      router.refresh();
      onFinish();
    } catch (error) {
      console.error("Failed to create client:", error);
      toast.error("createFailed", { description: t("wizard.error") });
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
                <FormLabel>{t("crm.CrmForm.fields.personType")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.personTypePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">{t("crm.CrmForm.personType.INDIVIDUAL")}</SelectItem>
                    <SelectItem value="COMPANY">{t("crm.CrmForm.personType.COMPANY")}</SelectItem>
                    <SelectItem value="INVESTOR">{t("crm.CrmForm.personType.INVESTOR")}</SelectItem>
                    <SelectItem value="BROKER">{t("crm.CrmForm.personType.BROKER")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            
            <ConditionalFormSection condition={personType === "INDIVIDUAL" || personType === "INVESTOR" || personType === "BROKER"}>
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.fullName")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.fullNamePlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </ConditionalFormSection>
            
            <ConditionalFormSection condition={personType === "COMPANY"}>
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.companyName")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.companyNamePlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </ConditionalFormSection>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="primary_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.primaryPhone")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.primaryPhonePlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="primary_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.primaryEmail")}</FormLabel>
                  <FormControl><Input {...field} type="email" placeholder={t("crm.CrmForm.fields.primaryEmailPlaceholder")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="intent" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.intent")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.intentPlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="BUY">{t("crm.CrmForm.intents.BUY")}</SelectItem>
                    <SelectItem value="RENT">{t("crm.CrmForm.intents.RENT")}</SelectItem>
                    <SelectItem value="SELL">{t("crm.CrmForm.intents.SELL")}</SelectItem>
                    <SelectItem value="LEASE">{t("crm.CrmForm.intents.LEASE")}</SelectItem>
                    <SelectItem value="INVEST">{t("crm.CrmForm.intents.INVEST")}</SelectItem>
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
                  <FormLabel>{t("crm.CrmForm.fields.secondaryPhone")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="secondary_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.secondaryEmail")}</FormLabel>
                  <FormControl><Input {...field} type="email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="channels" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.channels")}</FormLabel>
                <FormControl>
                  <MultiSelect 
                    options={CHANNEL_OPTIONS} 
                    value={field.value || []} 
                    onChange={field.onChange}
                    placeholder={t("crm.CrmForm.fields.channelsPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="language" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.language")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
                  <FormLabel>{t("crm.CrmForm.fields.afm")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.afmPlaceholder")} maxLength={9} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="doy" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.doy")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.doyPlaceholder")} /></SelectTrigger></FormControl>
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
                <FormLabel>{t("crm.CrmForm.fields.idDoc")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <ConditionalFormSection condition={personType === "COMPANY"}>
              <FormField control={form.control} name="company_gemi" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.companyGemi")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.companyGemiPlaceholder")} /></FormControl>
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
              label={t("crm.CrmForm.fields.purpose")}
              placeholder={t("crm.CrmForm.fields.purposePlaceholder")}
              otherLabel={t("crm.CrmForm.fields.specifyOther")}
              otherPlaceholder={t("crm.CrmForm.fields.specifyOtherPlaceholder")}
              options={[
                { value: "RESIDENTIAL", label: t("crm.CrmForm.purpose.RESIDENTIAL") },
                { value: "COMMERCIAL", label: t("crm.CrmForm.purpose.COMMERCIAL") },
                { value: "LAND", label: t("crm.CrmForm.purpose.LAND") },
                { value: "PARKING", label: t("crm.CrmForm.purpose.PARKING") },
                { value: "OTHER", label: t("crm.CrmForm.purpose.OTHER") },
              ]}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="budget_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.budgetMin")}</FormLabel>
                  <FormControl><Input {...field} type="number" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="budget_max" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.budgetMax")}</FormLabel>
                  <FormControl><Input {...field} type="number" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="timeline" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.timeline")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.timelinePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">{t("crm.CrmForm.timeline.IMMEDIATE")}</SelectItem>
                    <SelectItem value="ONE_THREE_MONTHS">{t("crm.CrmForm.timeline.ONE_THREE_MONTHS")}</SelectItem>
                    <SelectItem value="THREE_SIX_MONTHS">{t("crm.CrmForm.timeline.THREE_SIX_MONTHS")}</SelectItem>
                    <SelectItem value="SIX_PLUS_MONTHS">{t("crm.CrmForm.timeline.SIX_PLUS_MONTHS")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );
      
      case 5:
        // Property Preferences for Matchmaking
        return (
          <div className="space-y-6">
            {/* Bedrooms & Bathrooms */}
            <div>
              <h4 className="text-sm font-medium mb-3">Δωμάτια</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="bedrooms_min" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ελάχιστα υπνοδωμάτια</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Οποιοδήποτε" /></SelectTrigger></FormControl>
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
                    <FormLabel>Μέγιστα υπνοδωμάτια</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Οποιοδήποτε" /></SelectTrigger></FormControl>
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
                    <FormLabel>Ελάχιστα μπάνια</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Οποιοδήποτε" /></SelectTrigger></FormControl>
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
                    <FormLabel>Μέγιστα μπάνια</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Οποιοδήποτε" /></SelectTrigger></FormControl>
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

            {/* Size */}
            <div>
              <h4 className="text-sm font-medium mb-3">Μέγεθος (τ.μ.)</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="size_min_sqm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ελάχιστο</FormLabel>
                    <FormControl><Input {...field} type="number" placeholder="π.χ. 50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="size_max_sqm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Μέγιστο</FormLabel>
                    <FormControl><Input {...field} type="number" placeholder="π.χ. 150" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Floor */}
            <div>
              <h4 className="text-sm font-medium mb-3">Όροφος</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="floor_min" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Από όροφο</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Οποιοδήποτε" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="-1">Υπόγειο</SelectItem>
                        <SelectItem value="0">Ισόγειο</SelectItem>
                        <SelectItem value="1">1ος</SelectItem>
                        <SelectItem value="2">2ος</SelectItem>
                        <SelectItem value="3">3ος</SelectItem>
                        <SelectItem value="4">4ος</SelectItem>
                        <SelectItem value="5">5ος+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="floor_max" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Έως όροφο</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Οποιοδήποτε" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="0">Ισόγειο</SelectItem>
                        <SelectItem value="1">1ος</SelectItem>
                        <SelectItem value="2">2ος</SelectItem>
                        <SelectItem value="3">3ος</SelectItem>
                        <SelectItem value="4">4ος</SelectItem>
                        <SelectItem value="5">5ος+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="ground_floor_only" render={({ field }) => (
                <FormItem className="flex items-center space-x-2 mt-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Μόνο ισόγειο</FormLabel>
                </FormItem>
              )} />
            </div>

            {/* Requirements */}
            <div>
              <h4 className="text-sm font-medium mb-3">Απαιτήσεις</h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="requires_elevator" render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">Ασανσέρ</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="requires_parking" render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">Πάρκινγκ</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="requires_pet_friendly" render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">Δεκτά κατοικίδια</FormLabel>
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Furnished & Heating */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="furnished_preference" render={({ field }) => (
                <FormItem>
                  <FormLabel>Επίπλωση</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Οποιαδήποτε" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="ANY">Οποιαδήποτε</SelectItem>
                      <SelectItem value="NO">Χωρίς επίπλωση</SelectItem>
                      <SelectItem value="PARTIALLY">Μερικώς επιπλωμένο</SelectItem>
                      <SelectItem value="FULLY">Πλήρως επιπλωμένο</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="energy_class_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ελάχιστη ενεργειακή κλάση</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Οποιαδήποτε" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="A_PLUS">Α+</SelectItem>
                      <SelectItem value="A">Α</SelectItem>
                      <SelectItem value="B">Β</SelectItem>
                      <SelectItem value="C">Γ</SelectItem>
                      <SelectItem value="D">Δ</SelectItem>
                      <SelectItem value="E">Ε</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Heating Preferences */}
            <FormField control={form.control} name="heating_preferences" render={({ field }) => (
              <FormItem>
                <FormLabel>Τύπος θέρμανσης</FormLabel>
                <FormControl>
                  <MultiSelect 
                    options={HEATING_OPTIONS} 
                    value={field.value || []} 
                    onChange={field.onChange}
                    placeholder="Επιλέξτε τύπους θέρμανσης"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Condition */}
            <FormField control={form.control} name="condition_preferences" render={({ field }) => (
              <FormItem>
                <FormLabel>Κατάσταση ακινήτου</FormLabel>
                <FormControl>
                  <MultiSelect 
                    options={CONDITION_OPTIONS} 
                    value={field.value || []} 
                    onChange={field.onChange}
                    placeholder="Επιλέξτε αποδεκτές καταστάσεις"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Amenities */}
            <FormField control={form.control} name="amenities_required" render={({ field }) => (
              <FormItem>
                <FormLabel>Απαραίτητες παροχές</FormLabel>
                <FormControl>
                  <MultiSelect 
                    options={AMENITIES_OPTIONS} 
                    value={field.value || []} 
                    onChange={field.onChange}
                    placeholder="Επιλέξτε απαραίτητες παροχές"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="amenities_preferred" render={({ field }) => (
              <FormItem>
                <FormLabel>Επιθυμητές παροχές (προαιρετικές)</FormLabel>
                <FormControl>
                  <MultiSelect 
                    options={AMENITIES_OPTIONS} 
                    value={field.value || []} 
                    onChange={field.onChange}
                    placeholder="Επιλέξτε επιθυμητές παροχές"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );
      
      case 6:
        if (!showFinancing) {
          return <p className="text-muted-foreground text-sm py-4">Η χρηματοδότηση αφορά μόνο Αγορά ή Επένδυση.</p>;
        }
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="financing_type" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.financingType")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.financingTypePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">{t("crm.CrmForm.financingType.CASH")}</SelectItem>
                    <SelectItem value="MORTGAGE">{t("crm.CrmForm.financingType.MORTGAGE")}</SelectItem>
                    <SelectItem value="PREAPPROVAL_PENDING">{t("crm.CrmForm.financingType.PREAPPROVAL_PENDING")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="preapproval_bank" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.preapprovalBank")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="needs_mortgage_help" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">{t("crm.CrmForm.fields.needsMortgageHelp")}</FormLabel>
              </FormItem>
            )} />
            
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.notes")}</FormLabel>
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
                <FormLabel className="!mt-0">{t("crm.CrmForm.fields.gdprConsent")}</FormLabel>
              </FormItem>
            )} />
            
            <FormField control={form.control} name="allow_marketing" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">{t("crm.CrmForm.fields.allowMarketing")}</FormLabel>
              </FormItem>
            )} />
            
            <FormField control={form.control} name="lead_source" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.leadSource")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.leadSourcePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="REFERRAL">{t("crm.CrmForm.leadSource.REFERRAL")}</SelectItem>
                    <SelectItem value="WEB">{t("crm.CrmForm.leadSource.WEB")}</SelectItem>
                    <SelectItem value="PORTAL">{t("crm.CrmForm.leadSource.PORTAL")}</SelectItem>
                    <SelectItem value="WALK_IN">{t("crm.CrmForm.leadSource.WALK_IN")}</SelectItem>
                    <SelectItem value="SOCIAL">{t("crm.CrmForm.leadSource.SOCIAL")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="assigned_to" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.agentOwner")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("common.selectAgent")} /></SelectTrigger></FormControl>
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-10">
        <div className="w-full max-w-[800px] text-sm">
          {/* Progress Bar */}
          <div className="pb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">{t("crm.CrmForm.title")}</h2>
              <AutosaveIndicator status={autosaveStatus} />
            </div>
            <ProgressBar 
              steps={STEPS} 
              currentStep={currentStep} 
              onStepClick={handleStepClick}
            />
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
            >
              {t("crm.CrmForm.buttons.previous")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} disabled={isLoading}>
                {t("crm.CrmForm.buttons.next")}
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Δημιουργία..." : t("crm.CrmForm.buttons.submit")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
