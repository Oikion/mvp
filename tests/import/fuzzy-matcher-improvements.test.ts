import { describe, it, expect } from "vitest";
import { findBestMatch } from "@/lib/import/fuzzy-matcher";

// Sample field definitions for testing - include entity property
const SAMPLE_FIELDS = [
  { key: "client_name", entity: "client", required: true, group: "contact", aliases: ["Όνομα", "Ονοματεπώνυμο", "name", "full_name"] },
  { key: "primary_email", entity: "client", required: false, group: "contact", aliases: ["Email", "Ηλ. Ταχυδρομείο", "email_address"] },
  { key: "primary_phone", entity: "client", required: false, group: "contact", aliases: ["Τηλέφωνο", "Κινητό", "phone", "mobile"] },
  { key: "property_name", entity: "property", required: true, group: "basic", aliases: ["Τίτλος Ακινήτου", "listing_title", "title"] },
  { key: "primary_email", entity: "property", required: false, group: "contact", aliases: ["property_email", "listing_email"] },
  { key: "price", entity: "property", required: false, group: "financial", aliases: ["Τιμή", "asking_price", "cost"] },
] as const;

describe("Fuzzy matcher improvements", () => {
  describe("Greeklish transliteration matching (Feature A)", () => {
    it("should match Greeklish 'Onoma' to client_name", () => {
      const match = findBestMatch("Onoma", SAMPLE_FIELDS);
      expect(match.fieldKey).toBe("client_name");
      expect(match.score).toBeGreaterThanOrEqual(80);
    });

    it("should match Greeklish 'Tilefono' to primary_phone", () => {
      const match = findBestMatch("Tilefono", SAMPLE_FIELDS);
      expect(match.fieldKey).toBe("primary_phone");
      expect(match.score).toBeGreaterThanOrEqual(80);
    });

    it("should match Greeklish 'Timi' to price", () => {
      const match = findBestMatch("Timi", SAMPLE_FIELDS);
      expect(match.fieldKey).toBe("price");
      expect(match.score).toBeGreaterThanOrEqual(80);
    });

    it("should match a pure Greek alias directly (regression)", () => {
      // 'Τηλέφωνο' is an alias for primary_phone — must still match
      const match = findBestMatch("Τηλέφωνο", SAMPLE_FIELDS);
      expect(match.fieldKey).toBe("primary_phone");
      expect(match.score).toBeGreaterThanOrEqual(90);
    });
  });

  describe("Ambiguity detection (Feature B)", () => {
    it("should flag 'Email' as ambiguous when client and property both have email fields", () => {
      const match = findBestMatch("Email", SAMPLE_FIELDS);
      expect(match.ambiguous).toBe(true);
      expect(match.alternatives).toBeDefined();
      expect(match.alternatives!.length).toBeGreaterThanOrEqual(1);
    });

    it("should NOT flag unambiguous matches", () => {
      const match = findBestMatch("phone", SAMPLE_FIELDS);
      expect(match.ambiguous).toBeFalsy();
    });

    it("alternatives should reference the runner-up field", () => {
      const match = findBestMatch("Email", SAMPLE_FIELDS);
      // Both client primary_email and property primary_email should appear
      const allKeys = [match.fieldKey, ...(match.alternatives?.map((a) => a.fieldKey) ?? [])];
      expect(allKeys).toContain("primary_email");
    });
  });

  describe("Composite header matching (Feature C)", () => {
    it("should match 'Τιμή Ακινήτου' to price via entity context", () => {
      const match = findBestMatch("Τιμή Ακινήτου", SAMPLE_FIELDS);
      expect(match.fieldKey).toBe("price");
      expect(match.score).toBeGreaterThanOrEqual(85);
    });

    it("should match English composite 'Property Price' to price via entity context", () => {
      const match = findBestMatch("Property Price", SAMPLE_FIELDS);
      // 'Property' → entity:property, 'Price' → price alias matches
      expect(match.fieldKey).toBe("price");
      expect(match.score).toBeGreaterThanOrEqual(85);
    });
  });

  describe("fieldKey / targetField consistency", () => {
    it("fieldKey and targetField should be identical on a normal match", () => {
      const match = findBestMatch("phone", SAMPLE_FIELDS);
      expect(match.fieldKey).toBe(match.targetField);
    });

    it("should return fieldKey: null on no match", () => {
      const match = findBestMatch("xyzzy_gibberish_123", SAMPLE_FIELDS);
      expect(match.fieldKey).toBeNull();
      expect(match.targetField).toBeNull();
      expect(match.score).toBe(0);
    });
  });

  describe("usedFields exclusion (backward compat)", () => {
    it("should skip fields listed in usedFields", () => {
      const used = new Set(["primary_phone"]);
      const match = findBestMatch("Τηλέφωνο", SAMPLE_FIELDS, used);
      // primary_phone is excluded — should not match it
      expect(match.fieldKey).not.toBe("primary_phone");
    });
  });
});
