import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { getOrgOpenAIKey, getOrgOpenAIModel } from "@/lib/org-settings";
import { getSystemSetting } from "@/lib/system-settings";

// ============================================
// Types
// ============================================

interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ParsedPropertyData {
  property_name?: string;
  property_type?: string;
  transaction_type?: string;
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
  heating_type?: string;
  furnished?: string;
  condition?: string;
  elevator?: boolean;
  amenities?: string[];
  description?: string;
}

interface ConversationState {
  phase: "initial" | "gathering" | "followup" | "confirm" | "complete";
  collectedData: ParsedPropertyData;
  missingRequired: string[];
  conversationHistory: ConversationMessage[];
}

// ============================================
// Constants
// ============================================

const REQUIRED_FIELDS = ["property_type", "transaction_type", "municipality"];

// Property-type-specific important fields configuration
// This ensures we ask contextually relevant questions based on the property type
const IMPORTANT_FIELDS_BY_TYPE: Record<string, string[]> = {
  // Apartments: floor number is relevant
  APARTMENT: ["price", "bedrooms", "size_net_sqm", "floor", "year_built", "heating_type", "condition"],
  
  // Detached houses: ask about number of floors and plot size, NOT floor number
  HOUSE: ["price", "bedrooms", "size_net_sqm", "floors_total", "plot_size_sqm", "year_built", "heating_type", "condition"],
  
  // Maisonettes: similar to houses - multiple floors, may have plot
  MAISONETTE: ["price", "bedrooms", "size_net_sqm", "floors_total", "plot_size_sqm", "year_built", "heating_type", "condition"],
  
  // Commercial: floor can be relevant, plus frontage
  COMMERCIAL: ["price", "size_net_sqm", "floor", "year_built", "heating_type", "condition"],
  
  // Warehouse: floor/level might matter, no bedrooms
  WAREHOUSE: ["price", "size_net_sqm", "floor", "year_built", "condition"],
  
  // Parking: just location and size
  PARKING: ["price", "size_net_sqm", "floor"],
  
  // Plot/Land: only plot size and price, no building attributes
  PLOT: ["price", "plot_size_sqm"],
  
  // Farm/Agricultural land: plot size and land characteristics
  FARM: ["price", "plot_size_sqm"],
  
  // Industrial: size and condition
  INDUSTRIAL: ["price", "size_net_sqm", "plot_size_sqm", "year_built", "condition"],
  
  // Default/Other: basic residential fields without floor
  OTHER: ["price", "bedrooms", "size_net_sqm", "year_built", "heating_type", "condition"],
};

// Default fields when property type is not yet known
const DEFAULT_IMPORTANT_FIELDS = ["price", "bedrooms", "size_net_sqm", "year_built", "heating_type", "condition"];

const FIELD_PROMPTS: Record<string, string> = {
  property_type: "Τι τύπο ακινήτου έχετε; Διαμέρισμα, μονοκατοικία, μεζονέτα, επαγγελματικό χώρο;",
  transaction_type: "Είναι για πώληση ή ενοικίαση;",
  municipality: "Σε ποιον δήμο ή περιοχή βρίσκεται το ακίνητο;",
  price: "Ποια είναι η τιμή που ζητάτε;",
  bedrooms: "Πόσα υπνοδωμάτια έχει;",
  bathrooms: "Πόσα μπάνια έχει;",
  size_net_sqm: "Πόσα τετραγωνικά μέτρα είναι;",
  floor: "Σε ποιον όροφο βρίσκεται;",
  floors_total: "Πόσους ορόφους έχει το σπίτι;",
  plot_size_sqm: "Πόσα τετραγωνικά μέτρα είναι το οικόπεδο;",
  year_built: "Τι έτος κατασκευής είναι;",
  heating_type: "Τι τύπο θέρμανσης έχει; Αυτόνομη, κεντρική, φυσικό αέριο;",
  condition: "Σε τι κατάσταση βρίσκεται; Άριστη, πολύ καλή, καλή ή χρειάζεται ανακαίνιση;",
  furnished: "Είναι επιπλωμένο;",
  amenities: "Έχει κάποιες ιδιαίτερες παροχές; Τζάκι, κλιματισμό, πάρκινγκ, αποθήκη;",
};

const SYSTEM_PROMPT = `Είσαι φιλικός βοηθός κτηματομεσίτη που βοηθά στην καταχώρηση ακινήτων. Έχεις γνώση του ελληνικού κτηματομεσιτικού τομέα.

ΚΑΝΟΝΕΣ:
1. Μίλα πάντα στα Ελληνικά με φιλικό, επαγγελματικό τρόπο
2. Κράτα τις απαντήσεις σου σύντομες (1-2 προτάσεις το πολύ)
3. Ρώτα για ένα πράγμα τη φορά
4. Όταν ο χρήστης δώσει πληροφορίες, αναγνώρισέ τες και ρώτα για το επόμενο
5. Αν ο χρήστης περιγράψει πολλά πράγματα μαζί, επιβεβαίωσέ τα όλα

ΠΟΛΥ ΣΗΜΑΝΤΙΚΟ - ΚΑΤΑΝΟΗΣΗ ΤΥΠΟΥ ΑΚΙΝΗΤΟΥ:
Πρέπει να καταλαβαίνεις τον τύπο ακινήτου και να κάνεις ΜΟΝΟ σχετικές ερωτήσεις:

• ΜΟΝΟΚΑΤΟΙΚΙΑ (HOUSE): 
  - ΜΗΝ ρωτάς "σε ποιον όροφο βρίσκεται" - δεν έχει νόημα!
  - Ρώτα "πόσους ορόφους έχει το σπίτι" (floors_total)
  - Ρώτα για το μέγεθος οικοπέδου (plot_size_sqm)

• ΜΕΖΟΝΕΤΑ (MAISONETTE):
  - Όπως μονοκατοικία - ρώτα πόσους ορόφους έχει, όχι σε ποιον όροφο

• ΔΙΑΜΕΡΙΣΜΑ (APARTMENT):
  - Εδώ ο όροφος (floor) είναι σχετικός
  - ΜΗΝ ρωτάς για οικόπεδο

• ΟΙΚΟΠΕΔΟ/ΑΓΡΟΤΕΜΑΧΙΟ (PLOT/FARM):
  - ΜΗΝ ρωτάς για υπνοδωμάτια, θέρμανση, κατάσταση - δεν υπάρχει κτίσμα!
  - Ρώτα μόνο τιμή και μέγεθος οικοπέδου

• PARKING:
  - ΜΗΝ ρωτάς για υπνοδωμάτια ή θέρμανση

• ΕΠΑΓΓΕΛΜΑΤΙΚΟΣ ΧΩΡΟΣ/ΑΠΟΘΗΚΗ:
  - ΜΗΝ ρωτάς για υπνοδωμάτια

ΜΟΡΦΗ ΑΠΑΝΤΗΣΗΣ:
Πρέπει να απαντάς ΜΟΝΟ με ένα JSON object:
{
  "spoken_response": "Η φράση που θα πει ο βοηθός φωνητικά (σύντομη και φυσική)",
  "extracted_data": { ... δεδομένα που εξήχθησαν από τον χρήστη ... },
  "next_field": "το επόμενο πεδίο που πρέπει να ρωτήσουμε ή null αν τελειώσαμε",
  "is_complete": true/false αν έχουμε αρκετά δεδομένα για καταχώρηση
}

ΔΙΑΘΕΣΙΜΑ ΠΕΔΙΑ (για extracted_data):
- property_type: "APARTMENT" | "HOUSE" | "MAISONETTE" | "COMMERCIAL" | "WAREHOUSE" | "PARKING" | "PLOT" | "FARM" | "INDUSTRIAL" | "OTHER"
- transaction_type: "SALE" | "RENTAL" | "SHORT_TERM" | "EXCHANGE"
- municipality: string (όνομα δήμου)
- area: string (περιοχή)
- address_street: string (διεύθυνση)
- postal_code: string
- price: number (σε ευρώ)
- bedrooms: number (ΜΟΝΟ για κατοικίες, όχι για οικόπεδα/parking/αποθήκες)
- bathrooms: number
- size_net_sqm: number (τετραγωνικά μέτρα κτίσματος)
- size_gross_sqm: number
- floor: "BASEMENT" | "GROUND" | "1ST" | "2ND" | ... | "PENTHOUSE" (ΜΟΝΟ για διαμερίσματα/επαγγελματικούς χώρους, ΟΧΙ για μονοκατοικίες)
- floors_total: number (πόσους ορόφους έχει το κτίριο - για μονοκατοικίες/μεζονέτες)
- plot_size_sqm: number (μέγεθος οικοπέδου - για μονοκατοικίες/οικόπεδα/αγροτεμάχια)
- year_built: number
- heating_type: "AUTONOMOUS" | "CENTRAL" | "NATURAL_GAS" | "HEAT_PUMP" | "ELECTRIC" | "NONE"
- furnished: "NO" | "PARTIALLY" | "FULLY"
- condition: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "NEEDS_RENOVATION"
- elevator: boolean
- amenities: ["AC", "FIREPLACE", "PARKING", "STORAGE", "SOLAR", "DOUBLE_GLAZING", "VIEW", "BALCONY", "GARDEN", "PET_FRIENDLY", "FRONTAGE", "ALARM", "SECURITY_DOOR", "POOL", "GYM", "ATTIC", "BASEMENT"]

ΥΠΟΧΡΕΩΤΙΚΑ ΠΕΔΙΑ: property_type, transaction_type, municipality

Αν ο χρήστης δεν έχει δώσει τα υποχρεωτικά πεδία, ρώτα γι' αυτά πρώτα. Μετά ρώτα για τα σχετικά με τον τύπο ακινήτου πεδία. Όταν έχεις αρκετά δεδομένα, ρώτα αν θέλει να προσθέσει κάτι άλλο ή να ολοκληρώσει.`;

// ============================================
// Helper Functions
// ============================================

function getMissingRequiredFields(data: ParsedPropertyData): string[] {
  return REQUIRED_FIELDS.filter((field) => !data[field as keyof ParsedPropertyData]);
}

function getMissingImportantFields(data: ParsedPropertyData): string[] {
  // Get the appropriate fields based on property type
  const propertyType = data.property_type?.toUpperCase();
  const relevantFields = propertyType && IMPORTANT_FIELDS_BY_TYPE[propertyType]
    ? IMPORTANT_FIELDS_BY_TYPE[propertyType]
    : DEFAULT_IMPORTANT_FIELDS;
  
  return relevantFields.filter((field) => !data[field as keyof ParsedPropertyData]);
}

// Helper to get contextual field hints for the AI
function getPropertyTypeContext(propertyType: string | undefined): string {
  if (!propertyType) return "";
  
  const type = propertyType.toUpperCase();
  switch (type) {
    case "HOUSE":
      return "Για μονοκατοικία, ΜΗΝ ρωτάς σε ποιον όροφο βρίσκεται - αυτό δεν έχει νόημα. Ρώτα πόσους ορόφους έχει το σπίτι (floors_total) και το μέγεθος του οικοπέδου (plot_size_sqm).";
    case "MAISONETTE":
      return "Για μεζονέτα, ρώτα πόσους ορόφους έχει (floors_total) αντί για όροφο. Μπορεί να έχει και οικόπεδο.";
    case "APARTMENT":
      return "Για διαμέρισμα, ο όροφος (floor) είναι σημαντικός.";
    case "PLOT":
    case "FARM":
      return "Για οικόπεδο/αγροτεμάχιο, ΜΗΝ ρωτάς για υπνοδωμάτια, θέρμανση ή κατάσταση - δεν υπάρχει κτίσμα. Ρώτα μόνο για τιμή και μέγεθος οικοπέδου.";
    case "PARKING":
      return "Για θέση στάθμευσης, ρώτα μόνο για τιμή, μέγεθος και αν είναι υπόγειο/ισόγειο.";
    case "COMMERCIAL":
    case "WAREHOUSE":
      return "Για επαγγελματικό χώρο/αποθήκη, ΜΗΝ ρωτάς για υπνοδωμάτια.";
    default:
      return "";
  }
}

function buildContextMessage(state: ConversationState): string {
  const parts: string[] = [];

  if (Object.keys(state.collectedData).length > 0) {
    parts.push(`ΔΕΔΟΜΕΝΑ ΠΟΥ ΕΧΟΥΝ ΣΥΛΛΕΧΘΕΙ: ${JSON.stringify(state.collectedData)}`);
  }

  // Add property type-specific context if we know the property type
  const propertyTypeContext = getPropertyTypeContext(state.collectedData.property_type);
  if (propertyTypeContext) {
    parts.push(`ΟΔΗΓΙΑ ΓΙΑ ΑΥΤΟΝ ΤΟΝ ΤΥΠΟ: ${propertyTypeContext}`);
  }

  const missingRequired = getMissingRequiredFields(state.collectedData);
  if (missingRequired.length > 0) {
    parts.push(`ΥΠΟΧΡΕΩΤΙΚΑ ΠΟΥ ΛΕΙΠΟΥΝ: ${missingRequired.join(", ")}`);
  }

  // Get context-aware missing important fields based on property type
  const missingImportant = getMissingImportantFields(state.collectedData);
  if (missingImportant.length > 0) {
    parts.push(`ΣΧΕΤΙΚΑ ΠΕΔΙΑ ΠΟΥ ΛΕΙΠΟΥΝ (για αυτόν τον τύπο ακινήτου): ${missingImportant.join(", ")}`);
  }

  parts.push(`ΦΑΣΗ: ${state.phase}`);

  return parts.join("\n");
}

function mergeData(existing: ParsedPropertyData, newData: ParsedPropertyData): ParsedPropertyData {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(newData)) {
    if (value !== undefined && value !== null && value !== "") {
      (merged as any)[key] = value;
    }
  }

  // Merge amenities arrays
  if (newData.amenities && Array.isArray(newData.amenities)) {
    const existingAmenities = existing.amenities || [];
    merged.amenities = [...new Set([...existingAmenities, ...newData.amenities])];
  }

  return merged;
}

// ============================================
// API Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userMessage, conversationState } = body;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "User message is required" }, { status: 400 });
    }

    // Get organization ID for org-specific settings
    const organizationId = await getCurrentOrgIdSafe();

    // Get OpenAI API key (org-specific > system settings > environment variable)
    let apiKey: string | null = null;
    let modelName = "gpt-4o-mini";

    if (organizationId) {
      apiKey = await getOrgOpenAIKey(organizationId);
      modelName = await getOrgOpenAIModel(organizationId);
    }

    // Fallback to system/env if no org key
    if (!apiKey) {
      apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
    }

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Initialize or restore conversation state
    const state: ConversationState = conversationState || {
      phase: "initial",
      collectedData: {},
      missingRequired: REQUIRED_FIELDS,
      conversationHistory: [],
    };

    // Add context message about current state
    const contextMessage = buildContextMessage(state);

    // Build messages for OpenAI - only include user/assistant messages from history
    const historyMessages = state.conversationHistory
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextMessage },
      ...historyMessages,
      { role: "user", content: userMessage },
    ];

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from AI");
    }

    // Parse the response
    let aiResponse: {
      spoken_response: string;
      extracted_data: ParsedPropertyData;
      next_field: string | null;
      is_complete: boolean;
    };

    try {
      aiResponse = JSON.parse(responseContent);
    } catch {
      // If parsing fails, create a default response
      aiResponse = {
        spoken_response: "Συγγνώμη, δεν κατάλαβα. Μπορείτε να επαναλάβετε;",
        extracted_data: {},
        next_field: null,
        is_complete: false,
      };
    }

    // Merge new data with existing
    const updatedData = mergeData(state.collectedData, aiResponse.extracted_data || {});

    // Update conversation history
    const updatedHistory: ConversationMessage[] = [
      ...state.conversationHistory,
      { role: "user", content: userMessage },
      { role: "assistant", content: aiResponse.spoken_response },
    ];

    // Determine new phase
    const missingRequired = getMissingRequiredFields(updatedData);
    const missingImportant = getMissingImportantFields(updatedData);

    let newPhase: ConversationState["phase"] = state.phase;
    if (missingRequired.length > 0) {
      newPhase = "gathering";
    } else if (missingImportant.length > 0) {
      newPhase = "followup";
    } else if (aiResponse.is_complete) {
      newPhase = "confirm";
    }

    // Build updated state
    const updatedState: ConversationState = {
      phase: newPhase,
      collectedData: updatedData,
      missingRequired,
      conversationHistory: updatedHistory,
    };

    return NextResponse.json({
      success: true,
      spokenResponse: aiResponse.spoken_response,
      extractedData: aiResponse.extracted_data,
      collectedData: updatedData,
      nextField: aiResponse.next_field,
      isComplete: aiResponse.is_complete && missingRequired.length === 0,
      missingRequired,
      missingImportant,
      conversationState: updatedState,
    });
  } catch (error: any) {
    console.error("Conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process conversation" },
      { status: 500 }
    );
  }
}

// Start conversation endpoint
export async function GET() {
  // Return initial greeting and state
  const initialState: ConversationState = {
    phase: "initial",
    collectedData: {},
    missingRequired: REQUIRED_FIELDS,
    conversationHistory: [],
  };

  const greeting =
    "Γεια σας! Είμαι έτοιμος να σας βοηθήσω να καταχωρήσετε ένα ακίνητο. Πείτε μου για ποιο ακίνητο πρόκειται;";

  return NextResponse.json({
    success: true,
    spokenResponse: greeting,
    conversationState: initialState,
  });
}
