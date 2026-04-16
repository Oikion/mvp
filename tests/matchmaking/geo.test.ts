import { describe, it, expect } from "vitest";
import { haversineDistanceKm, scoreByRadius } from "@/lib/matchmaking/geo";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistanceKm(37.9838, 23.7275, 37.9838, 23.7275)).toBe(0);
  });

  it("Athens to Thessaloniki is approximately 303 km", () => {
    // Athens: 37.9838, 23.7275 — Thessaloniki: 40.6401, 22.9444
    // Great-circle (geodesic) distance is ~303 km; road distance is ~488 km
    const dist = haversineDistanceKm(37.9838, 23.7275, 40.6401, 22.9444);
    expect(dist).toBeGreaterThan(295);
    expect(dist).toBeLessThan(315);
  });

  it("Athens to Piraeus is approximately 8 km", () => {
    // Piraeus: 37.9477, 23.6464
    const dist = haversineDistanceKm(37.9838, 23.7275, 37.9477, 23.6464);
    expect(dist).toBeGreaterThan(6);
    expect(dist).toBeLessThan(10);
  });
});

describe("scoreByRadius", () => {
  it("returns maxPoints when distance is 0", () => {
    expect(scoreByRadius(0, 10, 15)).toBe(15);
  });

  it("returns 0 when distance exceeds radius * 1.2", () => {
    expect(scoreByRadius(12.1, 10, 15)).toBe(0);
  });

  it("returns proportional score within radius", () => {
    // distanceKm=6, radiusKm=10, radiusExtended=12 → ratio=6/12=0.5 → score=0.5*15=7.5 → round=8
    expect(scoreByRadius(6, 10, 15)).toBe(8);
  });
});
