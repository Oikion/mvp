/**
 * Fuzzy Matcher Utility for Import Column Mapping
 *
 * Provides intelligent auto-matching of CSV column headers to target fields
 * using Levenshtein distance, alias matching, and confidence scoring.
 *
 * Features:
 * - Greeklish transliteration matching (Feature A)
 * - Ambiguity detection across entities (Feature B)
 * - Composite header matching for multi-word headers (Feature C)
 */

import { transliterateGreekToLatin, containsGreek } from "@/lib/import/transliteration";

export type MatchConfidence = "high" | "medium" | "low" | "none";

export interface MatchResult {
  sourceColumn: string;
  /** Alias for targetField — preferred in new code */
  fieldKey: string | null;
  targetField: string | null;
  confidence: MatchConfidence;
  score: number; // 0-100
  matchType: "exact" | "alias" | "fuzzy" | "partial" | "none";
  /** True when the top-2 candidates belong to different entities and are within 10 points */
  ambiguous?: boolean;
  /** Runner-up candidates when ambiguous is true */
  alternatives?: Array<{ fieldKey: string; entity?: string; score: number }>;
}

export interface FieldDefinitionWithAliases {
  key: string;
  entity?: string;
  required: boolean;
  group: string;
  aliases?: string[];
  description?: string;
}

/**
 * Entity identifier tokens used for composite header matching (Feature C).
 * Maps a token to an entity name for context-boosted scoring.
 */
const ENTITY_IDENTIFIER_MAP: Record<string, string> = {
  Πελάτη: "client",
  Πελάτης: "client",
  Ακινήτου: "property",
  Ακίνητο: "property",
  Εντολής: "request",
  Εντολή: "request",
  Client: "client",
  Property: "property",
  Mandate: "request",
  Request: "request",
};

/**
 * Normalize a string for comparison:
 * - Convert to lowercase
 * - Replace separators (spaces, dashes, underscores, dots) with underscores
 * - Remove special characters
 * - Trim whitespace
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replaceAll(/[\s\-_.]+/g, "_")
    .replaceAll(/[^a-z0-9_]/g, "");
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Calculate similarity percentage between two strings (0-100)
 * Based on Levenshtein distance normalized by the longer string's length
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 100;
  if (a.length === 0 || b.length === 0) return 0;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.round(similarity);
}

/**
 * Check if the source contains key terms from the target
 * Useful for matching "street_address" to "address_street"
 */
export function containsKeyTerms(source: string, target: string): boolean {
  const sourceTerms = source.split("_").filter(t => t.length > 2);
  const targetTerms = target.split("_").filter(t => t.length > 2);
  
  if (sourceTerms.length === 0 || targetTerms.length === 0) return false;
  
  // Check if at least half of the source terms appear in target
  const matchedTerms = sourceTerms.filter(st => 
    targetTerms.some(tt => tt.includes(st) || st.includes(tt))
  );
  
  return matchedTerms.length >= Math.ceil(sourceTerms.length / 2);
}

/**
 * Convert confidence score (0-100) to confidence level
 */
export function scoreToConfidence(score: number): MatchConfidence {
  if (score >= 95) return "high";
  if (score >= 75) return "medium";
  if (score >= 50) return "low";
  return "none";
}

/**
 * Returns true when a normalized string carries no meaningful content —
 * i.e. it is empty or consists solely of underscore separators with no
 * alphanumeric characters (e.g. normalizeString("Τιμή Ακινήτου") → "_").
 */
function isEmptyNormalized(s: string): boolean {
  return s.length === 0 || /^_+$/.test(s);
}

/**
 * Derive an effective normalized form for scoring.
 *
 * `normalizeString` strips all non-ASCII characters, so a pure Greek input
 * collapses to "" or "_". In those cases we use the transliterated form
 * instead so scoring is not based on empty/separator-only strings.
 */
function effectiveNormalized(raw: string): { effective: string; transliterated: string | null } {
  const isGreek = containsGreek(raw);
  const transliterated = isGreek ? normalizeString(transliterateGreekToLatin(raw)) : null;
  const normalized = normalizeString(raw);
  // When normalization destroys the whole string (e.g. pure Greek input collapses to
  // "" or "_"), fall back to the transliterated form as the primary comparison string.
  const effective = isEmptyNormalized(normalized) ? (transliterated ?? normalized) : normalized;
  return { effective, transliterated };
}

/**
 * Score a single field definition against a source column header.
 * Returns { score, matchType } for that candidate.
 *
 * Feature A (Greeklish): when aliases contain Greek or the source looks like
 * Greeklish, transliterated comparisons are added to the scoring pool.
 * When the source is entirely Greek, normalization would collapse it to "",
 * so we always use the transliterated form as the effective comparison string.
 */
function scoreField(
  _normalizedSource: string, // kept for API compat; we recompute internally
  sourceColumn: string,
  field: FieldDefinitionWithAliases
): { score: number; matchType: MatchResult["matchType"] } {
  const { effective: normalizedSource, transliterated: transliteratedSource } =
    effectiveNormalized(sourceColumn);

  const normalizedKey = normalizeString(field.key);

  // Helper: return the best similarity across all transliteration combinations.
  function bestSimilarity(src: string, b: string, rawAlias?: string): number {
    let best = calculateSimilarity(src, b);

    // If alias contains Greek, compare transliterated alias against source forms.
    if (rawAlias && containsGreek(rawAlias)) {
      const transAlias = normalizeString(transliterateGreekToLatin(rawAlias));
      best = Math.max(best, calculateSimilarity(src, transAlias));
      if (transliteratedSource) {
        best = Math.max(best, calculateSimilarity(transliteratedSource, transAlias));
      }
    }

    // Compare transliterated source against Latin alias (catches Greeklish input).
    if (transliteratedSource) {
      best = Math.max(best, calculateSimilarity(transliteratedSource, b));
    }

    return best;
  }

  // 1. Exact match (after normalization) — also check transliterated source vs key
  if (
    normalizedSource === normalizedKey ||
    (transliteratedSource && transliteratedSource === normalizedKey)
  ) {
    return { score: 100, matchType: "exact" };
  }

  // 2. Alias exact match — compare all transliteration combinations.
  //    Guard: skip the match when both sides normalized to "" (would be a false match
  //    between any two all-Greek strings after normalization strips them both).
  const aliasExact = field.aliases?.some((alias) => {
    const normAlias = normalizeString(alias);
    // Both sides empty after normalization → not a meaningful exact match
    if (isEmptyNormalized(normAlias) && isEmptyNormalized(normalizedSource)) return false;
    if (normAlias === normalizedSource) return true;
    if (transliteratedSource && normAlias === transliteratedSource) return true;
    if (containsGreek(alias)) {
      const transAlias = normalizeString(transliterateGreekToLatin(alias));
      if (transAlias === normalizedSource) return true;
      if (transliteratedSource && transAlias === transliteratedSource) return true;
    }
    return false;
  });
  if (aliasExact) {
    return { score: 95, matchType: "alias" };
  }

  // 3. High similarity (Levenshtein + transliteration)
  const keySimilarity = bestSimilarity(normalizedSource, normalizedKey);
  const aliasSimilarities =
    field.aliases?.map((alias) =>
      bestSimilarity(normalizedSource, normalizeString(alias), alias)
    ) ?? [];

  const maxSimilarity = Math.max(keySimilarity, ...aliasSimilarities);

  if (maxSimilarity >= 80) {
    return { score: Math.round(maxSimilarity * 0.85), matchType: "fuzzy" };
  }

  // 4. Partial match (key terms)
  if (containsKeyTerms(normalizedSource, normalizedKey)) {
    return { score: 70, matchType: "partial" };
  }
  if (
    field.aliases?.some((alias) =>
      containsKeyTerms(normalizedSource, normalizeString(alias))
    )
  ) {
    return { score: 65, matchType: "partial" };
  }

  return { score: 0, matchType: "none" };
}

/**
 * Feature C: Composite header matching.
 *
 * When a multi-word header scores below 88 (the composite boost ceiling),
 * split it into tokens and try to identify both a field-key token (score > 85)
 * and an entity identifier token. If both are found, boost the overall score
 * to 88 and restrict to that entity.
 *
 * Returns null when composite matching is not applicable or inconclusive.
 */
function compositeMatch(
  sourceColumn: string,
  fieldDefinitions: readonly FieldDefinitionWithAliases[],
  usedFields: Set<string>,
  existingScore: number
): { fieldKey: string; entity?: string; score: number; matchType: MatchResult["matchType"] } | null {
  // Only attempt composite when the full-string score leaves room for improvement
  if (existingScore >= 88) return null;

  const tokens = sourceColumn.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  // Detect entity from tokens (try raw token first, then transliterated)
  let detectedEntity: string | undefined;
  for (const token of tokens) {
    const mapped = ENTITY_IDENTIFIER_MAP[token];
    if (mapped) {
      detectedEntity = mapped;
      break;
    }
    // Also try transliterating Greek tokens to find entity identifiers
    if (containsGreek(token)) {
      const transToken = transliterateGreekToLatin(token);
      // Normalize capitalisation for lookup
      const capitalised = transToken.charAt(0).toUpperCase() + transToken.slice(1);
      const mappedTrans = ENTITY_IDENTIFIER_MAP[capitalised];
      if (mappedTrans) {
        detectedEntity = mappedTrans;
        break;
      }
    }
  }

  // Try each token as a field-key candidate
  let bestCandidateKey: string | null = null;
  let bestCandidateScore = 0;

  for (const token of tokens) {
    const normalizedToken = normalizeString(token);
    for (const field of fieldDefinitions) {
      if (usedFields.has(field.key)) continue;
      if (detectedEntity && field.entity && field.entity !== detectedEntity) continue;

      const { score } = scoreField(normalizedToken, token, field);
      if (score > 85 && score > bestCandidateScore) {
        bestCandidateScore = score;
        bestCandidateKey = field.key;
      }
    }
  }

  if (bestCandidateKey && detectedEntity) {
    return {
      fieldKey: bestCandidateKey,
      entity: detectedEntity,
      score: 88,
      matchType: "fuzzy",
    };
  }

  return null;
}

/**
 * Find the best match for a single source column against all field definitions.
 *
 * @param sourceColumn  Raw CSV column header
 * @param fieldDefinitions  Field definitions to match against
 * @param usedFields  Already-claimed field keys (optional; defaults to empty set)
 */
export function findBestMatch(
  sourceColumn: string,
  fieldDefinitions: readonly FieldDefinitionWithAliases[],
  usedFields: Set<string> = new Set()
): MatchResult {
  const normalizedSource = normalizeString(sourceColumn);

  // --- Scoring pass: collect all candidates ---
  type Candidate = { fieldKey: string; entity?: string; score: number; matchType: MatchResult["matchType"] };
  const candidates: Candidate[] = [];

  for (const field of fieldDefinitions) {
    if (usedFields.has(field.key)) continue;

    const { score, matchType } = scoreField(normalizedSource, sourceColumn, field);
    if (score > 0) {
      candidates.push({ fieldKey: field.key, entity: field.entity, score, matchType });
    }
  }

  // Sort candidates descending by score
  candidates.sort((a, b) => b.score - a.score);

  const top = candidates[0];
  const runnerUp = candidates[1];

  // --- Feature C: Composite header matching ---
  const compositeResult = compositeMatch(
    sourceColumn,
    fieldDefinitions,
    usedFields,
    top?.score ?? 0
  );

  // Use composite result if it outscores the best direct candidate
  let winner: Candidate | undefined = top;
  if (compositeResult && (!top || compositeResult.score > top.score)) {
    winner = compositeResult;
  }

  // --- Build base result ---
  const noMatch: MatchResult = {
    sourceColumn,
    fieldKey: null,
    targetField: null,
    confidence: "none",
    score: 0,
    matchType: "none",
  };

  if (!winner || winner.score === 0) return noMatch;

  // --- Feature B: Ambiguity detection ---
  // Two candidates from different entities within 10 points → ambiguous.
  // Also flag when the winning fieldKey itself exists in multiple entity-variants
  // (i.e. the same field key is defined for both "client" and "property"), since the
  // matcher cannot determine which entity the user intends.
  let ambiguous = false;
  let alternatives: MatchResult["alternatives"];

  // Collect all entity-variants of the winning key that scored > 0
  const winnerKeyVariants = candidates.filter(
    (c) => c.fieldKey === winner.fieldKey && c !== top && c.entity !== winner.entity
  );

  if (winnerKeyVariants.length > 0 && winner.entity !== undefined) {
    // The same field key is defined for multiple entities → inherently ambiguous.
    // We don't require a tight score gap here: the mere existence of the same key
    // in another entity is sufficient to flag ambiguity.
    ambiguous = true;
    alternatives = winnerKeyVariants.map((v) => ({
      fieldKey: v.fieldKey,
      entity: v.entity,
      score: v.score,
    }));
  } else if (runnerUp && runnerUp.score > 0) {
    // Different field key — apply the standard cross-entity score proximity check
    const scoreDiff = winner.score - runnerUp.score;
    const differentEntities =
      winner.entity !== undefined &&
      runnerUp.entity !== undefined &&
      winner.entity !== runnerUp.entity;

    if (differentEntities && scoreDiff <= 10) {
      ambiguous = true;
      alternatives = [
        { fieldKey: runnerUp.fieldKey, entity: runnerUp.entity, score: runnerUp.score },
      ];
    }
  }

  return {
    sourceColumn,
    fieldKey: winner.fieldKey,
    targetField: winner.fieldKey,
    confidence: scoreToConfidence(winner.score),
    score: winner.score,
    matchType: winner.matchType,
    ...(ambiguous ? { ambiguous, alternatives } : {}),
  };
}

/**
 * Auto-match all source columns to field definitions.
 * Returns mapping of source columns to their best matches.
 *
 * Ambiguous matches (Feature B) are preserved in results but their targetField
 * is cleared so the UI places them in the "Unassigned" section.
 */
export function autoMatchColumns(
  sourceColumns: string[],
  fieldDefinitions: readonly FieldDefinitionWithAliases[]
): Map<string, MatchResult> {
  const results = new Map<string, MatchResult>();
  const usedFields = new Set<string>();

  // First pass: find all matches (without deduplication) and sort by score
  const allMatches: Array<{ source: string; result: MatchResult }> = [];

  for (const column of sourceColumns) {
    const match = findBestMatch(column, fieldDefinitions, new Set());
    allMatches.push({ source: column, result: match });
  }

  // Sort by score (highest first) to prioritize best matches
  allMatches.sort((a, b) => b.result.score - a.result.score);

  const unassigned: MatchResult = {
    sourceColumn: "",
    fieldKey: null,
    targetField: null,
    confidence: "none",
    score: 0,
    matchType: "none",
  };

  // Second pass: assign matches, preventing duplicates.
  // Ambiguous matches are not claimed — they go to "Unassigned" in the UI.
  for (const { source, result } of allMatches) {
    if (
      result.targetField &&
      !usedFields.has(result.targetField) &&
      result.score >= 50 &&
      !result.ambiguous
    ) {
      usedFields.add(result.targetField);
      results.set(source, result);
    } else if (result.ambiguous) {
      // Keep the full result (with ambiguity info) but clear targetField so
      // the UI puts it in the Unassigned section.
      results.set(source, {
        ...result,
        sourceColumn: source,
        fieldKey: null,
        targetField: null,
      });
    } else {
      // No valid match or field already used
      results.set(source, { ...unassigned, sourceColumn: source });
    }
  }

  return results;
}

/**
 * Convert auto-match results to the field mapping format used by the wizard
 */
export function matchResultsToMapping(results: Map<string, MatchResult>): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const [source, result] of Array.from(results.entries())) {
    if (result.targetField && result.score >= 50) {
      mapping[source] = result.targetField;
    }
  }
  
  return mapping;
}

/**
 * Get statistics about auto-matching results
 */
export function getMatchStatistics(results: Map<string, MatchResult>): {
  total: number;
  matched: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  unmatched: number;
} {
  let matched = 0;
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;

  for (const result of Array.from(results.values())) {
    if (result.targetField) {
      matched++;
      switch (result.confidence) {
        case "high":
          highConfidence++;
          break;
        case "medium":
          mediumConfidence++;
          break;
        case "low":
          lowConfidence++;
          break;
      }
    }
  }

  return {
    total: results.size,
    matched,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    unmatched: results.size - matched,
  };
}
