"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/**
 * SelectWithOther Component - Oikion Design System
 * 
 * A Select component that automatically shows an input field when "Other" is selected.
 * 
 * Features:
 * - Automatically detects "Other" option selection (case-insensitive)
 * - Configurable "Other" value patterns (default: "other", "OTHER", "άλλο", "Άλλο", "ΑΛΛΟ")
 * - Smooth animation for the input field appearance
 * - Full accessibility support
 * - Works with React Hook Form via FormSelectWithOther
 * 
 * @example
 * // Standalone usage
 * <SelectWithOther
 *   value={value}
 *   onValueChange={setValue}
 *   otherValue={otherValue}
 *   onOtherValueChange={setOtherValue}
 *   placeholder="Select an option"
 *   otherPlaceholder="Please specify..."
 *   options={[
 *     { value: "option1", label: "Option 1" },
 *     { value: "option2", label: "Option 2" },
 *     { value: "other", label: "Other" },
 *   ]}
 * />
 */

// Pattern to detect "Other" values in various languages
const DEFAULT_OTHER_PATTERNS = [
  "other",
  "OTHER", 
  "Other",
  "άλλο",
  "Άλλο",
  "ΑΛΛΟ",
  "αλλο",
  "ΑΛΛΟ",
];

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectWithOtherProps {
  /** Current selected value */
  value?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Current "Other" input value */
  otherValue?: string;
  /** Callback when "Other" input value changes */
  onOtherValueChange?: (value: string) => void;
  /** Placeholder text for the select */
  placeholder?: string;
  /** Placeholder text for the "Other" input */
  otherPlaceholder?: string;
  /** Label for the "Other" input field */
  otherLabel?: string;
  /** Array of options to display */
  options?: SelectOption[];
  /** Additional patterns to detect as "Other" selection */
  otherPatterns?: string[];
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Additional class names for the container */
  className?: string;
  /** Additional class names for the select trigger */
  triggerClassName?: string;
  /** Additional class names for the "Other" input */
  inputClassName?: string;
  /** Name attribute for form submission */
  name?: string;
  /** Children elements (for SelectItem rendering manually) */
  children?: React.ReactNode;
  /** Whether the "Other" input is required when "Other" is selected */
  otherRequired?: boolean;
}

/**
 * Check if a value matches any "Other" pattern
 */
export function isOtherValue(
  value: string | undefined,
  customPatterns?: string[]
): boolean {
  if (!value) return false;
  
  const patterns = customPatterns 
    ? [...DEFAULT_OTHER_PATTERNS, ...customPatterns]
    : DEFAULT_OTHER_PATTERNS;
  
  const normalizedValue = value.toLowerCase().trim();
  
  return patterns.some(pattern => 
    normalizedValue === pattern.toLowerCase().trim()
  );
}

export function SelectWithOther({
  value,
  onValueChange,
  otherValue = "",
  onOtherValueChange,
  placeholder = "Select an option",
  otherPlaceholder = "Please specify...",
  otherLabel = "Please specify",
  options,
  otherPatterns,
  disabled = false,
  className,
  triggerClassName,
  inputClassName,
  name,
  children,
  otherRequired = false,
}: SelectWithOtherProps) {
  const showOtherInput = isOtherValue(value, otherPatterns);

  const handleValueChange = (newValue: string) => {
    onValueChange?.(newValue);
    // Clear other value when switching away from "other"
    if (!isOtherValue(newValue, otherPatterns) && otherValue) {
      onOtherValueChange?.("");
    }
  };

  const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onOtherValueChange?.(e.target.value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        name={name}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options ? (
            options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))
          ) : (
            children
          )}
        </SelectContent>
      </Select>
      
      {/* Animated "Other" input field */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out -mx-1",
          showOtherInput 
            ? "grid-rows-[1fr] opacity-100" 
            : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden px-1">
          <div className="pt-2 pb-1 space-y-1.5">
            <Label 
              htmlFor={name ? `${name}-other` : "other-input"} 
              className="text-sm text-muted-foreground"
            >
              {otherLabel}
            </Label>
            <Input
              id={name ? `${name}-other` : "other-input"}
              name={name ? `${name}_other` : undefined}
              value={otherValue}
              onChange={handleOtherInputChange}
              placeholder={otherPlaceholder}
              disabled={disabled}
              required={otherRequired && showOtherInput}
              className={cn(
                "transition-all duration-200 ease-in-out",
                inputClassName
              )}
              aria-describedby={showOtherInput ? undefined : "hidden"}
              tabIndex={showOtherInput ? 0 : -1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

SelectWithOther.displayName = "SelectWithOther";

/**
 * Helper hook for managing SelectWithOther state
 */
export function useSelectWithOther(initialValue?: string, initialOtherValue?: string) {
  const [value, setValue] = React.useState(initialValue);
  const [otherValue, setOtherValue] = React.useState(initialOtherValue || "");

  const reset = React.useCallback(() => {
    setValue(initialValue);
    setOtherValue(initialOtherValue || "");
  }, [initialValue, initialOtherValue]);

  /**
   * Get the final value - returns otherValue if "Other" is selected, otherwise returns the selected value
   */
  const getFinalValue = React.useCallback(() => {
    if (isOtherValue(value)) {
      return otherValue || value;
    }
    return value;
  }, [value, otherValue]);

  return {
    value,
    setValue,
    otherValue,
    setOtherValue,
    reset,
    getFinalValue,
    isOther: isOtherValue(value),
  };
}

export { DEFAULT_OTHER_PATTERNS };
