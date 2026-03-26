/**
 * Greek-to-Latin transliteration for fuzzy matching.
 * Handles standard Greek, accented characters, digraphs, and final sigma.
 */

const GREEK_TO_LATIN: Record<string, string> = {
  // Lowercase
  // Note: υ (plain upsilon) maps to "i" reflecting modern Greek phonology (sounds like "ee").
  // ύ (accented upsilon) maps to "y" per the import fuzzy-matching convention used in column headers.
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "i", φ: "f", χ: "ch", ψ: "ps", ω: "o",
  // Uppercase
  Α: "a", Β: "v", Γ: "g", Δ: "d", Ε: "e", Ζ: "z", Η: "i", Θ: "th",
  Ι: "i", Κ: "k", Λ: "l", Μ: "m", Ν: "n", Ξ: "x", Ο: "o", Π: "p",
  Ρ: "r", Σ: "s", Τ: "t", Υ: "i", Φ: "f", Χ: "ch", Ψ: "ps", Ω: "o",
  // Accented lowercase
  ά: "a", έ: "e", ή: "i", ί: "i", ό: "o", ύ: "y", ώ: "o",
  ϊ: "i", ϋ: "y", ΐ: "i", ΰ: "y",
  // Accented uppercase
  Ά: "a", Έ: "e", Ή: "i", Ί: "i", Ό: "o", Ύ: "y", Ώ: "o",
  Ϊ: "i", Ϋ: "y",
};

export function transliterateGreekToLatin(input: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const mapped = GREEK_TO_LATIN[char];
    if (mapped !== undefined) {
      result += mapped;
    } else {
      result += char.toLowerCase();
    }
  }
  return result;
}

export function containsGreek(input: string): boolean {
  return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(input);
}
