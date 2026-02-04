#!/usr/bin/env npx tsx

/**
 * DEMO DATA SEED SCRIPT
 * 
 * Creates comprehensive demo data for showcase purposes:
 * - 200+ properties with varied types, prices, locations
 * - 150+ clients with matchmaking-ready preferences
 * - 50+ social feed posts
 * - 100+ tasks
 * - Sample import CSV files
 * 
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts --clerk-user-id user_xxxxx
 * 
 * Environment variables required:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - CLERK_SECRET_KEY: Clerk secret key for API access
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";

const prismadb = new PrismaClient();

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  PROPERTIES_COUNT: 220,
  CLIENTS_COUNT: 160,
  SOCIAL_POSTS_COUNT: 60,
  TASKS_COUNT: 120,
  DOCUMENTS_COUNT: 80,
  DEALS_COUNT: 35,
  SHOWINGS_COUNT: 100,
  MARKETING_SPEND_COUNT: 50,
  AGENT_HOURS_COUNT: 200,
  MARKET_DATA_COUNT: 60,
  HISTORY_MONTHS: 12,
};

// ============================================
// GREEK LOCATION DATA
// ============================================

const ATHENS_AREAS = [
  { area: "Kolonaki", city: "Athens", state: "Attica", municipality: "Athens", priceMultiplier: 1.8 },
  { area: "Kifisia", city: "Athens", state: "Attica", municipality: "Kifisia", priceMultiplier: 1.6 },
  { area: "Glyfada", city: "Athens", state: "Attica", municipality: "Glyfada", priceMultiplier: 1.5 },
  { area: "Voula", city: "Athens", state: "Attica", municipality: "Voula", priceMultiplier: 1.7 },
  { area: "Vouliagmeni", city: "Athens", state: "Attica", municipality: "Vouliagmeni", priceMultiplier: 2.0 },
  { area: "Marousi", city: "Athens", state: "Attica", municipality: "Marousi", priceMultiplier: 1.3 },
  { area: "Chalandri", city: "Athens", state: "Attica", municipality: "Chalandri", priceMultiplier: 1.2 },
  { area: "Psychiko", city: "Athens", state: "Attica", municipality: "Filothei-Psychiko", priceMultiplier: 1.9 },
  { area: "Filothei", city: "Athens", state: "Attica", municipality: "Filothei-Psychiko", priceMultiplier: 1.8 },
  { area: "Ekali", city: "Athens", state: "Attica", municipality: "Ekali", priceMultiplier: 2.2 },
  { area: "Nea Smyrni", city: "Athens", state: "Attica", municipality: "Nea Smyrni", priceMultiplier: 1.1 },
  { area: "Palaio Faliro", city: "Athens", state: "Attica", municipality: "Palaio Faliro", priceMultiplier: 1.3 },
  { area: "Alimos", city: "Athens", state: "Attica", municipality: "Alimos", priceMultiplier: 1.2 },
  { area: "Kallithea", city: "Athens", state: "Attica", municipality: "Kallithea", priceMultiplier: 0.9 },
  { area: "Pagkrati", city: "Athens", state: "Attica", municipality: "Athens", priceMultiplier: 1.0 },
  { area: "Koukaki", city: "Athens", state: "Attica", municipality: "Athens", priceMultiplier: 1.1 },
  { area: "Exarchia", city: "Athens", state: "Attica", municipality: "Athens", priceMultiplier: 0.85 },
  { area: "Plaka", city: "Athens", state: "Attica", municipality: "Athens", priceMultiplier: 1.4 },
  { area: "Syntagma", city: "Athens", state: "Attica", municipality: "Athens", priceMultiplier: 1.5 },
  { area: "Piraeus", city: "Piraeus", state: "Attica", municipality: "Piraeus", priceMultiplier: 0.8 },
  { area: "Peristeri", city: "Athens", state: "Attica", municipality: "Peristeri", priceMultiplier: 0.7 },
  { area: "Ilioupoli", city: "Athens", state: "Attica", municipality: "Ilioupoli", priceMultiplier: 0.95 },
  { area: "Zografou", city: "Athens", state: "Attica", municipality: "Zografou", priceMultiplier: 0.85 },
  { area: "Rafina", city: "Athens", state: "Attica", municipality: "Rafina", priceMultiplier: 1.1 },
];

const THESSALONIKI_AREAS = [
  { area: "Kalamaria", city: "Thessaloniki", state: "Central Macedonia", municipality: "Kalamaria", priceMultiplier: 1.2 },
  { area: "Ano Poli", city: "Thessaloniki", state: "Central Macedonia", municipality: "Thessaloniki", priceMultiplier: 1.0 },
  { area: "Kentro", city: "Thessaloniki", state: "Central Macedonia", municipality: "Thessaloniki", priceMultiplier: 1.1 },
  { area: "Pylaia", city: "Thessaloniki", state: "Central Macedonia", municipality: "Pylaia", priceMultiplier: 1.3 },
  { area: "Panorama", city: "Thessaloniki", state: "Central Macedonia", municipality: "Panorama", priceMultiplier: 1.4 },
];

const ISLAND_AREAS = [
  { area: "Mykonos Town", city: "Mykonos", state: "South Aegean", municipality: "Mykonos", priceMultiplier: 3.0 },
  { area: "Oia", city: "Santorini", state: "South Aegean", municipality: "Thira", priceMultiplier: 3.5 },
  { area: "Fira", city: "Santorini", state: "South Aegean", municipality: "Thira", priceMultiplier: 2.8 },
  { area: "Chania Old Town", city: "Chania", state: "Crete", municipality: "Chania", priceMultiplier: 1.5 },
  { area: "Heraklion Center", city: "Heraklion", state: "Crete", municipality: "Heraklion", priceMultiplier: 1.1 },
  { area: "Kassandra", city: "Chalkidiki", state: "Central Macedonia", municipality: "Kassandra", priceMultiplier: 1.4 },
];

const ALL_AREAS = [...ATHENS_AREAS, ...THESSALONIKI_AREAS, ...ISLAND_AREAS];

// ============================================
// PROPERTY DATA TEMPLATES
// ============================================

const PROPERTY_TYPES = [
  { type: "APARTMENT", weight: 45 },
  { type: "HOUSE", weight: 20 },
  { type: "MAISONETTE", weight: 10 },
  { type: "COMMERCIAL", weight: 8 },
  { type: "LAND", weight: 5 },
  { type: "PLOT", weight: 4 },
  { type: "WAREHOUSE", weight: 3 },
  { type: "PARKING", weight: 3 },
  { type: "INDUSTRIAL", weight: 2 },
] as const;

const PROPERTY_CONDITIONS = ["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"] as const;
const FURNISHED_OPTIONS = ["NO", "PARTIALLY", "FULLY"] as const;
const HEATING_TYPES = ["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"] as const;
const ENERGY_CLASSES = ["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H"] as const;

const AMENITIES_LIST = [
  "parking", "storage", "balcony", "garden", "pool", "gym", "security", "concierge",
  "fireplace", "airConditioning", "underfloorHeating", "solarPanels", "doubleGlazing",
  "alarm", "intercom", "cctv", "sauna", "jacuzzi", "rooftop", "petsAllowed"
];

const PROPERTY_NAME_TEMPLATES = {
  APARTMENT: [
    "Luxury Apartment in {area}",
    "Modern Flat {area}",
    "Elegant Apartment {area}",
    "Spacious Residence {area}",
    "City View Apartment {area}",
    "Renovated Flat {area}",
    "Cozy Studio {area}",
    "Penthouse {area}",
    "Ground Floor Apartment {area}",
  ],
  HOUSE: [
    "Family House {area}",
    "Detached Villa {area}",
    "Modern House {area}",
    "Traditional Home {area}",
    "Garden House {area}",
    "Corner House {area}",
  ],
  MAISONETTE: [
    "Elegant Maisonette {area}",
    "Modern Duplex {area}",
    "Split-Level Home {area}",
    "Two-Story Residence {area}",
  ],
  COMMERCIAL: [
    "Office Space {area}",
    "Retail Shop {area}",
    "Commercial Unit {area}",
    "Business Premises {area}",
  ],
  LAND: [
    "Building Plot {area}",
    "Land for Development {area}",
    "Residential Plot {area}",
  ],
  PLOT: [
    "City Plot {area}",
    "Buildable Land {area}",
    "Investment Plot {area}",
  ],
  WAREHOUSE: [
    "Industrial Warehouse {area}",
    "Storage Facility {area}",
    "Distribution Center {area}",
  ],
  PARKING: [
    "Underground Parking {area}",
    "Covered Parking Space {area}",
    "Garage {area}",
  ],
  INDUSTRIAL: [
    "Industrial Unit {area}",
    "Manufacturing Facility {area}",
    "Factory Building {area}",
  ],
};

// ============================================
// CLIENT DATA TEMPLATES
// ============================================

const GREEK_FIRST_NAMES = [
  "Alexandros", "Maria", "Giorgos", "Elena", "Nikos", "Sofia", "Dimitris", "Anna",
  "Kostas", "Katerina", "Stavros", "Christina", "Panagiotis", "Irini", "Michalis",
  "Eleni", "Vasilis", "Theodora", "Andreas", "Chrysanthi", "Lefteris", "Despina",
  "Ioannis", "Vasiliki", "Aggelos", "Marianna", "Christos", "Paraskevi", "Spyros",
  "Evangelia", "Konstantinos", "Aikaterini", "Dionysios", "Foteini", "Anastasios",
  "Georgia", "Emmanouil", "Dimitra", "Petros", "Kalliopi", "Nikolaos", "Stamatia",
  "Athanasios", "Argyro", "Charalambos", "Olympia", "Georgios", "Eftychia", "Ilias",
];

const GREEK_LAST_NAMES = [
  "Papadopoulos", "Konstantinou", "Nikolaou", "Dimitriou", "Georgiou", "Antoniou",
  "Papanikolaou", "Vasileiou", "Papadimitriou", "Ioannou", "Karagiannis", "Makri",
  "Alexiou", "Christodoulou", "Stefanou", "Karamanlis", "Papadakis", "Mavridis",
  "Papageorgiou", "Panagiotopoulos", "Andreopoulos", "Kourtidou", "Papathanasiou",
  "Giannopoulos", "Konstantinidis", "Economou", "Vlachos", "Athanasiadou", "Tzanetakis",
  "Papadopoulou", "Nikolaidis", "Papakonstantinou", "Antoniadou", "Mavropoulos",
  "Samaras", "Koutsoukos", "Kalogeropoulos", "Dimitrakis", "Karakosta", "Tzimas",
  "Zachariadou", "Sarris", "Papandreou", "Simopoulos", "Karatza", "Papadogiannakis",
  "Theodorou", "Anastasiadis",
];

const CLIENT_TYPES = ["BUYER", "SELLER", "RENTER", "INVESTOR"] as const;
const CLIENT_STATUSES = ["LEAD", "ACTIVE"] as const;
const INTENTS = ["BUY", "RENT", "INVEST"] as const;
const PURPOSES = ["RESIDENTIAL", "COMMERCIAL", "LAND"] as const;
const TIMELINES = ["IMMEDIATE", "ONE_THREE_MONTHS", "THREE_SIX_MONTHS", "SIX_PLUS_MONTHS"] as const;
const FINANCING_TYPES = ["CASH", "MORTGAGE", "PREAPPROVAL_PENDING"] as const;
const LEAD_SOURCES = ["REFERRAL", "WEB", "PORTAL", "WALK_IN", "SOCIAL"] as const;

// ============================================
// TASK TEMPLATES
// ============================================

const TASK_TITLES = [
  "Follow-up call with {client}",
  "Schedule property viewing for {client}",
  "Send property portfolio to {client}",
  "Document collection for {client}",
  "Contract preparation for {client}",
  "Meeting with {client}",
  "Property valuation request",
  "Update listing photos",
  "Market analysis for {client}",
  "Negotiation follow-up with {client}",
  "Send comparable properties",
  "Check financing options for {client}",
  "Coordinate with lawyer for {client}",
  "Property inspection scheduling",
  "Review offer from {client}",
  "Send weekly market update",
  "Update CRM records",
  "Prepare listing presentation",
  "Follow up on listing agreement",
  "Client feedback call",
];

const TASK_PRIORITIES = ["high", "medium", "low"] as const;

// ============================================
// SOCIAL POST TEMPLATES
// ============================================

const POST_TEMPLATES = {
  property: [
    "Just listed a stunning {type} in {area}! {bedrooms} bedrooms, {size}sqm. Asking €{price}.",
    "New listing alert! Beautiful {type} in {area}. Perfect for families.",
    "Exclusive listing: {type} in prestigious {area}. Don't miss this opportunity!",
    "Hot property: {type} in {area} just hit the market!",
    "Featured listing of the week: {type} in {area}.",
  ],
  client: [
    "Successfully closed a deal for our client in {area}! Congratulations!",
    "Another happy client! Just helped them find their dream home in {area}.",
    "Welcome to our new client looking for properties in {area}!",
    "Great news! Our client just secured their investment property.",
  ],
  text: [
    "Market update: Property prices in Athens up 5% this quarter.",
    "Tips for first-time buyers: What to look for in your property search.",
    "The Greek real estate market continues to show strong growth.",
    "Excited to announce our office expansion!",
    "Team meeting highlights: New marketing strategies for Q2.",
    "Attending the Real Estate Summit this weekend. Who else is going?",
    "Just completed another successful property valuation in {area}.",
    "Happy to share that our team achieved record sales this month!",
  ],
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted<T extends { weight: number }>(arr: T[]): T {
  const totalWeight = arr.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of arr) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return arr[arr.length - 1];
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateHistoricalDate(monthsBack: number): Date {
  const now = new Date();
  // Distribution: 30% recent, 40% mid, 30% old
  const r = Math.random();
  let monthsAgo: number;
  if (r < 0.3) {
    monthsAgo = rand(0, 1); // Recent
  } else if (r < 0.7) {
    monthsAgo = rand(1, 6); // Mid-range
  } else {
    monthsAgo = rand(6, monthsBack); // Older
  }
  
  const date = new Date(now);
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(rand(1, 28));
  date.setHours(rand(8, 20), rand(0, 59), rand(0, 59));
  return date;
}

function generateFutureDueDate(): Date {
  const now = new Date();
  const daysAhead = rand(-30, 60); // Some past due, most future
  const date = new Date(now);
  date.setDate(date.getDate() + daysAhead);
  date.setHours(rand(9, 18), 0, 0);
  return date;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.gr", "outlook.com", "hotmail.com", "protonmail.com"];
  const variations = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${rand(1, 999)}`,
  ];
  return `${pick(variations)}@${pick(domains)}`;
}

function generatePhone(): string {
  const prefixes = ["697", "698", "699", "694", "695", "693"];
  return `${pick(prefixes)}${rand(1000000, 9999999)}`;
}

function generateRandomAmenities(): Record<string, boolean> {
  const amenities: Record<string, boolean> = {};
  const count = rand(3, 10);
  const shuffled = shuffle(AMENITIES_LIST);
  for (let i = 0; i < count; i++) {
    amenities[shuffled[i]] = true;
  }
  return amenities;
}

function generatePostSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

// ============================================
// FRIENDLY ID GENERATION
// ============================================

const ENTITY_PREFIXES = {
  Properties: "prp",
  Clients: "clt",
  crm_Accounts_Tasks: "tsk",
  SocialPost: "post",
} as const;

async function generateFriendlyIds(
  entityType: keyof typeof ENTITY_PREFIXES,
  count: number
): Promise<string[]> {
  const prefix = ENTITY_PREFIXES[entityType];
  
  const result = await prismadb.$queryRaw<Array<{ lastValue: number }>>`
    INSERT INTO "IdSequence" (id, prefix, "lastValue", "updatedAt")
    VALUES (${prefix}, ${prefix}, ${count}, NOW())
    ON CONFLICT (prefix) 
    DO UPDATE SET 
      "lastValue" = "IdSequence"."lastValue" + ${count}, 
      "updatedAt" = NOW()
    RETURNING "lastValue"
  `;
  
  const endValue = result[0]?.lastValue ?? count;
  const startValue = endValue - count + 1;
  
  const ids: string[] = [];
  for (let i = startValue; i <= endValue; i++) {
    ids.push(`${prefix}-${String(i).padStart(6, "0")}`);
  }
  
  return ids;
}

// ============================================
// FIND ORGANIZATION ID
// ============================================

async function findOrganizationId(clerkUserId: string): Promise<{ orgId: string; userDbId: string }> {
  console.log(`\n🔍 Looking up organization for Clerk user: ${clerkUserId}`);
  
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  // Get user's organization memberships from Clerk
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId: clerkUserId,
  });

  if (memberships.data.length === 0) {
    throw new Error(`User ${clerkUserId} is not a member of any organization`);
  }

  // Get the first organization (or you could let user choose)
  const orgMembership = memberships.data[0];
  const orgId = orgMembership.organization.id;
  const orgName = orgMembership.organization.name;

  console.log(`✓ Found organization: "${orgName}" (${orgId})`);

  // Find the user in our database
  const dbUser = await prismadb.users.findFirst({
    where: { clerkUserId },
    select: { id: true, name: true, email: true },
  });

  if (!dbUser) {
    throw new Error(`User ${clerkUserId} not found in database. Make sure the user has logged in at least once.`);
  }

  console.log(`✓ Found database user: ${dbUser.name || dbUser.email} (${dbUser.id})`);

  return { orgId, userDbId: dbUser.id };
}

// ============================================
// GET ORG USERS
// ============================================

async function getOrganizationUsers(orgId: string): Promise<Array<{ id: string; name: string | null }>> {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });

  const userIds: Array<{ id: string; name: string | null }> = [];

  for (const membership of memberships.data) {
    const clerkUserId = membership.publicUserData?.userId;
    if (clerkUserId) {
      const dbUser = await prismadb.users.findFirst({
        where: { clerkUserId },
        select: { id: true, name: true },
      });
      if (dbUser) {
        userIds.push(dbUser);
      }
    }
  }

  return userIds;
}

// ============================================
// SEED PROPERTIES
// ============================================

async function seedProperties(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>
): Promise<string[]> {
  console.log(`\n📦 Creating ${CONFIG.PROPERTIES_COUNT} properties...`);

  const propertyIds = await generateFriendlyIds("Properties", CONFIG.PROPERTIES_COUNT);
  const properties: any[] = [];

  for (let i = 0; i < CONFIG.PROPERTIES_COUNT; i++) {
    const propertyType = pickWeighted(PROPERTY_TYPES).type;
    const location = pick(ALL_AREAS);
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const assignedUser = pick(userIds);
    
    // Base price calculation
    let basePrice: number;
    let transactionType: string;
    
    // 70% sale, 25% rental, 5% short-term
    const txnRoll = Math.random();
    if (txnRoll < 0.70) {
      transactionType = "SALE";
      basePrice = rand(80000, 800000);
    } else if (txnRoll < 0.95) {
      transactionType = "RENTAL";
      basePrice = rand(400, 3500);
    } else {
      transactionType = "SHORT_TERM";
      basePrice = rand(50, 300); // Daily rate
    }

    // Adjust price based on property type
    if (propertyType === "HOUSE" || propertyType === "MAISONETTE") {
      basePrice = transactionType === "SALE" ? rand(200000, 1500000) : rand(800, 4000);
    } else if (propertyType === "COMMERCIAL" || propertyType === "WAREHOUSE" || propertyType === "INDUSTRIAL") {
      basePrice = transactionType === "SALE" ? rand(150000, 2000000) : rand(1000, 8000);
    } else if (propertyType === "LAND" || propertyType === "PLOT") {
      transactionType = "SALE";
      basePrice = rand(50000, 500000);
    } else if (propertyType === "PARKING") {
      transactionType = "SALE";
      basePrice = rand(15000, 80000);
    }

    const price = Math.round(basePrice * location.priceMultiplier);

    // Property details based on type
    let bedrooms = 0, bathrooms = 1, sizeNet = 0, sizeGross = 0, floor = "0";
    
    if (["APARTMENT", "HOUSE", "MAISONETTE"].includes(propertyType)) {
      bedrooms = rand(1, 5);
      bathrooms = Math.max(1, Math.floor(bedrooms / 2) + rand(0, 1));
      sizeNet = rand(40, 300);
      sizeGross = sizeNet + rand(5, 30);
      floor = propertyType === "HOUSE" ? "0" : String(rand(-1, 8));
    } else if (propertyType === "COMMERCIAL") {
      sizeNet = rand(30, 500);
      sizeGross = sizeNet + rand(5, 50);
      floor = String(rand(0, 5));
    } else if (["WAREHOUSE", "INDUSTRIAL"].includes(propertyType)) {
      sizeNet = rand(200, 2000);
      sizeGross = sizeNet + rand(20, 100);
      floor = "0";
    } else if (propertyType === "PARKING") {
      sizeNet = rand(12, 25);
      sizeGross = sizeNet;
      floor = String(rand(-3, 0));
    }

    // Status distribution: 70% ACTIVE, 15% PENDING, 10% SOLD, 5% OFF_MARKET
    const statusRoll = Math.random();
    let status: string;
    if (statusRoll < 0.70) status = "ACTIVE";
    else if (statusRoll < 0.85) status = "PENDING";
    else if (statusRoll < 0.95) status = "SOLD";
    else status = "OFF_MARKET";

    // Generate property name
    const nameTemplates = PROPERTY_NAME_TEMPLATES[propertyType as keyof typeof PROPERTY_NAME_TEMPLATES] || 
                          PROPERTY_NAME_TEMPLATES.APARTMENT;
    const propertyName = pick(nameTemplates).replace("{area}", location.area);

    const property = {
      id: propertyIds[i],
      property_name: propertyName,
      property_type: propertyType,
      property_status: status,
      transaction_type: transactionType,
      price: price,
      price_type: transactionType === "SALE" ? "SALE" : "RENTAL",
      
      // Location
      area: location.area,
      address_city: location.city,
      address_state: location.state,
      municipality: location.municipality,
      address_street: `${pick(["Οδός", "Λεωφόρος", "Πλατεία"])} ${pick(["Αθηνάς", "Ερμού", "Σταδίου", "Πανεπιστημίου", "Βασ. Σοφίας", "Κηφισίας"])} ${rand(1, 200)}`,
      postal_code: `${rand(100, 199)}${rand(10, 99)}`,
      
      // Details
      bedrooms: bedrooms > 0 ? bedrooms : null,
      bathrooms: bathrooms,
      size_net_sqm: sizeNet > 0 ? sizeNet : null,
      size_gross_sqm: sizeGross > 0 ? sizeGross : null,
      floor: floor,
      floors_total: rand(1, 10),
      year_built: rand(1960, 2024),
      
      // Features
      condition: pick(PROPERTY_CONDITIONS),
      furnished: pick(FURNISHED_OPTIONS),
      heating_type: pick(HEATING_TYPES),
      energy_cert_class: pick(ENERGY_CLASSES),
      elevator: Math.random() > 0.4,
      accepts_pets: Math.random() > 0.5,
      amenities: generateRandomAmenities(),
      
      // Description
      description: `${propertyName}. ${sizeNet > 0 ? `${sizeNet}sqm` : ""} ${bedrooms > 0 ? `with ${bedrooms} bedrooms` : ""}. ${pick(["Excellent condition", "Recently renovated", "Prime location", "Great investment opportunity", "Perfect for families", "Ideal for professionals"])}. Contact us for more details.`,
      
      // Assignment
      assigned_to: assignedUser.id,
      createdBy: assignedUser.id,
      
      // Organization
      organizationId: orgId,
      
      // Timestamps
      createdAt: createdAt,
      updatedAt: createdAt,
      
      // Visibility
      portal_visibility: "PUBLIC",
      address_privacy_level: "PARTIAL",
    };

    properties.push(property);
  }

  // Batch insert
  await prismadb.properties.createMany({
    data: properties,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${properties.length} properties`);
  return propertyIds;
}

// ============================================
// SEED CLIENTS
// ============================================

async function seedClients(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyAreas: string[]
): Promise<string[]> {
  console.log(`\n👥 Creating ${CONFIG.CLIENTS_COUNT} clients...`);

  const clientIds = await generateFriendlyIds("Clients", CONFIG.CLIENTS_COUNT);
  const clients: any[] = [];

  // Get unique areas from properties for matchmaking
  const uniqueAreas = [...new Set(propertyAreas)];

  for (let i = 0; i < CONFIG.CLIENTS_COUNT; i++) {
    const firstName = pick(GREEK_FIRST_NAMES);
    const lastName = pick(GREEK_LAST_NAMES);
    const clientName = `${firstName} ${lastName}`;
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const assignedUser = pick(userIds);

    // Client type distribution
    const typeRoll = Math.random();
    let clientType: string, intent: string;
    if (typeRoll < 0.50) {
      clientType = "BUYER";
      intent = "BUY";
    } else if (typeRoll < 0.75) {
      clientType = "RENTER";
      intent = "RENT";
    } else if (typeRoll < 0.90) {
      clientType = "INVESTOR";
      intent = "INVEST";
    } else {
      clientType = "SELLER";
      intent = "SELL";
    }

    // Budget based on intent
    let budgetMin: number, budgetMax: number;
    if (intent === "RENT") {
      budgetMin = rand(300, 1500);
      budgetMax = budgetMin + rand(200, 1000);
    } else {
      budgetMin = rand(50000, 500000);
      budgetMax = budgetMin + rand(50000, 300000);
    }

    // Areas of interest (pick 2-5 areas that match properties)
    const areasCount = rand(2, 5);
    const areasOfInterest = shuffle(uniqueAreas).slice(0, areasCount);

    // Property preferences for matchmaking
    const propertyPreferences = {
      bedrooms_min: rand(1, 2),
      bedrooms_max: rand(3, 5),
      bathrooms_min: 1,
      bathrooms_max: rand(2, 4),
      size_min_sqm: rand(50, 100),
      size_max_sqm: rand(120, 250),
      floor_min: rand(-1, 0),
      floor_max: rand(3, 8),
      requires_elevator: Math.random() > 0.5,
      requires_parking: Math.random() > 0.4,
      requires_pet_friendly: Math.random() > 0.7,
      furnished_preference: Math.random() > 0.6 ? pick(FURNISHED_OPTIONS) : "ANY",
      heating_preferences: Math.random() > 0.5 ? [pick(HEATING_TYPES), pick(HEATING_TYPES)] : undefined,
      energy_class_min: Math.random() > 0.6 ? pick(["A", "B", "C", "D"]) : undefined,
      condition_preferences: Math.random() > 0.5 ? ["EXCELLENT", "VERY_GOOD", "GOOD"] : undefined,
      amenities_required: Math.random() > 0.6 ? shuffle(AMENITIES_LIST).slice(0, rand(1, 3)) : undefined,
      amenities_preferred: Math.random() > 0.5 ? shuffle(AMENITIES_LIST).slice(0, rand(2, 5)) : undefined,
    };

    const client = {
      id: clientIds[i],
      client_name: clientName,
      full_name: clientName,
      client_type: clientType,
      client_status: pick(CLIENT_STATUSES),
      intent: intent,
      purpose: pick(PURPOSES),
      person_type: Math.random() > 0.85 ? "COMPANY" : "INDIVIDUAL",
      
      // Contact
      primary_email: generateEmail(firstName, lastName),
      primary_phone: generatePhone(),
      
      // Budget
      budget_min: budgetMin,
      budget_max: budgetMax,
      
      // Preferences for matchmaking
      areas_of_interest: areasOfInterest,
      property_preferences: propertyPreferences,
      
      // Additional
      timeline: pick(TIMELINES),
      financing_type: intent === "BUY" ? pick(FINANCING_TYPES) : "CASH",
      lead_source: pick(LEAD_SOURCES),
      gdpr_consent: true,
      allow_marketing: Math.random() > 0.3,
      
      // Description
      description: `${clientType === "BUYER" ? "Looking to buy" : clientType === "RENTER" ? "Searching for rental" : clientType === "INVESTOR" ? "Investment opportunity seeker" : "Property owner"} in ${areasOfInterest.join(", ")}. Budget: €${budgetMin.toLocaleString()} - €${budgetMax.toLocaleString()}.`,
      
      // Assignment
      assigned_to: assignedUser.id,
      createdBy: assignedUser.id,
      
      // Organization
      organizationId: orgId,
      
      // Timestamps
      createdAt: createdAt,
      updatedAt: createdAt,
    };

    clients.push(client);
  }

  await prismadb.clients.createMany({
    data: clients,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${clients.length} clients`);
  return clientIds;
}

// ============================================
// SEED SOCIAL POSTS
// ============================================

async function seedSocialPosts(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyIds: string[],
  clientIds: string[]
): Promise<void> {
  console.log(`\n📱 Creating ${CONFIG.SOCIAL_POSTS_COUNT} social posts...`);

  const postIds = await generateFriendlyIds("SocialPost", CONFIG.SOCIAL_POSTS_COUNT);
  const posts: any[] = [];

  // Get some property and client details for realistic posts
  const properties = await prismadb.properties.findMany({
    where: { id: { in: propertyIds.slice(0, 50) } },
    select: { id: true, property_name: true, property_type: true, area: true, price: true, bedrooms: true, size_net_sqm: true },
  });

  const clients = await prismadb.clients.findMany({
    where: { id: { in: clientIds.slice(0, 30) } },
    select: { id: true, client_name: true },
  });

  for (let i = 0; i < CONFIG.SOCIAL_POSTS_COUNT; i++) {
    const author = pick(userIds);
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const slug = generatePostSlug();

    // Post type distribution: 40% property, 20% client, 40% text
    const typeRoll = Math.random();
    let postType: string, content: string, linkedEntityId: string | null = null;
    let linkedEntityType: string | null = null, linkedEntityTitle: string | null = null;

    if (typeRoll < 0.40 && properties.length > 0) {
      postType = "property";
      const property = pick(properties);
      const template = pick(POST_TEMPLATES.property);
      content = template
        .replace("{type}", property.property_type?.toLowerCase() || "property")
        .replace("{area}", property.area || "Athens")
        .replace("{bedrooms}", String(property.bedrooms || 2))
        .replace("{size}", String(property.size_net_sqm || 100))
        .replace("{price}", property.price?.toLocaleString() || "N/A");
      linkedEntityId = property.id;
      linkedEntityType = "property";
      linkedEntityTitle = property.property_name;
    } else if (typeRoll < 0.60 && clients.length > 0) {
      postType = "client";
      const client = pick(clients);
      const template = pick(POST_TEMPLATES.client);
      content = template.replace("{area}", pick(ALL_AREAS).area);
      linkedEntityId = client.id;
      linkedEntityType = "client";
      linkedEntityTitle = client.client_name;
    } else {
      postType = "text";
      const template = pick(POST_TEMPLATES.text);
      content = template.replace("{area}", pick(ALL_AREAS).area);
    }

    posts.push({
      id: postIds[i],
      slug: slug,
      organizationId: orgId,
      authorId: author.id,
      postType: postType,
      content: content,
      linkedEntityId: linkedEntityId,
      linkedEntityType: linkedEntityType,
      linkedEntityTitle: linkedEntityTitle,
      createdAt: createdAt,
      updatedAt: createdAt,
    });
  }

  await prismadb.socialPost.createMany({
    data: posts,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${posts.length} social posts`);
}

// ============================================
// SEED TASKS
// ============================================

async function seedTasks(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  clientIds: string[]
): Promise<void> {
  console.log(`\n✅ Creating ${CONFIG.TASKS_COUNT} tasks...`);

  const taskIds = await generateFriendlyIds("crm_Accounts_Tasks", CONFIG.TASKS_COUNT);
  const tasks: any[] = [];

  // Get client names for task titles
  const clients = await prismadb.clients.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, client_name: true },
  });

  const clientMap = new Map(clients.map(c => [c.id, c.client_name]));

  for (let i = 0; i < CONFIG.TASKS_COUNT; i++) {
    const assignedUser = pick(userIds);
    const clientId = pick(clientIds);
    const clientName = clientMap.get(clientId) || "Client";
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const dueDate = generateFutureDueDate();

    const titleTemplate = pick(TASK_TITLES);
    const title = titleTemplate.replace("{client}", clientName);

    tasks.push({
      id: taskIds[i],
      title: title,
      content: `Task related to ${clientName}. ${pick(["High priority follow-up", "Standard procedure", "Routine check", "Urgent action required", "Schedule for next week"])}`,
      priority: pick(TASK_PRIORITIES),
      user: assignedUser.id,
      account: clientId,
      dueDateAt: dueDate,
      organizationId: orgId,
      createdBy: assignedUser.id,
      createdAt: createdAt,
      updatedAt: createdAt,
    });
  }

  await prismadb.crm_Accounts_Tasks.createMany({
    data: tasks,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${tasks.length} tasks`);
}

// ============================================
// SEED DOCUMENTS
// ============================================

// Document system types matching the Prisma enum
const DOCUMENT_SYSTEM_TYPES = ["INVOICE", "RECEIPT", "CONTRACT", "OFFER", "OTHER"] as const;

const DOCUMENT_CONFIGS = [
  { systemType: "CONTRACT", mimeType: "application/pdf", ext: "pdf", names: ["Sale Contract", "Rental Agreement", "Preliminary Contract", "Lease Agreement", "Purchase Agreement"] },
  { systemType: "INVOICE", mimeType: "application/pdf", ext: "pdf", names: ["Commission Invoice", "Service Invoice", "Property Invoice"] },
  { systemType: "RECEIPT", mimeType: "application/pdf", ext: "pdf", names: ["Payment Receipt", "Deposit Receipt", "Transaction Receipt"] },
  { systemType: "OFFER", mimeType: "application/pdf", ext: "pdf", names: ["Purchase Offer", "Rental Offer", "Counter Offer", "Formal Proposal"] },
  { systemType: "OTHER", mimeType: "application/pdf", ext: "pdf", names: ["Floor Plan", "Energy Certificate", "Title Deed", "Building Permit", "Property Appraisal", "Inspection Report"] },
  { systemType: "OTHER", mimeType: "image/jpeg", ext: "jpg", names: ["Property Photo", "Interior Shot", "Exterior View", "Room Photo"] },
  { systemType: "OTHER", mimeType: "image/png", ext: "png", names: ["Floor Plan Image", "Site Plan", "Layout Diagram"] },
];

async function seedDocuments(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyIds: string[],
  clientIds: string[]
): Promise<string[]> {
  console.log(`\n📄 Creating ${CONFIG.DOCUMENTS_COUNT} documents...`);

  const documentIds: string[] = [];
  const documents: any[] = [];

  for (let i = 0; i < CONFIG.DOCUMENTS_COUNT; i++) {
    const docConfig = pick(DOCUMENT_CONFIGS);
    const docName = pick(docConfig.names);
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const user = pick(userIds);
    const docId = `doc-${String(i + 1).padStart(6, "0")}`;

    // Link to property or client (60% property, 40% client)
    const linkedPropertiesIds: string[] = [];
    const accountsIDs: string[] = [];
    
    if (Math.random() < 0.6 && propertyIds.length > 0) {
      linkedPropertiesIds.push(pick(propertyIds));
    } else if (clientIds.length > 0) {
      accountsIDs.push(pick(clientIds));
    }

    documents.push({
      id: docId,
      document_name: `${docName} - ${rand(1000, 9999)}`,
      document_system_type: docConfig.systemType,
      document_file_mimeType: docConfig.mimeType,
      document_file_url: `https://storage.example.com/documents/${orgId}/${docId}.${docConfig.ext}`,
      description: `${docName} for ${linkedPropertiesIds.length > 0 ? "property" : "client"} record`,
      status: pick(["ACTIVE", "ACTIVE", "ACTIVE", "ARCHIVED"]),
      visibility: pick(["PRIVATE", "ORGANIZATION", "SHARED"]),
      size: rand(50000, 5000000), // 50KB to 5MB
      created_by_user: user.id,
      createdBy: user.id,
      assigned_user: user.id,
      linkedPropertiesIds: linkedPropertiesIds,
      accountsIDs: accountsIDs,
      organizationId: orgId,
      date_created: createdAt,
      createdAt: createdAt,
      last_updated: createdAt,
      updatedAt: createdAt,
      viewsCount: rand(0, 25),
      favourite: Math.random() > 0.8,
    });

    documentIds.push(docId);
  }

  await prismadb.documents.createMany({
    data: documents,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${documents.length} documents`);
  return documentIds;
}

// ============================================
// SEED DEALS
// ============================================

const DEAL_STATUSES = ["PROPOSED", "NEGOTIATING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const DEAL_TYPES = ["SELLER", "BUYER", "DUAL"] as const; // From Prisma DealType enum

async function seedDeals(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyIds: string[],
  clientIds: string[]
): Promise<string[]> {
  console.log(`\n💰 Creating ${CONFIG.DEALS_COUNT} deals...`);

  const dealIds: string[] = [];
  const deals: any[] = [];

  // Get some properties with prices
  const properties = await prismadb.properties.findMany({
    where: { id: { in: propertyIds.slice(0, 100) } },
    select: { id: true, price: true, property_name: true },
  });

  for (let i = 0; i < CONFIG.DEALS_COUNT; i++) {
    const property = pick(properties);
    const client = pick(clientIds);
    const propertyAgent = pick(userIds);
    const clientAgent = pick(userIds);
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const dealId = `deal-${String(i + 1).padStart(6, "0")}`;

    // Status distribution: more completed deals for reporting
    const statusRoll = Math.random();
    let status: string;
    if (statusRoll < 0.35) status = "COMPLETED";
    else if (statusRoll < 0.50) status = "IN_PROGRESS";
    else if (statusRoll < 0.65) status = "ACCEPTED";
    else if (statusRoll < 0.80) status = "NEGOTIATING";
    else if (statusRoll < 0.95) status = "PROPOSED";
    else status = "CANCELLED";

    const propertyPrice = property.price || rand(100000, 500000);
    const commissionRate = rand(2, 5) / 100; // 2-5% commission
    const totalCommission = Math.round(Number(propertyPrice) * commissionRate);

    const closedAt = status === "COMPLETED" ? new Date(createdAt.getTime() + rand(7, 90) * 24 * 60 * 60 * 1000) : null;
    const contractDate = ["COMPLETED", "IN_PROGRESS", "ACCEPTED"].includes(status) 
      ? new Date(createdAt.getTime() + rand(3, 30) * 24 * 60 * 60 * 1000) 
      : null;

    deals.push({
      id: dealId,
      organizationId: orgId,
      propertyId: property.id,
      clientId: client,
      propertyAgentId: propertyAgent.id,
      clientAgentId: clientAgent.id,
      propertyAgentSplit: rand(40, 60),
      clientAgentSplit: rand(40, 60),
      totalCommission: totalCommission,
      commissionCurrency: "EUR",
      status: status,
      proposedById: propertyAgent.id,
      title: `Deal: ${property.property_name?.slice(0, 30) || "Property"}`,
      notes: `${status === "COMPLETED" ? "Successfully closed" : "In progress"} deal for ${property.property_name || "property"}`,
      closedAt: closedAt,
      contractDate: contractDate,
      hoursWorked: status === "COMPLETED" ? rand(10, 80) : null,
      dealType: pick(DEAL_TYPES),
      leadSource: pick(LEAD_SOURCES),
      createdAt: createdAt,
      updatedAt: closedAt || createdAt,
    });

    dealIds.push(dealId);
  }

  await prismadb.deal.createMany({
    data: deals,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${deals.length} deals`);
  return dealIds;
}

// ============================================
// SEED PROPERTY SHOWINGS
// ============================================

const SHOWING_RESULTS = ["NO_SHOW", "NO_INTEREST", "INTERESTED", "VERY_INTERESTED", "OFFER_MADE", "CONTRACT_SIGNED"] as const;

async function seedShowings(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyIds: string[],
  clientIds: string[]
): Promise<void> {
  console.log(`\n🏠 Creating ${CONFIG.SHOWINGS_COUNT} property showings...`);

  const showings: any[] = [];

  for (let i = 0; i < CONFIG.SHOWINGS_COUNT; i++) {
    const showingDate = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const agent = pick(userIds);

    showings.push({
      id: crypto.randomUUID(),
      organizationId: orgId,
      propertyId: pick(propertyIds),
      clientId: Math.random() > 0.2 ? pick(clientIds) : null, // 80% have client linked
      agentId: agent.id,
      showingDate: showingDate,
      result: pick(SHOWING_RESULTS),
      notes: pick([
        "Client was very impressed with the location",
        "Good showing, client requested more information",
        "Client needs to discuss with spouse",
        "Interested in scheduling second viewing",
        "Price negotiation discussed",
        "Client found the property too small",
        "Perfect match for client requirements",
        null,
      ]),
      duration: rand(15, 90), // 15-90 minutes
      createdAt: showingDate,
      updatedAt: showingDate,
    });
  }

  await prismadb.propertyShowing.createMany({
    data: showings,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${showings.length} property showings`);
}

// ============================================
// SEED MARKETING SPEND
// ============================================

const MARKETING_CATEGORIES = ["LEAD_GENERATION", "ADVERTISING", "SOCIAL_MEDIA", "PRINT_MEDIA", "SIGNAGE", "OPEN_HOUSE", "NETWORKING", "REFERRAL_PROGRAM", "WEBSITE", "SEO", "EMAIL_MARKETING", "OTHER"] as const;

async function seedMarketingSpend(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>
): Promise<void> {
  console.log(`\n📊 Creating ${CONFIG.MARKETING_SPEND_COUNT} marketing spend records...`);

  const spends: any[] = [];

  for (let i = 0; i < CONFIG.MARKETING_SPEND_COUNT; i++) {
    const spendDate = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const category = pick(MARKETING_CATEGORIES);
    
    // Amount based on category
    let amount: number;
    switch (category) {
      case "ADVERTISING": amount = rand(100, 1000); break;
      case "SOCIAL_MEDIA": amount = rand(50, 500); break;
      case "PRINT_MEDIA": amount = rand(100, 800); break;
      case "SIGNAGE": amount = rand(50, 300); break;
      case "OPEN_HOUSE": amount = rand(100, 500); break;
      case "NETWORKING": amount = rand(50, 300); break;
      case "WEBSITE": amount = rand(200, 2000); break;
      case "SEO": amount = rand(100, 800); break;
      case "EMAIL_MARKETING": amount = rand(50, 300); break;
      case "REFERRAL_PROGRAM": amount = rand(100, 500); break;
      case "LEAD_GENERATION": amount = rand(200, 1500); break;
      default: amount = rand(50, 500);
    }

    spends.push({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: pick(userIds).id,
      amount: amount,
      spendDate: spendDate,
      category: category,
      leadSource: pick(LEAD_SOURCES),
      description: `${category.replace("_", " ")} expense - ${pick(["Facebook", "Google", "Instagram", "Local newspaper", "Property portal", "Office", "Client event"])}`,
      createdAt: spendDate,
      updatedAt: spendDate,
    });
  }

  await prismadb.marketingSpend.createMany({
    data: spends,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${spends.length} marketing spend records`);
}

// ============================================
// SEED AGENT HOURS
// ============================================

const ACTIVITY_TYPES = ["ADMINISTRATIVE", "INCOME_PRODUCING", "SHOWINGS", "PROSPECTING", "MARKETING", "TRAINING", "TRAVEL", "CLIENT_MEETINGS", "NEGOTIATIONS", "PAPERWORK"] as const;

async function seedAgentHours(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  dealIds: string[]
): Promise<void> {
  console.log(`\n⏱️ Creating ${CONFIG.AGENT_HOURS_COUNT} agent hour records...`);

  const hours: any[] = [];

  for (let i = 0; i < CONFIG.AGENT_HOURS_COUNT; i++) {
    const date = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const activityType = pick(ACTIVITY_TYPES);

    hours.push({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: pick(userIds).id,
      date: date,
      hoursWorked: rand(1, 8) + (Math.random() > 0.5 ? 0.5 : 0), // 1-8.5 hours
      activityType: activityType,
      dealId: Math.random() > 0.7 && dealIds.length > 0 ? pick(dealIds) : null,
      description: `${activityType.replace("_", " ")} work`,
      createdAt: date,
      updatedAt: date,
    });
  }

  await prismadb.agentHours.createMany({
    data: hours,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${hours.length} agent hour records`);
}

// ============================================
// SEED MARKET DATA
// ============================================

async function seedMarketData(orgId: string): Promise<void> {
  console.log(`\n📈 Creating ${CONFIG.MARKET_DATA_COUNT} market data records...`);

  const marketData: any[] = [];
  const areas = ALL_AREAS.map(a => a.area);

  // Create market data for different areas across months
  for (let i = 0; i < CONFIG.MARKET_DATA_COUNT; i++) {
    const area = pick(areas);
    const date = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const areaInfo = ALL_AREAS.find(a => a.area === area) || ALL_AREAS[0];
    
    const basePrice = 2500 * areaInfo.priceMultiplier; // Base price per sqm

    marketData.push({
      id: crypto.randomUUID(),
      organizationId: orgId,
      date: date,
      area: area,
      priceRange: `${Math.round(basePrice * 0.8)}-${Math.round(basePrice * 1.2)}`,
      activeListings: rand(20, 150),
      soldListings: rand(5, 40),
      newListings: rand(10, 60),
      medianSalePrice: Math.round(basePrice * rand(80, 150) * 100) / 100,
      averageSalePrice: Math.round(basePrice * rand(85, 160) * 100) / 100,
      averageDaysOnMarket: rand(30, 180),
      absorptionRate: Math.round(rand(5, 25) * 10) / 100,
      medianListPrice: Math.round(basePrice * rand(90, 170) * 100) / 100,
      pricePerSqft: Math.round(basePrice * 0.093), // Convert to sqft
      createdAt: date,
      updatedAt: date,
    });
  }

  await prismadb.marketData.createMany({
    data: marketData,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${marketData.length} market data records`);
}

// ============================================
// SEED EXPORT HISTORY
// ============================================

async function seedExportHistory(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyIds: string[],
  clientIds: string[]
): Promise<void> {
  console.log(`\n📤 Creating export history records...`);

  const exports: any[] = [];
  const count = 30;

  const formats = ["xlsx", "csv", "pdf"];
  const templates = ["CMA", "SHORTLIST", "ROI", "MARKET_TRENDS", null];
  const destinations = ["client", "xe.gr", "spitogatos", "internal", null];

  for (let i = 0; i < count; i++) {
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const isProperty = Math.random() > 0.4;
    const isBulk = Math.random() > 0.7;
    const format = pick(formats);

    if (isBulk) {
      const entityIds = isProperty 
        ? shuffle(propertyIds).slice(0, rand(3, 15))
        : shuffle(clientIds).slice(0, rand(3, 10));

      exports.push({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: pick(userIds).id,
        entityType: isProperty ? "BULK_PROPERTIES" : "BULK_CLIENTS",
        entityId: `bulk-${createdAt.getTime()}`,
        entityIds: entityIds,
        exportFormat: format,
        exportTemplate: pick(templates),
        destination: pick(destinations),
        filename: `${isProperty ? "properties" : "clients"}_export_${createdAt.toISOString().split("T")[0]}.${format}`,
        rowCount: entityIds.length,
        createdAt: createdAt,
      });
    } else {
      exports.push({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: pick(userIds).id,
        entityType: isProperty ? "PROPERTY" : "CLIENT",
        entityId: isProperty ? pick(propertyIds) : pick(clientIds),
        entityIds: [],
        exportFormat: format,
        exportTemplate: pick(templates),
        destination: pick(destinations),
        filename: `${isProperty ? "property" : "client"}_${rand(1000, 9999)}.${format}`,
        rowCount: 1,
        createdAt: createdAt,
      });
    }
  }

  await prismadb.exportHistory.createMany({
    data: exports,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${exports.length} export history records`);
}

// ============================================
// GENERATE IMPORT CSV FILES
// ============================================

function generateImportCSVs(): void {
  console.log(`\n📄 Generating import CSV files...`);

  // Properties CSV for import demo
  const propertiesCSV = generatePropertiesCSV(50);
  const propertiesPath = path.join(__dirname, "../test-data/properties-demo-import.csv");
  fs.writeFileSync(propertiesPath, propertiesCSV, "utf-8");
  console.log(`✓ Created ${propertiesPath}`);

  // Clients CSV for import demo
  const clientsCSV = generateClientsCSV(30);
  const clientsPath = path.join(__dirname, "../test-data/clients-demo-import.csv");
  fs.writeFileSync(clientsPath, clientsCSV, "utf-8");
  console.log(`✓ Created ${clientsPath}`);
}

function generatePropertiesCSV(count: number): string {
  const headers = [
    "property_name", "property_type", "transaction_type", "price", "area",
    "address_city", "address_state", "municipality", "bedrooms", "bathrooms",
    "size_net_sqm", "size_gross_sqm", "floor", "elevator", "accepts_pets",
    "furnished", "heating_type", "energy_cert_class", "condition", "property_status", "description"
  ];

  const rows: string[][] = [headers];

  for (let i = 0; i < count; i++) {
    const propertyType = pickWeighted(PROPERTY_TYPES).type;
    const location = pick(ALL_AREAS);
    const txnType = Math.random() > 0.3 ? "SALE" : "RENTAL";
    const price = txnType === "SALE" ? rand(80000, 600000) : rand(400, 2500);
    const bedrooms = ["APARTMENT", "HOUSE", "MAISONETTE"].includes(propertyType) ? rand(1, 5) : 0;
    const bathrooms = Math.max(1, Math.floor(bedrooms / 2) + rand(0, 1));
    const sizeNet = rand(50, 250);
    
    const nameTemplates = PROPERTY_NAME_TEMPLATES[propertyType as keyof typeof PROPERTY_NAME_TEMPLATES] || 
                          PROPERTY_NAME_TEMPLATES.APARTMENT;
    const name = pick(nameTemplates).replace("{area}", location.area);

    rows.push([
      `"${name}"`,
      propertyType,
      txnType,
      String(Math.round(price * location.priceMultiplier)),
      location.area,
      location.city,
      location.state,
      location.municipality,
      String(bedrooms),
      String(bathrooms),
      String(sizeNet),
      String(sizeNet + rand(5, 30)),
      String(rand(0, 6)),
      Math.random() > 0.5 ? "true" : "false",
      Math.random() > 0.5 ? "true" : "false",
      pick(FURNISHED_OPTIONS),
      pick(HEATING_TYPES),
      pick(ENERGY_CLASSES),
      pick(PROPERTY_CONDITIONS),
      "ACTIVE",
      `"Property for ${txnType.toLowerCase()} in ${location.area}"`
    ]);
  }

  return rows.map(row => row.join(",")).join("\n");
}

function generateClientsCSV(count: number): string {
  const headers = [
    "client_name", "client_type", "client_status", "intent", "purpose",
    "budget_min", "budget_max", "primary_email", "primary_phone",
    "billing_city", "billing_state", "person_type", "timeline",
    "financing_type", "lead_source", "description"
  ];

  const rows: string[][] = [headers];

  for (let i = 0; i < count; i++) {
    const firstName = pick(GREEK_FIRST_NAMES);
    const lastName = pick(GREEK_LAST_NAMES);
    const clientType = pick(CLIENT_TYPES);
    const intent = clientType === "BUYER" ? "BUY" : clientType === "RENTER" ? "RENT" : clientType === "INVESTOR" ? "INVEST" : "SELL";
    const budgetMin = intent === "RENT" ? rand(400, 1200) : rand(100000, 400000);
    const budgetMax = budgetMin + (intent === "RENT" ? rand(200, 600) : rand(50000, 200000));

    rows.push([
      `"${firstName} ${lastName}"`,
      clientType,
      pick(CLIENT_STATUSES),
      intent,
      pick(PURPOSES),
      String(budgetMin),
      String(budgetMax),
      generateEmail(firstName, lastName),
      generatePhone(),
      pick(["Athens", "Thessaloniki", "Piraeus"]),
      "Attica",
      Math.random() > 0.85 ? "COMPANY" : "INDIVIDUAL",
      pick(TIMELINES),
      pick(FINANCING_TYPES),
      pick(LEAD_SOURCES),
      `"Looking for property in Athens area"`
    ]);
  }

  return rows.map(row => row.join(",")).join("\n");
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log("🚀 Demo Data Seed Script");
  console.log("========================\n");

  // Parse command line arguments
  const args = process.argv.slice(2);
  const clerkUserIdIndex = args.indexOf("--clerk-user-id");
  const appendMode = args.includes("--append");
  
  if (clerkUserIdIndex === -1 || !args[clerkUserIdIndex + 1]) {
    console.error("❌ Error: --clerk-user-id argument is required");
    console.error("Usage: npx tsx scripts/seed-demo-data.ts --clerk-user-id user_xxxxx [--append]");
    console.error("  --append: Only add documents and reports to existing data");
    process.exit(1);
  }

  const clerkUserId = args[clerkUserIdIndex + 1];

  // Check environment
  if (!process.env.CLERK_SECRET_KEY) {
    console.error("❌ Error: CLERK_SECRET_KEY environment variable is not set");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  try {
    // Step 1: Find organization and user
    const { orgId, userDbId } = await findOrganizationId(clerkUserId);

    // Step 2: Get all organization users
    const orgUsers = await getOrganizationUsers(orgId);
    if (orgUsers.length === 0) {
      // Fallback to just the requesting user
      orgUsers.push({ id: userDbId, name: null });
    }
    console.log(`✓ Found ${orgUsers.length} organization user(s)`);

    let propertyIds: string[];
    let clientIds: string[];

    if (appendMode) {
      console.log("\n📌 Append mode: Using existing properties and clients");
      
      // Get existing property and client IDs
      const existingProperties = await prismadb.properties.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });
      propertyIds = existingProperties.map(p => p.id);
      
      const existingClients = await prismadb.clients.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });
      clientIds = existingClients.map(c => c.id);
      
      console.log(`✓ Found ${propertyIds.length} existing properties`);
      console.log(`✓ Found ${clientIds.length} existing clients`);
    } else {
      // Step 3: Seed properties
      propertyIds = await seedProperties(orgId, orgUsers);
      
      // Get areas from created properties for client matchmaking
      const propertyAreas = await prismadb.properties.findMany({
        where: { id: { in: propertyIds } },
        select: { area: true },
      });
      const areas = propertyAreas.map(p => p.area).filter(Boolean) as string[];

      // Step 4: Seed clients with matchmaking data
      clientIds = await seedClients(orgId, orgUsers, areas);

      // Step 5: Seed social posts
      await seedSocialPosts(orgId, orgUsers, propertyIds, clientIds);

      // Step 6: Seed tasks
      await seedTasks(orgId, orgUsers, clientIds);
    }

    // Step 7: Seed documents
    const documentIds = await seedDocuments(orgId, orgUsers, propertyIds, clientIds);

    // Step 8: Seed deals
    const dealIds = await seedDeals(orgId, orgUsers, propertyIds, clientIds);

    // Step 9: Seed property showings
    await seedShowings(orgId, orgUsers, propertyIds, clientIds);

    // Step 10: Seed marketing spend
    await seedMarketingSpend(orgId, orgUsers);

    // Step 11: Seed agent hours
    await seedAgentHours(orgId, orgUsers, dealIds);

    // Step 12: Seed market data
    await seedMarketData(orgId);

    // Step 13: Seed export history
    await seedExportHistory(orgId, orgUsers, propertyIds, clientIds);

    // Step 14: Generate import CSV files
    generateImportCSVs();

    console.log("\n✨ Demo data seeding complete!");
    console.log("\nSummary:");
    if (!appendMode) {
      console.log(`  - Properties: ${CONFIG.PROPERTIES_COUNT}`);
      console.log(`  - Clients: ${CONFIG.CLIENTS_COUNT}`);
      console.log(`  - Social Posts: ${CONFIG.SOCIAL_POSTS_COUNT}`);
      console.log(`  - Tasks: ${CONFIG.TASKS_COUNT}`);
    }
    console.log(`  - Documents: ${CONFIG.DOCUMENTS_COUNT}`);
    console.log(`  - Deals: ${CONFIG.DEALS_COUNT}`);
    console.log(`  - Property Showings: ${CONFIG.SHOWINGS_COUNT}`);
    console.log(`  - Marketing Spend: ${CONFIG.MARKETING_SPEND_COUNT}`);
    console.log(`  - Agent Hours: ${CONFIG.AGENT_HOURS_COUNT}`);
    console.log(`  - Market Data: ${CONFIG.MARKET_DATA_COUNT}`);
    console.log(`  - Export History: 30`);
    console.log(`  - Import CSV files: 2`);
    console.log(`\nOrganization: ${orgId}`);

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prismadb.$disconnect();
  }
}

main();
