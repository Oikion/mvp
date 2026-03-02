import { describe, it, expect } from "vitest";
import { 
  createPropertySchema, 
  updatePropertySchema,
  validatePublishingReadiness 
} from "@/lib/validations/mls";

describe("MLS Property Validation Rules", () => {
  describe("MLS-001: Price Must Be Positive", () => {
    it("should pass with positive price for SALE", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        transaction_type: "SALE",
        price: 150000,
        size_net_sqm: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("should fail with zero price for SALE (non-draft)", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        transaction_type: "SALE",
        price: 0,
        size_net_sqm: 1000,
        draft_status: false,
      });
      expect(result.success).toBe(false);
    });

    it("should pass with null price for EXCHANGE", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        transaction_type: "EXCHANGE",
        price: null,
        size_net_sqm: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("should pass with positive price for RENTAL", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        transaction_type: "RENTAL",
        price: 800,
        size_net_sqm: 500,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("MLS-002: Area Measurement Required", () => {
    it("should pass with size_net_sqm provided", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_net_sqm: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("should pass with size_net_sqm provided", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_net_sqm: 85,
      });
      expect(result.success).toBe(true);
    });

    it("should pass with size_gross_sqm provided", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_gross_sqm: 100,
      });
      expect(result.success).toBe(true);
    });

    it("should pass with plot_size_sqm provided", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        plot_size_sqm: 500,
      });
      expect(result.success).toBe(true);
    });

    it("should fail without any area measurement (non-draft)", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        draft_status: false,
      });
      expect(result.success).toBe(false);
    });

    it("should pass without area for drafts", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        draft_status: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("MLS-005: Date Consistency", () => {
    it("should pass when renovated_year >= year_built", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_net_sqm: 1000,
        year_built: 1990,
        renovated_year: 2020,
      });
      expect(result.success).toBe(true);
    });

    it("should fail when renovated_year < year_built", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_net_sqm: 1000,
        year_built: 2020,
        renovated_year: 1990,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.renovated_year).toBeDefined();
      }
    });

    it("should pass when only year_built is provided", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_net_sqm: 1000,
        year_built: 1990,
      });
      expect(result.success).toBe(true);
    });

    it("should pass when building_permit_year <= year_built", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_net_sqm: 1000,
        year_built: 1990,
        building_permit_year: 1988,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("MLS-006: Property Type Specific Requirements", () => {
    it("should require plot_size_sqm for LAND type", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Land",
        property_type: "LAND",
        draft_status: false,
      });
      expect(result.success).toBe(false);
    });

    it("should pass for LAND with plot_size_sqm", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Land",
        property_type: "LAND",
        plot_size_sqm: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("should require plot_size_sqm for PLOT type", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Plot",
        property_type: "PLOT",
        draft_status: false,
      });
      expect(result.success).toBe(false);
    });

    it("should not require plot_size for APARTMENT", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Apartment",
        property_type: "APARTMENT",
        size_net_sqm: 85,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("MLS-009: Measurement Consistency", () => {
    it("should pass when net_sqm <= gross_sqm", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_net_sqm: 80,
        size_gross_sqm: 100,
      });
      expect(result.success).toBe(true);
    });

    it("should fail when net_sqm > gross_sqm", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_net_sqm: 100,
        size_gross_sqm: 80,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.size_net_sqm).toBeDefined();
      }
    });

    it("should pass when net_sqm equals gross_sqm", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test Property",
        size_net_sqm: 100,
        size_gross_sqm: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Publishing Readiness Validation (MLS-008)", () => {
    it("should be ready with all required fields", () => {
      const result = validatePublishingReadiness({
        property_name: "Test Property",
        property_type: "APARTMENT",
        transaction_type: "SALE",
        price: 150000,
        size_net_sqm: 85,
        description: "A nice apartment",
        address_city: "Athens",
      });
      expect(result.ready).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should not be ready without property_name", () => {
      const result = validatePublishingReadiness({
        property_name: "",
        property_type: "APARTMENT",
        transaction_type: "SALE",
        price: 150000,
        size_net_sqm: 85,
      });
      expect(result.ready).toBe(false);
      expect(result.errors).toContain("Property name is required");
    });

    it("should not be ready without price (except EXCHANGE)", () => {
      const result = validatePublishingReadiness({
        property_name: "Test",
        property_type: "APARTMENT",
        transaction_type: "SALE",
        price: 0,
        size_net_sqm: 85,
      });
      expect(result.ready).toBe(false);
      expect(result.errors).toContain("Price is required and must be greater than zero");
    });

    it("should be ready without price for EXCHANGE", () => {
      const result = validatePublishingReadiness({
        property_name: "Test",
        property_type: "APARTMENT",
        transaction_type: "EXCHANGE",
        size_net_sqm: 85,
      });
      expect(result.ready).toBe(true);
    });

    it("should warn about missing description", () => {
      const result = validatePublishingReadiness({
        property_name: "Test",
        property_type: "APARTMENT",
        transaction_type: "SALE",
        price: 150000,
        size_net_sqm: 85,
      });
      expect(result.ready).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Update Property Schema", () => {
    it("should require id field", () => {
      const result = updatePropertySchema.safeParse({
        property_name: "Updated Name",
      });
      expect(result.success).toBe(false);
    });

    it("should allow partial updates with id", () => {
      const result = updatePropertySchema.safeParse({
        id: "property-123",
        property_name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

    it("should validate date consistency on update", () => {
      const result = updatePropertySchema.safeParse({
        id: "property-123",
        year_built: 2020,
        renovated_year: 1990,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Enum Validation", () => {
    it("should accept valid property status", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test",
        size_net_sqm: 1000,
        property_status: "ACTIVE",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid transaction type", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test",
        size_net_sqm: 1000,
        transaction_type: "RENTAL",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid property type", () => {
      const result = createPropertySchema.safeParse({
        property_name: "Test",
        size_net_sqm: 1000,
        property_type: "APARTMENT",
      });
      expect(result.success).toBe(true);
    });
  });
});
