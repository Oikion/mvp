import { describe, it, expect } from "vitest";
import { parseConstructionYear } from "@/lib/matchmaking/normalizers";

describe("parseConstructionYear", () => {
  it("returns null for null", () => {
    expect(parseConstructionYear(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseConstructionYear(undefined)).toBeNull();
  });

  it("returns 2005 for number 2005", () => {
    expect(parseConstructionYear(2005)).toBe(2005);
  });

  it("returns 1985 for string '1985'", () => {
    expect(parseConstructionYear("1985")).toBe(1985);
  });

  it("returns null for non-numeric string 'abc'", () => {
    expect(parseConstructionYear("abc")).toBeNull();
  });

  it("returns null for 1799 (below range)", () => {
    expect(parseConstructionYear(1799)).toBeNull();
  });

  it("returns null for 2101 (above range)", () => {
    expect(parseConstructionYear(2101)).toBeNull();
  });

  it("returns 1800 for boundary value 1800", () => {
    expect(parseConstructionYear(1800)).toBe(1800);
  });

  it("returns 2100 for boundary value 2100", () => {
    expect(parseConstructionYear(2100)).toBe(2100);
  });

  it("returns 2010 for string with leading/trailing whitespace", () => {
    expect(parseConstructionYear("  2010  ")).toBe(2010);
  });
});
