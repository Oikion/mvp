"use client";

import { useEffect, useRef } from "react";
import { useFormContext, Control, FieldPath, FieldValues } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddressAutofill } from "@/hooks/useAddressAutofill";
import useDebounce from "@/hooks/useDebounce";

export interface AddressFieldGroupProps<T extends FieldValues> {
  control: Control<T>;
  countryFieldName: FieldPath<T>;
  municipalityFieldName: FieldPath<T>;
  areaFieldName?: FieldPath<T>;
  postalCodeFieldName: FieldPath<T>;
  defaultCountry?: string;
  disabled?: boolean;
  className?: string;
  showCountry?: boolean;
}

const COUNTRIES = [
  { code: "GR", name: "Ελλάδα", nameEn: "Greece" },
  // Add more countries as needed
];

/**
 * AddressFieldGroup Component
 * 
 * A reusable component for address input with bi-directional autofill:
 * - Enter postal code → auto-fills municipality
 * - Enter municipality → suggests postal codes
 * - Country restriction (default: Greece)
 * 
 * Integrates with react-hook-form for form management.
 */
export function AddressFieldGroup<T extends FieldValues>({
  control,
  countryFieldName,
  municipalityFieldName,
  areaFieldName,
  postalCodeFieldName,
  defaultCountry = "GR",
  disabled = false,
  className,
  showCountry = true,
}: AddressFieldGroupProps<T>) {
  const t = useTranslations("common.address");
  const form = useFormContext<T>();
  
  // Get current values using watch
  const country = form.watch(countryFieldName) || defaultCountry;
  const postalCode = form.watch(postalCodeFieldName) || "";
  const municipality = form.watch(municipalityFieldName) || "";
  
  // Debounce values for autofill
  const debouncedPostalCode = useDebounce(postalCode, 500);
  const debouncedMunicipality = useDebounce(municipality, 500);
  
  // Track if autofill was triggered programmatically to prevent loops
  const isAutofillingRef = useRef(false);
  const lastAutofilledPostalCodeRef = useRef<string>("");
  const lastAutofilledMunicipalityRef = useRef<string>("");

  // Initialize autofill hook
  const autofill = useAddressAutofill({
    country,
    onLookupComplete: (result) => {
      if (isAutofillingRef.current) return;
      
      isAutofillingRef.current = true;
      
      try {
        // If lookup was by postal code, fill municipality
        if (result.postalCode && result.municipality) {
          if (
            result.postalCode === debouncedPostalCode &&
            lastAutofilledPostalCodeRef.current !== result.postalCode
          ) {
            form.setValue(municipalityFieldName, result.municipality as any, {
              shouldValidate: false,
              shouldDirty: true,
            });
            
            if (result.area && areaFieldName) {
              form.setValue(areaFieldName, result.area as any, {
                shouldValidate: false,
                shouldDirty: true,
              });
            }
            
            lastAutofilledPostalCodeRef.current = result.postalCode;
          }
        }
        
        // If lookup was by municipality, suggest postal codes
        if (result.municipality && result.suggestions && result.suggestions.length > 0) {
          if (
            result.municipality.toLowerCase() === debouncedMunicipality.toLowerCase() &&
            lastAutofilledMunicipalityRef.current !== result.municipality
          ) {
            // Auto-fill first suggestion's postal code if postal code is empty
            if (!postalCode && result.suggestions[0].postalCode) {
              form.setValue(postalCodeFieldName, result.suggestions[0].postalCode as any, {
                shouldValidate: false,
                shouldDirty: true,
              });
            }
            
            lastAutofilledMunicipalityRef.current = result.municipality;
          }
        }
      } finally {
        setTimeout(() => {
          isAutofillingRef.current = false;
        }, 100);
      }
    },
  });

  // Trigger lookup when postal code changes
  useEffect(() => {
    if (
      debouncedPostalCode &&
      /^\d{5}$/.test(debouncedPostalCode) &&
      country === "GR" &&
      !isAutofillingRef.current
    ) {
      // Only lookup if postal code is different from last autofilled
      if (lastAutofilledPostalCodeRef.current !== debouncedPostalCode) {
        autofill.lookupByPostalCode(debouncedPostalCode);
      }
    }
  }, [debouncedPostalCode, country, autofill]);

  // Trigger lookup when municipality changes
  useEffect(() => {
    if (
      debouncedMunicipality &&
      debouncedMunicipality.length >= 2 &&
      country === "GR" &&
      !isAutofillingRef.current
    ) {
      // Only lookup if municipality is different from last autofilled
      if (
        lastAutofilledMunicipalityRef.current.toLowerCase() !==
        debouncedMunicipality.toLowerCase()
      ) {
        autofill.lookupByMunicipality(debouncedMunicipality);
      }
    }
  }, [debouncedMunicipality, country, autofill]);

  // Reset dependent fields when country changes
  useEffect(() => {
    if (country !== "GR") {
      // Clear municipality and postal code when country changes away from Greece
      form.setValue(municipalityFieldName, "" as any, { shouldValidate: false });
      form.setValue(postalCodeFieldName, "" as any, { shouldValidate: false });
      if (areaFieldName) {
        form.setValue(areaFieldName, "" as any, { shouldValidate: false });
      }
      lastAutofilledPostalCodeRef.current = "";
      lastAutofilledMunicipalityRef.current = "";
    }
  }, [country, form, municipalityFieldName, postalCodeFieldName, areaFieldName]);

  const isGreek = true; // Assuming Greek locale for now

  return (
    <div className={className}>
      {showCountry && (
        <FormField
          control={control}
          name={countryFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("country")}</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                }}
                value={field.value || defaultCountry}
                disabled={disabled}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("countryPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {isGreek ? country.name : country.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name={municipalityFieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("municipality")}
              <span className="text-destructive ml-1">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                disabled={disabled || autofill.isLoading}
                placeholder={t("municipalityPlaceholder")}
                onChange={(e) => {
                  field.onChange(e);
                  // Reset postal code autofill tracking when municipality changes manually
                  if (e.target.value !== lastAutofilledMunicipalityRef.current) {
                    lastAutofilledPostalCodeRef.current = "";
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areaFieldName && (
          <FormField
            control={control}
            name={areaFieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("area")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={disabled}
                    placeholder={t("areaPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={control}
          name={postalCodeFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("postalCode")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={disabled || autofill.isLoading}
                  placeholder={t("postalCodePlaceholder")}
                  maxLength={5}
                  onChange={(e) => {
                    const value = e.target.value.replaceAll(/\D/g, ""); // Only digits
                    field.onChange(value);
                    // Reset municipality autofill tracking when postal code changes manually
                    if (value !== lastAutofilledPostalCodeRef.current) {
                      lastAutofilledMunicipalityRef.current = "";
                    }
                  }}
                />
              </FormControl>
              {autofill.error && (
                <p className="text-sm text-destructive">{autofill.error}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
