/**
 * JSON Schema validation utilities for AI tools
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";

// Initialize AJV with formats support
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validate input data against a JSON Schema
 */
export function validateInput(schema: Record<string, unknown>, data: unknown): ValidationResult {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (!valid && validate.errors) {
      const errors = validate.errors.map((err) => {
        const path = err.instancePath || "root";
        return `${path}: ${err.message}`;
      });
      return { valid: false, errors };
    }

    return { valid: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Schema validation failed";
    return { valid: false, errors: [errorMessage] };
  }
}

/**
 * Validate that a schema is a valid JSON Schema
 */
export function validateSchema(schema: unknown): ValidationResult {
  if (!schema || typeof schema !== "object") {
    return { valid: false, errors: ["Schema must be an object"] };
  }

  const schemaObj = schema as Record<string, unknown>;

  // Must have type: "object"
  if (schemaObj.type !== "object") {
    return { valid: false, errors: ['Schema type must be "object"'] };
  }

  // Must have properties
  if (!schemaObj.properties || typeof schemaObj.properties !== "object") {
    return { valid: false, errors: ["Schema must have properties object"] };
  }

  // Try to compile the schema to validate it
  try {
    ajv.compile(schemaObj);
    return { valid: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Invalid schema";
    return { valid: false, errors: [errorMessage] };
  }
}

/**
 * Generate an empty object conforming to a schema
 * Useful for initializing form data
 */
export function generateDefaultValue(schema: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;

  if (!properties) {
    return result;
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    if (propSchema.default !== undefined) {
      result[key] = propSchema.default;
    } else if (propSchema.type === "string") {
      result[key] = "";
    } else if (propSchema.type === "number" || propSchema.type === "integer") {
      result[key] = 0;
    } else if (propSchema.type === "boolean") {
      result[key] = false;
    } else if (propSchema.type === "array") {
      result[key] = [];
    } else if (propSchema.type === "object") {
      result[key] = {};
    }
  }

  return result;
}

/**
 * Get property descriptions from a schema
 * Useful for form tooltips
 */
export function getPropertyDescriptions(
  schema: Record<string, unknown>
): Record<string, string> {
  const descriptions: Record<string, string> = {};
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;

  if (!properties) {
    return descriptions;
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    if (propSchema.description && typeof propSchema.description === "string") {
      descriptions[key] = propSchema.description;
    }
  }

  return descriptions;
}

/**
 * Get required fields from a schema
 */
export function getRequiredFields(schema: Record<string, unknown>): string[] {
  const required = schema.required;
  if (Array.isArray(required)) {
    return required.filter((item): item is string => typeof item === "string");
  }
  return [];
}

/**
 * Extract property types from a schema
 */
export function getPropertyTypes(
  schema: Record<string, unknown>
): Record<string, string> {
  const types: Record<string, string> = {};
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;

  if (!properties) {
    return types;
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    if (propSchema.type && typeof propSchema.type === "string") {
      types[key] = propSchema.type;
    } else if (propSchema.enum) {
      types[key] = "enum";
    }
  }

  return types;
}
