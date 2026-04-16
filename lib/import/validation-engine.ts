/**
 * lib/import/validation-engine.ts
 *
 * Validation-only pipeline for the unified import engine. Runs the same
 * partition -> detect -> strip -> normalize -> validate -> dedup logic as
 * the real import engine but performs ZERO database writes, encryption,
 * or ID generation. Returns a preview-safe validation result.
 */

import {
  UNIFIED_FIELD_DEFINITIONS,
  stripEntityPrefix,
} from "./unified-field-definitions";
import {
  normalizeClientEnums,
  normalizePropertyEnums,
  normalizeRequestEnums,
} from "./enum-normalizer";
import { contactImportSchema } from "./contact-import-schema";
import { propertyImportSchema } from "./property-import-schema";
import { requestImportSchema } from "./request-import-schema";
import { generateRequestTitle, generateClientName } from "./name-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidatedRow {
  rowIndex: number;
  contactRow: Record<string, unknown> | null;
  propertyRow: Record<string, unknown> | null;
  requestRow: Record<string, unknown> | null;
  hasContact: boolean;
  hasProperty: boolean;
  hasRequest: boolean;
  contactDedupKey?: string;
  propertyDedupKey?: string;
}

export interface ValidationError {
  rowIndex: number;
  entity: "contact" | "property" | "request";
  field: string;
  error: string;
  rawValue: unknown;
}

export interface EntitySummary {
  detected: boolean;
  total: number;
  unique: number;
  deduplicated: number;
}

export interface ValidationResult {
  validRows: ValidatedRow[];
  errorRows: ValidationError[];
  entitySummary: {
    contacts: EntitySummary;
    properties: EntitySummary;
    requests: EntitySummary;
  };
}

// ---------------------------------------------------------------------------
// Field -> entity ownership map (built once at module load)
// ---------------------------------------------------------------------------

const fieldEntityMap = new Map<string, "contact" | "property" | "request">();
for (const def of UNIFIED_FIELD_DEFINITIONS) {
  fieldEntityMap.set(def.key, def.entity);
}

// ---------------------------------------------------------------------------
// Helpers (mirrored from unified-engine.ts)
// ---------------------------------------------------------------------------

function isNonEmpty(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

function partitionRow(
  row: Record<string, unknown>,
): {
  contactRow: Record<string, unknown>;
  propertyRow: Record<string, unknown>;
  requestRow: Record<string, unknown>;
} {
  const contactRow: Record<string, unknown> = {};
  const propertyRow: Record<string, unknown> = {};
  const requestRow: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const entity = fieldEntityMap.get(key);
    if (!entity) continue; // unmapped keys are dropped
    if (entity === "contact") contactRow[key] = value;
    else if (entity === "property") propertyRow[key] = value;
    else requestRow[key] = value;
  }

  return { contactRow, propertyRow, requestRow };
}

// ---------------------------------------------------------------------------
// Contact deduplication key  (phone > email > name)
// ---------------------------------------------------------------------------

function contactDedupKey(row: Record<string, unknown>): string {
  const phone = String(row.primary_phone ?? "")
    .trim()
    .replace(/\D/g, "");
  const email = String(row.primary_email ?? "").trim().toLowerCase();
  const name = String(row.contact_name ?? "").trim().toLowerCase();
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return `name:${name}`;
}

// ---------------------------------------------------------------------------
// Property deduplication key  (address composite, fallback to name)
// ---------------------------------------------------------------------------

function propertyDedupKey(row: Record<string, unknown>): string {
  const street = String(row.address_street ?? "").trim().toLowerCase();
  const city = String(row.address_city ?? "").trim().toLowerCase();

  // Use composite address key if we have at least a street
  if (street) {
    return `addr:${street}|${city}`;
  }

  // Fallback to property_name
  const name = String(row.property_name ?? "").trim().toLowerCase();
  return `name:${name}`;
}

// ---------------------------------------------------------------------------
// Main validation function
// ---------------------------------------------------------------------------

export function validateImportData(
  rows: Record<string, unknown>[],
): ValidationResult {
  const validRows: ValidatedRow[] = [];
  const errorRows: ValidationError[] = [];

  // Dedup tracking
  const contactDedupMap = new Map<string, number[]>();
  const propertyDedupMap = new Map<string, number[]>();

  // Entity counters
  let contactTotal = 0;
  let propertyTotal = 0;
  let requestTotal = 0;

  // Detect whether the file has a contact_name column mapped at all
  const fileHasContactNameColumn = rows.some((r) => r.contact_name !== undefined);

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i;

    // ── 1. PARTITION ──────────────────────────────────────────────────────
    const { contactRow: rawContactRow, propertyRow, requestRow: rawRequestRow } =
      partitionRow(rows[i]);

    // ── 2. DETECT ─────────────────────────────────────────────────────────
    const hasContact =
      isNonEmpty(rawContactRow.contact_name) ||
      (!fileHasContactNameColumn &&
        (isNonEmpty(rawContactRow.primary_phone) ||
          isNonEmpty(rawContactRow.primary_email)));

    const hasProperty = isNonEmpty(propertyRow.property_name);

    // Strip entity prefixes from request row so keys match the per-entity schema
    const requestRow = stripEntityPrefix(rawRequestRow);
    const hasRequest = Object.values(rawRequestRow).some(isNonEmpty);

    // Track entity detection
    if (hasContact) contactTotal++;
    if (hasProperty) propertyTotal++;
    if (hasRequest) requestTotal++;

    // Build the validated row shell
    const validated: ValidatedRow = {
      rowIndex,
      contactRow: null,
      propertyRow: null,
      requestRow: null,
      hasContact,
      hasProperty,
      hasRequest,
    };

    let rowHasErrors = false;

    // Track names for mandate title generation
    let clientName: string | null = null;
    let propertyName: string | null = null;

    // ── 3. CONTACT VALIDATION ─────────────────────────────────────────────
    if (hasContact) {
      // Auto-name when triggered by phone/email without explicit name
      if (!isNonEmpty(rawContactRow.contact_name)) {
        rawContactRow.contact_name = generateClientName(rawContactRow);
      }
      clientName = String(rawContactRow.contact_name ?? "");

      // Strip entity prefixes (e.g. contact_description -> description)
      const contactRowStripped = stripEntityPrefix(rawContactRow);

      // Normalize enums
      const normalized = normalizeClientEnums(contactRowStripped);

      // Validate with Zod — use parsed.data which has preprocessed types
      // (e.g. zBoolean converts "true" → true, zOptionalNumber converts "" → undefined)
      const parsed = contactImportSchema.safeParse(normalized);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errorRows.push({
            rowIndex,
            entity: "contact",
            field: issue.path.join(".") || "unknown",
            error: issue.message,
            rawValue: normalized[issue.path[0] as string] ?? null,
          });
        }
        rowHasErrors = true;
        validated.contactRow = normalized;
      } else {
        // Use Zod-transformed data (booleans, numbers, dates properly typed)
        validated.contactRow = parsed.data as Record<string, unknown>;
      }

      // Contact dedup key (use the raw row with original keys for phone/email/name)
      const dedupKey = contactDedupKey(rawContactRow);
      validated.contactDedupKey = dedupKey;

      const existing = contactDedupMap.get(dedupKey);
      if (existing) {
        existing.push(rowIndex);
      } else {
        contactDedupMap.set(dedupKey, [rowIndex]);
      }
    }

    // ── 4. PROPERTY VALIDATION ────────────────────────────────────────────
    if (hasProperty) {
      propertyName = String(propertyRow.property_name ?? "");

      // Normalize enums
      const normalized = normalizePropertyEnums(propertyRow);

      // Validate with Zod — use parsed.data for proper types
      const parsed = propertyImportSchema.safeParse(normalized);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errorRows.push({
            rowIndex,
            entity: "property",
            field: issue.path.join(".") || "unknown",
            error: issue.message,
            rawValue: normalized[issue.path[0] as string] ?? null,
          });
        }
        rowHasErrors = true;
        validated.propertyRow = normalized;
      } else {
        validated.propertyRow = parsed.data as Record<string, unknown>;
      }

      // Property dedup key
      const dedupKey = propertyDedupKey(propertyRow);
      validated.propertyDedupKey = dedupKey;

      const existing = propertyDedupMap.get(dedupKey);
      if (existing) {
        existing.push(rowIndex);
      } else {
        propertyDedupMap.set(dedupKey, [rowIndex]);
      }
    }

    // ── 5. REQUEST VALIDATION ─────────────────────────────────────────────
    if (hasRequest) {
      // Budget auto-copy from property price
      if (hasProperty && propertyRow.price != null) {
        if (requestRow.budget_min == null) requestRow.budget_min = propertyRow.price;
        if (requestRow.budget_max == null) requestRow.budget_max = propertyRow.price;
      }

      // Normalize enums (must happen before title generation for tx_type lookup)
      const normalized = normalizeRequestEnums(requestRow);

      // Inject auto-generated title BEFORE safeParse
      const title = generateRequestTitle(normalized, clientName, propertyName);
      normalized.title = title;

      // Validate with Zod — use parsed.data for proper types
      const parsed = requestImportSchema.safeParse(normalized);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errorRows.push({
            rowIndex,
            entity: "request",
            field: issue.path.join(".") || "unknown",
            error: issue.message,
            rawValue: normalized[issue.path[0] as string] ?? null,
          });
        }
        rowHasErrors = true;
        validated.requestRow = normalized;
      } else {
        validated.requestRow = parsed.data as Record<string, unknown>;
      }
    }

    // Rows with at least one valid entity go into validRows.
    // Entity-specific errors null out only the failing entity's sub-row —
    // the row can still be imported for its other entities.
    // e.g. a row where contact passes but property fails: hasContact=true,
    // propertyRow=null (cleared below), hasProperty becomes false for import.
    if (rowHasErrors) {
      // Null out entity sub-rows that had validation errors
      const entityErrors = new Set(
        errorRows
          .filter((e) => e.rowIndex === rowIndex)
          .map((e) => e.entity)
      );
      if (entityErrors.has("contact")) {
        validated.contactRow = null;
        validated.hasContact = false;
      }
      if (entityErrors.has("property")) {
        validated.propertyRow = null;
        validated.hasProperty = false;
      }
      if (entityErrors.has("request")) {
        validated.requestRow = null;
        validated.hasRequest = false;
      }
    }

    // Include in validRows if at least one entity survived validation
    if (validated.hasContact || validated.hasProperty || validated.hasRequest) {
      validRows.push(validated);
    }
  }

  // ── 6. BUILD ENTITY SUMMARIES ─────────────────────────────────────────
  const contactUnique = contactDedupMap.size;
  const propertyUnique = propertyDedupMap.size;

  const entitySummary: ValidationResult["entitySummary"] = {
    contacts: {
      detected: contactTotal > 0,
      total: contactTotal,
      unique: contactUnique,
      deduplicated: contactTotal - contactUnique,
    },
    properties: {
      detected: propertyTotal > 0,
      total: propertyTotal,
      unique: propertyUnique,
      deduplicated: propertyTotal - propertyUnique,
    },
    requests: {
      detected: requestTotal > 0,
      total: requestTotal,
      unique: requestTotal, // requests are not deduplicated
      deduplicated: 0,
    },
  };

  return { validRows, errorRows, entitySummary };
}
