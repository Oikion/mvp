"use client";

import { Control, FieldPath, FieldValues } from "react-hook-form";
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

export interface AddressFieldGroupProps<T extends FieldValues> {
  control: Control<T>;
  countryFieldName: FieldPath<T>;
  municipalityFieldName: FieldPath<T>;
  areaFieldName?: FieldPath<T>;
  postalCodeFieldName: FieldPath<T>;
  regionFieldName?: FieldPath<T>;
  regionalUnitFieldName?: FieldPath<T>;
  defaultCountry?: string;
  disabled?: boolean;
  className?: string;
  showCountry?: boolean;
  /** When true, shows a red asterisk on area and postal code fields (at least one required) */
  requireAreaOrPostal?: boolean;
}

const COUNTRIES = [
  { code: "GR", name: "Ελλάδα", nameEn: "Greece" },
];

/**
 * AddressFieldGroup Component
 *
 * Reusable address input component for Greek properties.
 * Renders country, municipality, area, and postal code fields.
 * Integrates with react-hook-form.
 */
export function AddressFieldGroup<T extends FieldValues>({
  control,
  countryFieldName,
  municipalityFieldName,
  areaFieldName,
  postalCodeFieldName,
  regionFieldName,
  regionalUnitFieldName,
  defaultCountry = "GR",
  disabled = false,
  className,
  showCountry = true,
  requireAreaOrPostal = false,
}: AddressFieldGroupProps<T>) {
  const t = useTranslations("common.address");
  const isGreek = true;

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
                onValueChange={field.onChange}
                value={field.value || defaultCountry}
                disabled={disabled}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("countryPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {isGreek ? c.name : c.nameEn}
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
                disabled={disabled}
                placeholder={t("municipalityPlaceholder")}
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
                <FormLabel required={requireAreaOrPostal}>{t("area")}</FormLabel>
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
              <FormLabel required={requireAreaOrPostal}>{t("postalCode")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={disabled}
                  placeholder={t("postalCodePlaceholder")}
                  maxLength={5}
                  onChange={(e) => {
                    const value = e.target.value.replaceAll(/\D/g, "");
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {(regionFieldName || regionalUnitFieldName) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regionFieldName && (
            <FormField
              control={control}
              name={regionFieldName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("region")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={disabled}
                      placeholder={t("regionPlaceholder")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {regionalUnitFieldName && (
            <FormField
              control={control}
              name={regionalUnitFieldName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("regionalUnit")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={disabled}
                      placeholder={t("regionalUnitPlaceholder")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
