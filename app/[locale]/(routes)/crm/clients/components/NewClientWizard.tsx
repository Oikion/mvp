"use client";

import { z } from "zod";
import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
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
import chatgptEl from "@/locales/el/chatgpt.json";
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
  chatgpt: chatgptEl,
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
    required_error: t("crm.crm.CrmForm.validation.personTypeRequired", "Ο τύπος πελάτη είναι υποχρεωτικός"),
  }),
  full_name: z.string().optional(),
  company_name: z.string().optional(),
  primary_phone: z.string().optional(),
  primary_email: z.string().email(t("validation.emailInvalid", "Μη έγκυρο email")).optional().or(z.literal("")),
  intent: z.enum(["BUY", "RENT", "SELL", "LEASE", "INVEST"], {
    required_error: t("crm.crm.CrmForm.validation.intentRequired", "Ο σκοπός είναι υποχρεωτικός"),
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
  areas_of_interest: z.array(z.string()).optional().default([]),
  budget_min: z.coerce.number().optional(),
  budget_max: z.coerce.number().optional(),
  timeline: z.enum(["IMMEDIATE", "ONE_THREE_MONTHS", "THREE_SIX_MONTHS", "SIX_PLUS_MONTHS"]).optional(),
  
  // Step 5: Χρηματοδότηση (conditional)
  financing_type: z.enum(["CASH", "MORTGAGE", "PREAPPROVAL_PENDING"]).optional(),
  preapproval_bank: z.string().optional().or(z.literal("")),
  needs_mortgage_help: z.boolean().optional().default(false),
  notes: z.string().optional().or(z.literal("")),
  
  // Step 6: Συναίνεση & GDPR
  gdpr_consent: z.boolean().optional().default(false),
  allow_marketing: z.boolean().optional().default(false),
  lead_source: z.enum(["REFERRAL", "WEB", "PORTAL", "WALK_IN", "SOCIAL"]).optional(),
  assigned_to: z.string().min(1, t("validation.assignedAgentRequired", "Ο ανατεθειμένος πράκτορας είναι υποχρεωτικός")),
}).refine(
  (data) => {
    // Require phone OR email
    return !!(data.primary_phone && data.primary_phone.length) || !!(data.primary_email && data.primary_email.length);
  },
  {
    path: ["primary_email"],
    message: t("crm.CrmForm.validation.phoneOrEmailRequired", "Το τηλέφωνο ή το email είναι υποχρεωτικό"),
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
    message: t("crm.CrmForm.validation.nameRequired", "Το όνομα είναι υποχρεωτικό"),
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
    message: t("crm.CrmForm.validation.afmInvalid", "Το ΑΦΜ πρέπει να έχει 9 ψηφία"),
  }
);

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, title: "Βασικά", description: "Βασικές πληροφορίες πελάτη" },
  { id: 2, title: "Επικοινωνία", description: "Προτιμήσεις επικοινωνίας" },
  { id: 3, title: "Νομικά", description: "Νομικά στοιχεία (προαιρετικά)" },
  { id: 4, title: "Ανάγκες / Προτιμήσεις", description: "Ανάγκες και προτιμήσεις ακινήτου" },
  { id: 5, title: "Χρηματοδότηση", description: "Στοιχεία χρηματοδότησης" },
  { id: 6, title: "Συναίνεση & GDPR", description: "Συναίνεση και προσωπικά δεδομένα" },
];

const CHANNEL_OPTIONS: MultiSelectOption[] = [
  { value: "CALL", label: t("crm.CrmForm.channels.CALL", "Κλήση") },
  { value: "SMS", label: t("crm.CrmForm.channels.SMS", "SMS") },
  { value: "WHATSAPP", label: t("crm.CrmForm.channels.WHATSAPP", "WhatsApp") },
  { value: "VIBER", label: t("crm.CrmForm.channels.VIBER", "Viber") },
  { value: "EMAIL", label: t("crm.CrmForm.channels.EMAIL", "Email") },
];

export function NewClientWizard({ users, onFinish, initialDraftId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
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
      areas_of_interest: [],
      budget_min: undefined,
      budget_max: undefined,
      timeline: undefined,
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
        fieldsToValidate = ["financing_type", "preapproval_bank", "needs_mortgage_help", "notes"];
        break;
      case 6:
        fieldsToValidate = ["gdpr_consent", "allow_marketing", "lead_source", "assigned_to"];
        break;
    }

    const result = await form.trigger(fieldsToValidate as any);
    return result;
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
    if (isValid) {
      setCurrentStep(stepId);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      // If we have a draft, update it to final; otherwise create new
      if (draftId) {
        await axios.put(`/api/crm/clients/${draftId}`, {
          ...data,
          draft_status: false,
        });
      } else {
        await axios.post("/api/crm/clients", {
          ...data,
          draft_status: false,
        });
      }
      
      toast({
        variant: "success",
        title: t("common.success", "Επιτυχία"),
        description: t("common.clientCreated", "Ο πελάτης δημιουργήθηκε επιτυχώς"),
      });
      
      router.refresh();
      onFinish();
    } catch (error) {
      console.error("Failed to create client:", error);
      toast({
        variant: "destructive",
        title: t("common.error", "Σφάλμα"),
        description: t("common.clientCreationFailed", "Αποτυχία δημιουργίας πελάτη"),
      });
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
                <FormLabel>{t("crm.CrmForm.fields.personType", "Τύπος πελάτη")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.personTypePlaceholder", "Επιλέξτε τύπο")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">{t("crm.CrmForm.personType.INDIVIDUAL", "Ιδιώτης")}</SelectItem>
                    <SelectItem value="COMPANY">{t("crm.CrmForm.personType.COMPANY", "Εταιρεία")}</SelectItem>
                    <SelectItem value="INVESTOR">{t("crm.CrmForm.personType.INVESTOR", "Επενδυτής")}</SelectItem>
                    <SelectItem value="BROKER">{t("crm.CrmForm.personType.BROKER", "Μεσίτης/Πράκτορας")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            
            <ConditionalFormSection condition={personType === "INDIVIDUAL" || personType === "INVESTOR" || personType === "BROKER"}>
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.fullName", "Ονοματεπώνυμο")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.fullNamePlaceholder", "Όνομα Επώνυμο")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </ConditionalFormSection>
            
            <ConditionalFormSection condition={personType === "COMPANY"}>
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.companyName", "Επωνυμία Εταιρείας")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.companyNamePlaceholder", "Όνομα εταιρείας")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </ConditionalFormSection>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="primary_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.primaryPhone", "Κύριο τηλέφωνο")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.primaryPhonePlaceholder", "+30 210 1234567")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="primary_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.primaryEmail", "Κύριο email")}</FormLabel>
                  <FormControl><Input {...field} type="email" placeholder={t("crm.CrmForm.fields.primaryEmailPlaceholder", "email@example.com")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="intent" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.intent", "Σκοπός")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.intentPlaceholder", "Επιλέξτε σκοπό")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="BUY">{t("crm.CrmForm.intents.BUY", "Αγορά")}</SelectItem>
                    <SelectItem value="RENT">{t("crm.CrmForm.intents.RENT", "Ενοικίαση")}</SelectItem>
                    <SelectItem value="SELL">{t("crm.CrmForm.intents.SELL", "Πώληση")}</SelectItem>
                    <SelectItem value="LEASE">{t("crm.CrmForm.intents.LEASE", "Εκμίσθωση")}</SelectItem>
                    <SelectItem value="INVEST">{t("crm.CrmForm.intents.INVEST", "Επένδυση")}</SelectItem>
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
                  <FormLabel>{t("crm.CrmForm.fields.secondaryPhone", "Εναλλακτικό τηλέφωνο")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="secondary_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.secondaryEmail", "Εναλλακτικό email")}</FormLabel>
                  <FormControl><Input {...field} type="email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="channels" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.channels", "Προτίμηση επικοινωνίας")}</FormLabel>
                <FormControl>
                  <MultiSelect 
                    options={CHANNEL_OPTIONS} 
                    value={field.value || []} 
                    onChange={field.onChange}
                    placeholder={t("crm.CrmForm.fields.channelsPlaceholder", "Επιλέξτε κανάλια")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="language" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.language", "Γλώσσα")}</FormLabel>
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
                  <FormLabel>{t("crm.CrmForm.fields.afm", "ΑΦΜ")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.afmPlaceholder", "9 ψηφία")} maxLength={9} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="doy" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.doy", "ΔΟΥ")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.doyPlaceholder", "Επιλέξτε ΔΟΥ")} /></SelectTrigger></FormControl>
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
                <FormLabel>{t("crm.CrmForm.fields.idDoc", "ΑΔΤ/Διαβατήριο")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <ConditionalFormSection condition={personType === "COMPANY"}>
              <FormField control={form.control} name="company_gemi" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.companyGemi", "ΓΕΜΗ")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("crm.CrmForm.fields.companyGemiPlaceholder", "Αριθμός ΓΕΜΗ")} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </ConditionalFormSection>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.purpose", "Σκοπός ακινήτου")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.purposePlaceholder", "Επιλέξτε σκοπό")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="RESIDENTIAL">{t("crm.CrmForm.purpose.RESIDENTIAL", "Κατοικία")}</SelectItem>
                    <SelectItem value="COMMERCIAL">{t("crm.CrmForm.purpose.COMMERCIAL", "Επαγγελματικό")}</SelectItem>
                    <SelectItem value="LAND">{t("crm.CrmForm.purpose.LAND", "Γη")}</SelectItem>
                    <SelectItem value="PARKING">{t("crm.CrmForm.purpose.PARKING", "Χώρος Parking")}</SelectItem>
                    <SelectItem value="OTHER">{t("crm.CrmForm.purpose.OTHER", "Άλλο")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="budget_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.budgetMin", "Ελάχιστος προϋπολογισμός")}</FormLabel>
                  <FormControl><Input {...field} type="number" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="budget_max" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.CrmForm.fields.budgetMax", "Μέγιστος προϋπολογισμός")}</FormLabel>
                  <FormControl><Input {...field} type="number" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="timeline" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.timeline", "Πότε;")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.timelinePlaceholder", "Επιλέξτε χρονοδιάγραμμα")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">{t("crm.CrmForm.timeline.IMMEDIATE", "Άμεσα")}</SelectItem>
                    <SelectItem value="ONE_THREE_MONTHS">{t("crm.CrmForm.timeline.ONE_THREE_MONTHS", "1-3 μήνες")}</SelectItem>
                    <SelectItem value="THREE_SIX_MONTHS">{t("crm.CrmForm.timeline.THREE_SIX_MONTHS", "3-6 μήνες")}</SelectItem>
                    <SelectItem value="SIX_PLUS_MONTHS">{t("crm.CrmForm.timeline.SIX_PLUS_MONTHS", "6+ μήνες")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );
      
      case 5:
        if (!showFinancing) {
          return <p className="text-muted-foreground text-sm py-4">Η χρηματοδότηση αφορά μόνο Αγορά ή Επένδυση.</p>;
        }
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="financing_type" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.financingType", "Τύπος χρηματοδότησης")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.financingTypePlaceholder", "Επιλέξτε τύπο")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">{t("crm.CrmForm.financingType.CASH", "Μετρητά")}</SelectItem>
                    <SelectItem value="MORTGAGE">{t("crm.CrmForm.financingType.MORTGAGE", "Στεγαστικό")}</SelectItem>
                    <SelectItem value="PREAPPROVAL_PENDING">{t("crm.CrmForm.financingType.PREAPPROVAL_PENDING", "Εκκρεμεί προέγκριση")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="preapproval_bank" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.preapprovalBank", "Τράπεζα προέγκρισης")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="needs_mortgage_help" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">{t("crm.CrmForm.fields.needsMortgageHelp", "Χρειάζεται βοήθεια με στεγαστικό")}</FormLabel>
              </FormItem>
            )} />
            
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.notes", "Σημειώσεις")}</FormLabel>
                <FormControl><Textarea {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        );
      
      case 6:
        return (
          <div className="space-y-4">
            <FormField control={form.control} name="gdpr_consent" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">{t("crm.CrmForm.fields.gdprConsent", "Συναίνεση GDPR")}</FormLabel>
              </FormItem>
            )} />
            
            <FormField control={form.control} name="allow_marketing" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">{t("crm.CrmForm.fields.allowMarketing", "Επιτρέπω μάρκετινγκ")}</FormLabel>
              </FormItem>
            )} />
            
            <FormField control={form.control} name="lead_source" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.leadSource", "Πηγή")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("crm.CrmForm.fields.leadSourcePlaceholder", "Πώς μας βρήκετε;")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="REFERRAL">{t("crm.CrmForm.leadSource.REFERRAL", "Σύσταση")}</SelectItem>
                    <SelectItem value="WEB">{t("crm.CrmForm.leadSource.WEB", "Ιστοσελίδα")}</SelectItem>
                    <SelectItem value="PORTAL">{t("crm.CrmForm.leadSource.PORTAL", "Πύλη")}</SelectItem>
                    <SelectItem value="WALK_IN">{t("crm.CrmForm.leadSource.WALK_IN", "Προσωπική επίσκεψη")}</SelectItem>
                    <SelectItem value="SOCIAL">{t("crm.CrmForm.leadSource.SOCIAL", "Κοινωνικά δίκτυα")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="assigned_to" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("crm.CrmForm.fields.agentOwner", "Ανατεθειμένος πράκτορας/μεσίτης")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("common.selectAgent", "Επιλέξτε πράκτορα")} /></SelectTrigger></FormControl>
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
        <div className="w-[800px] text-sm">
          {/* Progress Bar */}
          <div className="pb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">{t("crm.CrmForm.title", "Νέος Πελάτης")}</h2>
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
              {t("crm.CrmForm.buttons.previous", "Προηγούμενο")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} disabled={isLoading}>
                {t("crm.CrmForm.buttons.next", "Επόμενο")}
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Δημιουργία..." : t("crm.CrmForm.buttons.submit", "Δημιουργία Πελάτη")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
