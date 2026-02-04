/**
 * Semantic Matcher
 * 
 * Extracts preferences from natural language (client notes, comments)
 * and matches them against property descriptions using AI.
 */

import OpenAI from "openai";
import { getOrgOpenAIKey, getOrgOpenAIModel } from "@/lib/org-settings";
import { getSystemSetting } from "@/lib/system-settings";

export interface ExtractedPreference {
  category: string;
  preference: string;
  importance: "required" | "preferred" | "nice_to_have";
  rawText: string;
}

export interface SemanticMatchResult {
  propertyId: string;
  semanticScore: number;
  matchedPreferences: Array<{
    preference: string;
    matched: boolean;
    evidence?: string;
  }>;
  explanation: string;
}

/**
 * Extract preferences from natural language text (e.g., client notes)
 */
export async function extractPreferencesFromText(
  text: string,
  organizationId: string
): Promise<ExtractedPreference[]> {
  if (!text || text.trim().length < 10) {
    return [];
  }

  let apiKey = await getOrgOpenAIKey(organizationId);
  const modelName = await getOrgOpenAIModel(organizationId);

  if (!apiKey) {
    apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
  }

  if (!apiKey) {
    console.warn("No OpenAI API key available for semantic matching");
    return [];
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are a real estate preference extraction assistant. 
Analyze the following text (client notes, comments, or communication) and extract property preferences.

Return a JSON array of preferences with this structure:
{
  "preferences": [
    {
      "category": "one of: location, size, rooms, amenities, features, condition, price, style",
      "preference": "specific preference description",
      "importance": "required | preferred | nice_to_have",
      "rawText": "the original text snippet this was extracted from"
    }
  ]
}

Examples of preferences to extract:
- "needs ground floor" → category: features, preference: "ground floor access", importance: required
- "prefers shower" → category: amenities, preference: "shower (not bathtub)", importance: preferred
- "likes modern kitchens" → category: style, preference: "modern kitchen", importance: nice_to_have
- "must have parking" → category: amenities, preference: "parking space", importance: required
- "wants sea view" → category: features, preference: "sea view", importance: preferred

Be thorough but only extract actual preferences, not general statements.
If no preferences are found, return {"preferences": []}.`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract preferences from:\n\n${text}` },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    return parsed.preferences || [];
  } catch (error) {
    console.error("Error extracting preferences:", error);
    return [];
  }
}

/**
 * Match extracted preferences against a property description
 */
export async function matchPreferencesToProperty(
  preferences: ExtractedPreference[],
  propertyDescription: string,
  propertyFeatures: Record<string, unknown>,
  organizationId: string
): Promise<{ score: number; matches: Array<{ preference: string; matched: boolean; evidence?: string }> }> {
  if (preferences.length === 0) {
    return { score: 100, matches: [] };
  }

  let apiKey = await getOrgOpenAIKey(organizationId);
  const modelName = await getOrgOpenAIModel(organizationId);

  if (!apiKey) {
    apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
  }

  if (!apiKey) {
    return { score: 50, matches: [] };
  }

  const openai = new OpenAI({ apiKey });

  const preferencesList = preferences
    .map((p) => `- [${p.importance}] ${p.preference} (${p.category})`)
    .join("\n");

  const featuresText = JSON.stringify(propertyFeatures, null, 2);

  const systemPrompt = `You are a real estate matching assistant.
Given a list of client preferences and property information, determine which preferences are satisfied.

Return a JSON object:
{
  "matches": [
    {
      "preference": "the preference text",
      "matched": true/false,
      "evidence": "text from property that confirms/denies this (or null)"
    }
  ],
  "overallScore": 0-100 (weighted by importance: required=50%, preferred=35%, nice_to_have=15%)
}

Scoring guidance:
- If a "required" preference is NOT matched, max score is 40
- If all "required" are matched and most "preferred" are matched, score 70-85
- If all preferences matched, score 90-100`;

  try {
    const completion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Client preferences:\n${preferencesList}\n\nProperty description:\n${propertyDescription}\n\nProperty features:\n${featuresText}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return { score: 50, matches: [] };

    const parsed = JSON.parse(content);
    return {
      score: parsed.overallScore || 50,
      matches: parsed.matches || [],
    };
  } catch (error) {
    console.error("Error matching preferences:", error);
    return { score: 50, matches: [] };
  }
}

/**
 * Get client notes and comments for preference extraction
 */
export async function getClientTextForExtraction(
  clientId: string,
  organizationId: string,
  prisma: any
): Promise<string> {
  const texts: string[] = [];

  // Get client communication notes
  const client = await prisma.clients.findFirst({
    where: { id: clientId, organizationId },
    select: {
      communication_notes: true,
    },
  });

  if (client?.communication_notes) {
    const notes = client.communication_notes as Record<string, unknown>;
    if (typeof notes === "object") {
      texts.push(JSON.stringify(notes));
    }
  }

  // Get client comments
  const comments = await prisma.clientComment.findMany({
    where: {
      clientId,
      organizationId,
    },
    select: {
      content: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  for (const comment of comments) {
    if (comment.content) {
      texts.push(comment.content);
    }
  }

  return texts.join("\n\n---\n\n");
}

/**
 * Full semantic matching pipeline for a client-property pair
 */
export async function performSemanticMatch(
  clientId: string,
  propertyId: string,
  organizationId: string,
  prisma: any
): Promise<SemanticMatchResult | null> {
  try {
    // Get client text
    const clientText = await getClientTextForExtraction(clientId, organizationId, prisma);
    
    if (!clientText || clientText.length < 20) {
      return null; // Not enough text to extract preferences
    }

    // Extract preferences
    const preferences = await extractPreferencesFromText(clientText, organizationId);
    
    if (preferences.length === 0) {
      return null;
    }

    // Get property
    const property = await prisma.properties.findFirst({
      where: { id: propertyId, organizationId },
    });

    if (!property) {
      return null;
    }

    // Build property features object
    const propertyFeatures = {
      type: property.property_type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      size: property.size_net_sqm,
      floor: property.floor,
      elevator: property.elevator,
      furnished: property.furnished,
      heating: property.heating_type,
      condition: property.condition,
      amenities: property.amenities,
      price: property.price,
      area: property.area,
      municipality: property.municipality,
    };

    // Match preferences to property
    const matchResult = await matchPreferencesToProperty(
      preferences,
      property.description || "",
      propertyFeatures,
      organizationId
    );

    // Generate explanation
    const matchedCount = matchResult.matches.filter((m) => m.matched).length;
    const explanation = `Found ${preferences.length} implicit preferences from client notes. ${matchedCount}/${preferences.length} preferences matched with this property.`;

    return {
      propertyId,
      semanticScore: matchResult.score,
      matchedPreferences: matchResult.matches,
      explanation,
    };
  } catch (error) {
    console.error("Error in semantic matching:", error);
    return null;
  }
}

const DEFAULT_MATCH_WEIGHTS = { ruleBased: 0.7, semantic: 0.3 };

/**
 * Combine rule-based and semantic scores
 */
export function combineMatchScores(
  ruleBasedScore: number,
  semanticScore: number | null,
  weights?: { ruleBased: number; semantic: number }
): number {
  if (semanticScore === null) {
    return ruleBasedScore;
  }

  const w = weights ?? DEFAULT_MATCH_WEIGHTS;
  return Math.round(
    ruleBasedScore * w.ruleBased + semanticScore * w.semantic
  );
}
