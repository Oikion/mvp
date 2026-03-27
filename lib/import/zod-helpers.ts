/**
 * lib/import/zod-helpers.ts
 *
 * Shared Zod preprocessors for import schemas.
 * Handles the mismatch between raw CSV string values and the types
 * expected by Zod schemas (booleans, numbers, dates).
 *
 * Key problems solved:
 * - `z.coerce.boolean()` treats any non-empty string as `true` ("no" → true)
 * - `z.coerce.number()` converts "" to 0, which then fails `.positive()`
 * - European number formats (200.000,50) are not handled by `Number()`
 * - Greek DD/MM/YYYY dates produce `Invalid Date` from `new Date()`
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Boolean coercion
// ---------------------------------------------------------------------------

const TRUTHY = new Set(["true", "1", "yes", "ναι", "ναί", "nai"]);
const FALSY = new Set(["false", "0", "no", "οχι", "όχι", "oxi", "ohi"]);

/**
 * Convert common boolean representations (including Greek) to boolean.
 * Returns `undefined` for unrecognizable values so Zod `.default()` kicks in.
 */
function coerceBoolean(val: unknown): boolean | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  const str = String(val).toLowerCase().trim();
  if (TRUTHY.has(str)) return true;
  if (FALSY.has(str)) return false;
  return undefined; // unknown value → treat as undefined (uses .default())
}

/**
 * Boolean field that correctly handles "no", "ΟΧΙ", "false", "0", etc.
 * Defaults to `false` when the value is empty or unrecognizable.
 */
export const zBoolean = z.preprocess(
  coerceBoolean,
  z.boolean().optional().default(false)
);

/**
 * Nullable boolean — same coercion but allows null (for tri-state fields
 * like mandate elevator/parking/pets_allowed where null means "no preference").
 */
export const zBooleanNullable = z.preprocess(
  coerceBoolean,
  z.boolean().optional().nullable()
);

// ---------------------------------------------------------------------------
// Number coercion
// ---------------------------------------------------------------------------

/**
 * Convert raw CSV values to numbers, handling:
 * - Empty strings → undefined (not 0)
 * - European formatting: "200.000,50" → 200000.50
 * - US formatting: "200,000.50" → 200000.50
 * - Currency symbols: "€200" → 200
 * - Plain numbers: "200000" → 200000
 */
function coerceOptionalNumber(val: unknown): number | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "number") return val;

  let str = String(val).trim();
  // Remove currency symbols and whitespace
  str = str.replace(/[€$£\s]/g, "");
  // Remove trailing non-numeric chars (e.g., "sqm", "m2")
  // but keep digits, dots, commas, minus
  if (str === "") return undefined;

  // Detect European format: if last separator is comma and digits after <= 2, it's decimal
  if (/\.\d{3}/.test(str) && /,\d{1,2}$/.test(str)) {
    // European: 200.000,50 → 200000.50
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (/,\d{3}/.test(str)) {
    // US/UK thousands: 200,000 → 200000
    str = str.replace(/,/g, "");
  } else if (/,\d{1,2}$/.test(str)) {
    // European decimal only: 200,50 → 200.50
    str = str.replace(",", ".");
  }

  const num = Number(str);
  return isNaN(num) ? undefined : num;
}

/** Optional number — empty/invalid → undefined, no constraints. */
export const zOptionalNumber = z.preprocess(
  coerceOptionalNumber,
  z.number().optional().nullable()
);

/** Optional positive number — empty/invalid → undefined, must be > 0. */
export const zOptionalPositiveNumber = z.preprocess(
  coerceOptionalNumber,
  z.number().positive().optional().nullable()
);

/** Optional non-negative integer — empty/invalid → undefined, must be int >= 0. */
export const zOptionalInt = z.preprocess(
  coerceOptionalNumber,
  z.number().int().min(0).optional().nullable()
);

/** Optional positive integer — empty/invalid → undefined, must be int > 0. */
export const zOptionalPositiveInt = z.preprocess(
  coerceOptionalNumber,
  z.number().int().positive().optional().nullable()
);

/** Optional integer (any sign) — for fields like floor_min that can be negative. */
export const zOptionalAnyInt = z.preprocess(
  coerceOptionalNumber,
  z.number().int().optional().nullable()
);

// ---------------------------------------------------------------------------
// Date coercion
// ---------------------------------------------------------------------------

/**
 * Parse date strings from common formats, including Greek DD/MM/YYYY.
 * Returns an ISO date string (YYYY-MM-DD) or undefined if unparseable.
 */
export function coerceDate(val: unknown): string | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val.toISOString().split("T")[0];
  }
  const str = String(val).trim();

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (Greek/European format)
  const ddmmyyyy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try YYYY-MM-DD (ISO) — pass through
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str;

  // Try other Date-parseable formats
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return undefined; // unparseable → treat as empty
}

/**
 * Zod preprocessor for optional date fields stored as strings.
 * Accepts DD/MM/YYYY, YYYY-MM-DD, and other Date-parseable formats.
 */
export const zOptionalDateString = z.preprocess(
  coerceDate,
  z.string().optional().or(z.literal(""))
);
