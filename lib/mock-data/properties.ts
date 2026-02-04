/**
 * Mock Property Data Generator
 */

import { faker } from "@faker-js/faker";
import { fakerEL } from "@faker-js/faker";

export interface MockProperty {
  id: string;
  title: string;
  description: string;
  propertyType: "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "COMMERCIAL" | "OFFICE";
  transactionType: "SALE" | "RENT";
  status: "ACTIVE" | "PENDING" | "SOLD" | "RENTED" | "DRAFT";
  price: number;
  currency: string;
  area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  energyClass: string | null;
  features: string[];
  address: {
    street: string;
    city: string;
    area: string;
    postalCode: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  images: string[];
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  visibility: "PRIVATE" | "NETWORK" | "PUBLIC";
  createdAt: string;
  updatedAt: string;
}

const PROPERTY_TYPES = ["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL", "OFFICE"] as const;
const TRANSACTION_TYPES = ["SALE", "RENT"] as const;
const PROPERTY_STATUSES = ["ACTIVE", "PENDING", "SOLD", "RENTED", "DRAFT"] as const;
const VISIBILITY_OPTIONS = ["PRIVATE", "NETWORK", "PUBLIC"] as const;
const ENERGY_CLASSES = ["A+", "A", "B+", "B", "C", "D", "E", "F", "G"] as const;

const GREEK_CITIES = [
  { city: "Αθήνα", areas: ["Κολωνάκι", "Γλυφάδα", "Μαρούσι", "Παγκράτι", "Χαλάνδρι", "Νέα Σμύρνη"] },
  { city: "Θεσσαλονίκη", areas: ["Κέντρο", "Καλαμαριά", "Πυλαία", "Σταυρούπολη", "Πανόραμα"] },
  { city: "Χανιά", areas: ["Παλιά Πόλη", "Νέα Χώρα", "Κουνουπιδιανά", "Αλικιανός"] },
  { city: "Ηράκλειο", areas: ["Κέντρο", "Αμμουδάρα", "Νέα Αλικαρνασσός", "Θέρισος"] },
];

const PROPERTY_FEATURES = [
  "Parking",
  "Storage",
  "Garden",
  "Pool",
  "Security",
  "Elevator",
  "Air Conditioning",
  "Fireplace",
  "Balcony",
  "Terrace",
  "Sea View",
  "Mountain View",
  "Furnished",
  "Solar Water Heater",
];

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
];

/**
 * Generate mock property data
 */
export function generateMockProperties(
  count: number,
  locale: "en" | "el" = "en"
): MockProperty[] {
  const f = locale === "el" ? fakerEL : faker;
  const properties: MockProperty[] = [];

  for (let i = 0; i < count; i++) {
    const propertyType = f.helpers.arrayElement(PROPERTY_TYPES);
    const transactionType = f.helpers.arrayElement(TRANSACTION_TYPES);
    const isLand = propertyType === "LAND";
    const createdAt = f.date.past({ years: 1 });

    const cityData = f.helpers.arrayElement(GREEK_CITIES);
    const area = f.helpers.arrayElement(cityData.areas);

    // Generate realistic prices based on type and transaction
    let price: number;
    if (transactionType === "RENT") {
      price = f.number.int({ min: 400, max: 3500 });
    } else {
      price = f.number.int({ min: 80000, max: 1500000 });
    }

    properties.push({
      id: `demo_property_${f.string.uuid()}`,
      title: generatePropertyTitle(propertyType, transactionType, area, locale),
      description: f.lorem.paragraphs({ min: 2, max: 4 }),
      propertyType,
      transactionType,
      status: f.helpers.arrayElement(PROPERTY_STATUSES),
      price,
      currency: "EUR",
      area: f.number.int({ min: 40, max: 500 }),
      bedrooms: isLand ? null : f.number.int({ min: 1, max: 5 }),
      bathrooms: isLand ? null : f.number.int({ min: 1, max: 3 }),
      floor: isLand ? null : f.number.int({ min: -1, max: 10 }),
      totalFloors: isLand ? null : f.number.int({ min: 1, max: 12 }),
      yearBuilt: isLand ? null : f.number.int({ min: 1970, max: 2024 }),
      energyClass: isLand ? null : f.helpers.arrayElement(ENERGY_CLASSES),
      features: f.helpers.arrayElements(PROPERTY_FEATURES, f.number.int({ min: 2, max: 6 })),
      address: {
        street: `${f.location.streetAddress()}`,
        city: cityData.city,
        area,
        postalCode: `${f.number.int({ min: 10000, max: 85999 })}`,
        country: "Greece",
      },
      coordinates: f.datatype.boolean(0.8)
        ? {
            latitude: f.location.latitude({ min: 34.8, max: 41.7 }),
            longitude: f.location.longitude({ min: 19.4, max: 29.6 }),
          }
        : null,
      images: f.helpers.arrayElements(PLACEHOLDER_IMAGES, f.number.int({ min: 1, max: 5 })),
      assignedTo: {
        id: `demo_user_${f.string.alphanumeric(8)}`,
        name: f.person.fullName(),
        email: f.internet.email().toLowerCase(),
      },
      visibility: f.helpers.arrayElement(VISIBILITY_OPTIONS),
      createdAt: createdAt.toISOString(),
      updatedAt: f.date.between({ from: createdAt, to: new Date() }).toISOString(),
    });
  }

  return properties;
}

function generatePropertyTitle(
  type: string,
  transaction: string,
  area: string,
  locale: "en" | "el"
): string {
  const typeLabels: Record<string, { en: string; el: string }> = {
    APARTMENT: { en: "Apartment", el: "Διαμέρισμα" },
    HOUSE: { en: "House", el: "Μονοκατοικία" },
    VILLA: { en: "Villa", el: "Βίλα" },
    LAND: { en: "Land", el: "Οικόπεδο" },
    COMMERCIAL: { en: "Commercial Space", el: "Επαγγελματικός Χώρος" },
    OFFICE: { en: "Office", el: "Γραφείο" },
  };

  const transactionLabels: Record<string, { en: string; el: string }> = {
    SALE: { en: "for Sale", el: "προς Πώληση" },
    RENT: { en: "for Rent", el: "προς Ενοικίαση" },
  };

  const typeLabel = typeLabels[type]?.[locale] || type;
  const transactionLabel = transactionLabels[transaction]?.[locale] || transaction;

  return locale === "el"
    ? `${typeLabel} ${transactionLabel} στην περιοχή ${area}`
    : `${typeLabel} ${transactionLabel} in ${area}`;
}
