import type { Clients, Properties, Users, MyAccount } from "@prisma/client";
import type { TemplatePlaceholder } from "./template-definitions";

interface AutoFillContext {
  property?: Properties | null;
  client?: Clients | null;
  agent?: Users | null;
  organization?: MyAccount | null;
}

/**
 * Auto-fills template placeholders from the given entities
 */
export function autoFillPlaceholders(
  placeholders: TemplatePlaceholder[],
  context: AutoFillContext
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const placeholder of placeholders) {
    // Start with default value if available
    if (placeholder.defaultValue) {
      values[placeholder.key] = placeholder.defaultValue;
    }

    // Skip if no auto-fill is configured
    if (!placeholder.autoFillFrom || !placeholder.autoFillField) {
      continue;
    }

    let entity: Record<string, unknown> | null | undefined = null;

    switch (placeholder.autoFillFrom) {
      case "property":
        entity = context.property as Record<string, unknown> | null;
        break;
      case "client":
        entity = context.client as Record<string, unknown> | null;
        break;
      case "agent":
        entity = context.agent as Record<string, unknown> | null;
        break;
      case "organization":
        entity = context.organization as Record<string, unknown> | null;
        break;
    }

    if (!entity) {
      continue;
    }

    const fieldValue = entity[placeholder.autoFillField];

    if (fieldValue !== null && fieldValue !== undefined) {
      // Convert value to string based on type
      if (typeof fieldValue === "boolean") {
        values[placeholder.key] = fieldValue ? "true" : "false";
      } else if (typeof fieldValue === "number") {
        values[placeholder.key] = String(fieldValue);
      } else if (fieldValue instanceof Date) {
        values[placeholder.key] = fieldValue.toISOString().split("T")[0];
      } else if (typeof fieldValue === "object" && "toNumber" in fieldValue) {
        // Handle Prisma Decimal type
        values[placeholder.key] = String((fieldValue as { toNumber: () => number }).toNumber());
      } else {
        values[placeholder.key] = String(fieldValue);
      }
    }
  }

  return values;
}

/**
 * Merges auto-filled values with user-provided values
 * User values take precedence
 */
export function mergeValues(
  autoFilled: Record<string, string>,
  userProvided: Record<string, string>
): Record<string, string> {
  return {
    ...autoFilled,
    ...userProvided,
  };
}

/**
 * Validates that all required placeholders have values
 */
export function validatePlaceholders(
  placeholders: TemplatePlaceholder[],
  values: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const placeholder of placeholders) {
    if (placeholder.required && (!values[placeholder.key] || values[placeholder.key].trim() === "")) {
      missing.push(placeholder.key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Formats a value for display based on placeholder type
 */
export function formatValue(
  value: string,
  type: TemplatePlaceholder["type"],
  locale: "en" | "el" = "el"
): string {
  if (!value) return "";

  switch (type) {
    case "currency":
      const num = parseFloat(value);
      return isNaN(num)
        ? value
        : new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-US", {
            style: "currency",
            currency: "EUR",
          }).format(num);

    case "number":
      const numVal = parseFloat(value);
      return isNaN(numVal)
        ? value
        : new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-US").format(numVal);

    case "date":
      const date = new Date(value);
      return isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(date);

    case "boolean":
      if (locale === "el") {
        return value === "true" ? "Ναι" : "Όχι";
      }
      return value === "true" ? "Yes" : "No";

    default:
      return value;
  }
}

