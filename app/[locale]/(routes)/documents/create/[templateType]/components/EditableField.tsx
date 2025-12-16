"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TemplatePlaceholder } from "@/lib/templates";

interface EditableFieldProps {
  readonly placeholder: TemplatePlaceholder;
  readonly value: string;
  readonly locale: "en" | "el";
  readonly isPreview?: boolean;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  readonly inline?: boolean;
}

export function EditableField({
  placeholder,
  value,
  locale,
  isPreview = false,
  onChange,
  className,
  inline = false,
}: EditableFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isGreek = locale === "el";

  const label = isGreek ? placeholder.labelEl : placeholder.labelEn;
  const isEmpty = !value || value.trim() === "";
  const isRequired = placeholder.required;

  // Format display value based on type
  const getDisplayValue = () => {
    if (isEmpty) return "";

    switch (placeholder.type) {
      case "currency": {
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return new Intl.NumberFormat(isGreek ? "el-GR" : "en-US", {
          style: "currency",
          currency: "EUR",
        }).format(num);
      }

      case "date":
        try {
          const date = new Date(value);
          return date.toLocaleDateString(isGreek ? "el-GR" : "en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch {
          return value;
        }

      case "boolean":
        if (value === "true") {
          return isGreek ? "Ναι" : "Yes";
        }
        return isGreek ? "Όχι" : "No";

      case "select": {
        const option = placeholder.options?.find((o) => o.value === value);
        if (option) {
          return isGreek ? option.labelEl : option.labelEn;
        }
        return value;
      }

      default:
        return value;
    }
  };

  // Preview mode - just show the value
  if (isPreview) {
    return (
      <span
        className={cn(
          "inline",
          isEmpty && isRequired && "italic",
          className
        )}
        style={{ color: isEmpty && isRequired ? "#ef4444" : "#000000" }}
      >
        {isEmpty ? `[${label}]` : getDisplayValue()}
      </span>
    );
  }

  // Common styles for white-themed inputs on document canvas
  // Force white background and BLACK text regardless of app theme
  const baseInputStyles = cn(
    "!bg-white !text-black placeholder:!text-gray-500",
    "border border-dashed !border-gray-300",
    "focus:!ring-2 focus:!ring-blue-400 focus:!border-blue-400",
    "h-auto py-0.5 px-1.5",
    "[&]:!text-black" // Extra specificity for text color
  );

  // Render different input types
  const renderInput = () => {
    switch (placeholder.type) {
      case "select":
        return (
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger
              className={cn(
                baseInputStyles,
                "min-w-[120px]",
                inline && "inline-flex w-auto",
                isEmpty && isRequired && "!border-orange-500",
                !isEmpty && "!border-blue-400 !bg-white",
                // Force black text in select trigger
                "[&>span]:!text-black [&>svg]:!text-gray-600"
              )}
            >
              <SelectValue 
                placeholder={label} 
                className="!text-black"
              />
            </SelectTrigger>
            <SelectContent className="!bg-white">
              {placeholder.options?.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="!text-black hover:!bg-gray-100"
                >
                  {isGreek ? option.labelEl : option.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "boolean":
        return (
          <span
            className={cn(
              "inline-flex items-center gap-2 px-2 py-1 rounded border border-dashed cursor-pointer",
              // Force light theme colors
              value === "true"
                ? "!bg-green-50 !border-green-400"
                : "!bg-gray-50 !border-gray-300",
              inline && "inline-flex"
            )}
            onClick={() => onChange(value === "true" ? "false" : "true")}
          >
            <Switch
              checked={value === "true"}
              onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
              className="scale-75"
            />
            <span className="text-sm text-gray-900">
              {value === "true" ? (isGreek ? "Ναι" : "Yes") : (isGreek ? "Όχι" : "No")}
            </span>
          </span>
        );

      case "date":
        return (
          <Input
            ref={inputRef}
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              baseInputStyles,
              "w-auto min-w-[140px]",
              inline && "inline-block",
              isEmpty && isRequired && "!border-orange-500",
              !isEmpty && "!border-blue-400",
              isFocused && "!ring-2 !ring-blue-400"
            )}
          />
        );

      case "currency":
      case "number":
        return (
          <Input
            ref={inputRef}
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={label}
            step={placeholder.type === "currency" ? "0.01" : "1"}
            className={cn(
              baseInputStyles,
              "w-auto min-w-[100px]",
              inline && "inline-block",
              isEmpty && isRequired && "!border-orange-500",
              !isEmpty && "!border-blue-400",
              isFocused && "!ring-2 !ring-blue-400"
            )}
          />
        );

      default: // text
        return (
          <Input
            ref={inputRef}
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={label}
            className={cn(
              baseInputStyles,
              inline ? "inline-block w-auto min-w-[150px]" : "w-full",
              isEmpty && isRequired && "!border-orange-500",
              !isEmpty && "!border-blue-400",
              isFocused && "!ring-2 !ring-blue-400"
            )}
          />
        );
    }
  };

  return (
    <span
      className={cn(
        "relative group",
        inline && "inline-block align-baseline",
        className
      )}
    >
      {renderInput()}
      {/* Tooltip showing field name on hover */}
      {isFocused && (
        <span className="absolute -top-6 left-0 text-xs bg-gray-800 text-white px-1.5 py-0.5 rounded whitespace-nowrap z-10 shadow-md">
          {label}
          {isRequired && " *"}
        </span>
      )}
    </span>
  );
}

// Row-style field with label
interface FieldRowProps {
  readonly placeholder: TemplatePlaceholder;
  readonly value: string;
  readonly locale: "en" | "el";
  readonly isPreview?: boolean;
  readonly onChange: (value: string) => void;
}

export function FieldRow({
  placeholder,
  value,
  locale,
  isPreview = false,
  onChange,
}: FieldRowProps) {
  const isGreek = locale === "el";
  const label = isGreek ? placeholder.labelEl : placeholder.labelEn;

  return (
    <div className="flex items-start gap-2 py-1">
      <span 
        className="font-semibold text-sm min-w-[40%] flex-shrink-0"
        style={{ color: "#000000" }}
      >
        {label}:
      </span>
      <EditableField
        placeholder={placeholder}
        value={value}
        locale={locale}
        isPreview={isPreview}
        onChange={onChange}
        className="flex-1"
      />
    </div>
  );
}



