"use client";

import { z } from "zod";
import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { AutosaveIndicator, AutosaveStatus } from "@/components/form/autosave-indicator";
import { AddressFieldGroup } from "@/components/form/AddressFieldGroup";
import useDebounce from "@/hooks/useDebounce";
import { PropertyImageUploader } from "@/components/property-images/PropertyImageUploader";
import { linkImagesToProperty } from "@/actions/mls/property-images/link-images-to-property";

type Props = {
  users: any[];
  onFinish: () => void;
  initialDraftId?: string;
};

const formSchema = z.object({
  // Step 1
  property_name: z.string().min(1, "Property name is required"),
  property_type: z.enum(["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE", "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"]),
  property_type_other: z.string().optional(),
  transaction_type: z.enum(["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE", "AUCTION"]).optional(),
  property_status: z.enum(["AVAILABLE", "RESERVED", "NEGOTIATION", "RENTED", "SOLD"]).optional(),
  is_exclusive: z.boolean().optional().default(false),
  
  // Step 2: Τοποθεσία
  country: z.string().optional().default("GR"),
  municipality: z.string().optional(),
  area: z.string().optional(),
  postal_code: z.string().optional(),
  address_privacy_level: z.enum(["EXACT", "PARTIAL", "HIDDEN"]).optional(),
  region: z.string().max(100).optional(),
  regional_unit: z.string().max(100).optional(),
  objective_zone: z.string().max(20).optional(),
  
  // Step 3: Επιφάνειες (conditional)
  size_net_sqm: z.coerce.number().optional(),
  size_gross_sqm: z.coerce.number().optional(),
  floor: z.string().optional(),
  floors_total: z.coerce.number().optional(),
  plot_size_sqm: z.coerce.number().optional(),
  inside_city_plan: z.boolean().optional(),
  build_coefficient: z.coerce.number().optional(),
  frontage_m: z.coerce.number().optional(),
  frontage_type: z.enum(["MAIN_ROAD", "SECONDARY_ROAD", "PEDESTRIAN", "CORNER", "SQUARE", "CUL_DE_SAC", "NONE"]).optional(),
  
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
  land_registry_office: z.string().max(200).optional(),
  building_block_ot: z.string().max(50).optional(),
  legalization_status: z.enum(["LEGALIZED", "IN_PROGRESS", "UNDECLARED"]).optional(),
  etaireia_diaxeirisis: z.string().optional().or(z.literal("")),
  monthly_common_charges: z.coerce.number().optional(),
  
  // Step 7: Παροχές
  amenities: z.array(z.string()).optional().default([]),
  orientation: z.array(z.string()).optional().default([]),
  furnished: z.enum(["NO", "PARTIALLY", "FULLY"]).optional(),
  accessibility: z.string().optional().or(z.literal("")),
  
  // Step 8: Τιμή & Διαθεσιμότητα
  price: z.coerce.number().optional(),
  price_type: z.enum(["RENTAL", "SALE", "PER_ACRE", "PER_SQM"]).optional(),
  available_from: z.string().optional(),
  accepts_pets: z.boolean().optional(),
  min_lease_months: z.coerce.number().optional(),
  
  // Step 9: Media & Δημοσίευση
  virtual_tour_url: z.string().url().optional().or(z.literal("")),
  visibility: z.enum(["HIDDEN", "PRIVATE", "SECURE", "PUBLIC"]).optional(),
  assigned_to: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;


export function NewPropertyWizard({ users, onFinish, initialDraftId }: Props) {
  const router = useRouter();
  const t = useTranslations("mls.PropertyForm");
  const { toast } = useAppToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedData, setLastSavedData] = useState<Partial<FormValues>>({});
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [uploadSessionId] = useState(() => crypto.randomUUID());

  const STEPS = [
    { id: 1, title: t("steps.basics"), description: t("stepDescriptions.basics") },
    { id: 2, title: t("steps.location"), description: t("stepDescriptions.location") },
    { id: 3, title: t("steps.surfaces"), description: t("stepDescriptions.surfaces") },
    { id: 4, title: t("steps.characteristics"), description: t("stepDescriptions.characteristics") },
    { id: 5, title: t("steps.condition"), description: t("stepDescriptions.condition") },
    { id: 6, title: t("steps.legal"), description: t("stepDescriptions.legal") },
    { id: 7, title: t("steps.amenities"), description: t("stepDescriptions.amenities") },
    { id: 8, title: t("steps.pricing"), description: t("stepDescriptions.pricing") },
    { id: 9, title: t("steps.media"), description: t("stepDescriptions.media") },
  ];

  const FLOOR_OPTIONS = [
    { value: "BASEMENT", label: t("floor.BASEMENT") },
    { value: "GROUND", label: t("floor.GROUND") },
    { value: "1ST", label: t("floor.1ST") },
    { value: "2ND", label: t("floor.2ND") },
    { value: "3RD", label: t("floor.3RD") },
    { value: "4TH", label: t("floor.4TH") },
    { value: "5TH", label: t("floor.5TH") },
    { value: "6TH", label: t("floor.6TH") },
    { value: "7TH", label: t("floor.7TH") },
    { value: "8TH", label: t("floor.8TH") },
    { value: "9TH", label: t("floor.9TH") },
    { value: "10TH", label: t("floor.10TH") },
    { value: "PENTHOUSE", label: t("floor.PENTHOUSE") },
  ];

  const AMENITY_OPTIONS: MultiSelectOption[] = [
    { value: "AC", label: t("amenities.AC") },
    { value: "FIREPLACE", label: t("amenities.FIREPLACE") },
    { value: "PARKING", label: t("amenities.PARKING") },
    { value: "STORAGE", label: t("amenities.STORAGE") },
    { value: "SOLAR", label: t("amenities.SOLAR") },
    { value: "DOUBLE_GLAZING", label: t("amenities.DOUBLE_GLAZING") },
    { value: "VIEW", label: t("amenities.VIEW") },
    { value: "BALCONY", label: t("amenities.BALCONY") },
    { value: "GARDEN", label: t("amenities.GARDEN") },
    { value: "PET_FRIENDLY", label: t("amenities.PET_FRIENDLY") },
    { value: "FRONTAGE", label: t("amenities.FRONTAGE") },
  ];

  const ORIENTATION_OPTIONS: MultiSelectOption[] = [
    { value: "N", label: t("orientation.N") },
    { value: "S", label: t("orientation.S") },
    { value: "E", label: t("orientation.E") },
    { value: "W", label: t("orientation.W") },
  ];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_name: "",
      property_type: undefined,
      property_type_other: "",
      transaction_type: undefined,
      property_status: "AVAILABLE",
      is_exclusive: false,
      country: "GR",
      municipality: "",
      area: "",
      postal_code: "",
      address_privacy_level: "PARTIAL",
      region: "",
      regional_unit: "",
      objective_zone: "",
      size_net_sqm: undefined,
      size_gross_sqm: undefined,
      floor: undefined,
      floors_total: undefined,
      plot_size_sqm: undefined,
      inside_city_plan: undefined,
      build_coefficient: undefined,
      frontage_m: undefined,
      frontage_type: undefined,
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
      land_registry_office: "",
      building_block_ot: "",
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
      visibility: "PUBLIC",
      assigned_to: "",
    },
  });

  // Load draft data when initialDraftId is provided
  useEffect(() => {
    const loadDraft = async () => {
      if (initialDraftId && !draftId) {
        try {
          const response = await axios.get(`/api/mls/properties/${initialDraftId}`);
          if (response.data?.property) {
            const draft = response.data.property;
            // Reset form with draft data
            form.reset({
              property_name: draft.property_name || "",
              property_type: draft.property_type || undefined,
              property_type_other: draft.property_type_other || "",
              transaction_type: draft.transaction_type || undefined,
              property_status: draft.property_status || "AVAILABLE",
              is_exclusive: draft.is_exclusive || false,
              country: draft.country || "GR",
              municipality: draft.municipality || draft.address_city || "",
              area: draft.area || draft.address_state || "",
              postal_code: draft.postal_code || draft.address_postal_code || "",
              address_privacy_level: draft.address_privacy_level || "PARTIAL",
              region: draft.region || "",
              regional_unit: draft.regional_unit || "",
              objective_zone: draft.objective_zone || "",
              size_net_sqm: draft.size_net_sqm || undefined,
              size_gross_sqm: draft.size_gross_sqm || undefined,
              floor: draft.floor || undefined,
              floors_total: draft.floors_total || undefined,
              plot_size_sqm: draft.plot_size_sqm || undefined,
              inside_city_plan: draft.inside_city_plan || undefined,
              build_coefficient: draft.build_coefficient || undefined,
              frontage_m: draft.frontage_m || undefined,
              frontage_type: draft.frontage_type || undefined,
              bedrooms: draft.bedrooms || undefined,
              bathrooms: draft.bathrooms || undefined,
              heating_type: draft.heating_type || undefined,
              energy_cert_class: draft.energy_cert_class || undefined,
              year_built: draft.year_built || undefined,
              renovated_year: draft.renovated_year || undefined,
              condition: draft.condition || undefined,
              elevator: draft.elevator || false,
              building_permit_no: draft.building_permit_no || "",
              building_permit_year: draft.building_permit_year || undefined,
              land_registry_kaek: draft.land_registry_kaek || "",
              land_registry_office: draft.land_registry_office || "",
              building_block_ot: draft.building_block_ot || "",
              legalization_status: draft.legalization_status || undefined,
              etaireia_diaxeirisis: draft.etaireia_diaxeirisis || "",
              monthly_common_charges: draft.monthly_common_charges || undefined,
              amenities: Array.isArray(draft.amenities) ? draft.amenities : [],
              orientation: Array.isArray(draft.orientation) ? draft.orientation : [],
              furnished: draft.furnished || undefined,
              accessibility: draft.accessibility || "",
              price: draft.price || undefined,
              price_type: draft.price_type || undefined,
              available_from: draft.available_from ? new Date(draft.available_from).toISOString().split('T')[0] : "",
              accepts_pets: draft.accepts_pets || false,
              min_lease_months: draft.min_lease_months || undefined,
              virtual_tour_url: draft.virtual_tour_url || "",
              visibility: draft.visibility || "PUBLIC",
              assigned_to: draft.assigned_to || "",
            });
            setDraftId(initialDraftId);
            setLastSavedData(form.getValues());
            setHasUserInteracted(true);
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
      const response = await axios.post("/api/mls/properties/draft", {
        id: draftId,
        ...data,
        property_name: (data as any).property_name || data.property_type || "Draft Property",
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

  const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
    1: ["property_name", "property_type", "property_type_other", "transaction_type", "property_status", "is_exclusive"],
    2: ["country", "municipality", "area", "postal_code", "address_privacy_level", "region", "regional_unit", "objective_zone"],
    3: ["size_net_sqm", "size_gross_sqm", "floor", "floors_total", "plot_size_sqm", "inside_city_plan", "frontage_type"],
    4: ["bedrooms", "bathrooms", "heating_type", "energy_cert_class"],
    5: ["year_built", "renovated_year", "condition", "elevator"],
    6: ["building_permit_no", "land_registry_kaek", "land_registry_office", "building_block_ot", "legalization_status", "monthly_common_charges"],
    7: ["amenities", "orientation", "furnished", "accessibility"],
    8: ["price", "price_type", "available_from", "accepts_pets"],
    9: ["virtual_tour_url", "visibility", "assigned_to"],
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const fieldsToValidate = STEP_FIELDS[step] ?? [];
    const result = await form.trigger(fieldsToValidate as any);
    if (!result) return false;

    return true;
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
      const response = await axios.post("/api/mls/properties", {
        ...data,
        draft_status: false,
        id: draftId, // Update existing draft if exists
      });

      // Link uploaded images to the newly created property
      const newPropertyId = response.data?.newProperty?.id;
      if (newPropertyId) {
        await linkImagesToProperty(newPropertyId, uploadSessionId);
      }

      toast.success(t("success.created"), { isTranslationKey: false });
      
      form.reset();
      router.refresh();
      onFinish();
    } catch (error: any) {
      console.error("Error creating property:", error);
      const errorData = error?.response?.data;
      const errorMessage = errorData?.error || errorData?.details || error?.message || t("errors.createFailed");

      toast.error(t("errors.createFailed"), { description: typeof errorMessage === 'string' ? errorMessage : String(errorMessage) });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitError = (errors: Record<string, any>) => {
    const errorFields = Object.keys(errors);
    for (let step = 1; step <= STEPS.length; step++) {
      if (STEP_FIELDS[step]?.some((f) => errorFields.includes(f))) {
        setCurrentStep(step);
        toast.error(t("errors.fillRequired"), { description: t("errors.fillRequired"), isTranslationKey: false });
        return;
      }
    }
    toast.error(t("errors.fillRequired"), { description: t("errors.fillRequired"), isTranslationKey: false });
  };

  const renderStepContent = () => {
    const propertyType = form.watch("property_type");
    const transactionType = form.watch("transaction_type");
    const isResidentialOrCommercial = propertyType ? ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE"].includes(propertyType) : false;
    const isLand = propertyType ? ["PLOT", "FARM"].includes(propertyType) : false;

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="property_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("fields.propertyName")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("fields.propertyNamePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormSelectWithOther<FormValues, "property_type">
              name="property_type"
              otherFieldName="property_type_other"
              label={t("fields.propertyType")}
              placeholder={t("fields.propertyTypePlaceholder")}
              otherLabel={t("fields.specifyOther")}
              otherPlaceholder={t("fields.specifyOtherPlaceholder")}
              disabled={isLoading}
              required
              options={[
                { value: "APARTMENT", label: t("propertyType.APARTMENT") },
                { value: "HOUSE", label: t("propertyType.HOUSE") },
                { value: "MAISONETTE", label: t("propertyType.MAISONETTE") },
                { value: "COMMERCIAL", label: t("propertyType.COMMERCIAL") },
                { value: "WAREHOUSE", label: t("propertyType.WAREHOUSE") },
                { value: "PARKING", label: t("propertyType.PARKING") },
                { value: "PLOT", label: t("propertyType.PLOT") },
                { value: "FARM", label: t("propertyType.FARM") },
                { value: "INDUSTRIAL", label: t("propertyType.INDUSTRIAL") },
                { value: "OTHER", label: t("propertyType.OTHER") },
              ]}
            />

            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.transactionType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("fields.transactionTypePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SALE">{t("transactionType.SALE")}</SelectItem>
                      <SelectItem value="RENTAL">{t("transactionType.RENTAL")}</SelectItem>
                      <SelectItem value="SHORT_TERM">{t("transactionType.SHORT_TERM")}</SelectItem>
                      <SelectItem value="EXCHANGE">{t("transactionType.EXCHANGE")}</SelectItem>
                      <SelectItem value="AUCTION">{t("transactionType.AUCTION")}</SelectItem>
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
                    <FormLabel>{t("fields.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "AVAILABLE"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">{t("status.AVAILABLE")}</SelectItem>
                        <SelectItem value="RESERVED">{t("status.RESERVED")}</SelectItem>
                        <SelectItem value="NEGOTIATION">{t("status.NEGOTIATION")}</SelectItem>
                        <SelectItem value="RENTED">{t("status.RENTED")}</SelectItem>
                        <SelectItem value="SOLD">{t("status.SOLD")}</SelectItem>
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
                      <FormLabel>{t("fields.isExclusive")}</FormLabel>
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
            <AddressFieldGroup
              control={form.control}
              countryFieldName="country"
              municipalityFieldName="municipality"
              areaFieldName="area"
              postalCodeFieldName="postal_code"
              regionFieldName="region"
              regionalUnitFieldName="regional_unit"
              defaultCountry="GR"
              disabled={isLoading}
            />

            <FormField
              control={form.control}
              name="objective_zone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.objectiveZone")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("fields.objectiveZonePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_privacy_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.addressPrivacyLevel")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "PARTIAL"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EXACT">{t("addressPrivacyLevel.EXACT")}</SelectItem>
                      <SelectItem value="PARTIAL">{t("addressPrivacyLevel.PARTIAL")}</SelectItem>
                      <SelectItem value="HIDDEN">{t("addressPrivacyLevel.HIDDEN")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        // Show message if property_type is not selected yet
        if (!propertyType) {
          return (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <p className="mb-2">{t("step3.noPropertyType")}</p>
            </div>
          );
        }
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
                        <FormLabel>{t("fields.sizeNetSqm")}</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} type="number" placeholder="0" {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                            value={field.value ?? ""}
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
                        <FormLabel>{t("fields.sizeGrossSqm")}</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} type="number" placeholder="0" {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                            value={field.value ?? ""}
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
                        <FormLabel>{t("fields.floor")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("fields.floorPlaceholder")} />
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
                        <FormLabel>{t("fields.floorsTotal")}</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} type="number" placeholder="0" {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                            value={field.value ?? ""}
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
                      <FormLabel>{t("fields.plotSizeSqm")}</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} type="number" placeholder="0" {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                          value={field.value ?? ""}
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
                        <FormLabel>{t("fields.insideCityPlan")}</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === "true")} value={field.value == null ? "" : field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("fields.insideCityPlanSelect")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">{t("fields.insideCityPlanInside")}</SelectItem>
                            <SelectItem value="false">{t("fields.insideCityPlanOutside")}</SelectItem>
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
                        <FormLabel>{t("fields.buildCoefficient")}</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} type="number" step="0.1" placeholder="0.0" {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                            value={field.value ?? ""}
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
                    name="frontage_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("fields.frontageM")}</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} type="number" placeholder="0" {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="frontage_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("fields.frontageType")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("fields.frontageTypePlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MAIN_ROAD">{t("frontageType.MAIN_ROAD")}</SelectItem>
                            <SelectItem value="SECONDARY_ROAD">{t("frontageType.SECONDARY_ROAD")}</SelectItem>
                            <SelectItem value="PEDESTRIAN">{t("frontageType.PEDESTRIAN")}</SelectItem>
                            <SelectItem value="CORNER">{t("frontageType.CORNER")}</SelectItem>
                            <SelectItem value="SQUARE">{t("frontageType.SQUARE")}</SelectItem>
                            <SelectItem value="CUL_DE_SAC">{t("frontageType.CUL_DE_SAC")}</SelectItem>
                            <SelectItem value="NONE">{t("frontageType.NONE")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">
                <p className="mb-2">{t("step3.otherType")}</p>
                <p>{t("step3.otherTypeContinue")}</p>
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
                      <FormLabel>{t("fields.bedrooms")}</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} type="number" placeholder="0" {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                          value={field.value ?? ""}
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
                      <FormLabel>{t("fields.bathrooms")}</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} type="number" step="0.5" placeholder="0" {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                          value={field.value ?? ""}
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
                    <FormLabel>{t("fields.heatingType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("fields.heatingTypePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AUTONOMOUS">{t("heatingType.AUTONOMOUS")}</SelectItem>
                        <SelectItem value="CENTRAL">{t("heatingType.CENTRAL")}</SelectItem>
                        <SelectItem value="NATURAL_GAS">{t("heatingType.NATURAL_GAS")}</SelectItem>
                        <SelectItem value="HEAT_PUMP">{t("heatingType.HEAT_PUMP")}</SelectItem>
                        <SelectItem value="ELECTRIC">{t("heatingType.ELECTRIC")}</SelectItem>
                        <SelectItem value="NONE">{t("heatingType.NONE")}</SelectItem>
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
                    <FormLabel>{t("fields.energyCertClass")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("fields.energyCertClassPlaceholder")} />
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
                        <SelectItem value="IN_PROGRESS">{t("energyCertClass.IN_PROGRESS")}</SelectItem>
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
                    <FormLabel>{t("fields.yearBuilt")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="2020" {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                        value={field.value ?? ""}
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
                    <FormLabel>{t("fields.renovatedYear")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="2020" {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                        value={field.value ?? ""}
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
                    <FormLabel>{t("fields.condition")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("fields.conditionPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EXCELLENT">{t("condition.EXCELLENT")}</SelectItem>
                        <SelectItem value="VERY_GOOD">{t("condition.VERY_GOOD")}</SelectItem>
                        <SelectItem value="GOOD">{t("condition.GOOD")}</SelectItem>
                        <SelectItem value="NEEDS_RENOVATION">{t("condition.NEEDS_RENOVATION")}</SelectItem>
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
                        <FormLabel>{t("fields.elevator")}</FormLabel>
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
                    <FormLabel>{t("fields.buildingPermitNo")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("fields.buildingPermitNoPlaceholder")} {...field} />
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
                    <FormLabel>{t("fields.buildingPermitYear")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="2020" {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                        value={field.value ?? ""}
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
                  <FormLabel>{t("fields.landRegistryKaek")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder={t("fields.landRegistryKaekPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="land_registry_office"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.landRegistryOffice")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("fields.landRegistryOfficePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="building_block_ot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.buildingBlockOt")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("fields.buildingBlockOtPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="legalization_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.legalizationStatus")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("fields.legalizationStatusPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LEGALIZED">{t("legalizationStatus.LEGALIZED")}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{t("legalizationStatus.IN_PROGRESS")}</SelectItem>
                      <SelectItem value="UNDECLARED">{t("legalizationStatus.UNDECLARED")}</SelectItem>
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
                    <FormLabel>{t("fields.etaireiaDiaxeirisis")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("fields.managementCompanyPlaceholder")} {...field} />
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
                    <FormLabel>{t("fields.monthlyCommonCharges")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="0" {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                        value={field.value ?? ""}
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
                  <FormLabel>{t("fields.amenities")}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={AMENITY_OPTIONS}
                      value={Array.isArray(field.value) ? field.value : []}
                      onChange={field.onChange}
                      placeholder={t("fields.amenitiesPlaceholder")}
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
                  <FormLabel>{t("fields.orientation")}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={ORIENTATION_OPTIONS}
                      value={Array.isArray(field.value) ? field.value : []}
                      onChange={field.onChange}
                      placeholder={t("fields.orientationPlaceholder")}
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
                    <FormLabel>{t("fields.furnished")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("fields.furnishedPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NO">{t("furnished.NO")}</SelectItem>
                        <SelectItem value="PARTIALLY">{t("furnished.PARTIALLY")}</SelectItem>
                        <SelectItem value="FULLY">{t("furnished.FULLY")}</SelectItem>
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
                    <FormLabel>{t("fields.accessibility")}</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder={t("fields.accessibilityPlaceholder")} {...field} />
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
                    <FormLabel>{t("fields.price")} (€)</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} type="number" placeholder="0" {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                        value={field.value ?? ""}
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
                    <FormLabel>{t("fields.priceType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("fields.priceTypePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RENTAL">{t("priceType.RENTAL")}</SelectItem>
                        <SelectItem value="SALE">{t("priceType.SALE")}</SelectItem>
                        <SelectItem value="PER_ACRE">{t("priceType.PER_ACRE")}</SelectItem>
                        <SelectItem value="PER_SQM">{t("priceType.PER_SQM")}</SelectItem>
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
                  <FormLabel>{t("fields.availableFrom")}</FormLabel>
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
                        <FormLabel>{t("fields.acceptsPets")}</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="min_lease_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.minLeaseMonths")}</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} type="number" placeholder="12" {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                          value={field.value ?? ""}
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
                  <FormLabel>{t("fields.virtualTourUrl")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} type="url" placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.portalVisibility")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "PUBLIC"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("fields.portalVisibilityPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="HIDDEN">{t("visibility.HIDDEN")}</SelectItem>
                      <SelectItem value="PRIVATE">{t("visibility.PRIVATE")}</SelectItem>
                      <SelectItem value="SECURE">{t("visibility.SECURE")}</SelectItem>
                      <SelectItem value="PUBLIC">{t("visibility.PUBLIC")}</SelectItem>
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
                  <FormLabel>{t("fields.agentOwner")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("fields.assignedAgentPlaceholder")} />
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
            <PropertyImageUploader
              uploadSessionId={uploadSessionId}
              disabled={isLoading}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const handleStepClick = async (stepId: number) => {
    // Save current form state before navigating
    const currentData = form.getValues();
    if (Object.keys(currentData).length > 0) {
      saveDraft(currentData);
      setLastSavedData(currentData);
    }

    // Allow moving back without validation
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      return;
    }

    // Validate all steps from current up to (but not including) target step
    for (let step = currentStep; step < stepId; step++) {
      const isValid = await validateStep(step);
      if (!isValid) {
        setCurrentStep(step);
        return;
      }
    }
    setCurrentStep(stepId);
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit, onSubmitError)} 
        className="h-full px-10"
        onFocus={() => setHasUserInteracted(true)}
        onChange={() => setHasUserInteracted(true)}
      >
        <div className="w-full max-w-[800px] text-sm pb-10">
          {/* Progress Bar */}
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
              {t("buttons.previous")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" size="sm" onClick={handleNext} disabled={isLoading}>
                {t("buttons.next")}
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? t("buttons.creating") : t("buttons.submit")}
              </Button>
            )}
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent key={currentStep}>
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Autosave Indicator */}
          <div className="flex justify-end pt-2">
            <AutosaveIndicator status={autosaveStatus} />
          </div>
        </div>
      </form>
    </Form>
  );
}

