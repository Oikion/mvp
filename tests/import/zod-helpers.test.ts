/**
 * tests/import/zod-helpers.test.ts
 *
 * Tests for the shared Zod preprocessors that handle CSV/XLSX data coercion:
 * - Boolean coercion (Greek/English, "no"/"OXI" must NOT become true)
 * - Number coercion (empty string, European formatting, currency symbols)
 * - Date coercion (DD/MM/YYYY, YYYY-MM-DD, other formats)
 */

import { describe, it, expect } from "vitest";
import {
  zBoolean,
  zBooleanNullable,
  zOptionalNumber,
  zOptionalPositiveNumber,
  zOptionalInt,
  zOptionalPositiveInt,
  zOptionalAnyInt,
  zOptionalDateString,
  coerceDate,
} from "@/lib/import/zod-helpers";

// ---------------------------------------------------------------------------
// 1. Boolean coercion — Bug 1 fix
// ---------------------------------------------------------------------------

describe("zBoolean", () => {
  it.each([
    // Truthy values
    ["true", true],
    ["TRUE", true],
    ["True", true],
    ["1", true],
    ["yes", true],
    ["YES", true],
    ["Yes", true],
    ["\u03bd\u03b1\u03b9", true],     // ναι
    ["\u039d\u0391\u0399", true],     // ΝΑΙ (uppercased by .toLowerCase())
    ["\u03bd\u03b1\u03af", true],     // ναί (with accent)
    ["nai", true],
    [true, true],
    [1, true],

    // Falsy values — THE CRITICAL FIX: these must NOT become true
    ["false", false],
    ["FALSE", false],
    ["False", false],
    ["0", false],
    ["no", false],
    ["NO", false],
    ["No", false],
    ["\u03bf\u03c7\u03b9", false],     // οχι
    ["\u03cc\u03c7\u03b9", false],     // όχι (with accent)
    ["\u039f\u03a7\u0399", false],     // ΟΧΙ (uppercased by .toLowerCase())
    ["oxi", false],
    ["ohi", false],
    [false, false],
    [0, false],

    // Empty/null/undefined → default false
    ["", false],
    [null, false],
    [undefined, false],

    // Unknown values → default false
    ["maybe", false],
    ["possibly", false],
  ])("coerces %j to %j", (input, expected) => {
    const result = zBoolean.parse(input);
    expect(result).toBe(expected);
  });
});

describe("zBooleanNullable", () => {
  it("coerces 'yes' to true", () => {
    expect(zBooleanNullable.parse("yes")).toBe(true);
  });

  it("coerces 'no' to false", () => {
    expect(zBooleanNullable.parse("no")).toBe(false);
  });

  it("coerces '\u03bd\u03b1\u03b9' to true", () => {
    expect(zBooleanNullable.parse("\u03bd\u03b1\u03b9")).toBe(true);
  });

  it("coerces '\u03cc\u03c7\u03b9' to false", () => {
    expect(zBooleanNullable.parse("\u03cc\u03c7\u03b9")).toBe(false);
  });

  it("returns undefined for empty string (nullable allows it)", () => {
    const result = zBooleanNullable.parse("");
    expect(result).toBeUndefined();
  });

  it("returns undefined for null", () => {
    const result = zBooleanNullable.parse(null);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Number coercion — Bug 2 + Bug 3 fix
// ---------------------------------------------------------------------------

describe("zOptionalNumber", () => {
  it.each([
    // Empty/null/undefined → undefined (NOT 0)
    ["", undefined],
    [null, undefined],
    [undefined, undefined],

    // Plain numbers
    [42, 42],
    [0, 0],
    [-5, -5],
    [3.14, 3.14],

    // Plain string numbers
    ["42", 42],
    ["3.14", 3.14],
    ["0", 0],
    ["-5", -5],

    // European thousands formatting (Bug 3)
    ["200.000,50", 200000.50],
    ["1.234.567,89", 1234567.89],
    ["200,50", 200.50],

    // US/UK thousands formatting
    ["200,000.50", 200000.50],
    ["1,234,567.89", 1234567.89],
    ["200,000", 200000],

    // Currency symbols
    ["\u20ac200", 200],     // €200
    ["$1000", 1000],
    ["\u00a3500", 500],     // £500
    ["\u20ac 200.000,50", 200000.50],

    // Unparseable → undefined
    ["abc", undefined],
    ["not a number", undefined],
  ])("coerces %j to %j", (input, expected) => {
    const result = zOptionalNumber.parse(input);
    expect(result).toBe(expected);
  });
});

describe("zOptionalPositiveNumber", () => {
  it("accepts positive numbers", () => {
    expect(zOptionalPositiveNumber.parse("150000")).toBe(150000);
    expect(zOptionalPositiveNumber.parse(42.5)).toBe(42.5);
  });

  it("rejects 0", () => {
    expect(() => zOptionalPositiveNumber.parse("0")).toThrow();
    expect(() => zOptionalPositiveNumber.parse(0)).toThrow();
  });

  it("rejects negative", () => {
    expect(() => zOptionalPositiveNumber.parse("-5")).toThrow();
  });

  it("returns undefined for empty string (does NOT reject)", () => {
    const result = zOptionalPositiveNumber.parse("");
    expect(result).toBeUndefined();
  });

  it("returns undefined for null", () => {
    const result = zOptionalPositiveNumber.parse(null);
    expect(result).toBeUndefined();
  });

  it("handles European price: '200.000,50'", () => {
    expect(zOptionalPositiveNumber.parse("200.000,50")).toBe(200000.50);
  });
});

describe("zOptionalInt", () => {
  it("accepts non-negative integers", () => {
    expect(zOptionalInt.parse("3")).toBe(3);
    expect(zOptionalInt.parse(0)).toBe(0);
  });

  it("rejects decimals", () => {
    expect(() => zOptionalInt.parse("3.5")).toThrow();
  });

  it("rejects negative", () => {
    expect(() => zOptionalInt.parse("-1")).toThrow();
  });

  it("returns undefined for empty string", () => {
    expect(zOptionalInt.parse("")).toBeUndefined();
  });
});

describe("zOptionalPositiveInt", () => {
  it("accepts positive integers", () => {
    expect(zOptionalPositiveInt.parse("5")).toBe(5);
  });

  it("rejects 0", () => {
    expect(() => zOptionalPositiveInt.parse("0")).toThrow();
  });

  it("returns undefined for empty string", () => {
    expect(zOptionalPositiveInt.parse("")).toBeUndefined();
  });
});

describe("zOptionalAnyInt", () => {
  it("accepts negative integers (e.g., basement floors)", () => {
    expect(zOptionalAnyInt.parse("-2")).toBe(-2);
  });

  it("accepts zero", () => {
    expect(zOptionalAnyInt.parse("0")).toBe(0);
  });

  it("returns undefined for empty string", () => {
    expect(zOptionalAnyInt.parse("")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Date coercion — Bug 4 fix
// ---------------------------------------------------------------------------

describe("coerceDate", () => {
  it.each([
    // DD/MM/YYYY — Greek/European standard
    ["25/01/2024", "2024-01-25"],
    ["1/3/2024", "2024-03-01"],
    ["31/12/2023", "2023-12-31"],

    // DD-MM-YYYY
    ["25-01-2024", "2024-01-25"],

    // DD.MM.YYYY
    ["25.01.2024", "2024-01-25"],

    // ISO YYYY-MM-DD — pass through
    ["2024-01-25", "2024-01-25"],
    ["2024-01-25T10:00:00Z", "2024-01-25T10:00:00Z"], // pass through with time

    // Empty/null/undefined
    ["", undefined],
    [null, undefined],
    [undefined, undefined],

    // Unparseable
    ["not a date", undefined],
    ["foobar", undefined],
  ])("coerces %j to %j", (input, expected) => {
    expect(coerceDate(input)).toBe(expected);
  });

  it("handles Date objects", () => {
    const d = new Date("2024-06-15T00:00:00Z");
    expect(coerceDate(d)).toBe("2024-06-15");
  });

  it("handles invalid Date objects", () => {
    expect(coerceDate(new Date("invalid"))).toBeUndefined();
  });
});

describe("zOptionalDateString", () => {
  it("parses DD/MM/YYYY to ISO string", () => {
    expect(zOptionalDateString.parse("25/01/2024")).toBe("2024-01-25");
  });

  it("passes through YYYY-MM-DD", () => {
    expect(zOptionalDateString.parse("2024-01-25")).toBe("2024-01-25");
  });

  it("returns undefined for empty string", () => {
    const result = zOptionalDateString.parse("");
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Integration: schema-level tests
// ---------------------------------------------------------------------------

describe("Property schema boolean coercion integration", () => {
  // Import here to test full schema
  it("'no' in elevator field does NOT become true", async () => {
    const { propertyImportSchema } = await import(
      "@/lib/import/property-import-schema"
    );
    const result = propertyImportSchema.parse({
      property_name: "Test Property",
      elevator: "no",
    });
    expect(result.elevator).toBe(false);
  });

  it("'\u039f\u03a7\u0399' in accepts_pets does NOT become true", async () => {
    const { propertyImportSchema } = await import(
      "@/lib/import/property-import-schema"
    );
    const result = propertyImportSchema.parse({
      property_name: "Test Property",
      accepts_pets: "\u039f\u03a7\u0399",
    });
    expect(result.accepts_pets).toBe(false);
  });

  it("'\u03bd\u03b1\u03b9' in is_exclusive becomes true", async () => {
    const { propertyImportSchema } = await import(
      "@/lib/import/property-import-schema"
    );
    const result = propertyImportSchema.parse({
      property_name: "Test Property",
      is_exclusive: "\u03bd\u03b1\u03b9",
    });
    expect(result.is_exclusive).toBe(true);
  });
});

describe("Property schema number coercion integration", () => {
  it("empty price does NOT cause validation error", async () => {
    const { propertyImportSchema } = await import(
      "@/lib/import/property-import-schema"
    );
    const result = propertyImportSchema.parse({
      property_name: "Test Property",
      price: "",
    });
    expect(result.price).toBeUndefined();
  });

  it("European-formatted price parses correctly", async () => {
    const { propertyImportSchema } = await import(
      "@/lib/import/property-import-schema"
    );
    const result = propertyImportSchema.parse({
      property_name: "Test Property",
      price: "200.000,50",
    });
    expect(result.price).toBe(200000.5);
  });

  it("price allows decimals (not int-only)", async () => {
    const { propertyImportSchema } = await import(
      "@/lib/import/property-import-schema"
    );
    const result = propertyImportSchema.parse({
      property_name: "Test Property",
      price: "150000.75",
    });
    expect(result.price).toBe(150000.75);
  });

  it("square_feet allows decimals", async () => {
    const { propertyImportSchema } = await import(
      "@/lib/import/property-import-schema"
    );
    const result = propertyImportSchema.parse({
      property_name: "Test Property",
      square_feet: "85.5",
    });
    expect(result.square_feet).toBe(85.5);
  });
});

describe("Mandate schema coercion integration", () => {
  it("bathrooms_min requires integer (Prisma Int?)", async () => {
    const { mandateImportSchema } = await import(
      "@/lib/import/mandate-import-schema"
    );
    expect(() =>
      mandateImportSchema.parse({
        title: "Test Mandate",
        bathrooms_min: "1.5",
      })
    ).toThrow();
  });

  it("bathrooms_min accepts integer string", async () => {
    const { mandateImportSchema } = await import(
      "@/lib/import/mandate-import-schema"
    );
    const result = mandateImportSchema.parse({
      title: "Test Mandate",
      bathrooms_min: "2",
    });
    expect(result.bathrooms_min).toBe(2);
  });

  it("empty budget_min does NOT cause validation error", async () => {
    const { mandateImportSchema } = await import(
      "@/lib/import/mandate-import-schema"
    );
    const result = mandateImportSchema.parse({
      title: "Test Mandate",
      budget_min: "",
    });
    expect(result.budget_min).toBeUndefined();
  });

  it("'\u03cc\u03c7\u03b9' in ground_floor_only becomes false", async () => {
    const { mandateImportSchema } = await import(
      "@/lib/import/mandate-import-schema"
    );
    const result = mandateImportSchema.parse({
      title: "Test Mandate",
      ground_floor_only: "\u03cc\u03c7\u03b9",
    });
    expect(result.ground_floor_only).toBe(false);
  });

  it("elevator nullable: empty → undefined (no preference)", async () => {
    const { mandateImportSchema } = await import(
      "@/lib/import/mandate-import-schema"
    );
    const result = mandateImportSchema.parse({
      title: "Test Mandate",
      elevator: "",
    });
    expect(result.elevator).toBeUndefined();
  });

  it("expires_at handles DD/MM/YYYY", async () => {
    const { mandateImportSchema } = await import(
      "@/lib/import/mandate-import-schema"
    );
    const result = mandateImportSchema.parse({
      title: "Test Mandate",
      expires_at: "31/12/2025",
    });
    expect(result.expires_at).toBe("2025-12-31");
  });
});

describe("Client schema boolean coercion integration", () => {
  it("'no' in gdpr_consent becomes false", async () => {
    const { clientImportSchema } = await import(
      "@/lib/import/client-import-schema"
    );
    const result = clientImportSchema.parse({
      client_name: "Test Client",
      gdpr_consent: "no",
    });
    expect(result.gdpr_consent).toBe(false);
  });

  it("'\u03bd\u03b1\u03b9' in allow_marketing becomes true", async () => {
    const { clientImportSchema } = await import(
      "@/lib/import/client-import-schema"
    );
    const result = clientImportSchema.parse({
      client_name: "Test Client",
      allow_marketing: "\u03bd\u03b1\u03b9",
    });
    expect(result.allow_marketing).toBe(true);
  });
});
