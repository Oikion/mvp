import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { getOrgOpenAIKey, getOrgOpenAIModel, hasExceededAICredits, trackAICreditsUsage } from "@/lib/org-settings";
import { prismadb } from "@/lib/prisma";

// Property data interface for description generation
interface PropertyData {
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
  renovated_year?: number;
  heating_type?: string;
  furnished?: string;
  condition?: string;
  elevator?: boolean;
  amenities?: string[];
  orientation?: string[];
  energy_cert_class?: string;
  accepts_pets?: boolean;
  monthly_common_charges?: number;
  virtual_tour_url?: string;
  is_exclusive?: boolean;
}

interface RequestBody {
  propertyData: PropertyData;
  imageUrls?: string[];
  language?: "el" | "en";
  tone?: "professional" | "luxury" | "friendly" | "investment";
  propertyId?: string;
}

// Maps for translating enum values to human-readable Greek/English
const PROPERTY_TYPE_LABELS: Record<string, { el: string; en: string }> = {
  APARTMENT: { el: "Διαμέρισμα", en: "Apartment" },
  HOUSE: { el: "Μονοκατοικία", en: "House" },
  MAISONETTE: { el: "Μεζονέτα", en: "Maisonette" },
  COMMERCIAL: { el: "Επαγγελματικός χώρος", en: "Commercial Space" },
  WAREHOUSE: { el: "Αποθήκη", en: "Warehouse" },
  PARKING: { el: "Θέση στάθμευσης", en: "Parking Space" },
  PLOT: { el: "Οικόπεδο", en: "Land Plot" },
  FARM: { el: "Αγροτεμάχιο", en: "Agricultural Land" },
  INDUSTRIAL: { el: "Βιομηχανικός χώρος", en: "Industrial Space" },
  OTHER: { el: "Άλλο", en: "Other" },
};

const TRANSACTION_TYPE_LABELS: Record<string, { el: string; en: string }> = {
  SALE: { el: "Πώληση", en: "Sale" },
  RENTAL: { el: "Ενοικίαση", en: "Rental" },
  SHORT_TERM: { el: "Βραχυχρόνια μίσθωση", en: "Short-term Rental" },
  EXCHANGE: { el: "Αντιπαροχή", en: "Exchange" },
};

const HEATING_TYPE_LABELS: Record<string, { el: string; en: string }> = {
  AUTONOMOUS: { el: "Αυτόνομη", en: "Autonomous" },
  CENTRAL: { el: "Κεντρική", en: "Central" },
  NATURAL_GAS: { el: "Φυσικό αέριο", en: "Natural Gas" },
  HEAT_PUMP: { el: "Αντλία θερμότητας", en: "Heat Pump" },
  ELECTRIC: { el: "Ηλεκτρική", en: "Electric" },
  NONE: { el: "Χωρίς", en: "None" },
};

const CONDITION_LABELS: Record<string, { el: string; en: string }> = {
  EXCELLENT: { el: "Άριστη", en: "Excellent" },
  VERY_GOOD: { el: "Πολύ καλή", en: "Very Good" },
  GOOD: { el: "Καλή", en: "Good" },
  NEEDS_RENOVATION: { el: "Χρειάζεται ανακαίνιση", en: "Needs Renovation" },
};

const AMENITY_LABELS: Record<string, { el: string; en: string }> = {
  AC: { el: "Κλιματισμός", en: "Air Conditioning" },
  FIREPLACE: { el: "Τζάκι", en: "Fireplace" },
  PARKING: { el: "Θέση στάθμευσης", en: "Parking" },
  STORAGE: { el: "Αποθήκη", en: "Storage" },
  SOLAR: { el: "Ηλιακός θερμοσίφωνας", en: "Solar Water Heater" },
  DOUBLE_GLAZING: { el: "Διπλά τζάμια", en: "Double Glazing" },
  VIEW: { el: "Θέα", en: "View" },
  BALCONY: { el: "Μπαλκόνι", en: "Balcony" },
  GARDEN: { el: "Κήπος", en: "Garden" },
  PET_FRIENDLY: { el: "Δέχεται κατοικίδια", en: "Pet Friendly" },
  FRONTAGE: { el: "Πρόσοψη", en: "Street Frontage" },
  ALARM: { el: "Συναγερμός", en: "Alarm System" },
  SECURITY_DOOR: { el: "Πόρτα ασφαλείας", en: "Security Door" },
  ELEVATOR: { el: "Ασανσέρ", en: "Elevator" },
  POOL: { el: "Πισίνα", en: "Swimming Pool" },
  GYM: { el: "Γυμναστήριο", en: "Gym" },
  ATTIC: { el: "Σοφίτα", en: "Attic" },
  BASEMENT: { el: "Υπόγειο", en: "Basement" },
};

const ORIENTATION_LABELS: Record<string, { el: string; en: string }> = {
  NORTH: { el: "Βόρεια", en: "North" },
  SOUTH: { el: "Νότια", en: "South" },
  EAST: { el: "Ανατολικά", en: "East" },
  WEST: { el: "Δυτικά", en: "West" },
  NORTHEAST: { el: "Βορειοανατολικά", en: "Northeast" },
  NORTHWEST: { el: "Βορειοδυτικά", en: "Northwest" },
  SOUTHEAST: { el: "Νοτιοανατολικά", en: "Southeast" },
  SOUTHWEST: { el: "Νοτιοδυτικά", en: "Southwest" },
};

function buildPropertySummary(data: PropertyData, language: "el" | "en"): string {
  const lines: string[] = [];
  const isGreek = language === "el";

  // Property type and transaction
  if (data.property_type) {
    const typeLabel = PROPERTY_TYPE_LABELS[data.property_type]?.[language] || data.property_type;
    const transLabel = data.transaction_type 
      ? TRANSACTION_TYPE_LABELS[data.transaction_type]?.[language] || data.transaction_type
      : "";
    lines.push(`${isGreek ? "Τύπος" : "Type"}: ${typeLabel}${transLabel ? ` (${transLabel})` : ""}`);
  }

  // Location
  const locationParts: string[] = [];
  if (data.area) locationParts.push(data.area);
  if (data.municipality) locationParts.push(data.municipality);
  if (locationParts.length > 0) {
    lines.push(`${isGreek ? "Περιοχή" : "Location"}: ${locationParts.join(", ")}`);
  }

  // Price
  if (data.price) {
    const priceFormatted = new Intl.NumberFormat(isGreek ? "el-GR" : "en-US").format(data.price);
    lines.push(`${isGreek ? "Τιμή" : "Price"}: €${priceFormatted}`);
  }

  // Size
  if (data.size_net_sqm) {
    lines.push(`${isGreek ? "Επιφάνεια" : "Size"}: ${data.size_net_sqm} ${isGreek ? "τ.μ." : "sqm"}`);
  }
  if (data.plot_size_sqm) {
    lines.push(`${isGreek ? "Οικόπεδο" : "Plot Size"}: ${data.plot_size_sqm} ${isGreek ? "τ.μ." : "sqm"}`);
  }

  // Rooms
  if (data.bedrooms !== undefined) {
    lines.push(`${isGreek ? "Υπνοδωμάτια" : "Bedrooms"}: ${data.bedrooms}`);
  }
  if (data.bathrooms !== undefined) {
    lines.push(`${isGreek ? "Μπάνια" : "Bathrooms"}: ${data.bathrooms}`);
  }

  // Floor
  if (data.floor) {
    const floorLabel = data.floor === "GROUND" 
      ? (isGreek ? "Ισόγειο" : "Ground floor")
      : data.floor === "BASEMENT"
      ? (isGreek ? "Υπόγειο" : "Basement")
      : data.floor === "PENTHOUSE"
      ? (isGreek ? "Ρετιρέ" : "Penthouse")
      : `${data.floor.replace(/[^0-9]/g, "")}${isGreek ? "ος όροφος" : "th floor"}`;
    lines.push(`${isGreek ? "Όροφος" : "Floor"}: ${floorLabel}${data.floors_total ? ` / ${data.floors_total}` : ""}`);
  }

  // Year built
  if (data.year_built) {
    lines.push(`${isGreek ? "Έτος κατασκευής" : "Year Built"}: ${data.year_built}`);
  }
  if (data.renovated_year) {
    lines.push(`${isGreek ? "Ανακαίνιση" : "Renovated"}: ${data.renovated_year}`);
  }

  // Condition
  if (data.condition) {
    const condLabel = CONDITION_LABELS[data.condition]?.[language] || data.condition;
    lines.push(`${isGreek ? "Κατάσταση" : "Condition"}: ${condLabel}`);
  }

  // Heating
  if (data.heating_type) {
    const heatLabel = HEATING_TYPE_LABELS[data.heating_type]?.[language] || data.heating_type;
    lines.push(`${isGreek ? "Θέρμανση" : "Heating"}: ${heatLabel}`);
  }

  // Energy class
  if (data.energy_cert_class) {
    lines.push(`${isGreek ? "Ενεργειακή κλάση" : "Energy Class"}: ${data.energy_cert_class.replace("_PLUS", "+")}`);
  }

  // Amenities
  if (data.amenities && data.amenities.length > 0) {
    const amenityLabels = data.amenities.map(a => AMENITY_LABELS[a]?.[language] || a);
    lines.push(`${isGreek ? "Παροχές" : "Amenities"}: ${amenityLabels.join(", ")}`);
  }

  // Orientation
  if (data.orientation && data.orientation.length > 0) {
    const orientLabels = data.orientation.map(o => ORIENTATION_LABELS[o]?.[language] || o);
    lines.push(`${isGreek ? "Προσανατολισμός" : "Orientation"}: ${orientLabels.join(", ")}`);
  }

  // Furnished
  if (data.furnished) {
    const furnishedLabel = data.furnished === "FULLY" 
      ? (isGreek ? "Πλήρως επιπλωμένο" : "Fully Furnished")
      : data.furnished === "PARTIALLY"
      ? (isGreek ? "Μερικώς επιπλωμένο" : "Partially Furnished")
      : (isGreek ? "Χωρίς έπιπλα" : "Unfurnished");
    lines.push(`${isGreek ? "Επίπλωση" : "Furnishing"}: ${furnishedLabel}`);
  }

  // Elevator
  if (data.elevator !== undefined) {
    lines.push(`${isGreek ? "Ασανσέρ" : "Elevator"}: ${data.elevator ? (isGreek ? "Ναι" : "Yes") : (isGreek ? "Όχι" : "No")}`);
  }

  // Pets
  if (data.accepts_pets !== undefined) {
    lines.push(`${isGreek ? "Κατοικίδια" : "Pets"}: ${data.accepts_pets ? (isGreek ? "Επιτρέπονται" : "Allowed") : (isGreek ? "Δεν επιτρέπονται" : "Not Allowed")}`);
  }

  // Common charges
  if (data.monthly_common_charges) {
    lines.push(`${isGreek ? "Κοινόχρηστα" : "Common Charges"}: €${data.monthly_common_charges}/${isGreek ? "μήνα" : "month"}`);
  }

  // Virtual tour
  if (data.virtual_tour_url) {
    lines.push(`${isGreek ? "Διαθέσιμη εικονική περιήγηση" : "Virtual tour available"}`);
  }

  // Exclusive
  if (data.is_exclusive) {
    lines.push(`${isGreek ? "Αποκλειστική ανάθεση" : "Exclusive listing"}`);
  }

  return lines.join("\n");
}

function getSystemPrompt(language: "el" | "en", tone: string): string {
  const isGreek = language === "el";
  
  const toneInstructions: Record<string, { el: string; en: string }> = {
    professional: {
      el: "Γράψε με επαγγελματικό και ξεκάθαρο ύφος, κατάλληλο για σοβαρούς αγοραστές.",
      en: "Write in a professional and clear tone, suitable for serious buyers.",
    },
    luxury: {
      el: "Γράψε με πολυτελές και εκλεπτυσμένο ύφος, τονίζοντας την αποκλειστικότητα και την ποιότητα.",
      en: "Write in a luxurious and sophisticated tone, emphasizing exclusivity and quality.",
    },
    friendly: {
      el: "Γράψε με φιλικό και προσιτό ύφος, κατάλληλο για οικογένειες.",
      en: "Write in a friendly and approachable tone, suitable for families.",
    },
    investment: {
      el: "Γράψε με επενδυτική προοπτική, τονίζοντας την απόδοση και τις δυνατότητες εκμετάλλευσης.",
      en: "Write with an investment perspective, emphasizing returns and potential.",
    },
  };

  const toneText = toneInstructions[tone]?.[language] || toneInstructions.professional[language];

  if (isGreek) {
    return `Είσαι ειδικός συντάκτης περιγραφών ακινήτων για την ελληνική αγορά. Δημιούργησε μια ελκυστική και επαγγελματική περιγραφή ακινήτου βασισμένη στα δεδομένα που θα λάβεις.

ΟΔΗΓΙΕΣ:
1. ${toneText}
2. Η περιγραφή πρέπει να είναι 150-250 λέξεις.
3. Ξεκίνα με ένα δυνατό opening που τραβάει την προσοχή.
4. Τόνισε τα κύρια χαρακτηριστικά και πλεονεκτήματα.
5. Ανέφερε την τοποθεσία και τις γειτονικές υποδομές αν είναι γνωστές.
6. Κλείσε με ένα call-to-action.
7. ΜΗΝ αναφέρεις την τιμή στην περιγραφή.
8. ΜΗΝ χρησιμοποιείς υπερβολές ή ψεύτικους ισχυρισμούς.
9. Χρησιμοποίησε bullet points μόνο αν βελτιώνουν την αναγνωσιμότητα.

Απάντησε ΜΟΝΟ με την περιγραφή, χωρίς τίτλους ή επεξηγήσεις.`;
  }

  return `You are an expert real estate copywriter for the Greek market. Create an attractive and professional property description based on the data provided.

INSTRUCTIONS:
1. ${toneText}
2. The description should be 150-250 words.
3. Start with a strong attention-grabbing opening.
4. Highlight the main features and advantages.
5. Mention the location and nearby amenities if known.
6. Close with a call-to-action.
7. DO NOT mention the price in the description.
8. DO NOT use exaggerations or false claims.
9. Use bullet points only if they improve readability.

Respond ONLY with the description, no titles or explanations.`;
}

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

    // Check AI credits
    const hasExceeded = await hasExceededAICredits(organizationId);
    if (hasExceeded) {
      return NextResponse.json(
        { error: "AI credits limit exceeded. Please contact your administrator." },
        { status: 403 }
      );
    }

    const body: RequestBody = await req.json();
    const { propertyData, imageUrls, language = "el", tone = "professional", propertyId } = body;

    if (!propertyData || Object.keys(propertyData).length === 0) {
      return NextResponse.json(
        { error: "Property data is required" },
        { status: 400 }
      );
    }

    // Get OpenAI API key
    const apiKey = await getOrgOpenAIKey(organizationId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please contact your administrator." },
        { status: 500 }
      );
    }

    // Get model preference
    const model = await getOrgOpenAIModel(organizationId);

    // If propertyId provided, fetch linked images
    let propertyImages: string[] = imageUrls || [];
    if (propertyId && propertyImages.length === 0) {
      const documents = await prismadb.documents.findMany({
        where: {
          organizationId,
          linkedPropertiesIds: { has: propertyId },
          document_file_mimeType: { startsWith: "image/" },
        },
        select: { document_file_url: true },
        orderBy: { date_created: "desc" },
        take: 5, // Limit to 5 images for cost control
      });
      propertyImages = documents.map(d => d.document_file_url).filter(Boolean) as string[];
    }

    const openai = new OpenAI({ apiKey });

    // Build the property summary
    const propertySummary = buildPropertySummary(propertyData, language);

    // Build messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: getSystemPrompt(language, tone) },
    ];

    // Add property data as user message
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      { 
        type: "text", 
        text: language === "el" 
          ? `Δημιούργησε μια περιγραφή για αυτό το ακίνητο:\n\n${propertySummary}`
          : `Create a description for this property:\n\n${propertySummary}` 
      },
    ];

    // Add images if available (using vision capability)
    if (propertyImages.length > 0) {
      // Use GPT-4o for vision if images are provided
      for (const imageUrl of propertyImages.slice(0, 3)) { // Limit to 3 images
        userContent.push({
          type: "image_url",
          image_url: { url: imageUrl, detail: "low" },
        });
      }
      if (language === "el") {
        userContent.push({ 
          type: "text", 
          text: "Χρησιμοποίησε τις παραπάνω φωτογραφίες για να εμπλουτίσεις την περιγραφή με οπτικές λεπτομέρειες." 
        });
      } else {
        userContent.push({ 
          type: "text", 
          text: "Use the above photos to enrich the description with visual details." 
        });
      }
    }

    messages.push({ role: "user", content: userContent });

    // Use vision model if images are provided, otherwise use configured model
    const useVisionModel = propertyImages.length > 0;
    const selectedModel = useVisionModel ? "gpt-4o" : model;

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const description = completion.choices[0]?.message?.content?.trim();
    
    if (!description) {
      return NextResponse.json(
        { error: "Failed to generate description - empty response" },
        { status: 500 }
      );
    }

    // Track AI credit usage (estimate based on tokens)
    const tokensUsed = completion.usage?.total_tokens || 1000;
    const creditsUsed = Math.ceil(tokensUsed / 1000); // 1 credit per 1000 tokens
    await trackAICreditsUsage(organizationId, creditsUsed);

    return NextResponse.json({
      success: true,
      description,
      language,
      tone,
      imagesAnalyzed: propertyImages.length,
      creditsUsed,
    });

  } catch (error) {
    console.error("[AI_GENERATE_PROPERTY_DESCRIPTION]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate property description", details: errorMessage },
      { status: 500 }
    );
  }
}
