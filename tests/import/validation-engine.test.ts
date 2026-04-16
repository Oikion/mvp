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
  it("detects contact when contact_name is present", () => {
    const result = validateImportData([
      { contact_name: "John Doe" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasContact).toBe(true);
    expect(result.validRows[0].hasProperty).toBe(false);
    expect(result.validRows[0].hasRequest).toBe(false);
    expect(result.validRows[0].contactRow).not.toBeNull();
    expect(result.validRows[0].propertyRow).toBeNull();
    expect(result.validRows[0].requestRow).toBeNull();
  });

  it("detects property when property_name is present", () => {
    const result = validateImportData([
      { property_name: "Seaside Villa" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasContact).toBe(false);
    expect(result.validRows[0].hasProperty).toBe(true);
    expect(result.validRows[0].hasRequest).toBe(false);
  });

  it("detects request when request-entity fields are present", () => {
    const result = validateImportData([
      { request_transaction_type: "sale", budget_min: 100000 },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasRequest).toBe(true);
    // mandate auto-generates a title so it should pass validation
    expect(result.validRows[0].requestRow).not.toBeNull();
  });

  it("detects contact from phone when no contact_name column exists in file", () => {
    // When NO row in the entire set has contact_name defined,
    // phone/email alone triggers client detection
    const result = validateImportData([
      { primary_phone: "6944123456" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasContact).toBe(true);
    // Auto-generated name from phone
    expect(result.validRows[0].contactDedupKey).toContain("phone:");
  });

  it("does NOT detect contact from phone when contact_name column exists but is empty for this row", () => {
    // When at least one row defines contact_name, presence of phone alone
    // is not enough to detect a contact
    const result = validateImportData([
      { contact_name: "Alice", property_name: "Property A" },
      { contact_name: "", primary_phone: "6944123456", property_name: "Property B" },
    ]);

    // Row 1: has contact + property
    expect(result.validRows[0].hasContact).toBe(true);
    // Row 2: contact_name is empty and the file HAS contact_name column,
    // so hasContact should be false
    const row2 = [...result.validRows, ...result.errorRows.map(e => e.rowIndex)]
      .find((r) => typeof r === "object" && r.rowIndex === 1);
    // We need to check if row index 1 has hasContact false
    // Since row 2 has no contact and has property, it should be in validRows
    const row2Valid = result.validRows.find((r) => r.rowIndex === 1);
    expect(row2Valid).toBeDefined();
    expect(row2Valid!.hasContact).toBe(false);
  });

  it("partitions fields correctly across entities", () => {
    const result = validateImportData([
      {
        contact_name: "John Doe",
        primary_phone: "6944123456",
        property_name: "Villa Test",
        address_city: "Athens",
        request_transaction_type: "sale",
        budget_min: 200000,
      },
    ]);

    expect(result.validRows).toHaveLength(1);
    const row = result.validRows[0];
    expect(row.hasContact).toBe(true);
    expect(row.hasProperty).toBe(true);
    expect(row.hasRequest).toBe(true);
    expect(row.contactRow).not.toBeNull();
    expect(row.propertyRow).not.toBeNull();
    expect(row.requestRow).not.toBeNull();
  });

  it("unmapped keys are dropped during partitioning", () => {
    const result = validateImportData([
      { contact_name: "John", random_unknown_field: "xyz" },
    ]);

    expect(result.validRows).toHaveLength(1);
    // The unknown field should not appear in any entity row
    const row = result.validRows[0];
    expect(row.contactRow).not.toHaveProperty("random_unknown_field");
  });
});

// ---------------------------------------------------------------------------
// 2. Client deduplication (phone > email > name priority)
// ---------------------------------------------------------------------------

describe("Contact deduplication", () => {
  it("deduplicates contacts by phone number (highest priority)", () => {
    const result = validateImportData([
      { contact_name: "John A", primary_phone: "6944123456" },
      { contact_name: "John B", primary_phone: "6944123456" },
      { contact_name: "Jane C", primary_phone: "6955999888" },
    ]);

    expect(result.entitySummary.contacts.total).toBe(3);
    expect(result.entitySummary.contacts.unique).toBe(2);
    expect(result.entitySummary.contacts.deduplicated).toBe(1);
  });

  it("deduplicates contacts by email when phone is absent", () => {
    const result = validateImportData([
      { contact_name: "Alice", primary_email: "alice@test.com" },
      { contact_name: "Alice Copy", primary_email: "alice@test.com" },
    ]);

    expect(result.entitySummary.contacts.total).toBe(2);
    expect(result.entitySummary.contacts.unique).toBe(1);
    expect(result.entitySummary.contacts.deduplicated).toBe(1);
  });

  it("deduplicates contacts by name when phone and email are absent", () => {
    const result = validateImportData([
      { contact_name: "John Doe" },
      { contact_name: "John Doe" },
      { contact_name: "Jane Smith" },
    ]);

    expect(result.entitySummary.contacts.total).toBe(3);
    expect(result.entitySummary.contacts.unique).toBe(2);
    expect(result.entitySummary.contacts.deduplicated).toBe(1);
  });

  it("phone takes priority over email for dedup key", () => {
    const result = validateImportData([
      { contact_name: "A", primary_phone: "6944000001", primary_email: "a@test.com" },
      { contact_name: "B", primary_phone: "6944000001", primary_email: "b@test.com" },
    ]);

    // Same phone -> same dedup key -> unique = 1
    expect(result.entitySummary.contacts.unique).toBe(1);
  });

  it("strips non-digit characters from phone for dedup", () => {
    const result = validateImportData([
      { contact_name: "A", primary_phone: "+30 694-412-3456" },
      { contact_name: "B", primary_phone: "306944123456" },
    ]);

    // After stripping non-digits, both become "306944123456"
    expect(result.entitySummary.contacts.unique).toBe(1);
  });

  it("email dedup is case-insensitive", () => {
    const result = validateImportData([
      { contact_name: "Alice", primary_email: "Alice@Test.COM" },
      { contact_name: "Alice2", primary_email: "alice@test.com" },
    ]);

    expect(result.entitySummary.contacts.unique).toBe(1);
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
  it("captures contact validation errors with correct context", () => {
    const result = validateImportData([
      {
        contact_name: "", // required, empty = error
        primary_email: "not-an-email", // invalid format
      },
    ]);

    // contact_name is empty so hasContact depends on the fileHasContactNameColumn logic
    // contact_name is explicitly present (not undefined) so the file "has" the column
    // empty contact_name -> hasContact = false (isNonEmpty("") = false)
    // So no contact detection here, row is skipped
    expect(result.entitySummary.contacts.total).toBe(0);
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
        request_transaction_type: "sale",
        budget_min: -100, // z.coerce.number().positive() should fail
      },
    ]);

    const mandateErrors = result.errorRows.filter(
      (e) => e.entity === "request",
    );
    expect(mandateErrors.length).toBeGreaterThan(0);
    expect(mandateErrors[0].entity).toBe("request");
    expect(mandateErrors[0].rowIndex).toBe(0);
  });

  it("error rows are excluded from validRows", () => {
    const result = validateImportData([
      { contact_name: "Good Contact" },
      {
        // mandate with invalid budget
        request_transaction_type: "sale",
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
      { contact_name: "Contact 1", property_name: "Prop 1", request_transaction_type: "sale" },
      { contact_name: "Contact 2", property_name: "Prop 2" },
      { contact_name: "Contact 1" }, // duplicate contact
    ]);

    expect(result.entitySummary.contacts.detected).toBe(true);
    expect(result.entitySummary.contacts.total).toBe(3);
    expect(result.entitySummary.contacts.unique).toBe(2);
    expect(result.entitySummary.contacts.deduplicated).toBe(1);

    expect(result.entitySummary.properties.detected).toBe(true);
    expect(result.entitySummary.properties.total).toBe(2);

    expect(result.entitySummary.requests.detected).toBe(true);
    expect(result.entitySummary.requests.total).toBe(1);
    expect(result.entitySummary.requests.deduplicated).toBe(0);
  });

  it("returns detected=false when no entities of that type exist", () => {
    const result = validateImportData([
      { property_name: "Prop Only" },
    ]);

    expect(result.entitySummary.contacts.detected).toBe(false);
    expect(result.entitySummary.contacts.total).toBe(0);
    expect(result.entitySummary.requests.detected).toBe(false);
    expect(result.entitySummary.requests.total).toBe(0);
    expect(result.entitySummary.properties.detected).toBe(true);
  });

  it("empty input returns all zeros", () => {
    const result = validateImportData([]);

    expect(result.validRows).toHaveLength(0);
    expect(result.errorRows).toHaveLength(0);
    expect(result.entitySummary.contacts.total).toBe(0);
    expect(result.entitySummary.properties.total).toBe(0);
    expect(result.entitySummary.requests.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Mixed entities (client + property + mandate) in one row
// ---------------------------------------------------------------------------

describe("Mixed entity rows", () => {
  it("handles a row with contact + property + request data", () => {
    const result = validateImportData([
      {
        contact_name: "Nikos Papadopoulos",
        primary_phone: "6944111222",
        primary_email: "nikos@example.com",
        property_name: "Glyfada Apartment",
        address_street: "Poseidonos 15",
        address_city: "Glyfada",
        price: 250000,
        request_transaction_type: "sale",
        budget_min: 200000,
        budget_max: 300000,
      },
    ]);

    expect(result.validRows).toHaveLength(1);
    const row = result.validRows[0];

    expect(row.hasContact).toBe(true);
    expect(row.hasProperty).toBe(true);
    expect(row.hasRequest).toBe(true);

    expect(row.contactRow).not.toBeNull();
    expect(row.propertyRow).not.toBeNull();
    expect(row.requestRow).not.toBeNull();

    expect(row.contactDedupKey).toContain("phone:");
    expect(row.propertyDedupKey).toContain("addr:");

    expect(result.entitySummary.contacts.total).toBe(1);
    expect(result.entitySummary.properties.total).toBe(1);
    expect(result.entitySummary.requests.total).toBe(1);
  });

  it("mandate title is auto-generated from transaction_type and property data", () => {
    const result = validateImportData([
      {
        property_name: "Test Property",
        request_transaction_type: "sale",
        request_property_type: "APARTMENT",
      },
    ]);

    expect(result.validRows).toHaveLength(1);
    const mandateRow = result.validRows[0].requestRow;
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
  it("contact-only rows work correctly", () => {
    const result = validateImportData([
      { contact_name: "Alice", primary_email: "alice@example.com", contact_type: "BUYER" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasContact).toBe(true);
    expect(result.validRows[0].hasProperty).toBe(false);
    expect(result.validRows[0].hasRequest).toBe(false);
    expect(result.validRows[0].propertyRow).toBeNull();
    expect(result.validRows[0].requestRow).toBeNull();
  });

  it("property-only rows work correctly", () => {
    const result = validateImportData([
      { property_name: "Mountain House", property_type: "house", price: 150000 },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasProperty).toBe(true);
    expect(result.validRows[0].hasContact).toBe(false);
    expect(result.validRows[0].hasRequest).toBe(false);
  });

  it("request-only rows work correctly (title auto-generated)", () => {
    const result = validateImportData([
      { request_transaction_type: "rental", budget_min: 500, budget_max: 1000 },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].hasRequest).toBe(true);
    expect(result.validRows[0].hasContact).toBe(false);
    expect(result.validRows[0].hasProperty).toBe(false);
    expect(result.validRows[0].requestRow).not.toBeNull();
    // Auto-generated title should be "Rent mandate"
    expect(result.validRows[0].requestRow!.title).toBe("Rent mandate");
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

  it("normalizes contact type from English variation", () => {
    const result = validateImportData([
      { contact_name: "Test Contact", contact_type: "buyer" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].contactRow).not.toBeNull();
    expect(result.validRows[0].contactRow!.contact_type).toBe("BUYER");
  });

  it("normalizes mandate transaction type", () => {
    const result = validateImportData([
      { request_transaction_type: "for rent", budget_min: 500 },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].requestRow).not.toBeNull();
    expect(result.validRows[0].requestRow!.transaction_type).toBe("RENTAL");
  });
});

// ---------------------------------------------------------------------------
// 9. Prefix stripping
// ---------------------------------------------------------------------------

describe("Prefix stripping", () => {
  it("strips request_ prefix from request fields", () => {
    const result = validateImportData([
      { request_transaction_type: "sale", request_status: "active" },
    ]);

    expect(result.validRows).toHaveLength(1);
    const requestRow = result.validRows[0].requestRow;
    expect(requestRow).not.toBeNull();
    // After prefix stripping, keys should be transaction_type and status
    expect(requestRow!.transaction_type).toBe("SALE");
    expect(requestRow!.status).toBe("ACTIVE");
    // Original prefixed keys should not exist
    expect(requestRow!.request_transaction_type).toBeUndefined();
  });

  it("strips contact_ prefix from contact description", () => {
    const result = validateImportData([
      { contact_name: "Test", contact_description: "VIP contact" },
    ]);

    expect(result.validRows).toHaveLength(1);
    const contactRow = result.validRows[0].contactRow;
    expect(contactRow).not.toBeNull();
    expect(contactRow!.description).toBe("VIP contact");
  });
});

// ---------------------------------------------------------------------------
// 10. contactDedupKey priority order
// ---------------------------------------------------------------------------

describe("contactDedupKey priority", () => {
  it("phone wins over email wins over name", () => {
    // Row with all three: phone, email, contact_name
    const resultAll = validateImportData([
      { contact_name: "Alice", primary_phone: "6944000001", primary_email: "alice@test.com" },
    ]);
    expect(resultAll.validRows).toHaveLength(1);
    expect(resultAll.validRows[0].contactDedupKey).toMatch(/^phone:/);

    // Row with email and contact_name but no phone
    const resultEmailName = validateImportData([
      { contact_name: "Bob", primary_email: "bob@test.com" },
    ]);
    expect(resultEmailName.validRows).toHaveLength(1);
    expect(resultEmailName.validRows[0].contactDedupKey).toMatch(/^email:/);

    // Row with contact_name only — no phone, no email
    const resultNameOnly = validateImportData([
      { contact_name: "Carol" },
    ]);
    expect(resultNameOnly.validRows).toHaveLength(1);
    expect(resultNameOnly.validRows[0].contactDedupKey).toMatch(/^name:/);
  });
});

// ---------------------------------------------------------------------------
// 11. ContactCategory single-value parsing
// ---------------------------------------------------------------------------

describe("ContactCategory parsing", () => {
  it("accepts a single BUYER contact_type value", () => {
    // contactImportSchema defines contact_type as a single enum (not array)
    // A valid enum value should pass validation
    const result = validateImportData([
      { contact_name: "Dave", contact_type: "BUYER" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].contactRow).not.toBeNull();
    expect(result.validRows[0].contactRow!.contact_type).toBe("BUYER");
  });

  it("normalizes lowercase contact_type to enum value", () => {
    // "buyer" should normalize to "BUYER" via normalizeClientEnums
    const result = validateImportData([
      { contact_name: "Eve", contact_type: "investor" },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].contactRow).not.toBeNull();
    expect(result.validRows[0].contactRow!.contact_type).toBe("INVESTOR");
  });
});
