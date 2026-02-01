import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { getSystemSetting } from "@/lib/system-settings";

// Property types that map to our schema
const PROPERTY_TYPES = [
  "APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE", 
  "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"
] as const;

const TRANSACTION_TYPES = ["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"] as const;

const HEATING_TYPES = [
  "AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"
] as const;

const FURNISHED_STATUS = ["NO", "PARTIALLY", "FULLY"] as const;

const CONDITION_STATUS = ["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"] as const;

// Amenities that can be extracted from voice
const AMENITIES = [
  "AC", "FIREPLACE", "PARKING", "STORAGE", "SOLAR", "DOUBLE_GLAZING",
  "VIEW", "BALCONY", "GARDEN", "PET_FRIENDLY", "FRONTAGE", "ALARM",
  "SECURITY_DOOR", "ELEVATOR", "POOL", "GYM", "ATTIC", "BASEMENT"
] as const;

interface ParsedPropertyData {
  property_name?: string;
  property_type?: typeof PROPERTY_TYPES[number];
  transaction_type?: typeof TRANSACTION_TYPES[number];
  municipality?: string;
  area?: string;
  address_street?: string;
  postal_code?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  size_net_sqm?: number;
  size_gross_sqm?: number;
  floor?: string;
  floors_total?: number;
  plot_size_sqm?: number;
  year_built?: number;
  heating_type?: typeof HEATING_TYPES[number];
  furnished?: typeof FURNISHED_STATUS[number];
  condition?: typeof CONDITION_STATUS[number];
  elevator?: boolean;
  amenities?: string[];
  description?: string;
  confidence: number;
  missing_required: string[];
}

const SYSTEM_PROMPT = `You are a real estate property data extractor for the Greek market. 
Parse the user's voice command and extract structured property data.

IMPORTANT RULES:
1. Extract Greek location names (municipalities, areas, streets) as-is in Greek
2. Convert written numbers to digits (e.g., "δύο" → 2, "εκατό" → 100)
3. Convert price mentions to numbers (e.g., "2 εκατομμύρια" → 2000000, "διακόσιες χιλιάδες" → 200000)
4. Recognize Greek property type words:
   - "διαμέρισμα" → APARTMENT
   - "μονοκατοικία" → HOUSE
   - "μεζονέτα" → MAISONETTE
   - "κατάστημα/γραφείο/επαγγελματικό" → COMMERCIAL
   - "αποθήκη" → WAREHOUSE
   - "parking/θέση στάθμευσης" → PARKING
   - "οικόπεδο" → PLOT
   - "αγροτεμάχιο" → FARM
5. Recognize transaction types:
   - "πώληση/πωλείται/προς πώληση" → SALE
   - "ενοικίαση/ενοικιάζεται/προς ενοικίαση" → RENTAL
6. Extract amenities from descriptions:
   - "τζάκι" → FIREPLACE
   - "συναγερμός/alarm" → ALARM
   - "πόρτα ασφαλείας/θωρακισμένη" → SECURITY_DOOR
   - "ανελκυστήρας/ασανσέρ" → ELEVATOR
   - "μπαλκόνι/βεράντα" → BALCONY
   - "κήπος" → GARDEN
   - "αποθήκη" (as amenity) → STORAGE
   - "parking" (as amenity) → PARKING
   - "κλιματισμός/air condition" → AC
   - "ηλιακός" → SOLAR
   - "πισίνα" → POOL
   - "θέα" → VIEW
   - "διπλά τζάμια" → DOUBLE_GLAZING
7. For "επιπλωμένο": FULLY, "μερικώς επιπλωμένο": PARTIALLY, "χωρίς έπιπλα": NO
8. Generate a descriptive property_name from the data (e.g., "Διαμέρισμα στο Γέρακα")

RESPOND WITH VALID JSON ONLY, no markdown, no explanation.`;

const USER_PROMPT_TEMPLATE = `Parse this voice command for property data:

"{{TRANSCRIPT}}"

Return a JSON object with these fields (include only fields that can be extracted):
{
  "property_name": "string - generated descriptive name",
  "property_type": "APARTMENT|HOUSE|MAISONETTE|COMMERCIAL|WAREHOUSE|PARKING|PLOT|FARM|INDUSTRIAL|OTHER",
  "transaction_type": "SALE|RENTAL|SHORT_TERM|EXCHANGE",
  "municipality": "string - city/municipality name in Greek",
  "area": "string - neighborhood/area name in Greek",
  "address_street": "string - street name and number if mentioned",
  "postal_code": "string - 5 digit postal code if mentioned",
  "price": number,
  "bedrooms": number,
  "bathrooms": number,
  "size_net_sqm": number,
  "size_gross_sqm": number,
  "floor": "string - BASEMENT|GROUND|1ST|2ND|3RD|4TH|5TH|6TH|7TH|8TH|PENTHOUSE",
  "floors_total": number,
  "plot_size_sqm": number,
  "year_built": number,
  "heating_type": "AUTONOMOUS|CENTRAL|NATURAL_GAS|HEAT_PUMP|ELECTRIC|NONE",
  "furnished": "NO|PARTIALLY|FULLY",
  "condition": "EXCELLENT|VERY_GOOD|GOOD|NEEDS_RENOVATION",
  "elevator": boolean,
  "amenities": ["string array from: AC, FIREPLACE, PARKING, STORAGE, SOLAR, DOUBLE_GLAZING, VIEW, BALCONY, GARDEN, PET_FRIENDLY, FRONTAGE, ALARM, SECURITY_DOOR, ELEVATOR, POOL, GYM, ATTIC, BASEMENT"],
  "description": "string - any additional details mentioned",
  "confidence": number between 0-1,
  "missing_required": ["array of important fields that couldn't be extracted"]
}`;

export async function POST(req: Request) {
  try {
    // Verify user is authenticated
    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    // Get OpenAI API key from system settings
    const apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please contact your administrator." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const userPrompt = USER_PROMPT_TEMPLATE.replace("{{TRANSCRIPT}}", transcript);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1, // Low temperature for more consistent parsing
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      return NextResponse.json(
        { error: "Failed to parse voice command - empty response" },
        { status: 500 }
      );
    }

    let parsedData: ParsedPropertyData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse OpenAI response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse voice command - invalid response format" },
        { status: 500 }
      );
    }

    // Validate and sanitize the parsed data
    const sanitizedData = sanitizePropertyData(parsedData);

    return NextResponse.json({
      success: true,
      data: sanitizedData,
      originalTranscript: transcript,
    });

  } catch (error) {
    console.error("[VOICE_PARSE_PROPERTY]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to parse voice command", details: errorMessage },
      { status: 500 }
    );
  }
}

function sanitizePropertyData(data: ParsedPropertyData): ParsedPropertyData {
  const sanitized: ParsedPropertyData = {
    confidence: data.confidence ?? 0.5,
    missing_required: data.missing_required ?? [],
  };

  // Validate property_type
  if (data.property_type && PROPERTY_TYPES.includes(data.property_type as any)) {
    sanitized.property_type = data.property_type;
  }

  // Validate transaction_type
  if (data.transaction_type && TRANSACTION_TYPES.includes(data.transaction_type as any)) {
    sanitized.transaction_type = data.transaction_type;
  }

  // String fields
  if (data.property_name && typeof data.property_name === "string") {
    sanitized.property_name = data.property_name.trim();
  }
  if (data.municipality && typeof data.municipality === "string") {
    sanitized.municipality = data.municipality.trim();
  }
  if (data.area && typeof data.area === "string") {
    sanitized.area = data.area.trim();
  }
  if (data.address_street && typeof data.address_street === "string") {
    sanitized.address_street = data.address_street.trim();
  }
  if (data.postal_code && typeof data.postal_code === "string") {
    // Remove non-digit characters to extract postal code
    const pc = data.postal_code.replace(/\D/g, "");
    if (pc.length === 5) {
      sanitized.postal_code = pc;
    }
  }
  if (data.description && typeof data.description === "string") {
    sanitized.description = data.description.trim();
  }

  // Number fields
  if (typeof data.price === "number" && data.price > 0) {
    sanitized.price = Math.round(data.price);
  }
  if (typeof data.bedrooms === "number" && data.bedrooms >= 0) {
    sanitized.bedrooms = Math.round(data.bedrooms);
  }
  if (typeof data.bathrooms === "number" && data.bathrooms >= 0) {
    sanitized.bathrooms = data.bathrooms;
  }
  if (typeof data.size_net_sqm === "number" && data.size_net_sqm > 0) {
    sanitized.size_net_sqm = Math.round(data.size_net_sqm);
  }
  if (typeof data.size_gross_sqm === "number" && data.size_gross_sqm > 0) {
    sanitized.size_gross_sqm = Math.round(data.size_gross_sqm);
  }
  if (typeof data.plot_size_sqm === "number" && data.plot_size_sqm > 0) {
    sanitized.plot_size_sqm = Math.round(data.plot_size_sqm);
  }
  if (typeof data.floors_total === "number" && data.floors_total > 0) {
    sanitized.floors_total = Math.round(data.floors_total);
  }
  if (typeof data.year_built === "number" && data.year_built > 1800 && data.year_built <= new Date().getFullYear()) {
    sanitized.year_built = Math.round(data.year_built);
  }

  // Floor validation
  const validFloors = ["BASEMENT", "GROUND", "1ST", "2ND", "3RD", "4TH", "5TH", "6TH", "7TH", "8TH", "9TH", "10TH", "PENTHOUSE"];
  if (data.floor && validFloors.includes(data.floor)) {
    sanitized.floor = data.floor;
  }

  // Enum validations
  if (data.heating_type && HEATING_TYPES.includes(data.heating_type as any)) {
    sanitized.heating_type = data.heating_type;
  }
  if (data.furnished && FURNISHED_STATUS.includes(data.furnished as any)) {
    sanitized.furnished = data.furnished;
  }
  if (data.condition && CONDITION_STATUS.includes(data.condition as any)) {
    sanitized.condition = data.condition;
  }

  // Boolean
  if (typeof data.elevator === "boolean") {
    sanitized.elevator = data.elevator;
  }

  // Amenities - filter to valid values
  if (Array.isArray(data.amenities)) {
    sanitized.amenities = data.amenities.filter(
      (a) => AMENITIES.includes(a as any)
    );
  }

  return sanitized;
}
