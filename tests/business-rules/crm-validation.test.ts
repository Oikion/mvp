import { describe, it, expect } from "vitest";
import { createClientSchema, updateClientSchema } from "@/lib/validations/crm";

describe("CRM Client Validation Rules", () => {
  describe("CRM-003: Contact Method Handling", () => {
    it("should pass when email is provided", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "test@example.com",
        primary_phone: "",
      });
      expect(result.success).toBe(true);
    });

    it("should pass when phone is provided", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "",
        primary_phone: "+30123456789",
      });
      expect(result.success).toBe(true);
    });

    it("should pass when both email and phone are provided", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "test@example.com",
        primary_phone: "+30123456789",
      });
      expect(result.success).toBe(true);
    });

    it("should pass when neither email nor phone is provided (both optional)", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "",
        primary_phone: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CRM-004: Person Type Fields", () => {
    it("should pass for COMPANY with company_name", () => {
      const result = createClientSchema.safeParse({
        client_name: "Acme Corp",
        primary_email: "contact@acme.com",
        person_type: "COMPANY",
        company_name: "Acme Corporation",
      });
      expect(result.success).toBe(true);
    });

    it("should pass for INDIVIDUAL with full_name", () => {
      const result = createClientSchema.safeParse({
        client_name: "John Doe",
        primary_email: "john@example.com",
        person_type: "INDIVIDUAL",
        full_name: "John Doe",
      });
      expect(result.success).toBe(true);
    });

    it("should pass when person_type is not set", () => {
      const result = createClientSchema.safeParse({
        client_name: "Unknown",
        primary_email: "unknown@example.com",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CRM-006: Greek ID Format Validation", () => {
    it("should pass with valid 9-digit AFM", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "test@example.com",
        afm: "123456789",
      });
      expect(result.success).toBe(true);
    });

    it("should fail with 8-digit AFM", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "test@example.com",
        afm: "12345678",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.afm).toBeDefined();
      }
    });

    it("should fail with 10-digit AFM", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "test@example.com",
        afm: "1234567890",
      });
      expect(result.success).toBe(false);
    });

    it("should pass with empty AFM (optional)", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "test@example.com",
        afm: "",
      });
      expect(result.success).toBe(true);
    });

    it("should pass with valid 5-digit postal code", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "test@example.com",
        billing_postal_code: "12345",
      });
      expect(result.success).toBe(true);
    });

    it("should fail with 4-digit postal code", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test Client",
        primary_email: "test@example.com",
        billing_postal_code: "1234",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Update Client Schema", () => {
    it("should require id field", () => {
      const result = updateClientSchema.safeParse({
        client_name: "Updated Name",
      });
      expect(result.success).toBe(false);
    });

    it("should allow partial updates with id", () => {
      const result = updateClientSchema.safeParse({
        id: "client-123",
        client_name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

  });

  describe("Enum Validation", () => {
    it("should accept valid client status", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test",
        primary_email: "test@example.com",
        client_status: "LEAD",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid client status", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test",
        primary_email: "test@example.com",
        client_status: "INVALID_STATUS",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid client type", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test",
        primary_email: "test@example.com",
        client_type: "BUYER",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid lead source", () => {
      const result = createClientSchema.safeParse({
        client_name: "Test",
        primary_email: "test@example.com",
        lead_source: "REFERRAL",
      });
      expect(result.success).toBe(true);
    });
  });
});
