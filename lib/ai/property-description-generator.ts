type PropertyDescriptionInput = {
  propertyName?: string;
  propertyType?: string;
  transactionType?: string;
  municipality?: string;
  area?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sizeNetSqm?: number;
  tone?: "professional" | "luxury" | "friendly";
  length?: "short" | "medium" | "long";
  includeEmotionalAppeal?: boolean;
  targetAudience?: "buyers" | "investors" | "renters";
};

type PropertyRecord = {
  property_name?: string | null;
  property_type?: string | null;
  transaction_type?: string | null;
  municipality?: string | null;
  area?: string | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_net_sqm?: number | null;
};

const LENGTH_SENTENCE_TARGET: Record<NonNullable<PropertyDescriptionInput["length"]>, number> =
  {
    short: 4,
    medium: 6,
    long: 8,
  };

function formatLocation(area?: string, municipality?: string): string {
  if (area && municipality) {
    return `${area}, ${municipality}`;
  }
  return area || municipality || "a prime location";
}

function formatBedrooms(bedrooms?: number): string {
  if (typeof bedrooms !== "number") {
    return "well-sized";
  }
  return `${bedrooms}-bedroom`;
}

function formatBathrooms(bathrooms?: number): string {
  if (typeof bathrooms !== "number") {
    return "thoughtfully planned";
  }
  return `${bathrooms}-bath`;
}

function formatSize(sizeNetSqm?: number): string {
  if (!sizeNetSqm) {
    return "comfortable";
  }
  return `${sizeNetSqm} sqm`;
}

function buildPqabDescription(input: PropertyDescriptionInput): string {
  const {
    propertyName,
    propertyType,
    transactionType,
    municipality,
    area,
    bedrooms,
    bathrooms,
    sizeNetSqm,
    tone = "professional",
    length = "short",
    includeEmotionalAppeal = true,
    targetAudience = "buyers",
  } = input;

  const location = formatLocation(area, municipality);
  const sizeText = formatSize(sizeNetSqm);
  const bedroomText = formatBedrooms(bedrooms);
  const bathroomText = formatBathrooms(bathrooms);
  const propertyLabel = propertyType ? propertyType.toLowerCase() : "home";
  const transactionLabel = transactionType ? transactionType.toLowerCase() : "opportunity";

  const sentences: string[] = [];
  const sentenceTarget = LENGTH_SENTENCE_TARGET[length];

  // Property details
  sentences.push(
    `${propertyName || "This"} ${propertyLabel} in ${location} is a ${bedroomText}, ${bathroomText} ${sizeText} ${transactionLabel}.`
  );

  // Quality of life
  sentences.push(
    `Enjoy everyday convenience with a layout designed for modern living and access to the best of ${location}.`
  );

  // Answers to common questions
  sentences.push(
    `Ideal for ${targetAudience}, it balances functionality with comfort, making it easy to visualize your next move.`
  );

  // Buyer emotion
  if (includeEmotionalAppeal) {
    const emotionLine =
      tone === "luxury"
        ? "Experience refined living with thoughtful finishes and an elevated sense of privacy."
        : tone === "friendly"
        ? "Feel right at home with a welcoming atmosphere and room to grow."
        : "Step into a space that supports both productivity and relaxation.";
    sentences.push(emotionLine);
  }

  const callToAction = "Call to action: Schedule a viewing today to explore the possibilities.";

  const mainTarget = Math.max(2, sentenceTarget - 1);
  const mainSentences = sentences.slice(0, mainTarget);

  return [...mainSentences, callToAction].join(" ");
}

function mapPropertyToDescriptionInput(property: PropertyRecord): PropertyDescriptionInput {
  return {
    propertyName: property.property_name || undefined,
    propertyType: property.property_type || undefined,
    transactionType: property.transaction_type || undefined,
    municipality: property.municipality || undefined,
    area: property.area || undefined,
    price: property.price || undefined,
    bedrooms: property.bedrooms || undefined,
    bathrooms: property.bathrooms || undefined,
    sizeNetSqm: property.size_net_sqm || undefined,
  };
}

export { buildPqabDescription, mapPropertyToDescriptionInput };
export type { PropertyDescriptionInput, PropertyRecord };
