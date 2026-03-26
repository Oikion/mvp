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
  normalizeMandateEnums,
} from "./enum-normalizer";
import { clientImportSchema } from "./client-import-schema";
import { propertyImportSchema } from "./property-import-schema";
import { mandateImportSchema } from "./mandate-import-schema";
import { generateMandateTitle, generateClientName } from "./name-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidatedRow {
  rowIndex: number;
  clientRow: Record<string, unknown> | null;
  propertyRow: Record<string, unknown> | null;
  mandateRow: Record<string, unknown> | null;
  hasClient: boolean;
  hasProperty: boolean;
  hasMandate: boolean;
  clientDedupKey?: string;
  propertyDedupKey?: string;
}

export interface ValidationError {
  rowIndex: number;
  entity: "client" | "property" | "mandate";
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
    clients: EntitySummary;
    properties: EntitySummary;
    mandates: EntitySummary;
  };
}

// ---------------------------------------------------------------------------
// Field -> entity ownership map (built once at module load)
// ---------------------------------------------------------------------------

const fieldEntityMap = new Map<string, "client" | "property" | "mandate">();
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
  clientRow: Record<string, unknown>;
  propertyRow: Record<string, unknown>;
  mandateRow: Record<string, unknown>;
} {
  const clientRow: Record<string, unknown> = {};
  const propertyRow: Record<string, unknown> = {};
  const mandateRow: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const entity = fieldEntityMap.get(key);
    if (!entity) continue; // unmapped keys are dropped
    if (entity === "client") clientRow[key] = value;
    else if (entity === "property") propertyRow[key] = value;
    else mandateRow[key] = value;
  }

  return { clientRow, propertyRow, mandateRow };
}

// ---------------------------------------------------------------------------
// Client deduplication key  (phone > email > name)
// ---------------------------------------------------------------------------

function clientDedupKey(row: Record<string, unknown>): string {
  const phone = String(row.primary_phone ?? "")
    .trim()
    .replace(/\D/g, "");
  const email = String(row.primary_email ?? "").trim().toLowerCase();
  const name = String(row.client_name ?? "").trim().toLowerCase();
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
  const clientDedupMap = new Map<string, number[]>();
  const propertyDedupMap = new Map<string, number[]>();

  // Entity counters
  let clientTotal = 0;
  let propertyTotal = 0;
  let mandateTotal = 0;

  // Detect whether the file has a client_name column mapped at all
  const fileHasClientNameColumn = rows.some((r) => r.client_name !== undefined);

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i;

    // ── 1. PARTITION ──────────────────────────────────────────────────────
    const { clientRow: rawClientRow, propertyRow, mandateRow: rawMandateRow } =
      partitionRow(rows[i]);

    // ── 2. DETECT ─────────────────────────────────────────────────────────
    const hasClient =
      isNonEmpty(rawClientRow.client_name) ||
      (!fileHasClientNameColumn &&
        (isNonEmpty(rawClientRow.primary_phone) ||
          isNonEmpty(rawClientRow.primary_email)));

    const hasProperty = isNonEmpty(propertyRow.property_name);

    // Strip entity prefixes from mandate row so keys match the per-entity schema
    const mandateRow = stripEntityPrefix(rawMandateRow);
    const hasMandate = Object.values(rawMandateRow).some(isNonEmpty);

    // Track entity detection
    if (hasClient) clientTotal++;
    if (hasProperty) propertyTotal++;
    if (hasMandate) mandateTotal++;

    // Build the validated row shell
    const validated: ValidatedRow = {
      rowIndex,
      clientRow: null,
      propertyRow: null,
      mandateRow: null,
      hasClient,
      hasProperty,
      hasMandate,
    };

    let rowHasErrors = false;

    // Track names for mandate title generation
    let clientName: string | null = null;
    let propertyName: string | null = null;

    // ── 3. CLIENT VALIDATION ──────────────────────────────────────────────
    if (hasClient) {
      // Auto-name when triggered by phone/email without explicit name
      if (!isNonEmpty(rawClientRow.client_name)) {
        rawClientRow.client_name = generateClientName(rawClientRow);
      }
      clientName = String(rawClientRow.client_name ?? "");

      // Strip entity prefixes (e.g. client_description -> description)
      const clientRowStripped = stripEntityPrefix(rawClientRow);

      // Normalize enums
      const normalized = normalizeClientEnums(clientRowStripped);

      // Validate with Zod
      const parsed = clientImportSchema.safeParse(normalized);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errorRows.push({
            rowIndex,
            entity: "client",
            field: issue.path.join(".") || "unknown",
            error: issue.message,
            rawValue: normalized[issue.path[0] as string] ?? null,
          });
        }
        rowHasErrors = true;
      }

      validated.clientRow = normalized;

      // Client dedup key (use the raw row with original keys for phone/email/name)
      const dedupKey = clientDedupKey(rawClientRow);
      validated.clientDedupKey = dedupKey;

      const existing = clientDedupMap.get(dedupKey);
      if (existing) {
        existing.push(rowIndex);
      } else {
        clientDedupMap.set(dedupKey, [rowIndex]);
      }
    }

    // ── 4. PROPERTY VALIDATION ────────────────────────────────────────────
    if (hasProperty) {
      propertyName = String(propertyRow.property_name ?? "");

      // Normalize enums
      const normalized = normalizePropertyEnums(propertyRow);

      // Validate with Zod
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
      }

      validated.propertyRow = normalized;

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

    // ── 5. MANDATE VALIDATION ─────────────────────────────────────────────
    if (hasMandate) {
      // Budget auto-copy from property price
      if (hasProperty && propertyRow.price != null) {
        if (mandateRow.budget_min == null) mandateRow.budget_min = propertyRow.price;
        if (mandateRow.budget_max == null) mandateRow.budget_max = propertyRow.price;
      }

      // Normalize enums (must happen before title generation for tx_type lookup)
      const normalized = normalizeMandateEnums(mandateRow);

      // Inject auto-generated title BEFORE safeParse
      const title = generateMandateTitle(normalized, clientName, propertyName);
      normalized.title = title;

      // Validate with Zod
      const parsed = mandateImportSchema.safeParse(normalized);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errorRows.push({
            rowIndex,
            entity: "mandate",
            field: issue.path.join(".") || "unknown",
            error: issue.message,
            rawValue: normalized[issue.path[0] as string] ?? null,
          });
        }
        rowHasErrors = true;
      }

      validated.mandateRow = normalized;
    }

    // All rows go into validRows (even ones with errors, for UI display).
    // The caller can filter by checking errorRows for the row index.
    if (!rowHasErrors) {
      validRows.push(validated);
    }
  }

  // ── 6. BUILD ENTITY SUMMARIES ─────────────────────────────────────────
  const clientUnique = clientDedupMap.size;
  const propertyUnique = propertyDedupMap.size;

  const entitySummary: ValidationResult["entitySummary"] = {
    clients: {
      detected: clientTotal > 0,
      total: clientTotal,
      unique: clientUnique,
      deduplicated: clientTotal - clientUnique,
    },
    properties: {
      detected: propertyTotal > 0,
      total: propertyTotal,
      unique: propertyUnique,
      deduplicated: propertyTotal - propertyUnique,
    },
    mandates: {
      detected: mandateTotal > 0,
      total: mandateTotal,
      unique: mandateTotal, // mandates are not deduplicated
      deduplicated: 0,
    },
  };

  return { validRows, errorRows, entitySummary };
}
