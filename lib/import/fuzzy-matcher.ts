/**
 * Fuzzy Matcher Utility for Import Column Mapping
 * 
 * Provides intelligent auto-matching of CSV column headers to target fields
 * using Levenshtein distance, alias matching, and confidence scoring.
 */

export type MatchConfidence = "high" | "medium" | "low" | "none";

export interface MatchResult {
  sourceColumn: string;
  targetField: string | null;
  confidence: MatchConfidence;
  score: number; // 0-100
  matchType: "exact" | "alias" | "fuzzy" | "partial" | "none";
}

export interface FieldDefinitionWithAliases {
  key: string;
  required: boolean;
  group: string;
  aliases?: string[];
  description?: string;
}

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
 * Find the best match for a single source column against all field definitions
 */
export function findBestMatch(
  sourceColumn: string,
  fieldDefinitions: readonly FieldDefinitionWithAliases[],
  usedFields: Set<string>
): MatchResult {
  const normalizedSource = normalizeString(sourceColumn);
  
  let bestMatch: MatchResult = {
    sourceColumn,
    targetField: null,
    confidence: "none",
    score: 0,
    matchType: "none",
  };

  for (const field of fieldDefinitions) {
    // Skip already used fields
    if (usedFields.has(field.key)) continue;

    const normalizedKey = normalizeString(field.key);
    let score = 0;
    let matchType: MatchResult["matchType"] = "none";

    // 1. Exact match (after normalization)
    if (normalizedSource === normalizedKey) {
      score = 100;
      matchType = "exact";
    }
    // 2. Alias match
    else if (field.aliases?.some(alias => normalizeString(alias) === normalizedSource)) {
      score = 95;
      matchType = "alias";
    }
    // 3. High similarity (Levenshtein)
    else {
      const similarity = calculateSimilarity(normalizedSource, normalizedKey);
      
      // Also check similarity against aliases
      const aliasSimilarities = field.aliases?.map(alias => 
        calculateSimilarity(normalizedSource, normalizeString(alias))
      ) || [];
      
      const maxSimilarity = Math.max(similarity, ...aliasSimilarities);
      
      if (maxSimilarity >= 80) {
        score = Math.round(maxSimilarity * 0.85); // Scale down a bit
        matchType = "fuzzy";
      }
      // 4. Partial match (key terms)
      else if (containsKeyTerms(normalizedSource, normalizedKey)) {
        score = 70;
        matchType = "partial";
      }
      // Also check key terms against aliases
      else if (field.aliases?.some(alias => containsKeyTerms(normalizedSource, normalizeString(alias)))) {
        score = 65;
        matchType = "partial";
      }
    }

    // Update best match if this is better
    if (score > bestMatch.score) {
      bestMatch = {
        sourceColumn,
        targetField: field.key,
        confidence: scoreToConfidence(score),
        score,
        matchType,
      };
    }
  }

  return bestMatch;
}

/**
 * Auto-match all source columns to field definitions
 * Returns mapping of source columns to their best matches
 */
export function autoMatchColumns(
  sourceColumns: string[],
  fieldDefinitions: readonly FieldDefinitionWithAliases[]
): Map<string, MatchResult> {
  const results = new Map<string, MatchResult>();
  const usedFields = new Set<string>();

  // First pass: find all matches and sort by score
  const allMatches: Array<{ source: string; result: MatchResult }> = [];
  
  for (const column of sourceColumns) {
    const match = findBestMatch(column, fieldDefinitions, new Set());
    allMatches.push({ source: column, result: match });
  }

  // Sort by score (highest first) to prioritize best matches
  allMatches.sort((a, b) => b.result.score - a.result.score);

  // Second pass: assign matches, preventing duplicates
  for (const { source, result } of allMatches) {
    if (result.targetField && !usedFields.has(result.targetField) && result.score >= 50) {
      usedFields.add(result.targetField);
      results.set(source, result);
    } else {
      // No valid match or field already used
      results.set(source, {
        sourceColumn: source,
        targetField: null,
        confidence: "none",
        score: 0,
        matchType: "none",
      });
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



