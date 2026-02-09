import { describe, expect, it } from "vitest";

import {
  buildPqabDescription,
  mapPropertyToDescriptionInput,
  type PropertyDescriptionInput,
  type PropertyRecord,
} from "@/lib/ai/property-description-generator";

describe("property-description-generator", () => {
  it("builds a PQAB description with key property details", () => {
    const input: PropertyDescriptionInput = {
      propertyName: "Kolonaki Loft",
      propertyType: "APARTMENT",
      transactionType: "SALE",
      municipality: "Athens",
      area: "Kolonaki",
      price: 350000,
      bedrooms: 2,
      bathrooms: 1,
      sizeNetSqm: 78,
      tone: "professional",
      length: "short",
      includeEmotionalAppeal: true,
      targetAudience: "buyers",
    };

    const description = buildPqabDescription(input);

    expect(description).toContain("Kolonaki");
    expect(description).toContain("2-bedroom");
    expect(description).toContain("78 sqm");
    expect(description).toContain("Call to action");
  });

  it("maps property record fields to description input", () => {
    const property: PropertyRecord = {
      property_name: "Coastal Home",
      property_type: "HOUSE",
      transaction_type: "RENTAL",
      municipality: "Athens",
      area: "Vouliagmeni",
      price: 1200,
      bedrooms: 3,
      bathrooms: 2,
      size_net_sqm: 140,
    };

    const mapped = mapPropertyToDescriptionInput(property);

    expect(mapped.propertyName).toBe("Coastal Home");
    expect(mapped.propertyType).toBe("HOUSE");
    expect(mapped.transactionType).toBe("RENTAL");
    expect(mapped.municipality).toBe("Athens");
    expect(mapped.area).toBe("Vouliagmeni");
    expect(mapped.bedrooms).toBe(3);
    expect(mapped.sizeNetSqm).toBe(140);
  });
});
