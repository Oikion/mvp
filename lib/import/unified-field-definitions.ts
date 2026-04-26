/**
 * Unified field definitions for the Oikion import engine.
 *
 * Merges all three entity field definition arrays (property, contact, request)
 * into a single array with entity ownership tags. Disambiguates overlapping keys
 * by prefixing request fields that collide with property fields, and renames
 * the contact `description` field to `contact_description`.
 *
 * IDs are omitted from all three entities — the engine generates them.
 * The request `title` field is omitted — the engine auto-generates it.
 */

import { propertyImportFieldDefinitions } from "./property-import-schema";
import { contactImportFieldDefinitions } from "./contact-import-schema";
import { requestImportFieldDefinitions } from "./request-import-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnifiedFieldDefinition {
  key: string;
  entity: "contact" | "property" | "request";
  required: boolean;
  group: string;
  aliases: string[];
  description?: string;
}

// ---------------------------------------------------------------------------
// Prefix strip map — maps unified (disambiguated) keys back to the original
// entity field name that the per-entity schema actually expects.
// ---------------------------------------------------------------------------

export const PREFIX_STRIP_MAP: Record<string, string> = {
  request_transaction_type: "transaction_type",
  request_property_type: "property_type",
  request_status: "status",
  request_condition: "condition",
  request_heating_type: "heating_type",
  request_furnished: "furnished",
  request_elevator: "elevator",
  request_inside_city_plan: "inside_city_plan",
  request_municipality: "municipality",
  request_region: "region",
  request_notes: "notes",
  contact_description: "description",
  contact_visibility: "visibility",
  contact_primary_email: "primary_email",
  request_visibility: "visibility",
};

/**
 * Strips entity-disambiguation prefixes from a row object so that the
 * resulting keys match what the per-entity Zod schema expects.
 */
export function stripEntityPrefix(
  row: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[PREFIX_STRIP_MAP[key] ?? key] = value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Keys that must be renamed/omitted when building the unified array
// ---------------------------------------------------------------------------

/** Request keys that collide with property keys and need a prefix. */
const REQUEST_KEY_RENAMES: Record<string, string> = {
  transaction_type: "request_transaction_type",
  property_type: "request_property_type",
  status: "request_status",
  condition: "request_condition",
  heating_type: "request_heating_type",
  furnished: "request_furnished",
  elevator: "request_elevator",
  inside_city_plan: "request_inside_city_plan",
  municipality: "request_municipality",
  region: "request_region",
  notes: "request_notes",
  visibility: "request_visibility",
};

/** Request keys that are omitted entirely from the unified array. */
const REQUEST_OMIT_KEYS = new Set<string>([
  "id",    // engine generates IDs
  "title", // engine auto-generates request titles
]);

/** Contact keys that are omitted entirely. */
const CLIENT_OMIT_KEYS = new Set<string>(["id"]);

/** Property keys that are omitted entirely. */
const PROPERTY_OMIT_KEYS = new Set<string>(["id"]);

/** Contact key renames for disambiguation. */
const CONTACT_KEY_RENAMES: Record<string, string> = {
  description: "contact_description",
  visibility: "contact_visibility",
  primary_email: "contact_primary_email",
};

// ---------------------------------------------------------------------------
// Extra aliases for renamed request fields
// (original aliases from the source definition are preserved; these extend them)
// ---------------------------------------------------------------------------

const REQUEST_EXTRA_ALIASES: Record<string, string[]> = {
  request_transaction_type: ["request_transaction", "buyer_intent"],
};

// ---------------------------------------------------------------------------
// Build the unified array programmatically
// ---------------------------------------------------------------------------

function buildUnifiedDefinitions(): UnifiedFieldDefinition[] {
  const result: UnifiedFieldDefinition[] = [];

  // --- Property fields ---
  for (const def of propertyImportFieldDefinitions) {
    if (PROPERTY_OMIT_KEYS.has(def.key)) continue;
    result.push({
      key: def.key,
      entity: "property",
      required: def.required,
      group: def.group,
      aliases: [...def.aliases],
      description: def.description,
    });
  }

  // --- Contact fields ---
  for (const def of contactImportFieldDefinitions) {
    if (CLIENT_OMIT_KEYS.has(def.key)) continue;
    const renamedKey = CONTACT_KEY_RENAMES[def.key] ?? def.key;
    result.push({
      key: renamedKey,
      entity: "contact",
      required: def.required,
      group: def.group,
      aliases: [...def.aliases],
      description: def.description,
    });
  }

  // --- Request fields ---
  for (const def of requestImportFieldDefinitions) {
    if (REQUEST_OMIT_KEYS.has(def.key)) continue;
    const renamedKey = REQUEST_KEY_RENAMES[def.key] ?? def.key;
    const extraAliases = REQUEST_EXTRA_ALIASES[renamedKey] ?? [];
    result.push({
      key: renamedKey,
      entity: "request",
      required: def.required,
      group: def.group,
      aliases: [...def.aliases, ...extraAliases],
      description: def.description,
    });
  }

  return result;
}

export const UNIFIED_FIELD_DEFINITIONS: readonly UnifiedFieldDefinition[] =
  buildUnifiedDefinitions();

// ---------------------------------------------------------------------------
// Convenience sets used by the unified engine for entity detection
// ---------------------------------------------------------------------------

/** All unified keys that belong to the request entity. */
export const REQUEST_FIELD_KEYS = new Set(
  UNIFIED_FIELD_DEFINITIONS.filter((f) => f.entity === "request").map(
    (f) => f.key
  )
);

/**
 * Presence of any of these keys in a mapped row is a strong signal that the
 * row contains contact data.
 */
export const CONTACT_TRIGGER_KEYS = new Set([
  "contact_name",
  "primary_phone",
  "contact_primary_email",
]);

/**
 * Presence of any of these keys in a mapped row is a strong signal that the
 * row contains property data.
 */
export const PROPERTY_TRIGGER_KEYS = new Set(["property_name"]);
