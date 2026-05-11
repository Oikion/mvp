// @ts-nocheck
"use client";

import axios from "axios";
import { useState, useEffect, useCallback, useMemo, useRef, KeyboardEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { ConditionalFormSection } from "@/components/form/conditional-section";
import { useClients } from "@/hooks/swr/useClients";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mandateFormSchema, type MandateFormValues } from "@/lib/validations/mandates";

// =============================================================================
// Types
// =============================================================================

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDraftId?: string;
  onSuccess?: () => void;
};

const baseSchema = mandateFormSchema;

type FormValues = MandateFormValues;

// Property types that warrant plot size fields
const LAND_RELATED_TYPES = ["PLOT", "FARM", "HOUSE", "INDUSTRIAL"];

// =============================================================================
// Component
// =============================================================================

export function NewMandateWizard({
  open,
  onOpenChange,
  initialDraftId,
  onSuccess,
}: Readonly<Props>) {
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const hasSubmittedRef = useRef(false);
  const draftIdRef = useRef<string | undefined>(initialDraftId);

  // Tag input state for areas_of_interest
  const [areaInputValue, setAreaInputValue] = useState("");

  // Client selector state
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  // Fetch org users for agent selector
  const { users: orgUsers, isLoading: usersLoading } = useOrgUsers();

  // Fetch clients for client selector
  const { clients, isLoading: clientsLoading } = useClients();

  // ---------------------------------------------------------------------------
  // Steps configuration
  // ---------------------------------------------------------------------------

  const STEPS = useMemo(
    () => [
      {
        id: 1,
        title: t("MandateForm.steps.basics"),
        description: t("MandateForm.stepDescriptions.basics"),
      },
      {
        id: 2,
        title: t("MandateForm.steps.location"),
        description: t("MandateForm.stepDescriptions.location"),
      },
      {
        id: 3,
        title: t("MandateForm.steps.requirements"),
        description: t("MandateForm.stepDescriptions.requirements"),
      },
      {
        id: 4,
        title: t("MandateForm.steps.features"),
        description: t("MandateForm.stepDescriptions.features"),
      },
      {
        id: 5,
        title: t("MandateForm.steps.assignment"),
        description: t("MandateForm.stepDescriptions.assignment"),
      },
    ],
    [t]
  );

  // ---------------------------------------------------------------------------
  // Multi-select option arrays
  // ---------------------------------------------------------------------------

  const CONDITION_OPTIONS: MultiSelectOption[] = useMemo(
    () => [
      { value: "EXCELLENT", label: t("MandateForm.condition.EXCELLENT") },
      { value: "VERY_GOOD", label: t("MandateForm.condition.VERY_GOOD") },
      { value: "GOOD", label: t("MandateForm.condition.GOOD") },
      {
        value: "NEEDS_RENOVATION",
        label: t("MandateForm.condition.NEEDS_RENOVATION"),
      },
    ],
    [t]
  );

  const HEATING_OPTIONS: MultiSelectOption[] = useMemo(
    () => [
      { value: "AUTONOMOUS", label: t("MandateForm.heating.AUTONOMOUS") },
      { value: "CENTRAL", label: t("MandateForm.heating.CENTRAL") },
      { value: "NATURAL_GAS", label: t("MandateForm.heating.NATURAL_GAS") },
      { value: "HEAT_PUMP", label: t("MandateForm.heating.HEAT_PUMP") },
      { value: "ELECTRIC", label: t("MandateForm.heating.ELECTRIC") },
      { value: "NONE", label: t("MandateForm.heating.NONE") },
    ],
    [t]
  );

  const AMENITIES_OPTIONS: MultiSelectOption[] = useMemo(
    () => [
      { value: "AC", label: t("MandateForm.amenities.AC") },
      { value: "POOL", label: t("MandateForm.amenities.POOL") },
      { value: "GARDEN", label: t("MandateForm.amenities.GARDEN") },
      { value: "BALCONY", label: t("MandateForm.amenities.BALCONY") },
      { value: "STORAGE", label: t("MandateForm.amenities.STORAGE") },
      { value: "FIREPLACE", label: t("MandateForm.amenities.FIREPLACE") },
      { value: "ALARM", label: t("MandateForm.amenities.ALARM") },
      {
        value: "SOLAR_WATER_HEATER",
        label: t("MandateForm.amenities.SOLAR_WATER_HEATER"),
      },
      { value: "EV_CHARGING", label: t("MandateForm.amenities.EV_CHARGING") },
      { value: "SMART_HOME", label: t("MandateForm.amenities.SMART_HOME") },
    ],
    [t]
  );

  // ---------------------------------------------------------------------------
  // Form setup
  // ---------------------------------------------------------------------------

  const form = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      title: "",
      transaction_type: undefined,
      property_type: undefined,
      property_purpose: undefined,
      status: "DRAFT",
      urgency: "MEDIUM",
      areas_of_interest: [],
      municipality: "",
      region: "",
      size_min_sqm: undefined,
      size_max_sqm: undefined,
      plot_size_min_sqm: undefined,
      plot_size_max_sqm: undefined,
      bedrooms_min: undefined,
      bedrooms_max: undefined,
      bathrooms_min: undefined,
      bathrooms_max: undefined,
      floor_min: undefined,
      floor_max: undefined,
      ground_floor_only: false,
      budget_min: undefined,
      budget_max: undefined,
      timeline: undefined,
      year_built_min: undefined,
      year_built_max: undefined,
      condition: [],
      heating_type: [],
      energy_cert_min: undefined,
      furnished: undefined,
      elevator: false,
      parking: false,
      pets_allowed: false,
      amenities: [],
      inside_city_plan: false,
      legalization_ok: false,
      assigned_to: "",
      clientId: "",
      notes: "",
      expires_at: "",
    },
  });

  // ---------------------------------------------------------------------------
  // Draft loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const loadDraft = async () => {
      if (initialDraftId && !draftId) {
        try {
          const response = await axios.get(
            `/api/mandates/${initialDraftId}`
          );
          if (response.data?.mandate) {
            const draft = response.data.mandate;
            form.reset({
              title: draft.title || "",
              transaction_type: draft.transaction_type || undefined,
              property_type: draft.property_type || undefined,
              property_purpose: draft.property_purpose || undefined,
              status: draft.status || "DRAFT",
              urgency: draft.urgency || "MEDIUM",
              areas_of_interest: Array.isArray(draft.areas_of_interest)
                ? draft.areas_of_interest
                : [],
              municipality: draft.municipality || "",
              region: draft.region || "",
              size_min_sqm: draft.size_min_sqm ?? undefined,
              size_max_sqm: draft.size_max_sqm ?? undefined,
              plot_size_min_sqm: draft.plot_size_min_sqm ?? undefined,
              plot_size_max_sqm: draft.plot_size_max_sqm ?? undefined,
              bedrooms_min: draft.bedrooms_min ?? undefined,
              bedrooms_max: draft.bedrooms_max ?? undefined,
              bathrooms_min: draft.bathrooms_min ?? undefined,
              bathrooms_max: draft.bathrooms_max ?? undefined,
              floor_min: draft.floor_min ?? undefined,
              floor_max: draft.floor_max ?? undefined,
              ground_floor_only: draft.ground_floor_only || false,
              budget_min: draft.budget_min ?? undefined,
              budget_max: draft.budget_max ?? undefined,
              timeline: draft.timeline || undefined,
              year_built_min: draft.year_built_min ?? undefined,
              year_built_max: draft.year_built_max ?? undefined,
              condition: Array.isArray(draft.condition) ? draft.condition : [],
              heating_type: Array.isArray(draft.heating_type)
                ? draft.heating_type
                : [],
              energy_cert_min: draft.energy_cert_min || undefined,
              furnished: draft.furnished || undefined,
              elevator: draft.elevator || false,
              parking: draft.parking || false,
              pets_allowed: draft.pets_allowed || false,
              amenities: Array.isArray(draft.amenities) ? draft.amenities : [],
              inside_city_plan: draft.inside_city_plan || false,
              legalization_ok: draft.legalization_ok || false,
              assigned_to: draft.assigned_to || "",
              clientId: draft.Mandate_Clients?.[0]?.Clients?.id || "",
              notes: draft.notes || "",
              expires_at: draft.expires_at
                ? new Date(draft.expires_at).toISOString().split("T")[0]
                : "",
            });
            setDraftId(initialDraftId);
            draftIdRef.current = initialDraftId;
          }
        } catch (error) {
          console.error("Failed to load mandate draft:", error);
        }
      }
    };
    loadDraft();
  }, [initialDraftId, draftId, form]);

  // ---------------------------------------------------------------------------
  // Autosave (debounced)
  // ---------------------------------------------------------------------------

  // Save draft on exit (component unmount or window close) — prevents draft spam
  useEffect(() => {
    const saveDraftOnExit = () => {
      if (hasSubmittedRef.current) return;
      const values = form.getValues();
      const hasData = values.title || values.transaction_type || values.budget_min || values.budget_max;
      if (!hasData) return;
      // Strip clientId — client linking uses junction table, not draft field
      const { clientId: _clientId, ...draftData } = values;
      const payload = JSON.stringify({
        id: draftIdRef.current,
        ...draftData,
        draft_status: true,
      });
      navigator.sendBeacon("/api/mandates/draft", new Blob([payload], { type: "application/json" }));
    };

    window.addEventListener("beforeunload", saveDraftOnExit);
    return () => {
      window.removeEventListener("beforeunload", saveDraftOnExit);
      saveDraftOnExit();
    };
  }, [form]);

  // ---------------------------------------------------------------------------
  // Step validation
  // ---------------------------------------------------------------------------

  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    switch (step) {
      case 1:
        fieldsToValidate = [
          "title",
          "transaction_type",
          "property_type",
          "property_purpose",
          "status",
          "urgency",
        ];
        break;
      case 2:
        fieldsToValidate = [
          "areas_of_interest",
          "municipality",
          "region",
          "size_min_sqm",
          "size_max_sqm",
          "plot_size_min_sqm",
          "plot_size_max_sqm",
        ];
        break;
      case 3:
        fieldsToValidate = [
          "bedrooms_min",
          "bedrooms_max",
          "bathrooms_min",
          "bathrooms_max",
          "floor_min",
          "floor_max",
          "ground_floor_only",
          "budget_min",
          "budget_max",
          "timeline",
          "year_built_min",
          "year_built_max",
        ];
        break;
      case 4:
        fieldsToValidate = [
          "condition",
          "heating_type",
          "energy_cert_min",
          "furnished",
          "elevator",
          "parking",
          "pets_allowed",
          "amenities",
          "inside_city_plan",
          "legalization_ok",
        ];
        break;
      case 5:
        fieldsToValidate = [
          "assigned_to",
          "clientId",
          "notes",
          "expires_at",
        ];
        break;
    }
    return form.trigger(fieldsToValidate as any);
  };

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Final submit
  // ---------------------------------------------------------------------------

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      // Clean empty strings to undefined so API schema accepts them
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k,
          typeof v === "string" && v.trim() === "" ? undefined : v,
        ])
      );

      // Convert expires_at string to ISO date if present
      if (cleaned.expires_at && typeof cleaned.expires_at === "string") {
        cleaned.expires_at = new Date(cleaned.expires_at).toISOString();
      }

      // Extract clientId before sending — client linking now uses junction table
      const selectedClientId = cleaned.clientId;
      delete cleaned.clientId;

      const submitData = { ...cleaned, draft_status: false };

      let mandateInternalId: string | undefined;

      if (draftId) {
        const res = await axios.put("/api/mandates", { id: draftId, ...submitData });
        mandateInternalId = res.data?.mandate?.id;
      } else {
        const res = await axios.post("/api/mandates", submitData);
        mandateInternalId = res.data?.mandate?.id;
      }

      // Link client via junction table if one was selected
      if (selectedClientId && mandateInternalId) {
        try {
          await axios.post("/api/mandates/link-entities", {
            mandateId: mandateInternalId,
            clientIds: [selectedClientId],
          });
        } catch (linkError) {
          console.error("Failed to link client to mandate:", linkError);
          // Non-fatal — mandate was created, just link failed
        }
      }

      hasSubmittedRef.current = true;
      toast.success("createSuccess", {
        description: t("MandateForm.wizard.success"),
      });
      router.refresh();
      onOpenChange?.(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create mandate:", error);
      toast.error("createFailed", {
        description: t("MandateForm.wizard.error"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Tag input helpers for areas_of_interest
  // ---------------------------------------------------------------------------

  const handleAreaKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    currentAreas: string[],
    onChange: (val: string[]) => void
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = areaInputValue.trim();
      if (trimmed && !currentAreas.includes(trimmed)) {
        onChange([...currentAreas, trimmed]);
      }
      setAreaInputValue("");
    }
  };

  const removeArea = (
    area: string,
    currentAreas: string[],
    onChange: (val: string[]) => void
  ) => {
    onChange(currentAreas.filter((a) => a !== area));
  };

  // ---------------------------------------------------------------------------
  // Filtered clients for combobox
  // ---------------------------------------------------------------------------

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return clients;
    const query = clientSearchQuery.toLowerCase();
    return clients.filter((c) => c.label.toLowerCase().includes(query));
  }, [clients, clientSearchQuery]);

  // ---------------------------------------------------------------------------
  // Watched values for conditional rendering
  // ---------------------------------------------------------------------------

  const propertyType = form.watch("property_type");
  const showPlotSize = LAND_RELATED_TYPES.includes(propertyType || "");

  // ---------------------------------------------------------------------------
  // Step content renderer
  // ---------------------------------------------------------------------------

  const renderStepContent = () => {
    switch (currentStep) {
      // =====================================================================
      // STEP 1: Basics
      // =====================================================================
      case 1:
        return (
          <div className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("MandateForm.fields.title")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("MandateForm.fields.titlePlaceholder")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transaction type */}
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    {t("MandateForm.fields.transactionType")}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "MandateForm.fields.transactionTypePlaceholder"
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SALE">
                        {t("MandateForm.transactionType.SALE")}
                      </SelectItem>
                      <SelectItem value="RENTAL">
                        {t("MandateForm.transactionType.RENTAL")}
                      </SelectItem>
                      <SelectItem value="SHORT_TERM">
                        {t("MandateForm.transactionType.SHORT_TERM")}
                      </SelectItem>
                      <SelectItem value="EXCHANGE">
                        {t("MandateForm.transactionType.EXCHANGE")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Property type */}
              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.propertyType")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "MandateForm.fields.propertyTypePlaceholder"
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="APARTMENT">
                          {t("MandateForm.propertyType.APARTMENT")}
                        </SelectItem>
                        <SelectItem value="HOUSE">
                          {t("MandateForm.propertyType.HOUSE")}
                        </SelectItem>
                        <SelectItem value="MAISONETTE">
                          {t("MandateForm.propertyType.MAISONETTE")}
                        </SelectItem>
                        <SelectItem value="WAREHOUSE">
                          {t("MandateForm.propertyType.WAREHOUSE")}
                        </SelectItem>
                        <SelectItem value="PARKING">
                          {t("MandateForm.propertyType.PARKING")}
                        </SelectItem>
                        <SelectItem value="PLOT">
                          {t("MandateForm.propertyType.PLOT")}
                        </SelectItem>
                        <SelectItem value="FARM">
                          {t("MandateForm.propertyType.FARM")}
                        </SelectItem>
                        <SelectItem value="INDUSTRIAL">
                          {t("MandateForm.propertyType.INDUSTRIAL")}
                        </SelectItem>
                        <SelectItem value="COMMERCIAL">
                          {t("MandateForm.propertyType.COMMERCIAL")}
                        </SelectItem>
                        <SelectItem value="OTHER">
                          {t("MandateForm.propertyType.OTHER")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Property purpose */}
              <FormField
                control={form.control}
                name="property_purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.propertyPurpose")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "MandateForm.fields.propertyPurposePlaceholder"
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RESIDENTIAL">
                          {t("MandateForm.propertyPurpose.RESIDENTIAL")}
                        </SelectItem>
                        <SelectItem value="COMMERCIAL">
                          {t("MandateForm.propertyPurpose.COMMERCIAL")}
                        </SelectItem>
                        <SelectItem value="LAND">
                          {t("MandateForm.propertyPurpose.LAND")}
                        </SelectItem>
                        <SelectItem value="PARKING">
                          {t("MandateForm.propertyPurpose.PARKING")}
                        </SelectItem>
                        <SelectItem value="OTHER">
                          {t("MandateForm.propertyPurpose.OTHER")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("MandateForm.fields.status")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "DRAFT"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">
                          {t("MandateForm.status.DRAFT")}
                        </SelectItem>
                        <SelectItem value="ACTIVE">
                          {t("MandateForm.status.ACTIVE")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Urgency */}
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("MandateForm.fields.urgency")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "MEDIUM"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">
                          {t("MandateForm.urgency.LOW")}
                        </SelectItem>
                        <SelectItem value="MEDIUM">
                          {t("MandateForm.urgency.MEDIUM")}
                        </SelectItem>
                        <SelectItem value="HIGH">
                          {t("MandateForm.urgency.HIGH")}
                        </SelectItem>
                        <SelectItem value="CRITICAL">
                          {t("MandateForm.urgency.CRITICAL")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      // =====================================================================
      // STEP 2: Location & Size
      // =====================================================================
      case 2:
        return (
          <div className="space-y-4">
            {/* Areas of interest — tag input */}
            <FormField
              control={form.control}
              name="areas_of_interest"
              render={({ field }) => {
                const areas = field.value || [];
                return (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.areasOfInterest")}
                    </FormLabel>
                    <FormControl>
                      <div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {areas.map((area) => (
                            <Badge
                              key={area}
                              variant="secondary"
                              className="gap-1"
                            >
                              {area}
                              <button
                                type="button"
                                onClick={() =>
                                  removeArea(area, areas, field.onChange)
                                }
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                aria-label={`${t("MandateForm.fields.removeArea")} ${area}`}
                              >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <Input
                          value={areaInputValue}
                          onChange={(e) => setAreaInputValue(e.target.value)}
                          onKeyDown={(e) =>
                            handleAreaKeyDown(e, areas, field.onChange)
                          }
                          placeholder={t(
                            "MandateForm.fields.areasOfInterestPlaceholder"
                          )}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Municipality */}
              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.municipality")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={t(
                          "MandateForm.fields.municipalityPlaceholder"
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Region */}
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("MandateForm.fields.region")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={t(
                          "MandateForm.fields.regionPlaceholder"
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Size range */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                {t("MandateForm.fields.sizeSection")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="size_min_sqm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.sizeMinSqm")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="size_max_sqm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.sizeMaxSqm")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="200"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Plot size — only for land-related property types */}
            <ConditionalFormSection condition={showPlotSize}>
              <div>
                <h4 className="text-sm font-medium mb-3">
                  {t("MandateForm.fields.plotSizeSection")}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="plot_size_min_sqm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("MandateForm.fields.plotSizeMinSqm")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="200"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="plot_size_max_sqm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("MandateForm.fields.plotSizeMaxSqm")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1000"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ConditionalFormSection>
          </div>
        );

      // =====================================================================
      // STEP 3: Requirements
      // =====================================================================
      case 3:
        return (
          <div className="space-y-6">
            {/* Rooms section */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                {t("MandateForm.fields.roomsSection")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.bedroomsMin")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bedrooms_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.bedroomsMax")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FormField
                  control={form.control}
                  name="bathrooms_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.bathroomsMin")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bathrooms_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.bathroomsMax")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Floor section */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                {t("MandateForm.fields.floorSection")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="floor_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.floorMin")}
                      </FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v ? parseInt(v) : undefined)
                        }
                        value={
                          field.value != null ? field.value.toString() : ""
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("MandateForm.fields.any")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="-1">
                            {t("MandateForm.fields.basement")}
                          </SelectItem>
                          <SelectItem value="0">
                            {t("MandateForm.fields.ground")}
                          </SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="floor_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.floorMax")}
                      </FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v ? parseInt(v) : undefined)
                        }
                        value={
                          field.value != null ? field.value.toString() : ""
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("MandateForm.fields.any")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">
                            {t("MandateForm.fields.ground")}
                          </SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="ground_floor_only"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 mt-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">
                      {t("MandateForm.fields.groundFloorOnly")}
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Budget section */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                {t("MandateForm.fields.budgetSection")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="budget_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.budgetMin")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
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
                      <FormLabel>
                        {t("MandateForm.fields.budgetMax")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Timeline */}
            <FormField
              control={form.control}
              name="timeline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.timeline")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "MandateForm.fields.timelinePlaceholder"
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IMMEDIATE">
                        {t("MandateForm.timeline.IMMEDIATE")}
                      </SelectItem>
                      <SelectItem value="ONE_THREE_MONTHS">
                        {t("MandateForm.timeline.ONE_THREE_MONTHS")}
                      </SelectItem>
                      <SelectItem value="THREE_SIX_MONTHS">
                        {t("MandateForm.timeline.THREE_SIX_MONTHS")}
                      </SelectItem>
                      <SelectItem value="SIX_PLUS_MONTHS">
                        {t("MandateForm.timeline.SIX_PLUS_MONTHS")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Year built range */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                {t("MandateForm.fields.yearBuiltSection")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="year_built_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.yearBuiltMin")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1990"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year_built_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("MandateForm.fields.yearBuiltMax")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2026"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      // =====================================================================
      // STEP 4: Features & Preferences
      // =====================================================================
      case 4:
        return (
          <div className="space-y-6">
            {/* Condition — multi-select */}
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("MandateForm.fields.condition")}
                  </FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={CONDITION_OPTIONS}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder={t(
                        "MandateForm.fields.conditionPlaceholder"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Heating type — multi-select */}
            <FormField
              control={form.control}
              name="heating_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("MandateForm.fields.heatingType")}
                  </FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={HEATING_OPTIONS}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder={t(
                        "MandateForm.fields.heatingTypePlaceholder"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Energy cert min */}
              <FormField
                control={form.control}
                name="energy_cert_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.energyCertMin")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("MandateForm.fields.any")}
                          />
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
                        <SelectItem value="IN_PROGRESS">
                          {t("MandateForm.energyCert.IN_PROGRESS")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Furnished */}
              <FormField
                control={form.control}
                name="furnished"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.furnished")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("MandateForm.fields.any")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NO">
                          {t("MandateForm.furnished.NO")}
                        </SelectItem>
                        <SelectItem value="PARTIALLY">
                          {t("MandateForm.furnished.PARTIALLY")}
                        </SelectItem>
                        <SelectItem value="FULLY">
                          {t("MandateForm.furnished.FULLY")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Boolean checkboxes */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                {t("MandateForm.fields.requirementsSection")}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="elevator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">
                        {t("MandateForm.fields.elevator")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parking"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">
                        {t("MandateForm.fields.parking")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pets_allowed"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">
                        {t("MandateForm.fields.petsAllowed")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Amenities — multi-select */}
            <FormField
              control={form.control}
              name="amenities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("MandateForm.fields.amenities")}
                  </FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={AMENITIES_OPTIONS}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder={t(
                        "MandateForm.fields.amenitiesPlaceholder"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Legal checkboxes */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                {t("MandateForm.fields.legalSection")}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="inside_city_plan"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">
                        {t("MandateForm.fields.insideCityPlan")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalization_ok"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">
                        {t("MandateForm.fields.legalizationOk")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      // =====================================================================
      // STEP 5: Assignment & Notes
      // =====================================================================
      case 5:
        return (
          <div className="space-y-4">
            {/* Assigned to — agent selector */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("MandateForm.fields.assignedTo")}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={usersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={tCommon("selectAgent")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orgUsers.map((user) => (
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

            {/* Client selector — combobox with search */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => {
                const selectedClient = clients.find(
                  (c) => c.value === field.value
                );
                return (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.client")}
                    </FormLabel>
                    <Popover
                      open={clientSearchOpen}
                      onOpenChange={setClientSearchOpen}
                      modal={false}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={clientSearchOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={clientsLoading}
                          >
                            {selectedClient
                              ? selectedClient.label
                              : t("MandateForm.fields.clientPlaceholder")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder={t(
                              "MandateForm.fields.clientSearchPlaceholder"
                            )}
                            value={clientSearchQuery}
                            onValueChange={setClientSearchQuery}
                          />
                          {clientsLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              {tCommon("loading")}
                            </div>
                          ) : filteredClients.length === 0 ? (
                            <CommandEmpty>
                              {t("MandateForm.fields.noClientsFound")}
                            </CommandEmpty>
                          ) : (
                            <ScrollArea className="h-64">
                              <div className="p-1">
                                {/* Option to clear selection */}
                                <div
                                  role="option"
                                  aria-selected={!field.value}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    field.onChange("");
                                    setClientSearchOpen(false);
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-muted-foreground italic"
                                  )}
                                >
                                  {t("MandateForm.fields.noClient")}
                                </div>
                                {filteredClients.map((client) => {
                                  const isSelected =
                                    field.value === client.value;
                                  return (
                                    <div
                                      key={client.value}
                                      role="option"
                                      aria-selected={isSelected}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        field.onChange(client.value);
                                        setClientSearchOpen(false);
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                        isSelected &&
                                          "bg-accent text-accent-foreground"
                                      )}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4 flex-shrink-0",
                                          isSelected
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <span className="truncate">
                                        {client.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          )}
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder={t(
                        "MandateForm.fields.notesPlaceholder"
                      )}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expires at */}
            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("MandateForm.fields.expiresAt")}
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
              {t("MandateForm.buttons.previous")}
            </Button>
            {currentStep < STEPS.length ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                disabled={isLoading}
              >
                {t("MandateForm.buttons.next")}
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading
                  ? tCommon("buttonStates.creating")
                  : t("MandateForm.buttons.submit")}
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>
                {STEPS[currentStep - 1].description}
              </CardDescription>
            </CardHeader>
            {/* CRITICAL: key={currentStep} forces unmount/remount to prevent DOM reuse bugs */}
            <CardContent key={currentStep}>
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
