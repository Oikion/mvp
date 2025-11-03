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
import greekTranslations from "@/locales/el.json";

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
    required_error: t("CrmForm.validation.personTypeRequired", "Ο τύπος πελάτη είναι υποχρεωτικός"),
  }),
  full_name: z.string().optional(),
  company_name: z.string().optional(),
  primary_phone: z.string().optional(),
  primary_email: z.string().email(t("CrmForm.validation.emailInvalid", "Μη έγκυρο email")).optional().or(z.literal("")),
  intent: z.enum(["BUY", "RENT", "SELL", "LEASE", "INVEST"], {
    required_error: t("CrmForm.validation.intentRequired", "Ο σκοπός είναι υποχρεωτικός"),
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
  assigned_to: z.string().min(1, "Assigned agent is required"),
}).refine(
  (data) => {
    // Require phone OR email
    return !!(data.primary_phone && data.primary_phone.length) || !!(data.primary_email && data.primary_email.length);
  },
  {
    path: ["primary_email"],
    message: t("CrmForm.validation.phoneOrEmailRequired", "Το τηλέφωνο ή το email είναι υποχρεωτικό"),
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
    message: t("CrmForm.validation.nameRequired", "Το όνομα είναι υποχρεωτικό"),
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
    message: t("CrmForm.validation.afmInvalid", "Το ΑΦΜ πρέπει να έχει 9 ψηφία"),
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
  { value: "CALL", label: t("CrmForm.channels.CALL", "Κλήση") },
  { value: "SMS", label: t("CrmForm.channels.SMS", "SMS") },
  { value: "WHATSAPP", label: t("CrmForm.channels.WHATSAPP", "WhatsApp") },
  { value: "VIBER", label: t("CrmForm.channels.VIBER", "Viber") },
  { value: "EMAIL", label: t("CrmForm.channels.EMAIL", "Email") },
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
          changedData[typedKey] = currentData[typedKey];
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

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      // Determine client_name based on person_type
      const client_name = data.person_type === "COMPANY" 
        ? data.company_name || "Unnamed Company"
        : data.full_name || "Unnamed Client";

      await axios.post("/api/crm/clients", {
        ...data,
        client_name,
        draft_status: false, // Final submission
        id: draftId, // Update draft if exists
      });

      toast({
        title: t("CrmForm.buttons.submit", "Success"),
        description: "Πελάτης δημιουργήθηκε επιτυχώς",
      });
      
      form.reset();
      router.refresh();
      onFinish();
    } catch (error: any) {
      console.error("Error creating client:", error);
      const errorMessage = error?.response?.data?.error || error?.response?.data || error?.message || "Κάτι πήγε στραβά";
      toast({
        variant: "destructive",
        title: "Σφάλμα",
        description: typeof errorMessage === 'string' ? errorMessage : "Αποτυχία δημιουργίας πελάτη",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    const personType = form.watch("person_type");
    const intent = form.watch("intent");

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="person_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.personType", "Τύπος πελάτη")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("CrmForm.fields.personTypePlaceholder", "Επιλέξτε τύπο")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">{t("CrmForm.personType.INDIVIDUAL", "Ιδιώτης")}</SelectItem>
                      <SelectItem value="COMPANY">{t("CrmForm.personType.COMPANY", "Εταιρεία")}</SelectItem>
                      <SelectItem value="INVESTOR">{t("CrmForm.personType.INVESTOR", "Επενδυτής")}</SelectItem>
                      <SelectItem value="BROKER">{t("CrmForm.personType.BROKER", "Μεσίτης")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <ConditionalFormSection condition={personType === "INDIVIDUAL"}>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.fullName", "Ονοματεπώνυμο")} *</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("CrmForm.fields.fullNamePlaceholder", "Όνομα Επώνυμο")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ConditionalFormSection>
            
            <ConditionalFormSection condition={personType === "COMPANY"}>
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.companyName", "Επωνυμία Εταιρείας")} *</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("CrmForm.fields.companyNamePlaceholder", "Όνομα εταιρείας")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ConditionalFormSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primary_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.primaryPhone", "Κύριο τηλέφωνο")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("CrmForm.fields.primaryPhonePlaceholder", "+30 210 1234567")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primary_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.primaryEmail", "Κύριο email")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="email" placeholder={t("CrmForm.fields.primaryEmailPlaceholder", "email@example.com")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="intent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.intent", "Σκοπός")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("CrmForm.fields.intentPlaceholder", "Επιλέξτε σκοπό")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BUY">{t("CrmForm.intents.BUY", "Αγορά")}</SelectItem>
                      <SelectItem value="RENT">{t("CrmForm.intents.RENT", "Ενοικίαση")}</SelectItem>
                      <SelectItem value="SELL">{t("CrmForm.intents.SELL", "Πώληση")}</SelectItem>
                      <SelectItem value="LEASE">{t("CrmForm.intents.LEASE", "Εκμίσθωση")}</SelectItem>
                      <SelectItem value="INVEST">{t("CrmForm.intents.INVEST", "Επένδυση")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="secondary_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.secondaryPhone", "Εναλλακτικό τηλέφωνο")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="+30 210 1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secondary_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.secondaryEmail", "Εναλλακτικό email")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="channels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.channels", "Προτίμηση επικοινωνίας")}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={CHANNEL_OPTIONS}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder={t("CrmForm.fields.channelsPlaceholder", "Επιλέξτε κανάλια")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.language", "Γλώσσα")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || "el"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="el">Ελληνικά</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="afm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.afm", "ΑΦΜ")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("CrmForm.fields.afmPlaceholder", "9 ψηφία")} maxLength={9} {...field} />
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
                    <FormLabel>{t("CrmForm.fields.doy", "ΔΟΥ")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("CrmForm.fields.doyPlaceholder", "Επιλέξτε ΔΟΥ")} />
                        </SelectTrigger>
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
              name="id_doc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.idDoc", "ΑΔΤ/Διαβατήριο")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="Αριθμός ταυτότητας" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ConditionalFormSection condition={personType === "COMPANY"}>
              <FormField
                control={form.control}
                name="company_gemi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.companyGemi", "ΓΕΜΗ")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("CrmForm.fields.companyGemiPlaceholder", "Αριθμός ΓΕΜΗ")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ConditionalFormSection>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.purpose", "Σκοπός ακινήτου")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("CrmForm.fields.purposePlaceholder", "Επιλέξτε σκοπό")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="RESIDENTIAL">{t("CrmForm.purpose.RESIDENTIAL", "Κατοικία")}</SelectItem>
                      <SelectItem value="COMMERCIAL">{t("CrmForm.purpose.COMMERCIAL", "Επαγγελματικό")}</SelectItem>
                      <SelectItem value="LAND">{t("CrmForm.purpose.LAND", "Γη")}</SelectItem>
                      <SelectItem value="PARKING">{t("CrmForm.purpose.PARKING", "Χώρος Parking")}</SelectItem>
                      <SelectItem value="OTHER">{t("CrmForm.purpose.OTHER", "Άλλο")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="areas_of_interest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.areas", "Περιοχές ενδιαφέροντος")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="Π.χ. Κέντρο, Νότια Προάστια" {...field} 
                      onChange={(e) => {
                        const areas = e.target.value.split(",").map(a => a.trim()).filter(Boolean);
                        field.onChange(areas);
                      }}
                      value={field.value?.join(", ") || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.budgetMin", "Ελάχιστος προϋπολογισμός")} (€)</FormLabel>
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
                name="budget_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CrmForm.fields.budgetMax", "Μέγιστος προϋπολογισμός")} (€)</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="timeline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.timeline", "Πότε;")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("CrmForm.fields.timelinePlaceholder", "Επιλέξτε χρονοδιάγραμμα")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IMMEDIATE">{t("CrmForm.timeline.IMMEDIATE", "Άμεσα")}</SelectItem>
                      <SelectItem value="ONE_THREE_MONTHS">{t("CrmForm.timeline.ONE_THREE_MONTHS", "1-3 μήνες")}</SelectItem>
                      <SelectItem value="THREE_SIX_MONTHS">{t("CrmForm.timeline.THREE_SIX_MONTHS", "3-6 μήνες")}</SelectItem>
                      <SelectItem value="SIX_PLUS_MONTHS">{t("CrmForm.timeline.SIX_PLUS_MONTHS", "6+ μήνες")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 5:
        // Only show if intent is BUY or INVEST
        if (intent !== "BUY" && intent !== "INVEST") {
          return (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Αυτό το βήμα δεν είναι απαραίτητο για τον επιλεγμένο σκοπό.
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="financing_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.financingType", "Τύπος χρηματοδότησης")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("CrmForm.fields.financingTypePlaceholder", "Επιλέξτε τύπο")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH">{t("CrmForm.financingType.CASH", "Μετρητά")}</SelectItem>
                      <SelectItem value="MORTGAGE">{t("CrmForm.financingType.MORTGAGE", "Στεγαστικό")}</SelectItem>
                      <SelectItem value="PREAPPROVAL_PENDING">{t("CrmForm.financingType.PREAPPROVAL_PENDING", "Εκκρεμεί προέγκριση")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preapproval_bank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.preapprovalBank", "Τράπεζα προέγκρισης")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="Όνομα τράπεζας" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="needs_mortgage_help"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("CrmForm.fields.needsMortgageHelp", "Χρειάζεται βοήθεια με στεγαστικό")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.notes", "Σημειώσεις")}</FormLabel>
                  <FormControl>
                    <Textarea disabled={isLoading} placeholder="Επιπλέον σημειώσεις..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="gdpr_consent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("CrmForm.fields.gdprConsent", "Συναίνεση GDPR")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allow_marketing"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("CrmForm.fields.allowMarketing", "Επιτρέπω μάρκετινγκ")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lead_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.leadSource", "Πηγή")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("CrmForm.fields.leadSourcePlaceholder", "Πώς μας βρήκετε;")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="REFERRAL">{t("CrmForm.leadSource.REFERRAL", "Σύσταση")}</SelectItem>
                      <SelectItem value="WEB">{t("CrmForm.leadSource.WEB", "Ιστοσελίδα")}</SelectItem>
                      <SelectItem value="PORTAL">{t("CrmForm.leadSource.PORTAL", "Πύλη")}</SelectItem>
                      <SelectItem value="WALK_IN">{t("CrmForm.leadSource.WALK_IN", "Προσωπική επίσκεψη")}</SelectItem>
                      <SelectItem value="SOCIAL">{t("CrmForm.leadSource.SOCIAL", "Κοινωνικά δίκτυα")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("CrmForm.fields.agentOwner", "Ανατεθειμένος πράκτορας")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε πράκτορα" />
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
              <h2 className="text-xl font-semibold">{t("CrmForm.title", "Νέος Πελάτης")}</h2>
              <AutosaveIndicator status={autosaveStatus} />
            </div>
            <ProgressBar steps={STEPS} currentStep={currentStep} />
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
              {t("CrmForm.buttons.previous", "Προηγούμενο")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} disabled={isLoading}>
                {t("CrmForm.buttons.next", "Επόμενο")}
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Δημιουργία..." : t("CrmForm.buttons.submit", "Δημιουργία Πελάτη")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}

