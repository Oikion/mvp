"use server";

import { TemplateType } from "@prisma/client";
import { getTemplateDefinition, validatePlaceholders } from "@/lib/templates";

export interface ValidationInput {
  templateType: TemplateType;
  values: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  missing: { key: string; label: string }[];
}

/**
 * Validate that all required template fields have values
 */
export async function validateTemplateData(
  input: ValidationInput,
  locale: "en" | "el" = "el"
): Promise<ValidationResult> {
  const definition = getTemplateDefinition(input.templateType);
  
  if (!definition) {
    throw new Error("Template not found");
  }

  const { valid, missing } = validatePlaceholders(definition.placeholders, input.values);

  // Map missing keys to labels
  const missingWithLabels = missing.map((key) => {
    const placeholder = definition.placeholders.find((p) => p.key === key);
    return {
      key,
      label: placeholder
        ? locale === "el"
          ? placeholder.labelEl
          : placeholder.labelEn
        : key,
    };
  });

  return {
    valid,
    missing: missingWithLabels,
  };
}






