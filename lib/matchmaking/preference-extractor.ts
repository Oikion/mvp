// @ts-nocheck
// TODO: Fix type errors
/**
 * Preference Extractor
 * 
 * Utilities for extracting and normalizing property preferences
 * from various text sources.
 */

/**
 * Common preference patterns to look for in text
 */
export const PREFERENCE_PATTERNS = {
  // Bathroom preferences
  shower: /\b(shower|ντους|ντουζ)\b/i,
  bathtub: /\b(bath ?tub|μπανιέρα|tub)\b/i,
  
  // Floor preferences  
  groundFloor: /\b(ground ?floor|ισόγειο|ισογείου|first ?floor)\b/i,
  highFloor: /\b(high ?floor|ψηλά|upper ?floor|penthouse)\b/i,
  
  // Outdoor preferences
  balcony: /\b(balcony|μπαλκόνι|βεράντα|terrace)\b/i,
  garden: /\b(garden|κήπος|yard|αυλή)\b/i,
  
  // Parking
  parking: /\b(parking|πάρκινγκ|garage|γκαράζ)\b/i,
  
  // Views
  seaView: /\b(sea ?view|θέα ?θάλασσα|ocean ?view)\b/i,
  mountainView: /\b(mountain ?view|θέα ?βουνό)\b/i,
  cityView: /\b(city ?view|θέα ?πόλη)\b/i,
  
  // Style
  modern: /\b(modern|μοντέρνο|contemporary|σύγχρονο)\b/i,
  traditional: /\b(traditional|παραδοσιακό|classic|κλασικό)\b/i,
  
  // Condition
  renovated: /\b(renovated|ανακαινισμένο|refurbished|newly ?renovated)\b/i,
  newBuild: /\b(new ?build|νεόδμητο|brand ?new|καινούργιο)\b/i,
  
  // Features
  elevator: /\b(elevator|ασανσέρ|lift)\b/i,
  airConditioning: /\b(air ?conditioning|κλιματισμός|AC|a\/c)\b/i,
  heating: /\b(central ?heating|θέρμανση|autonomous ?heating|αυτόνομη)\b/i,
  fireplace: /\b(fireplace|τζάκι)\b/i,
  storage: /\b(storage|αποθήκη|cellar)\b/i,
  
  // Pet related
  petFriendly: /\b(pet ?friendly|δεκτά ?κατοικίδια|pets ?allowed)\b/i,
  
  // Noise/quiet
  quiet: /\b(quiet|ήσυχο|peaceful|ησυχία)\b/i,
  
  // Light
  bright: /\b(bright|φωτεινό|sunny|ηλιόλουστο|natural ?light)\b/i,
};

/**
 * Importance indicators in text
 */
export const IMPORTANCE_INDICATORS = {
  required: [
    /\bmust\b/i,
    /\bneed(s)?\b/i,
    /\brequire(s|d)?\b/i,
    /\bessential\b/i,
    /\bmandatory\b/i,
    /\bπρέπει\b/i,
    /\bαπαραίτητο\b/i,
    /\bοπωσδήποτε\b/i,
  ],
  preferred: [
    /\bprefer(s)?\b/i,
    /\bwant(s)?\b/i,
    /\bwould like\b/i,
    /\bideally\b/i,
    /\bθα ?ήθελε?\b/i,
    /\bπροτιμά\b/i,
  ],
  negative: [
    /\bno\b/i,
    /\bnot\b/i,
    /\bdon'?t\b/i,
    /\bdoesn'?t\b/i,
    /\bavoid\b/i,
    /\bχωρίς\b/i,
    /\bόχι\b/i,
    /\bδεν\b/i,
  ],
};

export interface QuickExtractedPreference {
  type: string;
  value: boolean;
  importance: "required" | "preferred" | "nice_to_have";
  isNegative: boolean;
}

/**
 * Quick pattern-based preference extraction (no AI required)
 * Use this for fast, lightweight extraction before AI enhancement
 */
export function quickExtractPreferences(text: string): QuickExtractedPreference[] {
  const preferences: QuickExtractedPreference[] = [];
  const sentences = text.split(/[.!?\n]+/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 5) continue;

    // Check each pattern
    for (const [type, pattern] of Object.entries(PREFERENCE_PATTERNS)) {
      if (pattern.test(trimmed)) {
        // Determine importance
        let importance: "required" | "preferred" | "nice_to_have" = "nice_to_have";
        
        for (const reqPattern of IMPORTANCE_INDICATORS.required) {
          if (reqPattern.test(trimmed)) {
            importance = "required";
            break;
          }
        }
        
        if (importance === "nice_to_have") {
          for (const prefPattern of IMPORTANCE_INDICATORS.preferred) {
            if (prefPattern.test(trimmed)) {
              importance = "preferred";
              break;
            }
          }
        }

        // Check for negative
        let isNegative = false;
        for (const negPattern of IMPORTANCE_INDICATORS.negative) {
          if (negPattern.test(trimmed)) {
            isNegative = true;
            break;
          }
        }

        preferences.push({
          type,
          value: !isNegative,
          importance,
          isNegative,
        });
      }
    }
  }

  // Deduplicate by type, keeping highest importance
  const deduped = new Map<string, QuickExtractedPreference>();
  const importanceOrder = { required: 3, preferred: 2, nice_to_have: 1 };

  for (const pref of preferences) {
    const existing = deduped.get(pref.type);
    if (!existing || importanceOrder[pref.importance] > importanceOrder[existing.importance]) {
      deduped.set(pref.type, pref);
    }
  }

  return Array.from(deduped.values());
}

/**
 * Convert quick extracted preferences to structured format
 */
export function formatQuickPreferences(
  preferences: QuickExtractedPreference[]
): Record<string, { value: boolean; importance: string }> {
  const result: Record<string, { value: boolean; importance: string }> = {};

  for (const pref of preferences) {
    result[pref.type] = {
      value: pref.value,
      importance: pref.importance,
    };
  }

  return result;
}

/**
 * Check if a property matches quick-extracted preferences
 */
export function matchQuickPreferences(
  preferences: QuickExtractedPreference[],
  property: {
    elevator?: boolean;
    floor?: string;
    amenities?: Record<string, unknown>;
    description?: string;
    furnished?: string;
    heating_type?: string;
    condition?: string;
  }
): { matched: number; total: number; score: number } {
  let matched = 0;
  let total = 0;
  let weightedScore = 0;
  let maxScore = 0;

  const weights = { required: 3, preferred: 2, nice_to_have: 1 };

  for (const pref of preferences) {
    const weight = weights[pref.importance];
    maxScore += weight;
    total++;

    let isMatched = false;

    // Check specific preference types
    switch (pref.type) {
      case "elevator":
        isMatched = property.elevator === pref.value;
        break;
      case "groundFloor":
        isMatched = (property.floor === "0" || property.floor?.toLowerCase().includes("ground")) === pref.value;
        break;
      case "renovated":
      case "newBuild":
        isMatched = property.condition?.toLowerCase().includes("excellent") || 
                    property.condition?.toLowerCase().includes("very_good");
        break;
      default:
        // Check in amenities or description
        if (property.amenities && typeof property.amenities === "object") {
          const amenitiesStr = JSON.stringify(property.amenities).toLowerCase();
          isMatched = amenitiesStr.includes(pref.type.toLowerCase()) === pref.value;
        }
        if (!isMatched && property.description) {
          const pattern = PREFERENCE_PATTERNS[pref.type as keyof typeof PREFERENCE_PATTERNS];
          if (pattern) {
            isMatched = pattern.test(property.description) === pref.value;
          }
        }
    }

    if (isMatched) {
      matched++;
      weightedScore += weight;
    }
  }

  return {
    matched,
    total,
    score: maxScore > 0 ? Math.round((weightedScore / maxScore) * 100) : 100,
  };
}
