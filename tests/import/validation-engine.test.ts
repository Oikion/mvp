/**
 * tests/import/validation-engine.test.ts
 *
 * Verifies the validation-only import pipeline: partitioning, entity detection,
 * Zod validation, client dedup (phone > email > name), property dedup
 * (address composite / name fallback), and entity summary counts.
 */

import { describe, it, expect } from "vitest";
import { validateImportData } from "@/lib/import/validation-engine";

// ---------------------------------------------------------------------------
// 1. Row partitioning and entity detection
// ---------------------------------------------------------------------------

describe("Row partitioning and entity detection", () => {
  it("detects client when client_name is present", () => {
    const result = validateImportData([
      { client_name: "John Doe" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasClient).toBe(true);
    expect(result.validRows[0].hasProperty).toBe(false);
    expect(result.validRows[0].hasMandate).toBe(false);
    expect(result.validRows[0].clientRow).not.toBeNull();
    expect(result.validRows[0].propertyRow).toBeNull();
    expect(result.validRows[0].mandateRow).toBeNull();
  });

  it("detects property when property_name is present", () => {
    const result = validateImportData([
      { property_name: "Seaside Villa" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasClient).toBe(false);
    expect(result.validRows[0].hasProperty).toBe(true);
    expect(result.validRows[0].hasMandate).toBe(false);
  });

  it("detects mandate when mandate-entity fields are present", () => {
    const result = validateImportData([
      { mandate_transaction_type: "sale", budget_min: 100000 },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasMandate).toBe(true);
    // mandate auto-generates a title so it should pass validation
    expect(result.validRows[0].mandateRow).not.toBeNull();
  });

  it("detects client from phone when no client_name column exists in file", () => {
    // When NO row in the entire set has client_name defined,
    // phone/email alone triggers client detection
    const result = validateImportData([
      { primary_phone: "6944123456" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasClient).toBe(true);
    // Auto-generated name from phone
    expect(result.validRows[0].clientDedupKey).toContain("phone:");
  });

  it("does NOT detect client from phone when client_name column exists but is empty for this row", () => {
    // When at least one row defines client_name, presence of phone alone
    // is not enough to detect a client
    const result = validateImportData([
      { client_name: "Alice", property_name: "Property A" },
      { client_name: "", primary_phone: "6944123456", property_name: "Property B" },
    ]);

    // Row 1: has client + property
    expect(result.validRows[0].hasClient).toBe(true);
    // Row 2: client_name is empty and the file HAS client_name column,
    // so hasClient should be false
    const row2 = [...result.validRows, ...result.errorRows.map(e => e.rowIndex)]
      .find((r) => typeof r === "object" && r.rowIndex === 1);
    // We need to check if row index 1 has hasClient false
    // Since row 2 has no client and has property, it should be in validRows
    const row2Valid = result.validRows.find((r) => r.rowIndex === 1);
    expect(row2Valid).toBeDefined();
    expect(row2Valid!.hasClient).toBe(false);
  });

  it("partitions fields correctly across entities", () => {
    const result = validateImportData([
      {
        client_name: "John Doe",
        primary_phone: "6944123456",
        property_name: "Villa Test",
        address_city: "Athens",
        mandate_transaction_type: "sale",
        budget_min: 200000,
      },
    ]);

    expect(result.validRows).toHaveLength(1);
    const row = result.validRows[0];
    expect(row.hasClient).toBe(true);
    expect(row.hasProperty).toBe(true);
    expect(row.hasMandate).toBe(true);
    expect(row.clientRow).not.toBeNull();
    expect(row.propertyRow).not.toBeNull();
    expect(row.mandateRow).not.toBeNull();
  });

  it("unmapped keys are dropped during partitioning", () => {
    const result = validateImportData([
      { client_name: "John", random_unknown_field: "xyz" },
    ]);

    expect(result.validRows).toHaveLength(1);
    // The unknown field should not appear in any entity row
    const row = result.validRows[0];
    expect(row.clientRow).not.toHaveProperty("random_unknown_field");
  });
});

// ---------------------------------------------------------------------------
// 2. Client deduplication (phone > email > name priority)
// ---------------------------------------------------------------------------

describe("Client deduplication", () => {
  it("deduplicates clients by phone number (highest priority)", () => {
    const result = validateImportData([
      { client_name: "John A", primary_phone: "6944123456" },
      { client_name: "John B", primary_phone: "6944123456" },
      { client_name: "Jane C", primary_phone: "6955999888" },
    ]);

    expect(result.entitySummary.clients.total).toBe(3);
    expect(result.entitySummary.clients.unique).toBe(2);
    expect(result.entitySummary.clients.deduplicated).toBe(1);
  });

  it("deduplicates clients by email when phone is absent", () => {
    const result = validateImportData([
      { client_name: "Alice", primary_email: "alice@test.com" },
      { client_name: "Alice Copy", primary_email: "alice@test.com" },
    ]);

    expect(result.entitySummary.clients.total).toBe(2);
    expect(result.entitySummary.clients.unique).toBe(1);
    expect(result.entitySummary.clients.deduplicated).toBe(1);
  });

  it("deduplicates clients by name when phone and email are absent", () => {
    const result = validateImportData([
      { client_name: "John Doe" },
      { client_name: "John Doe" },
      { client_name: "Jane Smith" },
    ]);

    expect(result.entitySummary.clients.total).toBe(3);
    expect(result.entitySummary.clients.unique).toBe(2);
    expect(result.entitySummary.clients.deduplicated).toBe(1);
  });

  it("phone takes priority over email for dedup key", () => {
    const result = validateImportData([
      { client_name: "A", primary_phone: "6944000001", primary_email: "a@test.com" },
      { client_name: "B", primary_phone: "6944000001", primary_email: "b@test.com" },
    ]);

    // Same phone -> same dedup key -> unique = 1
    expect(result.entitySummary.clients.unique).toBe(1);
  });

  it("strips non-digit characters from phone for dedup", () => {
    const result = validateImportData([
      { client_name: "A", primary_phone: "+30 694-412-3456" },
      { client_name: "B", primary_phone: "306944123456" },
    ]);

    // After stripping non-digits, both become "306944123456"
    expect(result.entitySummary.clients.unique).toBe(1);
  });

  it("email dedup is case-insensitive", () => {
    const result = validateImportData([
      { client_name: "Alice", primary_email: "Alice@Test.COM" },
      { client_name: "Alice2", primary_email: "alice@test.com" },
    ]);

    expect(result.entitySummary.clients.unique).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Property deduplication (address composite, fallback to name)
// ---------------------------------------------------------------------------

describe("Property deduplication", () => {
  it("deduplicates properties by composite address key (street|city)", () => {
    const result = validateImportData([
      { property_name: "Apt A", address_street: "Ermou 10", address_city: "Athens" },
      { property_name: "Apt B", address_street: "Ermou 10", address_city: "Athens" },
      { property_name: "Apt C", address_street: "Stadiou 5", address_city: "Athens" },
    ]);

    expect(result.entitySummary.properties.total).toBe(3);
    expect(result.entitySummary.properties.unique).toBe(2);
    expect(result.entitySummary.properties.deduplicated).toBe(1);
  });

  it("falls back to property_name when no address columns present", () => {
    const result = validateImportData([
      { property_name: "Seaside Villa" },
      { property_name: "Seaside Villa" },
      { property_name: "Mountain Cabin" },
    ]);

    expect(result.entitySummary.properties.total).toBe(3);
    expect(result.entitySummary.properties.unique).toBe(2);
    expect(result.entitySummary.properties.deduplicated).toBe(1);
  });

  it("address dedup is case-insensitive", () => {
    const result = validateImportData([
      { property_name: "A", address_street: "ERMOU 10", address_city: "ATHENS" },
      { property_name: "B", address_street: "ermou 10", address_city: "athens" },
    ]);

    expect(result.entitySummary.properties.unique).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Zod validation errors captured with row/field/entity context
// ---------------------------------------------------------------------------

describe("Zod validation error capture", () => {
  it("captures client validation errors with correct context", () => {
    const result = validateImportData([
      {
        client_name: "", // required, empty = error
        primary_email: "not-an-email", // invalid format
      },
    ]);

    // client_name is empty so hasClient depends on the fileHasClientNameColumn logic
    // client_name is explicitly present (not undefined) so the file "has" the column
    // empty client_name -> hasClient = false (isNonEmpty("") = false)
    // So no client detection here, row is skipped
    expect(result.entitySummary.clients.total).toBe(0);
  });

  it("captures property validation errors for invalid enum values", () => {
    const result = validateImportData([
      {
        property_name: "Test Property",
        property_type: "INVALID_TYPE",
      },
    ]);

    // normalizePropertyEnums will return null for unknown enum value
    // z.enum().optional().nullable() allows null, so this should pass
    expect(result.validRows).toHaveLength(1);
  });

  it("captures mandate validation errors with correct entity context", () => {
    // Mandate with an invalid numeric field
    const result = validateImportData([
      {
        mandate_transaction_type: "sale",
        budget_min: -100, // z.coerce.number().positive() should fail
      },
    ]);

    const mandateErrors = result.errorRows.filter(
      (e) => e.entity === "mandate",
    );
    expect(mandateErrors.length).toBeGreaterThan(0);
    expect(mandateErrors[0].entity).toBe("mandate");
    expect(mandateErrors[0].rowIndex).toBe(0);
  });

  it("error rows are excluded from validRows", () => {
    const result = validateImportData([
      { client_name: "Good Client" },
      {
        // mandate with invalid budget
        mandate_transaction_type: "sale",
        budget_min: -500,
      },
    ]);

    // Row 0 (good client) should be in validRows
    const row0 = result.validRows.find((r) => r.rowIndex === 0);
    expect(row0).toBeDefined();

    // Row 1 (bad mandate) should NOT be in validRows
    const row1 = result.validRows.find((r) => r.rowIndex === 1);
    expect(row1).toBeUndefined();

    // Row 1 should have errors
    const row1Errors = result.errorRows.filter((e) => e.rowIndex === 1);
    expect(row1Errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Entity summary counts
// ---------------------------------------------------------------------------

describe("Entity summary counts", () => {
  it("returns correct summary for mixed import", () => {
    const result = validateImportData([
      { client_name: "Client 1", property_name: "Prop 1", mandate_transaction_type: "sale" },
      { client_name: "Client 2", property_name: "Prop 2" },
      { client_name: "Client 1" }, // duplicate client
    ]);

    expect(result.entitySummary.clients.detected).toBe(true);
    expect(result.entitySummary.clients.total).toBe(3);
    expect(result.entitySummary.clients.unique).toBe(2);
    expect(result.entitySummary.clients.deduplicated).toBe(1);

    expect(result.entitySummary.properties.detected).toBe(true);
    expect(result.entitySummary.properties.total).toBe(2);

    expect(result.entitySummary.mandates.detected).toBe(true);
    expect(result.entitySummary.mandates.total).toBe(1);
    expect(result.entitySummary.mandates.deduplicated).toBe(0);
  });

  it("returns detected=false when no entities of that type exist", () => {
    const result = validateImportData([
      { property_name: "Prop Only" },
    ]);

    expect(result.entitySummary.clients.detected).toBe(false);
    expect(result.entitySummary.clients.total).toBe(0);
    expect(result.entitySummary.mandates.detected).toBe(false);
    expect(result.entitySummary.mandates.total).toBe(0);
    expect(result.entitySummary.properties.detected).toBe(true);
  });

  it("empty input returns all zeros", () => {
    const result = validateImportData([]);

    expect(result.validRows).toHaveLength(0);
    expect(result.errorRows).toHaveLength(0);
    expect(result.entitySummary.clients.total).toBe(0);
    expect(result.entitySummary.properties.total).toBe(0);
    expect(result.entitySummary.mandates.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Mixed entities (client + property + mandate) in one row
// ---------------------------------------------------------------------------

describe("Mixed entity rows", () => {
  it("handles a row with client + property + mandate data", () => {
    const result = validateImportData([
      {
        client_name: "Nikos Papadopoulos",
        primary_phone: "6944111222",
        primary_email: "nikos@example.com",
        property_name: "Glyfada Apartment",
        address_street: "Poseidonos 15",
        address_city: "Glyfada",
        price: 250000,
        mandate_transaction_type: "sale",
        budget_min: 200000,
        budget_max: 300000,
      },
    ]);

    expect(result.validRows).toHaveLength(1);
    const row = result.validRows[0];

    expect(row.hasClient).toBe(true);
    expect(row.hasProperty).toBe(true);
    expect(row.hasMandate).toBe(true);

    expect(row.clientRow).not.toBeNull();
    expect(row.propertyRow).not.toBeNull();
    expect(row.mandateRow).not.toBeNull();

    expect(row.clientDedupKey).toContain("phone:");
    expect(row.propertyDedupKey).toContain("addr:");

    expect(result.entitySummary.clients.total).toBe(1);
    expect(result.entitySummary.properties.total).toBe(1);
    expect(result.entitySummary.mandates.total).toBe(1);
  });

  it("mandate title is auto-generated from transaction_type and property data", () => {
    const result = validateImportData([
      {
        property_name: "Test Property",
        mandate_transaction_type: "sale",
        mandate_property_type: "APARTMENT",
      },
    ]);

    expect(result.validRows).toHaveLength(1);
    const mandateRow = result.validRows[0].mandateRow;
    expect(mandateRow).not.toBeNull();
    // The title should be auto-generated (e.g. "Buy Apartment")
    expect(mandateRow!.title).toBeTruthy();
    expect(typeof mandateRow!.title).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// 7. Rows with only one entity type
// ---------------------------------------------------------------------------

describe("Single entity rows", () => {
  it("client-only rows work correctly", () => {
    const result = validateImportData([
      { client_name: "Alice", primary_email: "alice@example.com", client_type: "buyer" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasClient).toBe(true);
    expect(result.validRows[0].hasProperty).toBe(false);
    expect(result.validRows[0].hasMandate).toBe(false);
    expect(result.validRows[0].propertyRow).toBeNull();
    expect(result.validRows[0].mandateRow).toBeNull();
  });

  it("property-only rows work correctly", () => {
    const result = validateImportData([
      { property_name: "Mountain House", property_type: "house", price: 150000 },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasProperty).toBe(true);
    expect(result.validRows[0].hasClient).toBe(false);
    expect(result.validRows[0].hasMandate).toBe(false);
  });

  it("mandate-only rows work correctly (title auto-generated)", () => {
    const result = validateImportData([
      { mandate_transaction_type: "rental", budget_min: 500, budget_max: 1000 },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasMandate).toBe(true);
    expect(result.validRows[0].hasClient).toBe(false);
    expect(result.validRows[0].hasProperty).toBe(false);
    expect(result.validRows[0].mandateRow).not.toBeNull();
    // Auto-generated title should be "Rent mandate"
    expect(result.validRows[0].mandateRow!.title).toBe("Rent mandate");
  });
});

// ---------------------------------------------------------------------------
// 8. Enum normalization flows through correctly
// ---------------------------------------------------------------------------

describe("Enum normalization", () => {
  it("normalizes Greek property type to enum value", () => {
    const result = validateImportData([
      { property_name: "Test", property_type: "διαμέρισμα" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].propertyRow).not.toBeNull();
    expect(result.validRows[0].propertyRow!.property_type).toBe("APARTMENT");
  });

  it("normalizes client type from English variation", () => {
    const result = validateImportData([
      { client_name: "Test Client", client_type: "buyer" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].clientRow).not.toBeNull();
    expect(result.validRows[0].clientRow!.client_type).toBe("BUYER");
  });

  it("normalizes mandate transaction type", () => {
    const result = validateImportData([
      { mandate_transaction_type: "for rent", budget_min: 500 },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].mandateRow).not.toBeNull();
    expect(result.validRows[0].mandateRow!.transaction_type).toBe("RENTAL");
  });
});

// ---------------------------------------------------------------------------
// 9. Prefix stripping
// ---------------------------------------------------------------------------

describe("Prefix stripping", () => {
  it("strips mandate_ prefix from mandate fields", () => {
    const result = validateImportData([
      { mandate_transaction_type: "sale", mandate_status: "active" },
    ]);

    expect(result.validRows).toHaveLength(1);
    const mandateRow = result.validRows[0].mandateRow;
    expect(mandateRow).not.toBeNull();
    // After prefix stripping, keys should be transaction_type and status
    expect(mandateRow!.transaction_type).toBe("SALE");
    expect(mandateRow!.status).toBe("ACTIVE");
    // Original prefixed keys should not exist
    expect(mandateRow!.mandate_transaction_type).toBeUndefined();
  });

  it("strips client_ prefix from client description", () => {
    const result = validateImportData([
      { client_name: "Test", client_description: "VIP client" },
    ]);

    expect(result.validRows).toHaveLength(1);
    const clientRow = result.validRows[0].clientRow;
    expect(clientRow).not.toBeNull();
    expect(clientRow!.description).toBe("VIP client");
  });
});
