/**
 * AI SDK Schema Validator
 *
 * Comprehensive JSON Schema validation and sanitization for AI tool definitions.
 * Handles provider-specific requirements (OpenAI, Anthropic) and provides
 * detailed error reporting.
 *
 * @module lib/ai-sdk/schema-validator
 */

// ============================================
// Types
// ============================================

/**
 * Supported AI providers with different schema requirements
 */
export type AIProvider = "openai" | "anthropic" | "generic";

/**
 * Valid JSON Schema types for property definitions
 */
export type JSONSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "array"
  | "object"
  | "null";

/**
 * A property definition within a JSON Schema
 */
export interface JSONSchemaProperty {
  type: JSONSchemaType | JSONSchemaType[];
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
}

/**
 * A valid tool parameter schema (root must be type: "object")
 */
export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
  sanitized?: ToolParameterSchema;
}

/**
 * A validation error that prevents the schema from being used
 */
export interface SchemaValidationError {
  path: string;
  message: string;
  code: SchemaErrorCode;
}

/**
 * A validation warning that doesn't prevent usage but may cause issues
 */
export interface SchemaValidationWarning {
  path: string;
  message: string;
  code: SchemaWarningCode;
  provider?: AIProvider;
}

/**
 * Error codes for schema validation failures
 */
export type SchemaErrorCode =
  | "INVALID_ROOT_TYPE"
  | "MISSING_TYPE"
  | "MISSING_PROPERTIES"
  | "INVALID_PROPERTIES_TYPE"
  | "INVALID_PROPERTY_TYPE"
  | "INVALID_REQUIRED_ARRAY"
  | "UNKNOWN_REQUIRED_PROPERTY"
  | "INVALID_ENUM"
  | "EMPTY_ENUM"
  | "CIRCULAR_REFERENCE";

/**
 * Warning codes for potential issues
 */
export type SchemaWarningCode =
  | "DEFAULT_IN_ENUM"
  | "DEEP_NESTING"
  | "MISSING_DESCRIPTION"
  | "ADDITIONAL_PROPERTIES_TRUE"
  | "UNSUPPORTED_FORMAT"
  | "COMPLEX_UNION_TYPE";

// ============================================
// Provider Configuration
// ============================================

/**
 * Provider-specific schema requirements and limitations
 */
const PROVIDER_CONFIG: Record<
  AIProvider,
  {
    maxNestingDepth: number;
    requireAdditionalPropertiesFalse: boolean;
    supportedFormats: string[];
    allowDefaultInEnum: boolean;
  }
> = {
  openai: {
    maxNestingDepth: 5,
    requireAdditionalPropertiesFalse: true, // Required for strict mode
    supportedFormats: ["date-time", "date", "email", "uri"],
    allowDefaultInEnum: false, // Can cause issues
  },
  anthropic: {
    maxNestingDepth: 10,
    requireAdditionalPropertiesFalse: false,
    supportedFormats: ["date-time", "date", "email", "uri", "uuid"],
    allowDefaultInEnum: true,
  },
  generic: {
    maxNestingDepth: 10,
    requireAdditionalPropertiesFalse: false,
    supportedFormats: [],
    allowDefaultInEnum: true,
  },
};

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a tool parameter schema
 *
 * Checks that the schema conforms to JSON Schema Draft 7 and meets
 * the requirements for AI tool definitions.
 *
 * @param schema - The schema to validate
 * @param provider - Target AI provider for provider-specific checks
 * @returns Validation result with errors, warnings, and optionally sanitized schema
 */
export function validateToolSchema(
  schema: unknown,
  provider: AIProvider = "generic"
): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];
  const warnings: SchemaValidationWarning[] = [];

  // Check for null/undefined
  if (schema === null || schema === undefined) {
    errors.push({
      path: "",
      message: "Schema is null or undefined",
      code: "MISSING_TYPE",
    });
    return { valid: false, errors, warnings };
  }

  // Check it's an object
  if (typeof schema !== "object" || Array.isArray(schema)) {
    errors.push({
      path: "",
      message: `Schema must be an object, got ${Array.isArray(schema) ? "array" : typeof schema}`,
      code: "INVALID_ROOT_TYPE",
    });
    return { valid: false, errors, warnings };
  }

  const schemaObj = schema as Record<string, unknown>;

  // Check root type is "object"
  if (schemaObj.type !== "object") {
    errors.push({
      path: "type",
      message: `Root schema type must be "object", got "${schemaObj.type}"`,
      code: "INVALID_ROOT_TYPE",
    });
    return { valid: false, errors, warnings };
  }

  // Check properties exists and is an object
  if (schemaObj.properties === undefined || schemaObj.properties === null) {
    errors.push({
      path: "properties",
      message: "Schema must have a properties object",
      code: "MISSING_PROPERTIES",
    });
    return { valid: false, errors, warnings };
  }

  if (
    typeof schemaObj.properties !== "object" ||
    Array.isArray(schemaObj.properties)
  ) {
    errors.push({
      path: "properties",
      message: `Properties must be an object, got ${Array.isArray(schemaObj.properties) ? "array" : typeof schemaObj.properties}`,
      code: "INVALID_PROPERTIES_TYPE",
    });
    return { valid: false, errors, warnings };
  }

  // Validate properties recursively
  const config = PROVIDER_CONFIG[provider];
  validateProperties(
    schemaObj.properties as Record<string, unknown>,
    "properties",
    errors,
    warnings,
    config,
    provider,
    1
  );

  // Validate required array
  if (schemaObj.required !== undefined) {
    if (!Array.isArray(schemaObj.required)) {
      errors.push({
        path: "required",
        message: "required must be an array",
        code: "INVALID_REQUIRED_ARRAY",
      });
    } else {
      const props = Object.keys(schemaObj.properties as object);
      for (const req of schemaObj.required as string[]) {
        if (!props.includes(req)) {
          errors.push({
            path: `required[${req}]`,
            message: `Required property "${req}" is not defined in properties`,
            code: "UNKNOWN_REQUIRED_PROPERTY",
          });
        }
      }
    }
  }

  // Check additionalProperties for provider requirements
  if (config.requireAdditionalPropertiesFalse) {
    if (schemaObj.additionalProperties !== false) {
      warnings.push({
        path: "additionalProperties",
        message: `${provider} strict mode requires additionalProperties: false`,
        code: "ADDITIONAL_PROPERTIES_TRUE",
        provider,
      });
    }
  }

  // Check for missing description
  if (!schemaObj.description) {
    warnings.push({
      path: "description",
      message: "Schema should have a description for better AI understanding",
      code: "MISSING_DESCRIPTION",
    });
  }

  const valid = errors.length === 0;

  // If valid, return sanitized version
  if (valid) {
    const sanitized = sanitizeSchema(
      schemaObj as ToolParameterSchema,
      provider
    );
    return { valid, errors, warnings, sanitized };
  }

  return { valid, errors, warnings };
}

/**
 * Recursively validate properties in a schema
 */
function validateProperties(
  properties: Record<string, unknown>,
  path: string,
  errors: SchemaValidationError[],
  warnings: SchemaValidationWarning[],
  config: (typeof PROVIDER_CONFIG)[AIProvider],
  provider: AIProvider,
  depth: number
): void {
  // Check nesting depth
  if (depth > config.maxNestingDepth) {
    warnings.push({
      path,
      message: `Nesting depth ${depth} exceeds recommended maximum of ${config.maxNestingDepth}`,
      code: "DEEP_NESTING",
      provider,
    });
  }

  for (const [propName, propValue] of Object.entries(properties)) {
    const propPath = `${path}.${propName}`;

    if (!propValue || typeof propValue !== "object") {
      errors.push({
        path: propPath,
        message: `Property "${propName}" must be an object schema`,
        code: "INVALID_PROPERTY_TYPE",
      });
      continue;
    }

    const propSchema = propValue as Record<string, unknown>;

    // Check for type
    if (propSchema.type === undefined && propSchema.enum === undefined) {
      errors.push({
        path: propPath,
        message: `Property "${propName}" must have a type or enum`,
        code: "MISSING_TYPE",
      });
      continue;
    }

    // Validate type if present
    if (propSchema.type !== undefined) {
      const validTypes: JSONSchemaType[] = [
        "string",
        "number",
        "integer",
        "boolean",
        "array",
        "object",
        "null",
      ];
      const types = Array.isArray(propSchema.type)
        ? propSchema.type
        : [propSchema.type];

      for (const t of types) {
        if (!validTypes.includes(t as JSONSchemaType)) {
          errors.push({
            path: `${propPath}.type`,
            message: `Invalid type "${t}" in property "${propName}"`,
            code: "INVALID_PROPERTY_TYPE",
          });
        }
      }

      // Check for union types (can be complex)
      if (Array.isArray(propSchema.type) && propSchema.type.length > 2) {
        warnings.push({
          path: `${propPath}.type`,
          message: `Complex union type may not be well supported by all providers`,
          code: "COMPLEX_UNION_TYPE",
          provider,
        });
      }
    }

    // Validate enum
    if (propSchema.enum !== undefined) {
      if (!Array.isArray(propSchema.enum)) {
        errors.push({
          path: `${propPath}.enum`,
          message: `Enum must be an array`,
          code: "INVALID_ENUM",
        });
      } else if (propSchema.enum.length === 0) {
        errors.push({
          path: `${propPath}.enum`,
          message: `Enum cannot be empty`,
          code: "EMPTY_ENUM",
        });
      }

      // Check for default in enum
      if (propSchema.default !== undefined && !config.allowDefaultInEnum) {
        warnings.push({
          path: `${propPath}.default`,
          message: `Default values in enums may cause issues with ${provider}`,
          code: "DEFAULT_IN_ENUM",
          provider,
        });
      }
    }

    // Check format
    if (propSchema.format !== undefined) {
      if (
        config.supportedFormats.length > 0 &&
        !config.supportedFormats.includes(propSchema.format as string)
      ) {
        warnings.push({
          path: `${propPath}.format`,
          message: `Format "${propSchema.format}" may not be supported by ${provider}`,
          code: "UNSUPPORTED_FORMAT",
          provider,
        });
      }
    }

    // Check missing description
    if (!propSchema.description) {
      warnings.push({
        path: propPath,
        message: `Property "${propName}" should have a description`,
        code: "MISSING_DESCRIPTION",
      });
    }

    // Recursively validate nested objects
    if (propSchema.type === "object" && propSchema.properties) {
      validateProperties(
        propSchema.properties as Record<string, unknown>,
        propPath,
        errors,
        warnings,
        config,
        provider,
        depth + 1
      );
    }

    // Validate array items
    if (propSchema.type === "array" && propSchema.items) {
      const items = propSchema.items as Record<string, unknown>;
      if (items.type === "object" && items.properties) {
        validateProperties(
          items.properties as Record<string, unknown>,
          `${propPath}.items`,
          errors,
          warnings,
          config,
          provider,
          depth + 1
        );
      }
    }
  }
}

// ============================================
// Sanitization Functions
// ============================================

/**
 * Sanitize a schema for a specific provider
 *
 * Applies provider-specific transformations to ensure compatibility.
 *
 * @param schema - The schema to sanitize (must be valid)
 * @param provider - Target AI provider
 * @returns Sanitized schema ready for use
 */
export function sanitizeSchema(
  schema: ToolParameterSchema,
  provider: AIProvider = "generic"
): ToolParameterSchema {
  const config = PROVIDER_CONFIG[provider];

  // Deep clone to avoid mutation
  const sanitized = structuredClone(schema);

  // Ensure type is exactly "object"
  sanitized.type = "object";

  // Add additionalProperties: false for providers that require it
  if (config.requireAdditionalPropertiesFalse) {
    sanitized.additionalProperties = false;
  }

  // Ensure properties exists
  if (!sanitized.properties) {
    sanitized.properties = {};
  }

  // Sanitize each property
  sanitizeProperties(sanitized.properties, config);

  // Ensure required is an array if present
  if (sanitized.required !== undefined && !Array.isArray(sanitized.required)) {
    sanitized.required = [];
  }

  return sanitized;
}

/**
 * Recursively sanitize properties
 */
function sanitizeProperties(
  properties: Record<string, JSONSchemaProperty>,
  config: (typeof PROVIDER_CONFIG)[AIProvider]
): void {
  for (const [, propSchema] of Object.entries(properties)) {
    // Remove default from enums if provider doesn't support it
    if (propSchema.enum && propSchema.default !== undefined) {
      if (!config.allowDefaultInEnum) {
        delete propSchema.default;
      }
    }

    // Recursively sanitize nested objects
    if (propSchema.type === "object" && propSchema.properties) {
      // Add additionalProperties: false to nested objects
      if (config.requireAdditionalPropertiesFalse) {
        propSchema.additionalProperties = false;
      }
      sanitizeProperties(propSchema.properties, config);
    }

    // Sanitize array items
    if (propSchema.type === "array" && propSchema.items) {
      if (propSchema.items.type === "object" && propSchema.items.properties) {
        if (config.requireAdditionalPropertiesFalse) {
          propSchema.items.additionalProperties = false;
        }
        sanitizeProperties(propSchema.items.properties, config);
      }
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Quick check if a schema is valid (without full validation)
 *
 * Use for filtering - faster than full validation.
 */
export function isValidSchema(schema: unknown): schema is ToolParameterSchema {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return false;
  }

  const obj = schema as Record<string, unknown>;

  if (obj.type !== "object") {
    return false;
  }

  if (
    !obj.properties ||
    typeof obj.properties !== "object" ||
    Array.isArray(obj.properties)
  ) {
    return false;
  }

  return true;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  result: SchemaValidationResult
): string {
  if (result.valid) {
    return "Schema is valid";
  }

  const lines: string[] = ["Schema validation failed:"];

  for (const error of result.errors) {
    lines.push(`  ERROR [${error.code}] at "${error.path}": ${error.message}`);
  }

  if (result.warnings.length > 0) {
    lines.push("\nWarnings:");
    for (const warning of result.warnings) {
      const providerNote = warning.provider ? ` (${warning.provider})` : "";
      lines.push(
        `  WARN [${warning.code}] at "${warning.path}": ${warning.message}${providerNote}`
      );
    }
  }

  return lines.join("\n");
}

/**
 * Create a minimal valid schema for tools with no parameters
 */
export function createEmptySchema(): ToolParameterSchema {
  return {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  };
}
