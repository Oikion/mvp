"use client";

import { z } from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSelectWithOther } from "@/components/ui/form-select-with-other";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { AddressFieldGroup } from "@/components/form/AddressFieldGroup";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";

// Full schema matching NewPropertyWizard
const formSchema = z.object({
  id: z.string().min(1),
  // Step 1: Basics
  property_type: z.enum(["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE", "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"]).optional(),
  property_type_other: z.string().optional(),
  transaction_type: z.enum(["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"]).optional(),
  property_status: z.enum(["AVAILABLE", "RESERVED", "NEGOTIATION", "RENTED", "SOLD"]).optional(),
  is_exclusive: z.boolean().optional(),
  
  // Step 2: Location
  country: z.string().optional().default("GR"),
  municipality: z.string().optional(),
  area: z.string().optional(),
  postal_code: z.string().optional(),
  address_privacy_level: z.enum(["EXACT", "PARTIAL", "HIDDEN"]).optional(),
  address_street: z.string().optional(),
  
  // Step 3: Surfaces
  size_net_sqm: z.coerce.number().optional(),
  size_gross_sqm: z.coerce.number().optional(),
  floor: z.string().optional(),
  floors_total: z.coerce.number().optional(),
  plot_size_sqm: z.coerce.number().optional(),
  inside_city_plan: z.boolean().optional(),
  build_coefficient: z.coerce.number().optional(),
  frontage_m: z.coerce.number().optional(),
  
  // Step 4: Characteristics
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  heating_type: z.enum(["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"]).optional(),
  energy_cert_class: z.enum(["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H", "IN_PROGRESS"]).optional(),
  
  // Step 5: Condition
  year_built: z.coerce.number().int().optional(),
  renovated_year: z.coerce.number().int().optional(),
  condition: z.enum(["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"]).optional(),
  elevator: z.boolean().optional(),
  
  // Step 6: Legal
  building_permit_no: z.string().optional().or(z.literal("")),
  building_permit_year: z.coerce.number().optional(),
  land_registry_kaek: z.string().optional().or(z.literal("")),
  legalization_status: z.enum(["LEGALIZED", "IN_PROGRESS", "UNDECLARED"]).optional(),
  etaireia_diaxeirisis: z.string().optional().or(z.literal("")),
  monthly_common_charges: z.coerce.number().optional(),
  
  // Step 7: Amenities
  amenities: z.array(z.string()).optional().default([]),
  orientation: z.array(z.string()).optional().default([]),
  furnished: z.enum(["NO", "PARTIALLY", "FULLY"]).optional(),
  accessibility: z.string().optional().or(z.literal("")),
  
  // Step 8: Pricing
  price: z.coerce.number().min(0).optional(),
  price_type: z.enum(["RENTAL", "SALE", "PER_ACRE", "PER_SQM"]).optional(),
  available_from: z.string().optional(),
  accepts_pets: z.boolean().optional(),
  min_lease_months: z.coerce.number().optional(),
  
  // Step 9: Media
  virtual_tour_url: z.string().url().optional().or(z.literal("")),
  portal_visibility: z.enum(["PRIVATE", "SELECTED", "PUBLIC"]).optional(),
  assigned_to: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditPropertyForm({ initialData }: { initialData: any }) {
  const router = useRouter();
  const t = useTranslations("mls");
  const { users } = useOrgUsers();
  const [isLoading, setIsLoading] = useState(false);

  // Floor options with translations
  const floorOptions = useMemo(() => [
    { value: "BASEMENT", label: t("PropertyForm.floor.BASEMENT") },
    { value: "GROUND", label: t("PropertyForm.floor.GROUND") },
    { value: "1ST", label: t("PropertyForm.floor.1ST") },
    { value: "2ND", label: t("PropertyForm.floor.2ND") },
    { value: "3RD", label: t("PropertyForm.floor.3RD") },
    { value: "4TH", label: t("PropertyForm.floor.4TH") },
    { value: "5TH", label: t("PropertyForm.floor.5TH") },
    { value: "6TH", label: t("PropertyForm.floor.6TH") },
    { value: "7TH", label: t("PropertyForm.floor.7TH") },
    { value: "8TH", label: t("PropertyForm.floor.8TH") },
    { value: "9TH", label: t("PropertyForm.floor.9TH") },
    { value: "10TH", label: t("PropertyForm.floor.10TH") },
    { value: "PENTHOUSE", label: t("PropertyForm.floor.PENTHOUSE") },
  ], [t]);

  // Map legacy field names to new schema
  const mappedData = useMemo(() => {
    const data: any = {
      ...initialData,
      property_type_other: initialData?.property_type_other || "",
      // Map legacy status values
      property_status: initialData?.property_status === "ACTIVE" ? "AVAILABLE" :
                      initialData?.property_status === "PENDING" ? "RESERVED" :
                      initialData?.property_status === "SOLD" ? "SOLD" :
                      initialData?.property_status === "OFF_MARKET" ? "RESERVED" :
                      initialData?.property_status === "WITHDRAWN" ? "RESERVED" :
                      initialData?.property_status || "AVAILABLE",
      // Map legacy address fields
      municipality: initialData?.municipality || initialData?.address_city || "",
      area: initialData?.area || initialData?.address_state || "",
      postal_code: initialData?.postal_code || initialData?.address_zip || "",
      address_street: initialData?.address_street || "",
      // Map legacy size fields
      size_net_sqm: initialData?.size_net_sqm || initialData?.square_feet || undefined,
      plot_size_sqm: initialData?.plot_size_sqm || initialData?.lot_size || undefined,
      // Ensure arrays
      amenities: Array.isArray(initialData?.amenities) ? initialData.amenities : [],
      orientation: Array.isArray(initialData?.orientation) ? initialData.orientation : [],
      // Ensure strings
      description: initialData?.description ?? "",
      accessibility: initialData?.accessibility ?? "",
      building_permit_no: initialData?.building_permit_no ?? "",
      land_registry_kaek: initialData?.land_registry_kaek ?? "",
      etaireia_diaxeirisis: initialData?.etaireia_diaxeirisis ?? "",
      virtual_tour_url: initialData?.virtual_tour_url ?? "",
      // Ensure defaults
      country: initialData?.country || "GR",
      portal_visibility: initialData?.portal_visibility || "PRIVATE",
      address_privacy_level: initialData?.address_privacy_level || "PARTIAL",
      is_exclusive: initialData?.is_exclusive || false,
      elevator: initialData?.elevator || false,
      accepts_pets: initialData?.accepts_pets || false,
      inside_city_plan: initialData?.inside_city_plan || undefined,
      // Format date
      available_from: initialData?.available_from 
        ? new Date(initialData.available_from).toISOString().split('T')[0] 
        : "",
    };
    return data;
  }, [initialData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mappedData,
  });

  const propertyType = form.watch("property_type");
  const transactionType = form.watch("transaction_type");
  const isResidentialOrCommercial = propertyType ? ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE"].includes(propertyType) : false;
  const isLand = propertyType ? ["PLOT", "FARM"].includes(propertyType) : false;

  // Amenity options
  const amenityOptions: MultiSelectOption[] = useMemo(() => [
    { value: "AC", label: t("PropertyForm.amenities.AC") },
    { value: "FIREPLACE", label: t("PropertyForm.amenities.FIREPLACE") },
    { value: "PARKING", label: t("PropertyForm.amenities.PARKING") },
    { value: "STORAGE", label: t("PropertyForm.amenities.STORAGE") },
    { value: "SOLAR", label: t("PropertyForm.amenities.SOLAR") },
    { value: "DOUBLE_GLAZING", label: t("PropertyForm.amenities.DOUBLE_GLAZING") },
    { value: "VIEW", label: t("PropertyForm.amenities.VIEW") },
    { value: "BALCONY", label: t("PropertyForm.amenities.BALCONY") },
    { value: "GARDEN", label: t("PropertyForm.amenities.GARDEN") },
    { value: "PET_FRIENDLY", label: t("PropertyForm.amenities.PET_FRIENDLY") },
    { value: "FRONTAGE", label: t("PropertyForm.amenities.FRONTAGE") },
  ], [t]);

  // Orientation options
  const orientationOptions: MultiSelectOption[] = useMemo(() => [
    { value: "N", label: t("PropertyForm.orientation.N") },
    { value: "S", label: t("PropertyForm.orientation.S") },
    { value: "E", label: t("PropertyForm.orientation.E") },
    { value: "W", label: t("PropertyForm.orientation.W") },
  ], [t]);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await axios.put("/api/mls/properties", data);
      router.refresh();
    } catch (error) {
      console.error("Failed to update property:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basics" className="w-full">
          <div className="flex gap-6">
            {/* Main Content Area */}
            <div className="flex-1 min-w-0">

          {/* Tab 1: Basics */}
          <TabsContent value="basics" className="space-y-4 mt-4">
            <FormSelectWithOther<FormValues, "property_type">
              name="property_type"
              otherFieldName="property_type_other"
              label={t("PropertyForm.fields.propertyType")}
              placeholder={t("PropertyForm.fields.propertyTypePlaceholder")}
              otherLabel={t("PropertyForm.fields.specifyOther")}
              otherPlaceholder={t("PropertyForm.fields.specifyOtherPlaceholder")}
              disabled={isLoading}
              options={[
                { value: "APARTMENT", label: t("PropertyForm.propertyType.APARTMENT") },
                { value: "HOUSE", label: t("PropertyForm.propertyType.HOUSE") },
                { value: "MAISONETTE", label: t("PropertyForm.propertyType.MAISONETTE") },
                { value: "COMMERCIAL", label: t("PropertyForm.propertyType.COMMERCIAL") },
                { value: "WAREHOUSE", label: t("PropertyForm.propertyType.WAREHOUSE") },
                { value: "PARKING", label: t("PropertyForm.propertyType.PARKING") },
                { value: "PLOT", label: t("PropertyForm.propertyType.PLOT") },
                { value: "FARM", label: t("PropertyForm.propertyType.FARM") },
                { value: "INDUSTRIAL", label: t("PropertyForm.propertyType.INDUSTRIAL") },
                { value: "OTHER", label: t("PropertyForm.propertyType.OTHER") },
              ]}
            />

            <FormField control={form.control} name="transaction_type" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.transactionType")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.transactionTypePlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="SALE">{t("PropertyForm.transactionType.SALE")}</SelectItem>
                    <SelectItem value="RENTAL">{t("PropertyForm.transactionType.RENTAL")}</SelectItem>
                    <SelectItem value="SHORT_TERM">{t("PropertyForm.transactionType.SHORT_TERM")}</SelectItem>
                    <SelectItem value="EXCHANGE">{t("PropertyForm.transactionType.EXCHANGE")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="property_status" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.status")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">{t("PropertyForm.status.AVAILABLE")}</SelectItem>
                      <SelectItem value="RESERVED">{t("PropertyForm.status.RESERVED")}</SelectItem>
                      <SelectItem value="NEGOTIATION">{t("PropertyForm.status.NEGOTIATION")}</SelectItem>
                      <SelectItem value="RENTED">{t("PropertyForm.status.RENTED")}</SelectItem>
                      <SelectItem value="SOLD">{t("PropertyForm.status.SOLD")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="is_exclusive" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("PropertyForm.fields.isExclusive")}</FormLabel>
                  </div>
                </FormItem>
              )} />
            </div>
          </TabsContent>

          {/* Tab 2: Location */}
          <TabsContent value="location" className="space-y-4 mt-4">
            <AddressFieldGroup
              control={form.control}
              countryFieldName="country"
              municipalityFieldName="municipality"
              areaFieldName="area"
              postalCodeFieldName="postal_code"
              defaultCountry="GR"
              disabled={isLoading}
            />

            <FormField control={form.control} name="address_street" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.street")}</FormLabel>
                <FormControl><Input disabled={isLoading} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="address_privacy_level" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.addressPrivacyLevel")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="EXACT">{t("PropertyForm.addressPrivacyLevel.EXACT")}</SelectItem>
                    <SelectItem value="PARTIAL">{t("PropertyForm.addressPrivacyLevel.PARTIAL")}</SelectItem>
                    <SelectItem value="HIDDEN">{t("PropertyForm.addressPrivacyLevel.HIDDEN")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </TabsContent>

          {/* Tab 3: Surfaces */}
          <TabsContent value="surfaces" className="space-y-4 mt-4">
            {isResidentialOrCommercial ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="size_net_sqm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("PropertyForm.fields.sizeNetSqm")}</FormLabel>
                      <FormControl>
                        <Input type="number" disabled={isLoading} {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="size_gross_sqm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("PropertyForm.fields.sizeGrossSqm")}</FormLabel>
                      <FormControl>
                        <Input type="number" disabled={isLoading} {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="floor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("PropertyForm.fields.floor")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.floorPlaceholder")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {floorOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="floors_total" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("PropertyForm.fields.floorsTotal")}</FormLabel>
                      <FormControl>
                        <Input type="number" disabled={isLoading} {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </>
            ) : isLand ? (
              <>
                <FormField control={form.control} name="plot_size_sqm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.plotSizeSqm")}</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={isLoading} {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="inside_city_plan" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("PropertyForm.fields.insideCityPlan")}</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "true")} value={field.value === undefined ? undefined : field.value.toString()}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="true">Εντός</SelectItem>
                          <SelectItem value="false">Εκτός</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="build_coefficient" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("PropertyForm.fields.buildCoefficient")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" disabled={isLoading} {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="frontage_m" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.frontageM")}</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={isLoading} {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">
                <p>{t("PropertyForm.step3.otherType")}</p>
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Characteristics */}
          <TabsContent value="characteristics" className="space-y-4 mt-4">
            {isResidentialOrCommercial && (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="bedrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.bedrooms")}</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={isLoading} {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bathrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.bathrooms")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" disabled={isLoading} {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="heating_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.heatingType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.heatingTypePlaceholder")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="AUTONOMOUS">{t("PropertyForm.heatingType.AUTONOMOUS")}</SelectItem>
                      <SelectItem value="CENTRAL">{t("PropertyForm.heatingType.CENTRAL")}</SelectItem>
                      <SelectItem value="NATURAL_GAS">{t("PropertyForm.heatingType.NATURAL_GAS")}</SelectItem>
                      <SelectItem value="HEAT_PUMP">{t("PropertyForm.heatingType.HEAT_PUMP")}</SelectItem>
                      <SelectItem value="ELECTRIC">{t("PropertyForm.heatingType.ELECTRIC")}</SelectItem>
                      <SelectItem value="NONE">{t("PropertyForm.heatingType.NONE")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="energy_cert_class" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.energyCertClass")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.energyCertClassPlaceholder")} /></SelectTrigger></FormControl>
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
                      <SelectItem value="IN_PROGRESS">{t("PropertyForm.energyCertClass.IN_PROGRESS")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </TabsContent>

          {/* Tab 5: Condition */}
          <TabsContent value="condition" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="year_built" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.yearBuilt")}</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="renovated_year" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.renovatedYear")}</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="condition" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.condition")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.conditionPlaceholder")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="EXCELLENT">{t("PropertyForm.condition.EXCELLENT")}</SelectItem>
                      <SelectItem value="VERY_GOOD">{t("PropertyForm.condition.VERY_GOOD")}</SelectItem>
                      <SelectItem value="GOOD">{t("PropertyForm.condition.GOOD")}</SelectItem>
                      <SelectItem value="NEEDS_RENOVATION">{t("PropertyForm.condition.NEEDS_RENOVATION")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {isResidentialOrCommercial && (
                <FormField control={form.control} name="elevator" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t("PropertyForm.fields.elevator")}</FormLabel>
                    </div>
                  </FormItem>
                )} />
              )}
            </div>
          </TabsContent>

          {/* Tab 6: Legal */}
          <TabsContent value="legal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="building_permit_no" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.buildingPermitNo")}</FormLabel>
                  <FormControl><Input disabled={isLoading} placeholder="Αριθμός" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="building_permit_year" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.buildingPermitYear")}</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="land_registry_kaek" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.landRegistryKaek")}</FormLabel>
                <FormControl><Input disabled={isLoading} placeholder="ΚΑΕΚ" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="legalization_status" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.legalizationStatus")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.legalizationStatusPlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="LEGALIZED">{t("PropertyForm.legalizationStatus.LEGALIZED")}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t("PropertyForm.legalizationStatus.IN_PROGRESS")}</SelectItem>
                    <SelectItem value="UNDECLARED">{t("PropertyForm.legalizationStatus.UNDECLARED")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="etaireia_diaxeirisis" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.etaireiaDiaxeirisis")}</FormLabel>
                  <FormControl><Input disabled={isLoading} placeholder="Όνομα εταιρείας" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="monthly_common_charges" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.monthlyCommonCharges")}</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </TabsContent>

          {/* Tab 7: Amenities */}
          <TabsContent value="amenities" className="space-y-4 mt-4">
            <FormField control={form.control} name="amenities" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.amenities")}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={amenityOptions}
                    value={Array.isArray(field.value) ? field.value : []}
                    onChange={field.onChange}
                    placeholder={t("PropertyForm.fields.amenitiesPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="orientation" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.orientation")}</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={orientationOptions}
                    value={Array.isArray(field.value) ? field.value : []}
                    onChange={field.onChange}
                    placeholder={t("PropertyForm.fields.orientationPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="furnished" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.furnished")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.furnishedPlaceholder")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="NO">{t("PropertyForm.furnished.NO")}</SelectItem>
                      <SelectItem value="PARTIALLY">{t("PropertyForm.furnished.PARTIALLY")}</SelectItem>
                      <SelectItem value="FULLY">{t("PropertyForm.furnished.FULLY")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="accessibility" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.accessibility")}</FormLabel>
                  <FormControl><Input disabled={isLoading} placeholder="Ράμπα, ΑΜΕΑ, κλπ." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </TabsContent>

          {/* Tab 8: Pricing */}
          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.price")} (€)</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isLoading} {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="price_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PropertyForm.fields.priceType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.priceTypePlaceholder")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="RENTAL">{t("PropertyForm.priceType.RENTAL")}</SelectItem>
                      <SelectItem value="SALE">{t("PropertyForm.priceType.SALE")}</SelectItem>
                      <SelectItem value="PER_ACRE">{t("PropertyForm.priceType.PER_ACRE")}</SelectItem>
                      <SelectItem value="PER_SQM">{t("PropertyForm.priceType.PER_SQM")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="available_from" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.availableFrom")}</FormLabel>
                <FormControl><Input type="date" disabled={isLoading} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {transactionType === "RENTAL" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="accepts_pets" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t("PropertyForm.fields.acceptsPets")}</FormLabel>
                    </div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="min_lease_months" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PropertyForm.fields.minLeaseMonths")}</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={isLoading} {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}
          </TabsContent>

          {/* Tab 9: Media */}
          <TabsContent value="media" className="space-y-4 mt-4">
            <FormField control={form.control} name="virtual_tour_url" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.virtualTourUrl")}</FormLabel>
                <FormControl><Input type="url" disabled={isLoading} placeholder="https://..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="portal_visibility" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.portalVisibility")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "PRIVATE"}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("PropertyForm.fields.portalVisibilityPlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="PRIVATE">{t("PropertyForm.portalVisibility.PRIVATE")}</SelectItem>
                    <SelectItem value="SELECTED">{t("PropertyForm.portalVisibility.SELECTED")}</SelectItem>
                    <SelectItem value="PUBLIC">{t("PropertyForm.portalVisibility.PUBLIC")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="assigned_to" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.agentOwner")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Επιλέξτε πράκτορα" /></SelectTrigger></FormControl>
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
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PropertyForm.fields.description")}</FormLabel>
                <FormControl>
                  <Textarea disabled={isLoading} {...field} value={field.value ?? ""} rows={6} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="text-sm text-muted-foreground">
              <p>{t("PropertyForm.fields.photos")}: Θα προστεθούν από τη σελίδα λεπτομερειών.</p>
            </div>
          </TabsContent>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t mt-6">
                <Button disabled={isLoading} type="submit">
                  {isLoading ? t("PropertyForm.autosave.saving") : t("PropertyForm.buttons.update")}
                </Button>
              </div>
            </div>

            {/* Vertical Sidebar */}
            <aside className="w-64 flex-shrink-0 border-l bg-sidebar-accent/30 p-4">
              <TabsList className="flex flex-col h-auto w-full gap-1 bg-transparent p-0">
                <TabsTrigger 
                  value="basics" 
                  className="w-full justify-start h-auto py-2.5 px-3 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground"
                >
                  {t("PropertyForm.steps.basics")}
                </TabsTrigger>
                <TabsTrigger 
                  value="location" 
                  className="w-full justify-start h-auto py-2.5 px-3 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground"
                >
                  {t("PropertyForm.steps.location")}
                </TabsTrigger>
                <TabsTrigger 
                  value="surfaces" 
                  className="w-full justify-start h-auto py-2.5 px-3 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground"
                >
                  {t("PropertyForm.steps.surfaces")}
                </TabsTrigger>
                <TabsTrigger 
                  value="characteristics" 
                  className="w-full justify-start h-auto py-2.5 px-3 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground"
                >
                  {t("PropertyForm.steps.characteristics")}
                </TabsTrigger>
                <TabsTrigger 
                  value="condition" 
                  className="w-full justify-start h-auto py-2.5 px-3 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground"
                >
                  {t("PropertyForm.steps.condition")}
                </TabsTrigger>
                <TabsTrigger 
                  value="legal" 
                  className="w-full justify-start h-auto py-2.5 px-3 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground"
                >
                  {t("PropertyForm.steps.legal")}
                </TabsTrigger>
                <TabsTrigger 
                  value="amenities" 
                  className="w-full justify-start h-auto py-2.5 px-3 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground"
                >
                  {t("PropertyForm.steps.amenities")}
                </TabsTrigger>
                <TabsTrigger 
                  value="pricing" 
                  className="w-full justify-start h-auto py-2.5 px-3 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground"
                >
                  {t("PropertyForm.steps.pricing")}
                </TabsTrigger>
                <TabsTrigger 
                  value="media" 
                  className="w-full justify-start h-auto py-2.5 px-3 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground"
                >
                  {t("PropertyForm.steps.media")}
                </TabsTrigger>
              </TabsList>
            </aside>
          </div>
        </Tabs>
      </form>
    </Form>
  );
}
