import { describe, it, expect } from "vitest";
import { inferBooleanAmenity } from "@/lib/matchmaking/amenity-utils";

describe("inferBooleanAmenity", () => {
  it("returns null for null amenities", () => {
    expect(inferBooleanAmenity(null, ["garden"])).toBeNull();
  });

  it("returns null for undefined amenities", () => {
    expect(inferBooleanAmenity(undefined, ["garden"])).toBeNull();
  });

  it("returns true when key is present in array form", () => {
    expect(inferBooleanAmenity(["garden", "pool"], ["garden"])).toBe(true);
  });

  it("returns false when key is absent in array form", () => {
    expect(inferBooleanAmenity(["pool", "gym"], ["garden"])).toBe(false);
  });

  it("is case-insensitive for array form", () => {
    expect(inferBooleanAmenity(["Garden", "Pool"], ["garden"])).toBe(true);
  });

  it("normalizes hyphens and spaces in array form", () => {
    expect(
      inferBooleanAmenity(["parking-space", "gym"], ["parking_space"])
    ).toBe(true);
  });

  it("returns true when key maps to true in object form", () => {
    expect(
      inferBooleanAmenity({ garden: true, pool: false }, ["garden"])
    ).toBe(true);
  });

  it("returns false when key maps to false in object form", () => {
    expect(
      inferBooleanAmenity({ garden: false, pool: true }, ["garden"])
    ).toBe(false);
  });

  it("returns false when key is absent in object form", () => {
    expect(inferBooleanAmenity({ pool: true }, ["garden"])).toBe(false);
  });

  it("returns true when any of multiple keys matches (OR logic)", () => {
    expect(
      inferBooleanAmenity(["garage"], ["parking", "garage", "parking_space"])
    ).toBe(true);
  });
});
