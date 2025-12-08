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

type Props = {
  users: any[];
  onFinish: () => void;
  initialDraftId?: string;
};

const formSchema = z.object({
  // Step 1: Βασικά
  property_type: z.enum(["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE", "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"], {
    required_error: t("mls.PropertyForm.validation.propertyTypeRequired", "Ο τύπος ακινήτου είναι υποχρεωτικός"),
  }),
  transaction_type: z.enum(["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"], {
    required_error: t("mls.PropertyForm.validation.transactionTypeRequired", "Ο τύπος συναλλαγής είναι υποχρεωτικός"),
  }),
  property_status: z.enum(["AVAILABLE", "RESERVED", "NEGOTIATION", "RENTED", "SOLD"]).optional(),
  is_exclusive: z.boolean().optional().default(false),
  
  // Step 2: Τοποθεσία
  municipality: z.string().min(1, t("mls.PropertyForm.validation.municipalityRequired", "Ο δήμος είναι υποχρεωτικός")),
  area: z.string().optional(),
  postal_code: z.string().optional(),
  address_privacy_level: z.enum(["EXACT", "PARTIAL", "HIDDEN"]).optional(),
  
  // Step 3: Επιφάνειες (conditional)
  size_net_sqm: z.coerce.number().optional(),
  size_gross_sqm: z.coerce.number().optional(),
  floor: z.string().optional(),
  floors_total: z.coerce.number().optional(),
  plot_size_sqm: z.coerce.number().optional(),
  inside_city_plan: z.boolean().optional(),
  build_coefficient: z.coerce.number().optional(),
  frontage_m: z.coerce.number().optional(),
  
  // Step 4: Χαρακτηριστικά
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  heating_type: z.enum(["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"]).optional(),
  energy_cert_class: z.enum(["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H", "IN_PROGRESS"]).optional(),
  
  // Step 5: Κατάσταση & Έτος
  year_built: z.coerce.number().optional(),
  renovated_year: z.coerce.number().optional(),
  condition: z.enum(["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"]).optional(),
  elevator: z.boolean().optional(),
  
  // Step 6: Νομιμότητα
  building_permit_no: z.string().optional().or(z.literal("")),
  building_permit_year: z.coerce.number().optional(),
  land_registry_kaek: z.string().optional().or(z.literal("")),
  legalization_status: z.enum(["LEGALIZED", "IN_PROGRESS", "UNDECLARED"]).optional(),
  etaireia_diaxeirisis: z.string().optional().or(z.literal("")),
  monthly_common_charges: z.coerce.number().optional(),
  
  // Step 7: Παροχές
  amenities: z.array(z.string()).optional().default([]),
  orientation: z.array(z.string()).optional().default([]),
  furnished: z.enum(["NO", "PARTIALLY", "FULLY"]).optional(),
  accessibility: z.string().optional().or(z.literal("")),
  
  // Step 8: Τιμή & Διαθεσιμότητα
  price: z.coerce.number().min(0, t("mls.PropertyForm.validation.priceRequired", "Η τιμή είναι υποχρεωτική")),
  price_type: z.enum(["RENTAL", "SALE", "PER_ACRE", "PER_SQM"]).optional(),
  available_from: z.string().optional(),
  accepts_pets: z.boolean().optional(),
  min_lease_months: z.coerce.number().optional(),
  
  // Step 9: Media & Δημοσίευση
  virtual_tour_url: z.string().url().optional().or(z.literal("")),
  portal_visibility: z.enum(["PRIVATE", "SELECTED", "PUBLIC"]).optional(),
  assigned_to: z.string().min(1, t("validation.assignedAgentRequired", "Ο ανατεθειμένος πράκτορας είναι υποχρεωτικός")),
}).refine(
  (data) => {
    // Require area OR postal_code
    return !!(data.area && data.area.length) || !!(data.postal_code && data.postal_code.length);
  },
  {
    path: ["area"],
    message: t("mls.PropertyForm.validation.areaOrPostalCodeRequired", "Η περιοχή ή το ΤΚ είναι υποχρεωτικό"),
  }
).refine(
  (data) => {
    // Require size based on property type
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
    message: t("mls.PropertyForm.validation.sizeRequired", "Το μέγεθος είναι υποχρεωτικό"),
  }
).refine(
  (data) => {
    // Postal code validation: 5 digits if provided
    if (data.postal_code && data.postal_code.length > 0) {
      return /^\d{5}$/.test(data.postal_code);
    }
    return true;
  },
  {
    path: ["postal_code"],
    message: t("mls.PropertyForm.validation.postalCodeInvalid", "Το ΤΚ πρέπει να έχει 5 ψηφία"),
  }
);

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, title: "Βασικά", description: "Βασικές πληροφορίες ακινήτου" },
  { id: 2, title: "Τοποθεσία", description: "Τοποθεσία ακινήτου" },
  { id: 3, title: "Επιφάνειες & Όροφοι", description: "Επιφάνειες και χαρακτηριστικά βάσει τύπου ακινήτου" },
  { id: 4, title: "Χαρακτηριστικά", description: "Χαρακτηριστικά ακινήτου" },
  { id: 5, title: "Κατάσταση & Έτος", description: "Κατάσταση και έτος κατασκευής" },
  { id: 6, title: "Νομιμότητα & Έγγραφα", description: "Νομικά στοιχεία (προαιρετικά)" },
  { id: 7, title: "Παροχές & Extras", description: "Παροχές και επιπλέον χαρακτηριστικά" },
  { id: 8, title: "Τιμή & Διαθεσιμότητα", description: "Τιμή και διαθεσιμότητα" },
  { id: 9, title: "Media & Δημοσίευση", description: "Φωτογραφίες και δημοσίευση" },
];

const FLOOR_OPTIONS = [
  { value: "BASEMENT", label: t("mls.PropertyForm.floor.BASEMENT", "Υπόγειο") },
  { value: "GROUND", label: t("mls.PropertyForm.floor.GROUND", "Ισόγειο") },
  { value: "1ST", label: t("mls.PropertyForm.floor.1ST", "1ος") },
  { value: "2ND", label: t("mls.PropertyForm.floor.2ND", "2ος") },
  { value: "3RD", label: t("mls.PropertyForm.floor.3RD", "3ος") },
  { value: "4TH", label: t("mls.PropertyForm.floor.4TH", "4ος") },
  { value: "5TH", label: t("mls.PropertyForm.floor.5TH", "5ος") },
  { value: "6TH", label: t("mls.PropertyForm.floor.6TH", "6ος") },
  { value: "7TH", label: t("mls.PropertyForm.floor.7TH", "7ος") },
  { value: "8TH", label: t("mls.PropertyForm.floor.8TH", "8ος") },
  { value: "9TH", label: t("mls.PropertyForm.floor.9TH", "9ος") },
  { value: "10TH", label: t("mls.PropertyForm.floor.10TH", "10ος") },
  { value: "PENTHOUSE", label: t("mls.PropertyForm.floor.PENTHOUSE", "Ρετιρέ") },
];

const AMENITY_OPTIONS: MultiSelectOption[] = [
  { value: "AC", label: t("mls.PropertyForm.amenities.AC", "Κλιματισμός") },
  { value: "FIREPLACE", label: t("mls.PropertyForm.amenities.FIREPLACE", "Τζάκι") },
  { value: "PARKING", label: t("mls.PropertyForm.amenities.PARKING", "Parking") },
  { value: "STORAGE", label: t("mls.PropertyForm.amenities.STORAGE", "Αποθήκη") },
  { value: "SOLAR", label: t("mls.PropertyForm.amenities.SOLAR", "Ηλιακός") },
  { value: "DOUBLE_GLAZING", label: t("mls.PropertyForm.amenities.DOUBLE_GLAZING", "Διπλά τζάμια") },
  { value: "VIEW", label: t("mls.PropertyForm.amenities.VIEW", "Θέα") },
  { value: "BALCONY", label: t("mls.PropertyForm.amenities.BALCONY", "Βεράντα") },
  { value: "GARDEN", label: t("mls.PropertyForm.amenities.GARDEN", "Κήπος") },
  { value: "PET_FRIENDLY", label: t("mls.PropertyForm.amenities.PET_FRIENDLY", "Pet-friendly") },
  { value: "FRONTAGE", label: t("mls.PropertyForm.amenities.FRONTAGE", "Πρόσοψη") },
];

const ORIENTATION_OPTIONS: MultiSelectOption[] = [
  { value: "N", label: t("mls.PropertyForm.orientation.N", "Βόρεια") },
  { value: "S", label: t("mls.PropertyForm.orientation.S", "Νότια") },
  { value: "E", label: t("mls.PropertyForm.orientation.E", "Ανατολικά") },
  { value: "W", label: t("mls.PropertyForm.orientation.W", "Δυτικά") },
];

export function NewPropertyWizard({ users, onFinish, initialDraftId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedData, setLastSavedData] = useState<Partial<FormValues>>({});
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_type: undefined,
      transaction_type: undefined,
      property_status: "AVAILABLE",
      is_exclusive: false,
      municipality: "",
      area: "",
      postal_code: "",
      address_privacy_level: "PARTIAL",
      size_net_sqm: undefined,
      size_gross_sqm: undefined,
      floor: undefined,
      floors_total: undefined,
      plot_size_sqm: undefined,
      inside_city_plan: undefined,
      build_coefficient: undefined,
      frontage_m: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      heating_type: undefined,
      energy_cert_class: undefined,
      year_built: undefined,
      renovated_year: undefined,
      condition: undefined,
      elevator: false,
      building_permit_no: "",
      building_permit_year: undefined,
      land_registry_kaek: "",
      legalization_status: undefined,
      etaireia_diaxeirisis: "",
      monthly_common_charges: undefined,
      amenities: [],
      orientation: [],
      furnished: undefined,
      accessibility: "",
      price: undefined,
      price_type: undefined,
      available_from: "",
      accepts_pets: false,
      min_lease_months: undefined,
      virtual_tour_url: "",
      portal_visibility: "PUBLIC",
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
      const response = await axios.post("/api/mls/properties/draft", {
        id: draftId,
        property_name: data.property_type || "Draft Property",
        ...data,
      });
      
      if (response.data?.property?.id && !draftId) {
        setDraftId(response.data.property.id);
      }
      
      setAutosaveStatus("saved");
      setTimeout(() => setAutosaveStatus("idle"), 2000);
    } catch (error: any) {
      console.error("Failed to save draft:", error);
      // Only show error toast for actual failures, not validation issues
      const errorMessage = error?.response?.data?.error || error?.response?.data?.details || error?.message;
      if (error?.response?.status === 500) {
        console.error("Draft save error details:", errorMessage);
      }
      setAutosaveStatus("failed");
      setTimeout(() => setAutosaveStatus("idle"), 3000);
    }
  }, [draftId]);

  useEffect(() => {
    if (debouncedValues && currentStep > 0 && hasUserInteracted) {
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
  }, [debouncedValues, currentStep, form, saveDraft, lastSavedData, hasUserInteracted]);

  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    
    switch (step) {
      case 1:
        fieldsToValidate = ["property_type", "transaction_type", "property_status", "is_exclusive"];
        break;
      case 2:
        fieldsToValidate = ["municipality", "area", "postal_code", "address_privacy_level"];
        break;
      case 3:
        fieldsToValidate = ["size_net_sqm", "size_gross_sqm", "floor", "floors_total", "plot_size_sqm", "inside_city_plan"];
        break;
      case 4:
        fieldsToValidate = ["bedrooms", "bathrooms", "heating_type", "energy_cert_class"];
        break;
      case 5:
        fieldsToValidate = ["year_built", "renovated_year", "condition", "elevator"];
        break;
      case 6:
        fieldsToValidate = ["building_permit_no", "land_registry_kaek", "legalization_status", "monthly_common_charges"];
        break;
      case 7:
        fieldsToValidate = ["amenities", "orientation", "furnished", "accessibility"];
        break;
      case 8:
        fieldsToValidate = ["price", "price_type", "available_from", "accepts_pets"];
        break;
      case 9:
        fieldsToValidate = ["virtual_tour_url", "portal_visibility", "assigned_to"];
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
      const property_name = `${data.property_type || "Property"} - ${data.municipality || ""} ${data.area || ""}`.trim();

      const response = await axios.post("/api/mls/properties", {
        ...data,
        property_name,
        draft_status: false,
        id: draftId, // Update existing draft if exists
      });

      toast({
        variant: "success",
        title: "Success",
        description: "Ακίνητο δημιουργήθηκε επιτυχώς",
      });
      
      form.reset();
      router.refresh();
      onFinish();
    } catch (error: any) {
      console.error("Error creating property:", error);
      const errorData = error?.response?.data;
      const errorMessage = errorData?.error || errorData?.details || error?.message || "Κάτι πήγε στραβά";
      
      toast({
        variant: "destructive",
        title: "Σφάλμα",
        description: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    const propertyType = form.watch("property_type");
    const transactionType = form.watch("transaction_type");
    const isResidentialOrCommercial = ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE"].includes(propertyType || "");
    const isLand = ["PLOT", "FARM"].includes(propertyType || "");

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="property_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.propertyType", "Τύπος ακινήτου")} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("mls.PropertyForm.fields.propertyTypePlaceholder", "Επιλέξτε τύπο")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="APARTMENT">{t("mls.PropertyForm.propertyType.APARTMENT", "Διαμέρισμα")}</SelectItem>
                      <SelectItem value="HOUSE">{t("mls.PropertyForm.propertyType.HOUSE", "Μονοκατοικία")}</SelectItem>
                      <SelectItem value="MAISONETTE">{t("mls.PropertyForm.propertyType.MAISONETTE", "Μεζονέτα")}</SelectItem>
                      <SelectItem value="COMMERCIAL">{t("mls.PropertyForm.propertyType.COMMERCIAL", "Επαγγελματικός χώρος")}</SelectItem>
                      <SelectItem value="WAREHOUSE">{t("mls.PropertyForm.propertyType.WAREHOUSE", "Αποθήκη")}</SelectItem>
                      <SelectItem value="PARKING">{t("mls.PropertyForm.propertyType.PARKING", "Parking")}</SelectItem>
                      <SelectItem value="PLOT">{t("mls.PropertyForm.propertyType.PLOT", "Οικόπεδο")}</SelectItem>
                      <SelectItem value="FARM">{t("mls.PropertyForm.propertyType.FARM", "Αγροτεμάχιο")}</SelectItem>
                      <SelectItem value="INDUSTRIAL">{t("mls.PropertyForm.propertyType.INDUSTRIAL", "Βιομηχανικό")}</SelectItem>
                      <SelectItem value="OTHER">{t("mls.PropertyForm.propertyType.OTHER", "Άλλο")}</SelectItem>
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
                  <FormLabel>{t("mls.PropertyForm.fields.transactionType", "Τύπος συναλλαγής")} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("mls.PropertyForm.fields.transactionTypePlaceholder", "Επιλέξτε τύπο")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SALE">{t("mls.PropertyForm.transactionType.SALE", "Πώληση")}</SelectItem>
                      <SelectItem value="RENTAL">{t("mls.PropertyForm.transactionType.RENTAL", "Ενοικίαση")}</SelectItem>
                      <SelectItem value="SHORT_TERM">{t("mls.PropertyForm.transactionType.SHORT_TERM", "Βραχυχρόνια")}</SelectItem>
                      <SelectItem value="EXCHANGE">{t("mls.PropertyForm.transactionType.EXCHANGE", "Αντιπαροχή")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="property_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.status", "Κατάσταση")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "AVAILABLE"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">{t("mls.PropertyForm.status.AVAILABLE", "Διαθέσιμο")}</SelectItem>
                        <SelectItem value="RESERVED">{t("mls.PropertyForm.status.RESERVED", "Δεσμευμένο")}</SelectItem>
                        <SelectItem value="NEGOTIATION">{t("mls.PropertyForm.status.NEGOTIATION", "Σε διαπραγμάτευση")}</SelectItem>
                        <SelectItem value="RENTED">{t("mls.PropertyForm.status.RENTED", "Μισθωμένο")}</SelectItem>
                        <SelectItem value="SOLD">{t("mls.PropertyForm.status.SOLD", "Πωλημένο")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_exclusive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t("mls.PropertyForm.fields.isExclusive", "Αποκλειστικότητα")}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.municipality", "Δήμος")} *</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("mls.PropertyForm.fields.municipalityPlaceholder", "Επιλέξτε δήμο")} {...field} />
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
                    <FormLabel>{t("mls.PropertyForm.fields.area", "Περιοχή/Γειτονιά")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("mls.PropertyForm.fields.areaPlaceholder", "Επιλέξτε περιοχή")} {...field} />
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
                    <FormLabel>{t("mls.PropertyForm.fields.postalCode", "ΤΚ")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("mls.PropertyForm.fields.postalCodePlaceholder", "5 ψηφία")} maxLength={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address_privacy_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.addressPrivacyLevel", "Επίπεδο προστασίας διεύθυνσης")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "PARTIAL"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EXACT">{t("mls.PropertyForm.addressPrivacyLevel.EXACT", "Ακριβής διεύθυνση")}</SelectItem>
                      <SelectItem value="PARTIAL">{t("mls.PropertyForm.addressPrivacyLevel.PARTIAL", "Μερική")}</SelectItem>
                      <SelectItem value="HIDDEN">{t("mls.PropertyForm.addressPrivacyLevel.HIDDEN", "Κρυφή")}</SelectItem>
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
            {isResidentialOrCommercial ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="size_net_sqm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("mls.PropertyForm.fields.sizeNetSqm", "Καθαρά τ.μ.")} *</FormLabel>
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
                    name="size_gross_sqm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("mls.PropertyForm.fields.sizeGrossSqm", "Μεικτά τ.μ.")}</FormLabel>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("mls.PropertyForm.fields.floor", "Όροφος")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("mls.PropertyForm.fields.floorPlaceholder", "Επιλέξτε όροφο")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FLOOR_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floors_total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("mls.PropertyForm.fields.floorsTotal", "Σύνολο ορόφων κτιρίου")}</FormLabel>
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
                </div>
              </>
            ) : isLand ? (
              <>
                <FormField
                  control={form.control}
                  name="plot_size_sqm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mls.PropertyForm.fields.plotSizeSqm", "Εμβαδόν")} *</FormLabel>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inside_city_plan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("mls.PropertyForm.fields.insideCityPlan", "Εντός/Εκτός σχεδίου")} *</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === "true")} value={field.value !== undefined ? field.value.toString() : undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Επιλέξτε" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Εντός</SelectItem>
                            <SelectItem value="false">Εκτός</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="build_coefficient"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("mls.PropertyForm.fields.buildCoefficient", "Συντελεστής δόμησης")}</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} type="number" step="0.1" placeholder="0.0" {...field}
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
                  name="frontage_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mls.PropertyForm.fields.frontageM", "Πρόσοψη (μέτρα)")}</FormLabel>
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
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">
                <p className="mb-2">Τα πεδία εμφανίζονται βάσει του τύπου ακινήτου που επιλέξατε στο βήμα 1.</p>
                <p>Για parking, βιομηχανικό ή άλλο τύπο, μπορείτε να συνεχίσετε στο επόμενο βήμα.</p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {isResidentialOrCommercial && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mls.PropertyForm.fields.bedrooms", "Υπνοδωμάτια")}</FormLabel>
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
                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mls.PropertyForm.fields.bathrooms", "Μπάνια")}</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} type="number" step="0.5" placeholder="0" {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="heating_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.heatingType", "Τύπος θέρμανσης")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("mls.PropertyForm.fields.heatingTypePlaceholder", "Επιλέξτε τύπο")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AUTONOMOUS">{t("mls.PropertyForm.heatingType.AUTONOMOUS", "Αυτόνομη")}</SelectItem>
                        <SelectItem value="CENTRAL">{t("mls.PropertyForm.heatingType.CENTRAL", "Κεντρική")}</SelectItem>
                        <SelectItem value="NATURAL_GAS">{t("mls.PropertyForm.heatingType.NATURAL_GAS", "Φυσικό αέριο")}</SelectItem>
                        <SelectItem value="HEAT_PUMP">{t("mls.PropertyForm.heatingType.HEAT_PUMP", "Αντλία θερμότητας")}</SelectItem>
                        <SelectItem value="ELECTRIC">{t("mls.PropertyForm.heatingType.ELECTRIC", "Ηλεκτρική")}</SelectItem>
                        <SelectItem value="NONE">{t("mls.PropertyForm.heatingType.NONE", "Χωρίς")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="energy_cert_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.energyCertClass", "ΠΕΑ")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("mls.PropertyForm.fields.energyCertClassPlaceholder", "Επιλέξτε κλάση")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A_PLUS">A+</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                        <SelectItem value="H">H</SelectItem>
                        <SelectItem value="IN_PROGRESS">{t("mls.PropertyForm.energyCertClass.IN_PROGRESS", "Σε εξέλιξη")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year_built"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.yearBuilt", "Έτος κατασκευής")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="2020" {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="renovated_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.renovatedYear", "Έτος ανακαίνισης")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="2020" {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.condition", "Κατάσταση")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("mls.PropertyForm.fields.conditionPlaceholder", "Επιλέξτε κατάσταση")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EXCELLENT">{t("mls.PropertyForm.condition.EXCELLENT", "Άριστη")}</SelectItem>
                        <SelectItem value="VERY_GOOD">{t("mls.PropertyForm.condition.VERY_GOOD", "Πολύ καλή")}</SelectItem>
                        <SelectItem value="GOOD">{t("mls.PropertyForm.condition.GOOD", "Καλή")}</SelectItem>
                        <SelectItem value="NEEDS_RENOVATION">{t("mls.PropertyForm.condition.NEEDS_RENOVATION", "Χρειάζεται ανακαίνιση")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isResidentialOrCommercial && (
                <FormField
                  control={form.control}
                  name="elevator"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("mls.PropertyForm.fields.elevator", "Ανελκυστήρας")}</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="building_permit_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.buildingPermitNo", "Αριθμός άδειας οικοδομής")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="Αριθμός" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="building_permit_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.buildingPermitYear", "Έτος άδειας")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="2020" {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
              name="land_registry_kaek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.landRegistryKaek", "ΚΑΕΚ")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="ΚΑΕΚ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="legalization_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.legalizationStatus", "Κατάσταση νομιμοποίησης")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("mls.PropertyForm.fields.legalizationStatusPlaceholder", "Επιλέξτε κατάσταση")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LEGALIZED">{t("mls.PropertyForm.legalizationStatus.LEGALIZED", "Τακτοποιημένο Ν.4178/4495")}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{t("mls.PropertyForm.legalizationStatus.IN_PROGRESS", "Σε εξέλιξη")}</SelectItem>
                      <SelectItem value="UNDECLARED">{t("mls.PropertyForm.legalizationStatus.UNDECLARED", "Μη δηλωμένο")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="etaireia_diaxeirisis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.etaireiaDiaxeirisis", "Εταιρεία διαχείρισης")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="Όνομα εταιρείας" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthly_common_charges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.monthlyCommonCharges", "Κοινόχρηστα (€/μήνα)")}</FormLabel>
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
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="amenities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.amenities", "Παροχές")}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={AMENITY_OPTIONS}
                      value={Array.isArray(field.value) ? field.value : []}
                      onChange={field.onChange}
                      placeholder={t("mls.PropertyForm.fields.amenitiesPlaceholder", "Επιλέξτε παροχές")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orientation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.orientation", "Προσανατολισμός")}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={ORIENTATION_OPTIONS}
                      value={Array.isArray(field.value) ? field.value : []}
                      onChange={field.onChange}
                      placeholder={t("mls.PropertyForm.fields.orientationPlaceholder", "Επιλέξτε προσανατολισμό")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="furnished"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.furnished", "Επιπλωμένο")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("mls.PropertyForm.fields.furnishedPlaceholder", "Επιλέξτε")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NO">{t("mls.PropertyForm.furnished.NO", "Όχι")}</SelectItem>
                        <SelectItem value="PARTIALLY">{t("mls.PropertyForm.furnished.PARTIALLY", "Μερικώς")}</SelectItem>
                        <SelectItem value="FULLY">{t("mls.PropertyForm.furnished.FULLY", "Πλήρως")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accessibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.accessibility", "Προσβασιμότητα")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="Ράμπα, ΑΜΕΑ, κλπ." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.price", "Τιμή")} (€) *</FormLabel>
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
                name="price_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mls.PropertyForm.fields.priceType", "Τύπος τιμής")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("mls.PropertyForm.fields.priceTypePlaceholder", "Επιλέξτε τύπο")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RENTAL">{t("mls.PropertyForm.priceType.RENTAL", "€ ενοικίασης")}</SelectItem>
                        <SelectItem value="SALE">{t("mls.PropertyForm.priceType.SALE", "€ πώλησης")}</SelectItem>
                        <SelectItem value="PER_ACRE">{t("mls.PropertyForm.priceType.PER_ACRE", "€ ανά στρέμμα")}</SelectItem>
                        <SelectItem value="PER_SQM">{t("mls.PropertyForm.priceType.PER_SQM", "€ ανά τ.μ.")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="available_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.availableFrom", "Διαθέσιμο από")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {transactionType === "RENTAL" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accepts_pets"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("mls.PropertyForm.fields.acceptsPets", "Δέχεται κατοικίδια")}</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="min_lease_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mls.PropertyForm.fields.minLeaseMonths", "Ελάχιστοι μήνες ενοικίασης")}</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} type="number" placeholder="12" {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="virtual_tour_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.virtualTourUrl", "URL εικονικής περιήγησης")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} type="url" placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="portal_visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mls.PropertyForm.fields.portalVisibility", "Ορατότητα σε portals")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "PUBLIC"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("mls.PropertyForm.fields.portalVisibilityPlaceholder", "Επιλέξτε ορατότητα")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PRIVATE">{t("mls.PropertyForm.portalVisibility.PRIVATE", "Ιδιωτικό")}</SelectItem>
                      <SelectItem value="SELECTED">{t("mls.PropertyForm.portalVisibility.SELECTED", "Επιλεγμένα portals")}</SelectItem>
                      <SelectItem value="PUBLIC">{t("mls.PropertyForm.portalVisibility.PUBLIC", "Παντού")}</SelectItem>
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
                  <FormLabel>{t("mls.PropertyForm.fields.agentOwner", "Ανατεθειμένος πράκτορας")} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
            <div className="text-sm text-muted-foreground">
              <p>{t("mls.PropertyForm.fields.photos", "Φωτογραφίες")}: Θα προστεθούν μετά τη δημιουργία του ακινήτου.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleStepClick = async (stepId: number) => {
    // Allow moving back without validation
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      return;
    }
    
    // Validate current step before moving forward
    const isValid = await validateStep(currentStep);
    if (isValid) {
      // Check if we are trying to skip steps
      // Ideally we should validate all intermediate steps, but for now let's just allow
      // navigation if the current step is valid. 
      // Alternatively, restrict to only next step or previously completed steps.
      
      // Logic: Allow jumping to any step if current is valid? 
      // Or only allow jumping to next step (stepId === currentStep + 1)?
      // For a "progress bar link", usually you can click previously visited steps.
      // Jumping ahead is often restricted.
      
      // Let's allow clicking any step, but maybe we should enforce sequential progress?
      // User request "make steps link" implies freedom.
      setCurrentStep(stepId);
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="h-full px-10"
        onFocus={() => setHasUserInteracted(true)}
        onChange={() => setHasUserInteracted(true)}
      >
        <div className="w-[800px] text-sm">
          {/* Progress Bar */}
          <div className="pb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">{t("mls.PropertyForm.title", "Νέο Ακίνητο")}</h2>
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
              {t("mls.PropertyForm.buttons.previous", "Προηγούμενο")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} disabled={isLoading}>
                {t("mls.PropertyForm.buttons.next", "Επόμενο")}
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Δημιουργία..." : t("mls.PropertyForm.buttons.submit", "Δημιουργία Ακινήτου")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}

