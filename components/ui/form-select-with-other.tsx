"use client";

import * as React from "react";
import { useFormContext, Controller, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { isOtherValue, SelectOption, DEFAULT_OTHER_PATTERNS } from "./select-with-other";

/**
 * FormSelectWithOther Component - Oikion Design System
 * 
 * A React Hook Form integrated Select component that automatically shows an input
 * field when "Other" is selected.
 * 
 * Features:
 * - Full React Hook Form integration
 * - Automatically manages both select value and "Other" input value
 * - Supports combined field (stores both in single field) or separate fields
 * - Smooth animation for input appearance
 * - Full validation support
 * 
 * @example
 * // With combined value (stores "other:custom value" format)
 * <FormSelectWithOther
 *   name="propertyType"
 *   label="Property Type"
 *   placeholder="Select type"
 *   options={[
 *     { value: "APARTMENT", label: "Apartment" },
 *     { value: "OTHER", label: "Other" },
 *   ]}
 * />
 * 
 * @example
 * // With separate field for "Other" value
 * <FormSelectWithOther
 *   name="propertyType"
 *   otherFieldName="propertyTypeOther"
 *   label="Property Type"
 *   options={propertyOptions}
 * />
 */

export interface FormSelectWithOtherProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  /** Field name for the select value */
  name: TName;
  /** Optional separate field name for the "Other" input value */
  otherFieldName?: FieldPath<TFieldValues>;
  /** Label for the form field */
  label?: string;
  /** Description text below the field */
  description?: string;
  /** Placeholder text for the select */
  placeholder?: string;
  /** Placeholder text for the "Other" input */
  otherPlaceholder?: string;
  /** Label for the "Other" input field */
  otherLabel?: string;
  /** Array of options to display */
  options: SelectOption[];
  /** Additional patterns to detect as "Other" selection */
  otherPatterns?: string[];
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class names for the form item */
  className?: string;
  /** Additional class names for the select trigger */
  triggerClassName?: string;
  /** Additional class names for the "Other" input */
  inputClassName?: string;
  /** Whether the "Other" input is required when "Other" is selected */
  otherRequired?: boolean;
  /** Custom render for select items (children) */
  children?: React.ReactNode;
  /** Whether to render as controlled from outside (for FormField usage) */
  controlledField?: {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
  };
}

export function FormSelectWithOther<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  otherFieldName,
  label,
  description,
  placeholder = "Select an option",
  otherPlaceholder = "Please specify...",
  otherLabel = "Please specify",
  options,
  otherPatterns,
  disabled = false,
  className,
  triggerClassName,
  inputClassName,
  otherRequired = false,
  children,
  controlledField,
}: FormSelectWithOtherProps<TFieldValues, TName>) {
  const form = useFormContext<TFieldValues>();
  
  // Get the other field controller if a separate field is specified
  const otherFieldValue = otherFieldName 
    ? form.watch(otherFieldName) 
    : "";
  
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const currentValue = controlledField?.value ?? field.value;
        const showOtherInput = isOtherValue(currentValue, otherPatterns);
        
        const handleValueChange = (newValue: string) => {
          if (controlledField) {
            controlledField.onChange(newValue);
          } else {
            field.onChange(newValue);
          }
          
          // Clear other field if switching away from "other"
          if (!isOtherValue(newValue, otherPatterns) && otherFieldName) {
            form.setValue(otherFieldName, "" as any);
          }
        };

        const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (otherFieldName) {
            form.setValue(otherFieldName, e.target.value as any, { 
              shouldValidate: true,
              shouldDirty: true,
            });
          }
        };

        return (
          <FormItem className={className}>
            {label && <FormLabel>{label}</FormLabel>}
            <div className="space-y-2">
              <Select
                value={currentValue || ""}
                onValueChange={handleValueChange}
                disabled={disabled}
                name={field.name}
              >
                <FormControl>
                  <SelectTrigger 
                    className={cn(
                      fieldState.error && "border-destructive",
                      triggerClassName
                    )}
                    onBlur={controlledField?.onBlur ?? field.onBlur}
                  >
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {children ?? options.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Animated "Other" input field */}
              <div
                className={cn(
                  "grid transition-all duration-200 ease-in-out -mx-0.5",
                  showOtherInput 
                    ? "grid-rows-[1fr] opacity-100" 
                    : "grid-rows-[0fr] opacity-0"
                )}
                aria-hidden={!showOtherInput}
              >
                <div className="overflow-hidden px-0.5">
                  <div className="pt-2 pb-2 space-y-1.5">
                    <label 
                      htmlFor={`${field.name}-other`}
                      className="text-xs text-muted-foreground"
                    >
                      {otherLabel}
                    </label>
                    {otherFieldName ? (
                      <Controller
                        control={form.control}
                        name={otherFieldName}
                        render={({ field: otherField, fieldState: otherFieldState }) => (
                          <>
                            <Input
                              id={`${field.name}-other`}
                              {...otherField}
                              value={otherField.value || ""}
                              placeholder={otherPlaceholder}
                              disabled={disabled}
                              required={otherRequired && showOtherInput}
                              className={cn(
                                "transition-all duration-200 ease-in-out",
                                otherFieldState.error && "border-destructive",
                                inputClassName
                              )}
                              tabIndex={showOtherInput ? 0 : -1}
                            />
                            {otherFieldState.error && (
                              <p className="text-sm font-medium text-destructive">
                                {otherFieldState.error.message}
                              </p>
                            )}
                          </>
                        )}
                      />
                    ) : (
                      <Input
                        id={`${field.name}-other`}
                        value={otherFieldValue || ""}
                        onChange={handleOtherInputChange}
                        placeholder={otherPlaceholder}
                        disabled={disabled}
                        required={otherRequired && showOtherInput}
                        className={cn(
                          "transition-all duration-200 ease-in-out",
                          inputClassName
                        )}
                        tabIndex={showOtherInput ? 0 : -1}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

FormSelectWithOther.displayName = "FormSelectWithOther";

/**
 * Hook to create a combined value from select and other input
 * Useful when you want to store a single value that includes the custom "other" text
 */
export function useCombinedOtherValue(
  selectValue: string | undefined,
  otherValue: string | undefined,
  separator: string = ":"
): string {
  if (isOtherValue(selectValue) && otherValue) {
    return `${selectValue}${separator}${otherValue}`;
  }
  return selectValue || "";
}

/**
 * Helper to parse a combined other value back to select value and other value
 */
export function parseCombinedOtherValue(
  combinedValue: string | undefined,
  separator: string = ":"
): { selectValue: string; otherValue: string } {
  if (!combinedValue) {
    return { selectValue: "", otherValue: "" };
  }
  
  // Check if this is a combined value
  const separatorIndex = combinedValue.indexOf(separator);
  
  if (separatorIndex > 0) {
    const selectPart = combinedValue.slice(0, separatorIndex);
    if (isOtherValue(selectPart)) {
      return {
        selectValue: selectPart,
        otherValue: combinedValue.slice(separatorIndex + separator.length),
      };
    }
  }
  
  return { selectValue: combinedValue, otherValue: "" };
}

export { isOtherValue, DEFAULT_OTHER_PATTERNS };
