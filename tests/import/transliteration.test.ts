import { describe, it, expect } from "vitest";
import { transliterateGreekToLatin, containsGreek } from "@/lib/import/transliteration";

describe("Greek transliteration", () => {
  it("should transliterate Greek to Latin", () => {
    expect(transliterateGreekToLatin("Όνομα")).toBe("onoma");
    expect(transliterateGreekToLatin("Τηλέφωνο")).toBe("tilefono");
    expect(transliterateGreekToLatin("Διεύθυνση")).toBe("dieythinsi");
    expect(transliterateGreekToLatin("Τιμή")).toBe("timi");
    expect(transliterateGreekToLatin("Πόλη")).toBe("poli");
  });

  it("should handle accented characters", () => {
    expect(transliterateGreekToLatin("ά")).toBe("a");
    expect(transliterateGreekToLatin("έ")).toBe("e");
    expect(transliterateGreekToLatin("ή")).toBe("i");
    expect(transliterateGreekToLatin("ί")).toBe("i");
    expect(transliterateGreekToLatin("ό")).toBe("o");
    expect(transliterateGreekToLatin("ύ")).toBe("y");
    expect(transliterateGreekToLatin("ώ")).toBe("o");
  });

  it("should handle digraphs", () => {
    expect(transliterateGreekToLatin("θ")).toBe("th");
    expect(transliterateGreekToLatin("χ")).toBe("ch");
    expect(transliterateGreekToLatin("ψ")).toBe("ps");
  });

  it("should handle final sigma", () => {
    expect(transliterateGreekToLatin("ς")).toBe("s");
    expect(transliterateGreekToLatin("σ")).toBe("s");
  });

  it("should pass through Latin characters unchanged", () => {
    expect(transliterateGreekToLatin("email")).toBe("email");
    expect(transliterateGreekToLatin("Address123")).toBe("address123");
  });

  it("should handle mixed Greek and Latin", () => {
    expect(transliterateGreekToLatin("Email Πελάτη")).toBe("email pelati");
  });

  describe("containsGreek", () => {
    it("should detect Greek characters", () => {
      expect(containsGreek("Όνομα")).toBe(true);
      expect(containsGreek("email")).toBe(false);
      expect(containsGreek("Test Τιμή")).toBe(true);
      expect(containsGreek("123")).toBe(false);
    });
  });
});
