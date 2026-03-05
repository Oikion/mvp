"use client"

import { useState, useMemo, KeyboardEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { useAppToast } from "@/hooks/use-app-toast"
import { useOrgUsers } from "@/hooks/swr/useOrgUsers"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  MultiSelect,
  MultiSelectOption,
} from "@/components/ui/multi-select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Mandate {
  id: string
  title: string
  status: string
  urgency?: string | null
  transaction_type: string
  property_type?: string | null
  property_purpose?: string | null
  areas_of_interest?: string[] | null
  municipality?: string | null
  region?: string | null
  size_min_sqm?: number | null
  size_max_sqm?: number | null
  plot_size_min_sqm?: number | null
  plot_size_max_sqm?: number | null
  budget_min?: number | null
  budget_max?: number | null
  bedrooms_min?: number | null
  bedrooms_max?: number | null
  bathrooms_min?: number | null
  bathrooms_max?: number | null
  floor_min?: number | null
  floor_max?: number | null
  ground_floor_only?: boolean | null
  condition?: string[] | null
  year_built_min?: number | null
  year_built_max?: number | null
  heating_type?: string[] | null
  energy_cert_min?: string | null
  furnished?: string | null
  elevator?: boolean | null
  parking?: boolean | null
  pets_allowed?: boolean | null
  amenities?: string[] | null
  inside_city_plan?: boolean | null
  legalization_ok?: boolean | null
  timeline?: string | null
  expires_at?: string | null
  notes?: string | null
  assigned_to?: string | null
}

interface EditMandateFormProps {
  mandate: Mandate
  onSave: () => void
}

// ---------------------------------------------------------------------------
// Form schema (mirrors updateMandateSchema but all fields optional except id)
// ---------------------------------------------------------------------------

const editFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  transaction_type: z.enum(["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"]),
  property_type: z
    .enum([
      "RESIDENTIAL",
      "COMMERCIAL",
      "LAND",
      "RENTAL",
      "VACATION",
      "APARTMENT",
      "HOUSE",
      "MAISONETTE",
      "WAREHOUSE",
      "PARKING",
      "PLOT",
      "FARM",
      "INDUSTRIAL",
      "OTHER",
    ])
    .optional()
    .nullable(),
  property_purpose: z
    .enum(["RESIDENTIAL", "COMMERCIAL", "LAND", "PARKING", "OTHER"])
    .optional()
    .nullable(),
  status: z.enum([
    "DRAFT",
    "ACTIVE",
    "PAUSED",
    "FULFILLED",
    "EXPIRED",
    "CANCELLED",
  ]),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().nullable(),

  // Location
  areas_of_interest: z.array(z.string()).optional().default([]),
  municipality: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),

  // Size
  size_min_sqm: z.coerce.number().min(0).optional().nullable(),
  size_max_sqm: z.coerce.number().min(0).optional().nullable(),
  plot_size_min_sqm: z.coerce.number().min(0).optional().nullable(),
  plot_size_max_sqm: z.coerce.number().min(0).optional().nullable(),

  // Rooms
  bedrooms_min: z.coerce.number().int().min(0).optional().nullable(),
  bedrooms_max: z.coerce.number().int().min(0).optional().nullable(),
  bathrooms_min: z.coerce.number().int().min(0).optional().nullable(),
  bathrooms_max: z.coerce.number().int().min(0).optional().nullable(),
  floor_min: z.coerce.number().int().optional().nullable(),
  floor_max: z.coerce.number().int().optional().nullable(),
  ground_floor_only: z.boolean().optional().default(false),

  // Budget
  budget_min: z.coerce.number().min(0).optional().nullable(),
  budget_max: z.coerce.number().min(0).optional().nullable(),
  timeline: z
    .enum([
      "IMMEDIATE",
      "ONE_THREE_MONTHS",
      "THREE_SIX_MONTHS",
      "SIX_PLUS_MONTHS",
    ])
    .optional()
    .nullable(),
  year_built_min: z.coerce.number().int().min(1800).optional().nullable(),
  year_built_max: z.coerce.number().int().optional().nullable(),

  // Features
  condition: z.array(z.string()).optional().default([]),
  heating_type: z.array(z.string()).optional().default([]),
  energy_cert_min: z
    .enum([
      "A_PLUS",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "IN_PROGRESS",
    ])
    .optional()
    .nullable(),
  furnished: z.enum(["NO", "PARTIALLY", "FULLY"]).optional().nullable(),
  elevator: z.boolean().optional().default(false),
  parking: z.boolean().optional().default(false),
  pets_allowed: z.boolean().optional().default(false),
  amenities: z.array(z.string()).optional().default([]),

  // Legal
  inside_city_plan: z.boolean().optional().default(false),
  legalization_ok: z.boolean().optional().default(false),

  // Assignment
  assigned_to: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

type EditFormValues = z.infer<typeof editFormSchema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EditMandateForm({
  mandate,
  onSave,
}: EditMandateFormProps) {
  const { toast } = useAppToast()
  const t = useTranslations("mandates")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [areaInputValue, setAreaInputValue] = useState("")

  // Section open state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basics: true,
    location: true,
    size: false,
    requirements: false,
    features: false,
    legal: false,
    assignment: false,
  })

  // Org users for agent selector
  const { users: orgUsers } = useOrgUsers()

  // Multi-select options
  const CONDITION_OPTIONS: MultiSelectOption[] = useMemo(
    () => [
      { value: "EXCELLENT", label: "Excellent" },
      { value: "VERY_GOOD", label: "Very Good" },
      { value: "GOOD", label: "Good" },
      { value: "NEEDS_RENOVATION", label: "Needs Renovation" },
    ],
    []
  )

  const HEATING_OPTIONS: MultiSelectOption[] = useMemo(
    () => [
      { value: "AUTONOMOUS", label: "Autonomous" },
      { value: "CENTRAL", label: "Central" },
      { value: "NATURAL_GAS", label: "Natural Gas" },
      { value: "HEAT_PUMP", label: "Heat Pump" },
      { value: "ELECTRIC", label: "Electric" },
      { value: "NONE", label: "None" },
    ],
    []
  )

  // ---------------------------------------------------------------------------
  // Form setup with defaults from mandate data
  // ---------------------------------------------------------------------------

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: mandate.title ?? "",
      transaction_type:
        (mandate.transaction_type as EditFormValues["transaction_type"]) ??
        "SALE",
      property_type:
        (mandate.property_type as EditFormValues["property_type"]) ?? undefined,
      property_purpose:
        (mandate.property_purpose as EditFormValues["property_purpose"]) ??
        undefined,
      status: (mandate.status as EditFormValues["status"]) ?? "DRAFT",
      urgency:
        (mandate.urgency as EditFormValues["urgency"]) ?? undefined,
      areas_of_interest: Array.isArray(mandate.areas_of_interest)
        ? mandate.areas_of_interest
        : [],
      municipality: mandate.municipality ?? "",
      region: mandate.region ?? "",
      size_min_sqm: mandate.size_min_sqm ?? undefined,
      size_max_sqm: mandate.size_max_sqm ?? undefined,
      plot_size_min_sqm: mandate.plot_size_min_sqm ?? undefined,
      plot_size_max_sqm: mandate.plot_size_max_sqm ?? undefined,
      bedrooms_min: mandate.bedrooms_min ?? undefined,
      bedrooms_max: mandate.bedrooms_max ?? undefined,
      bathrooms_min: mandate.bathrooms_min ?? undefined,
      bathrooms_max: mandate.bathrooms_max ?? undefined,
      floor_min: mandate.floor_min ?? undefined,
      floor_max: mandate.floor_max ?? undefined,
      ground_floor_only: mandate.ground_floor_only ?? false,
      budget_min: mandate.budget_min ?? undefined,
      budget_max: mandate.budget_max ?? undefined,
      timeline:
        (mandate.timeline as EditFormValues["timeline"]) ?? undefined,
      year_built_min: mandate.year_built_min ?? undefined,
      year_built_max: mandate.year_built_max ?? undefined,
      condition: Array.isArray(mandate.condition) ? mandate.condition : [],
      heating_type: Array.isArray(mandate.heating_type)
        ? mandate.heating_type
        : [],
      energy_cert_min:
        (mandate.energy_cert_min as EditFormValues["energy_cert_min"]) ??
        undefined,
      furnished:
        (mandate.furnished as EditFormValues["furnished"]) ?? undefined,
      elevator: mandate.elevator ?? false,
      parking: mandate.parking ?? false,
      pets_allowed: mandate.pets_allowed ?? false,
      amenities: Array.isArray(mandate.amenities) ? mandate.amenities : [],
      inside_city_plan: mandate.inside_city_plan ?? false,
      legalization_ok: mandate.legalization_ok ?? false,
      assigned_to: mandate.assigned_to ?? undefined,
      expires_at: mandate.expires_at
        ? mandate.expires_at.split("T")[0]
        : undefined,
      notes: mandate.notes ?? "",
    },
  })

  // ---------------------------------------------------------------------------
  // Area tag helpers
  // ---------------------------------------------------------------------------

  const handleAreaKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && areaInputValue.trim()) {
      e.preventDefault()
      const current = form.getValues("areas_of_interest") ?? []
      if (!current.includes(areaInputValue.trim())) {
        form.setValue("areas_of_interest", [
          ...current,
          areaInputValue.trim(),
        ])
      }
      setAreaInputValue("")
    }
  }

  const removeArea = (area: string) => {
    const current = form.getValues("areas_of_interest") ?? []
    form.setValue(
      "areas_of_interest",
      current.filter((a) => a !== area)
    )
  }

  // Amenities tag helpers
  const [amenityInputValue, setAmenityInputValue] = useState("")

  const handleAmenityKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && amenityInputValue.trim()) {
      e.preventDefault()
      const current = form.getValues("amenities") ?? []
      if (!current.includes(amenityInputValue.trim())) {
        form.setValue("amenities", [...current, amenityInputValue.trim()])
      }
      setAmenityInputValue("")
    }
  }

  const removeAmenity = (amenity: string) => {
    const current = form.getValues("amenities") ?? []
    form.setValue(
      "amenities",
      current.filter((a) => a !== amenity)
    )
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const onSubmit = async (data: EditFormValues) => {
    setIsSubmitting(true)
    try {
      // Clean up empty string / null values for optional numeric fields
      const cleanedData: Record<string, unknown> = { id: mandate.id }

      for (const [key, value] of Object.entries(data)) {
        if (value === "" || value === undefined) {
          // Send null for optional fields to clear them
          cleanedData[key] = null
        } else {
          cleanedData[key] = value
        }
      }

      // Convert date string to Date for expires_at
      if (cleanedData.expires_at && typeof cleanedData.expires_at === "string") {
        cleanedData.expires_at = new Date(
          cleanedData.expires_at as string
        ).toISOString()
      }

      const res = await fetch("/api/mandates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update mandate")
      }

      toast.success("updateSuccess")
      onSave()
    } catch (err) {
      toast.error("updateFailed", {
        description:
          err instanceof Error ? err.message : "Failed to update mandate",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Section toggle helper
  // ---------------------------------------------------------------------------

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* ================================================================ */}
        {/* Basics                                                           */}
        {/* ================================================================ */}
        <Collapsible open={openSections.basics}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-medium hover:bg-accent"
            onClick={() => toggleSection("basics")}
            type="button"
          >
            {t("MandateForm.steps.basics")}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.basics && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.title")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("MandateForm.fields.titlePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.transactionType")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SALE">Sale</SelectItem>
                        <SelectItem value="RENTAL">Rental</SelectItem>
                        <SelectItem value="SHORT_TERM">Short Term</SelectItem>
                        <SelectItem value="EXCHANGE">Exchange</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.propertyType")}
                    </FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? null : val)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        <SelectItem value="APARTMENT">Apartment</SelectItem>
                        <SelectItem value="HOUSE">House</SelectItem>
                        <SelectItem value="MAISONETTE">Maisonette</SelectItem>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                        <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                        <SelectItem value="PARKING">Parking</SelectItem>
                        <SelectItem value="PLOT">Plot</SelectItem>
                        <SelectItem value="FARM">Farm</SelectItem>
                        <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.propertyPurpose")}
                    </FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? null : val)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                        <SelectItem value="LAND">Land</SelectItem>
                        <SelectItem value="PARKING">Parking</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("MandateForm.fields.status")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
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
                        <SelectItem value="PAUSED">
                          {t("MandateForm.status.PAUSED")}
                        </SelectItem>
                        <SelectItem value="FULFILLED">
                          {t("MandateForm.status.FULFILLED")}
                        </SelectItem>
                        <SelectItem value="EXPIRED">
                          {t("MandateForm.status.EXPIRED")}
                        </SelectItem>
                        <SelectItem value="CANCELLED">
                          {t("MandateForm.status.CANCELLED")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("MandateForm.fields.urgency")}</FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? null : val)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
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
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ================================================================ */}
        {/* Location                                                         */}
        {/* ================================================================ */}
        <Collapsible open={openSections.location}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-medium hover:bg-accent"
            onClick={() => toggleSection("location")}
            type="button"
          >
            {t("MandateForm.steps.location")}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.location && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            {/* Areas of interest tag input */}
            <FormField
              control={form.control}
              name="areas_of_interest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("MandateForm.fields.areasOfInterest")}
                  </FormLabel>
                  <FormControl>
                    <div>
                      <Input
                        placeholder={t("MandateForm.fields.areasPlaceholder")}
                        value={areaInputValue}
                        onChange={(e) => setAreaInputValue(e.target.value)}
                        onKeyDown={handleAreaKeyDown}
                      />
                      {(field.value ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(field.value ?? []).map((area) => (
                            <Badge
                              key={area}
                              variant="secondary"
                              className="gap-1"
                            >
                              {area}
                              <button
                                type="button"
                                onClick={() => removeArea(area)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.municipality")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("MandateForm.fields.region")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ================================================================ */}
        {/* Size                                                             */}
        {/* ================================================================ */}
        <Collapsible open={openSections.size}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-medium hover:bg-accent"
            onClick={() => toggleSection("size")}
            type="button"
          >
            Size
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.size && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                name="plot_size_min_sqm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.plotSizeMinSqm")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ================================================================ */}
        {/* Requirements (rooms, budget, timeline)                           */}
        {/* ================================================================ */}
        <Collapsible open={openSections.requirements}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-medium hover:bg-accent"
            onClick={() => toggleSection("requirements")}
            type="button"
          >
            {t("MandateForm.steps.requirements")}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.requirements && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                name="bathrooms_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.bathroomsMin")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                name="floor_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.floorMin")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                name="floor_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.floorMax")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ground_floor_only"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t("MandateForm.fields.groundFloorOnly")}
                  </FormLabel>
                </FormItem>
              )}
            />

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
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
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                        min={0}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="timeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.timeline")}
                    </FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? null : val)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                        <SelectItem value="ONE_THREE_MONTHS">
                          1-3 Months
                        </SelectItem>
                        <SelectItem value="THREE_SIX_MONTHS">
                          3-6 Months
                        </SelectItem>
                        <SelectItem value="SIX_PLUS_MONTHS">
                          6+ Months
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        min={1800}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
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
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ================================================================ */}
        {/* Features                                                         */}
        {/* ================================================================ */}
        <Collapsible open={openSections.features}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-medium hover:bg-accent"
            onClick={() => toggleSection("features")}
            type="button"
          >
            {t("MandateForm.steps.features")}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.features && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.condition")}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={CONDITION_OPTIONS}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder={t("MandateForm.fields.condition")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder={t("MandateForm.fields.heatingType")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="energy_cert_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.energyCertMin")}
                    </FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? null : val)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
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
                          In Progress
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="furnished"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.furnished")}
                    </FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? null : val)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        <SelectItem value="NO">No</SelectItem>
                        <SelectItem value="PARTIALLY">Partially</SelectItem>
                        <SelectItem value="FULLY">Fully</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="elevator"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("MandateForm.fields.elevator")}
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("MandateForm.fields.parking")}
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pets_allowed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("MandateForm.fields.petsAllowed")}
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Amenities tag input */}
            <FormField
              control={form.control}
              name="amenities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.amenities")}</FormLabel>
                  <FormControl>
                    <div>
                      <Input
                        placeholder="Type an amenity and press Enter"
                        value={amenityInputValue}
                        onChange={(e) =>
                          setAmenityInputValue(e.target.value)
                        }
                        onKeyDown={handleAmenityKeyDown}
                      />
                      {(field.value ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(field.value ?? []).map((amenity) => (
                            <Badge
                              key={amenity}
                              variant="secondary"
                              className="gap-1"
                            >
                              {amenity}
                              <button
                                type="button"
                                onClick={() => removeAmenity(amenity)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ================================================================ */}
        {/* Legal                                                            */}
        {/* ================================================================ */}
        <Collapsible open={openSections.legal}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-medium hover:bg-accent"
            onClick={() => toggleSection("legal")}
            type="button"
          >
            Legal
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.legal && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="inside_city_plan"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("MandateForm.fields.insideCityPlan")}
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalization_ok"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("MandateForm.fields.legalizationOk")}
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ================================================================ */}
        {/* Assignment                                                       */}
        {/* ================================================================ */}
        <Collapsible open={openSections.assignment}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-medium hover:bg-accent"
            onClick={() => toggleSection("assignment")}
            type="button"
          >
            {t("MandateForm.steps.assignment")}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.assignment && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.assignedTo")}
                    </FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? null : val)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        {orgUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name ?? user.email}
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
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("MandateForm.fields.expiresAt")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("MandateForm.fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("MandateForm.fields.notesPlaceholder")}
                      rows={4}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ================================================================ */}
        {/* Submit                                                           */}
        {/* ================================================================ */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("MandateForm.editTitle")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
