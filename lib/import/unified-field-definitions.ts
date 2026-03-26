/**
 * Unified field definitions for the Oikion import engine.
 *
 * Merges all three entity field definition arrays (property, client, mandate)
 * into a single array with entity ownership tags. Disambiguates overlapping keys
 * by prefixing mandate fields that collide with property fields, and renames
 * the client `description` field to `client_description`.
 *
 * IDs are omitted from all three entities — the engine generates them.
 * The mandate `title` field is omitted — the engine auto-generates it.
 */

import { propertyImportFieldDefinitions } from "./property-import-schema";
import { clientImportFieldDefinitions } from "./client-import-schema";
import { mandateImportFieldDefinitions } from "./mandate-import-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnifiedFieldDefinition {
  key: string;
  entity: "client" | "property" | "mandate";
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
  mandate_transaction_type: "transaction_type",
  mandate_property_type: "property_type",
  mandate_status: "status",
  mandate_condition: "condition",
  mandate_heating_type: "heating_type",
  mandate_furnished: "furnished",
  mandate_elevator: "elevator",
  mandate_inside_city_plan: "inside_city_plan",
  mandate_municipality: "municipality",
  mandate_region: "region",
  mandate_notes: "notes",
  client_description: "description",
  client_visibility: "visibility",
  mandate_visibility: "visibility",
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

/** Mandate keys that collide with property keys and need a prefix. */
const MANDATE_KEY_RENAMES: Record<string, string> = {
  transaction_type: "mandate_transaction_type",
  property_type: "mandate_property_type",
  status: "mandate_status",
  condition: "mandate_condition",
  heating_type: "mandate_heating_type",
  furnished: "mandate_furnished",
  elevator: "mandate_elevator",
  inside_city_plan: "mandate_inside_city_plan",
  municipality: "mandate_municipality",
  region: "mandate_region",
  notes: "mandate_notes",
  visibility: "mandate_visibility",
};

/** Mandate keys that are omitted entirely from the unified array. */
const MANDATE_OMIT_KEYS = new Set<string>([
  "id",    // engine generates IDs
  "title", // engine auto-generates mandate titles
]);

/** Client keys that are omitted entirely. */
const CLIENT_OMIT_KEYS = new Set<string>(["id"]);

/** Property keys that are omitted entirely. */
const PROPERTY_OMIT_KEYS = new Set<string>(["id"]);

/** Client key renames for disambiguation. */
const CLIENT_KEY_RENAMES: Record<string, string> = {
  description: "client_description",
  visibility: "client_visibility",
};

// ---------------------------------------------------------------------------
// Extra aliases for renamed mandate fields
// (original aliases from the source definition are preserved; these extend them)
// ---------------------------------------------------------------------------

const MANDATE_EXTRA_ALIASES: Record<string, string[]> = {
  mandate_transaction_type: ["mandate_transaction", "buyer_intent"],
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

  // --- Client fields ---
  for (const def of clientImportFieldDefinitions) {
    if (CLIENT_OMIT_KEYS.has(def.key)) continue;
    const renamedKey = CLIENT_KEY_RENAMES[def.key] ?? def.key;
    result.push({
      key: renamedKey,
      entity: "client",
      required: def.required,
      group: def.group,
      aliases: [...def.aliases],
      description: def.description,
    });
  }

  // --- Mandate fields ---
  for (const def of mandateImportFieldDefinitions) {
    if (MANDATE_OMIT_KEYS.has(def.key)) continue;
    const renamedKey = MANDATE_KEY_RENAMES[def.key] ?? def.key;
    const extraAliases = MANDATE_EXTRA_ALIASES[renamedKey] ?? [];
    result.push({
      key: renamedKey,
      entity: "mandate",
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

/** All unified keys that belong to the mandate entity. */
export const MANDATE_FIELD_KEYS = new Set(
  UNIFIED_FIELD_DEFINITIONS.filter((f) => f.entity === "mandate").map(
    (f) => f.key
  )
);

/**
 * Presence of any of these keys in a mapped row is a strong signal that the
 * row contains client data.
 */
export const CLIENT_TRIGGER_KEYS = new Set([
  "client_name",
  "primary_phone",
  "primary_email",
]);

/**
 * Presence of any of these keys in a mapped row is a strong signal that the
 * row contains property data.
 */
export const PROPERTY_TRIGGER_KEYS = new Set(["property_name"]);
