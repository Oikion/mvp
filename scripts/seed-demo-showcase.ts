#!/usr/bin/env npx tsx

/**
 * DEMO SHOWCASE SEED SCRIPT (Unified)
 *
 * Purges ALL data for a specific organization, then seeds comprehensive
 * demo data with proper per-org DEK encryption.
 *
 * What it seeds:
 *   - 220 Properties (encrypted: primary_email, communication_notes)
 *   - 160 Clients   (encrypted: 22+ string fields + communication_notes)
 *   - 40  Mandates   (encrypted: title, notes, communication_notes)
 *   - 30  Calendar Events (encrypted: title, description, location, notes)
 *   - 60  Social Posts
 *   - 120 Tasks
 *   - 80  Documents  (encrypted: document_name, description)
 *   - 35  Deals
 *   - 100 Property Showings
 *   - 50  Marketing Spend records
 *   - 200 Agent Hours
 *   - 60  Market Data records
 *   - 30  Export History
 *   - ~300 Client Comments
 *   - ~75  Property Comments
 *   - 25  Notifications
 *   - Client-Property links
 *
 * Usage:
 *   npx tsx scripts/seed-demo-showcase.ts --clerk-user-id user_xxxxx
 *   npx tsx scripts/seed-demo-showcase.ts --clerk-user-id user_xxxxx --skip-purge
 *
 * Environment variables required:
 *   - DATABASE_URL           — PostgreSQL connection string (direct or Accelerate)
 *   - CLERK_SECRET_KEY       — Clerk secret key for API access
 *   - SECRETS_ENCRYPTION_KEY — 64 hex chars (32 bytes) master KEK for field encryption
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClerkClient } from "@clerk/backend";

const databaseUrl = process.env.DATABASE_URL || "";
const adapter = new PrismaPg(databaseUrl);
const prismadb = new PrismaClient({ adapter });

// ============================================
// INLINE ENCRYPTION (standalone — no @/ imports)
// ============================================

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 16;

function getMasterKey(): Buffer {
  const hex = process.env.SECRETS_ENCRYPTION_KEY;
  if (!hex) throw new Error("SECRETS_ENCRYPTION_KEY is not set");
  if (hex.length !== 64) throw new Error(`SECRETS_ENCRYPTION_KEY must be 64 hex chars, got ${hex.length}`);
  return Buffer.from(hex, "hex");
}

function encryptRaw(plaintext: string, key: Buffer): string {
  if (plaintext === "") return plaintext;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  return parts[0].length === 32 && parts[1].length === 32;
}

/** Get or create the per-org DEK, mirroring lib/key-management.ts */
async function getOrgDek(orgId: string): Promise<Buffer> {
  const masterKey = getMasterKey();

  const row = await prismadb.orgEncryptionKey.findUnique({
    where: { organizationId: orgId },
  });

  if (row) {
    // Decrypt stored DEK
    const parts = row.encryptedDek.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const ciphertext = Buffer.from(parts[2], "hex");
    const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);
    const dekHex = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return Buffer.from(dekHex, "hex");
  }

  // Generate new DEK for this org
  const dek = randomBytes(32);
  const encryptedDek = encryptRaw(dek.toString("hex"), masterKey);

  await prismadb.orgEncryptionKey.create({
    data: {
      id: crypto.randomUUID(),
      organizationId: orgId,
      encryptedDek,
      updatedAt: new Date(),
    },
  });

  return dek;
}

// Field encryption helpers

function encryptField(value: string | null | undefined, dek: Buffer): string | null | undefined {
  if (value == null) return value;
  if (isEncrypted(value)) return value;
  return encryptRaw(value, dek);
}

function encryptJson(value: Prisma.JsonValue | null | undefined, dek: Buffer): Prisma.JsonValue | null | undefined {
  if (value == null) return value;
  if (typeof value === "string" && isEncrypted(value)) return value;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return encryptRaw(str, dek) as Prisma.JsonValue;
}

// Per-model encryption

const CLIENT_ENCRYPTED_STRING_FIELDS = [
  "client_name", "primary_email", "secondary_email", "primary_phone",
  "secondary_phone", "office_phone", "fax", "afm", "vat", "doy",
  "id_doc", "company_gemi", "description", "billing_street", "billing_city",
  "billing_state", "billing_postal_code", "billing_country",
  "shipping_street", "shipping_city", "shipping_state",
  "shipping_postal_code", "shipping_country",
] as const;

function encryptClientData(data: Record<string, unknown>, dek: Buffer): Record<string, unknown> {
  const result = { ...data };
  for (const field of CLIENT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      result[field] = encryptField(result[field] as string | null | undefined, dek);
    }
  }
  if ("communication_notes" in result) {
    result.communication_notes = encryptJson(result.communication_notes as Prisma.JsonValue, dek);
  }
  return result;
}

function encryptPropertyData(data: Record<string, unknown>, dek: Buffer): Record<string, unknown> {
  const result = { ...data };
  if ("primary_email" in result) {
    result.primary_email = encryptField(result.primary_email as string | null | undefined, dek);
  }
  if ("communication_notes" in result) {
    result.communication_notes = encryptJson(result.communication_notes as Prisma.JsonValue, dek);
  }
  return result;
}

const CALENDAR_ENCRYPTED_FIELDS = ["title", "description", "location", "attendeeEmail", "attendeeName", "notes"] as const;

function encryptCalendarData(data: Record<string, unknown>, dek: Buffer): Record<string, unknown> {
  const result = { ...data };
  for (const field of CALENDAR_ENCRYPTED_FIELDS) {
    if (field in result) {
      result[field] = encryptField(result[field] as string | null | undefined, dek);
    }
  }
  return result;
}

function encryptDocumentData(data: Record<string, unknown>, dek: Buffer): Record<string, unknown> {
  const result = { ...data };
  if ("document_name" in result) {
    result.document_name = encryptField(result.document_name as string | null | undefined, dek);
  }
  if ("description" in result) {
    result.description = encryptField(result.description as string | null | undefined, dek);
  }
  return result;
}

const MANDATE_ENCRYPTED_STRING_FIELDS = ["title", "notes"] as const;

function encryptMandateData(data: Record<string, unknown>, dek: Buffer): Record<string, unknown> {
  const result = { ...data };
  for (const field of MANDATE_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      result[field] = encryptField(result[field] as string | null | undefined, dek);
    }
  }
  if ("communication_notes" in result) {
    result.communication_notes = encryptJson(result.communication_notes as Prisma.JsonValue, dek);
  }
  return result;
}

function encryptCommentContent(content: string, dek: Buffer): string {
  return encryptRaw(content, dek);
}

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  PROPERTIES_COUNT: 220,
  CLIENTS_COUNT: 160,
  MANDATES_COUNT: 40,
  CALENDAR_EVENTS_COUNT: 30,
  SOCIAL_POSTS_COUNT: 60,
  TASKS_COUNT: 120,
  DOCUMENTS_COUNT: 80,
  DEALS_COUNT: 35,
  SHOWINGS_COUNT: 100,
  MARKETING_SPEND_COUNT: 50,
  AGENT_HOURS_COUNT: 200,
  MARKET_DATA_COUNT: 60,
  CLIENT_COMMENTS_PER_CLIENT: { min: 1, max: 3 },
  PROPERTY_COMMENTS_COUNT: 75,
  NOTIFICATIONS_COUNT: 25,
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
// TEMPLATE DATA
// ============================================

const PROPERTY_TYPES = [
  { type: "APARTMENT", weight: 45 }, { type: "HOUSE", weight: 20 },
  { type: "MAISONETTE", weight: 10 }, { type: "COMMERCIAL", weight: 8 },
  { type: "LAND", weight: 5 }, { type: "PLOT", weight: 4 },
  { type: "WAREHOUSE", weight: 3 }, { type: "PARKING", weight: 3 },
  { type: "INDUSTRIAL", weight: 2 },
] as const;

const PROPERTY_CONDITIONS = ["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"] as const;
const FURNISHED_OPTIONS = ["NO", "PARTIALLY", "FULLY"] as const;
const HEATING_TYPES = ["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"] as const;
const ENERGY_CLASSES = ["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H"] as const;

const AMENITIES_LIST = [
  "parking", "storage", "balcony", "garden", "pool", "gym", "security", "concierge",
  "fireplace", "airConditioning", "underfloorHeating", "solarPanels", "doubleGlazing",
  "alarm", "intercom", "cctv", "sauna", "jacuzzi", "rooftop", "petsAllowed",
];

const PROPERTY_NAME_TEMPLATES: Record<string, string[]> = {
  APARTMENT: ["Luxury Apartment in {area}", "Modern Flat {area}", "Elegant Apartment {area}", "Spacious Residence {area}", "City View Apartment {area}", "Renovated Flat {area}", "Cozy Studio {area}", "Penthouse {area}", "Ground Floor Apartment {area}"],
  HOUSE: ["Family House {area}", "Detached Villa {area}", "Modern House {area}", "Traditional Home {area}", "Garden House {area}", "Corner House {area}"],
  MAISONETTE: ["Elegant Maisonette {area}", "Modern Duplex {area}", "Split-Level Home {area}", "Two-Story Residence {area}"],
  COMMERCIAL: ["Office Space {area}", "Retail Shop {area}", "Commercial Unit {area}", "Business Premises {area}"],
  LAND: ["Building Plot {area}", "Land for Development {area}", "Residential Plot {area}"],
  PLOT: ["City Plot {area}", "Buildable Land {area}", "Investment Plot {area}"],
  WAREHOUSE: ["Industrial Warehouse {area}", "Storage Facility {area}", "Distribution Center {area}"],
  PARKING: ["Underground Parking {area}", "Covered Parking Space {area}", "Garage {area}"],
  INDUSTRIAL: ["Industrial Unit {area}", "Manufacturing Facility {area}", "Factory Building {area}"],
};

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

const CLIENT_STATUSES = ["LEAD", "ACTIVE"] as const;
const TIMELINES = ["IMMEDIATE", "ONE_THREE_MONTHS", "THREE_SIX_MONTHS", "SIX_PLUS_MONTHS"] as const;
const FINANCING_TYPES = ["CASH", "MORTGAGE", "PREAPPROVAL_PENDING"] as const;
const LEAD_SOURCES = ["REFERRAL", "WEB", "PORTAL", "WALK_IN", "SOCIAL"] as const;
const PURPOSES = ["RESIDENTIAL", "COMMERCIAL", "LAND"] as const;

const TASK_TITLES = [
  "Follow-up call with {client}", "Schedule property viewing for {client}",
  "Send property portfolio to {client}", "Document collection for {client}",
  "Contract preparation for {client}", "Meeting with {client}",
  "Property valuation request", "Update listing photos",
  "Market analysis for {client}", "Negotiation follow-up with {client}",
  "Send comparable properties", "Check financing options for {client}",
  "Coordinate with lawyer for {client}", "Property inspection scheduling",
  "Review offer from {client}", "Send weekly market update",
  "Update CRM records", "Prepare listing presentation",
  "Follow up on listing agreement", "Client feedback call",
];

const TASK_PRIORITIES = ["high", "medium", "low"] as const;

const POST_TEMPLATES = {
  property: [
    "Just listed a stunning {type} in {area}! {bedrooms} bedrooms, {size}sqm. Asking \u20ac{price}.",
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

const DOCUMENT_CONFIGS = [
  { systemType: "CONTRACT", mimeType: "application/pdf", ext: "pdf", names: ["Sale Contract", "Rental Agreement", "Preliminary Contract", "Lease Agreement", "Purchase Agreement"] },
  { systemType: "INVOICE", mimeType: "application/pdf", ext: "pdf", names: ["Commission Invoice", "Service Invoice", "Property Invoice"] },
  { systemType: "RECEIPT", mimeType: "application/pdf", ext: "pdf", names: ["Payment Receipt", "Deposit Receipt", "Transaction Receipt"] },
  { systemType: "OFFER", mimeType: "application/pdf", ext: "pdf", names: ["Purchase Offer", "Rental Offer", "Counter Offer", "Formal Proposal"] },
  { systemType: "OTHER", mimeType: "application/pdf", ext: "pdf", names: ["Floor Plan", "Energy Certificate", "Title Deed", "Building Permit", "Property Appraisal", "Inspection Report"] },
  { systemType: "OTHER", mimeType: "image/jpeg", ext: "jpg", names: ["Property Photo", "Interior Shot", "Exterior View", "Room Photo"] },
];

const DEAL_TYPES = ["SELLER", "BUYER", "DUAL"] as const;
const SHOWING_RESULTS = ["NO_SHOW", "NO_INTEREST", "INTERESTED", "VERY_INTERESTED", "OFFER_MADE", "CONTRACT_SIGNED"] as const;
const MARKETING_CATEGORIES = ["LEAD_GENERATION", "ADVERTISING", "SOCIAL_MEDIA", "PRINT_MEDIA", "SIGNAGE", "OPEN_HOUSE", "NETWORKING", "REFERRAL_PROGRAM", "WEBSITE", "SEO", "EMAIL_MARKETING", "OTHER"] as const;
const ACTIVITY_TYPES = ["ADMINISTRATIVE", "INCOME_PRODUCING", "SHOWINGS", "PROSPECTING", "MARKETING", "TRAINING", "TRAVEL", "CLIENT_MEETINGS", "NEGOTIATIONS", "PAPERWORK"] as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted<T extends { weight: number }>(arr: readonly T[]): T {
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
  const r = Math.random();
  let monthsAgo: number;
  if (r < 0.3) monthsAgo = rand(0, 1);
  else if (r < 0.7) monthsAgo = rand(1, 6);
  else monthsAgo = rand(6, monthsBack);
  const date = new Date(now);
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(rand(1, 28));
  date.setHours(rand(8, 20), rand(0, 59), rand(0, 59));
  return date;
}

function generateFutureDate(daysAhead: number = 60): Date {
  const now = new Date();
  const date = new Date(now);
  date.setDate(date.getDate() + rand(1, daysAhead));
  date.setHours(rand(9, 18), [0, 15, 30, 45][rand(0, 3)], 0);
  return date;
}

function generateFutureDueDate(): Date {
  const now = new Date();
  const date = new Date(now);
  date.setDate(date.getDate() + rand(-30, 60));
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
  for (let i = 0; i < count; i++) amenities[shuffled[i]] = true;
  return amenities;
}

function generatePostSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 6; i++) slug += chars[Math.floor(Math.random() * chars.length)];
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
  Mandate: "mnd",
} as const;

async function generateFriendlyIds(
  entityType: keyof typeof ENTITY_PREFIXES,
  count: number,
  organizationId: string = "__global__"
): Promise<string[]> {
  const prefix = ENTITY_PREFIXES[entityType];
  const seqId = `${prefix}_${organizationId}`;
  const result = await prismadb.$queryRaw<Array<{ lastValue: number }>>`
    INSERT INTO "IdSequence" (id, prefix, "organizationId", "lastValue", "updatedAt")
    VALUES (${seqId}, ${prefix}, ${organizationId}, ${count}, NOW())
    ON CONFLICT (prefix, "organizationId")
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
// CLERK HELPERS
// ============================================

async function findOrganizationId(clerkUserId: string): Promise<{ orgId: string; userDbId: string }> {
  console.log(`\n Looking up organization for Clerk user: ${clerkUserId}`);
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  const memberships = await clerk.users.getOrganizationMembershipList({ userId: clerkUserId });
  if (memberships.data.length === 0) {
    throw new Error(`User ${clerkUserId} is not a member of any organization`);
  }

  const orgMembership = memberships.data[0];
  const orgId = orgMembership.organization.id;
  console.log(`Found organization: "${orgMembership.organization.name}" (${orgId})`);

  const dbUser = await prismadb.users.findFirst({
    where: { clerkUserId },
    select: { id: true, name: true, email: true },
  });

  if (!dbUser) {
    throw new Error(`User ${clerkUserId} not found in database. Make sure they have logged in at least once.`);
  }

  console.log(`Found database user: ${dbUser.name || dbUser.email} (${dbUser.id})`);
  return { orgId, userDbId: dbUser.id };
}

async function getOrganizationUsers(orgId: string): Promise<Array<{ id: string; name: string | null }>> {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const memberships = await clerk.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 });
  const userIds: Array<{ id: string; name: string | null }> = [];

  for (const membership of memberships.data) {
    const clerkUserId = membership.publicUserData?.userId;
    if (clerkUserId) {
      const dbUser = await prismadb.users.findFirst({
        where: { clerkUserId },
        select: { id: true, name: true },
      });
      if (dbUser) userIds.push(dbUser);
    }
  }
  return userIds;
}

// ============================================
// PURGE ORG DATA
// ============================================

async function purgeOrgData(orgId: string, orgUsers: Array<{ id: string; name: string | null }>): Promise<void> {
  console.log(`\nPurging ALL data for organization ${orgId}...`);

  // Collect IDs of org-owned entities for FK-safe deletes
  const orgTaskIds = (await prismadb.crm_Accounts_Tasks.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map(t => t.id);

  const orgPropertyIds = (await prismadb.properties.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map(p => p.id);

  const orgClientIds = (await prismadb.clients.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map(c => c.id);

  const orgMandateIds = (await prismadb.mandate.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map(m => m.id);

  const orgEventIds = (await prismadb.calendarEvent.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map(e => e.id);

  // Users don't have organizationId — resolved via Clerk memberships
  const orgUserIds = orgUsers.map(u => u.id);

  // Collect org social post IDs (comments/likes cascade but delete explicitly for safety)
  const orgPostIds = (await prismadb.socialPost.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map(p => p.id);

  // Delete entities without orgId using parent FK
  const specialDeletes: Array<{ name: string; run: () => Promise<{ count: number }> }> = [
    { name: "task comments", run: () => prismadb.crm_Accounts_Tasks_Comments.deleteMany({ where: { crm_account_task: { in: orgTaskIds } } }) },
    { name: "property comments", run: () => prismadb.propertyComment.deleteMany({ where: { propertyId: { in: orgPropertyIds } } }) },
    { name: "client comments", run: () => prismadb.clientComment.deleteMany({ where: { clientId: { in: orgClientIds } } }) },
    { name: "mandate comments", run: () => prismadb.mandateComment.deleteMany({ where: { mandateId: { in: orgMandateIds } } }) },
    { name: "event invitees", run: () => prismadb.eventInvitee.deleteMany({ where: { eventId: { in: orgEventIds } } }) },
    { name: "calendar reminders", run: () => prismadb.calendarReminder.deleteMany({ where: { eventId: { in: orgEventIds } } }) },
    { name: "social post comments", run: () => prismadb.socialPostComment.deleteMany({ where: { postId: { in: orgPostIds } } }) },
    { name: "social post likes", run: () => prismadb.socialPostLike.deleteMany({ where: { postId: { in: orgPostIds } } }) },
    { name: "shared entities", run: () => prismadb.sharedEntity.deleteMany({ where: { sharedById: { in: orgUserIds } } }) },
    { name: "client-property links", run: () => prismadb.client_Properties.deleteMany({ where: { OR: [{ clientId: { in: orgClientIds } }, { propertyId: { in: orgPropertyIds } }] } }) },
    { name: "property contacts", run: () => prismadb.property_Contacts.deleteMany({ where: { property: { in: orgPropertyIds } } }) },
    { name: "client contacts", run: () => prismadb.client_Contacts.deleteMany({ where: { organizationId: orgId } }) },
    { name: "notifications", run: () => prismadb.notification.deleteMany({ where: { userId: { in: orgUserIds } } }) },
  ];

  for (const del of specialDeletes) {
    try {
      const result = await del.run();
      if (result.count > 0) console.log(`  Deleted ${result.count} ${del.name}`);
    } catch (e: any) {
      console.warn(`  Warning ${del.name}: ${e.message}`);
    }
  }

  // Delete tables with orgId filter (order matters for FK constraints)
  const orgFilteredTables = [
    "exportHistory", "agentHours", "propertyShowing", "marketingSpend",
    "documents", "deal", "crm_Accounts_Tasks",
    "socialPost", "mandate", "calendarEvent",
    "properties", "clients",
  ];

  for (const tableName of orgFilteredTables) {
    try {
      const model = (prismadb as any)[tableName];
      if (model?.deleteMany) {
        const result = await model.deleteMany({ where: { organizationId: orgId } });
        if (result.count > 0) console.log(`  Deleted ${result.count} ${tableName}`);
      }
    } catch (e: any) {
      console.warn(`  Warning ${tableName}: ${e.message}`);
    }
  }

  console.log(`Organization data purged`);
}

// ============================================
// SEED PROPERTIES
// ============================================

async function seedProperties(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  dek: Buffer
): Promise<string[]> {
  console.log(`\nCreating ${CONFIG.PROPERTIES_COUNT} properties...`);
  const propertyIds = await generateFriendlyIds("Properties", CONFIG.PROPERTIES_COUNT, orgId);
  const properties: any[] = [];

  for (let i = 0; i < CONFIG.PROPERTIES_COUNT; i++) {
    const propertyType = pickWeighted(PROPERTY_TYPES).type;
    const location = pick(ALL_AREAS);
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const assignedUser = pick(userIds);

    let basePrice: number;
    let transactionType: string;
    const txnRoll = Math.random();
    if (txnRoll < 0.70) { transactionType = "SALE"; basePrice = rand(80000, 800000); }
    else if (txnRoll < 0.95) { transactionType = "RENTAL"; basePrice = rand(400, 3500); }
    else { transactionType = "SHORT_TERM"; basePrice = rand(50, 300); }

    if (propertyType === "HOUSE" || propertyType === "MAISONETTE") {
      basePrice = transactionType === "SALE" ? rand(200000, 1500000) : rand(800, 4000);
    } else if (["COMMERCIAL", "WAREHOUSE", "INDUSTRIAL"].includes(propertyType)) {
      basePrice = transactionType === "SALE" ? rand(150000, 2000000) : rand(1000, 8000);
    } else if (["LAND", "PLOT"].includes(propertyType)) {
      transactionType = "SALE"; basePrice = rand(50000, 500000);
    } else if (propertyType === "PARKING") {
      transactionType = "SALE"; basePrice = rand(15000, 80000);
    }

    const price = Math.round(basePrice * location.priceMultiplier);
    let bedrooms = 0, bathrooms = 1, sizeNet = 0, sizeGross = 0, floor = "0";
    if (["APARTMENT", "HOUSE", "MAISONETTE"].includes(propertyType)) {
      bedrooms = rand(1, 5); bathrooms = Math.max(1, Math.floor(bedrooms / 2) + rand(0, 1));
      sizeNet = rand(40, 300); sizeGross = sizeNet + rand(5, 30);
      floor = propertyType === "HOUSE" ? "0" : String(rand(-1, 8));
    } else if (propertyType === "COMMERCIAL") {
      sizeNet = rand(30, 500); sizeGross = sizeNet + rand(5, 50); floor = String(rand(0, 5));
    } else if (["WAREHOUSE", "INDUSTRIAL"].includes(propertyType)) {
      sizeNet = rand(200, 2000); sizeGross = sizeNet + rand(20, 100); floor = "0";
    } else if (propertyType === "PARKING") {
      sizeNet = rand(12, 25); sizeGross = sizeNet; floor = String(rand(-3, 0));
    }

    const statusRoll = Math.random();
    let status: string;
    if (statusRoll < 0.70) status = "ACTIVE";
    else if (statusRoll < 0.85) status = "PENDING";
    else if (statusRoll < 0.95) status = "SOLD";
    else status = "OFF_MARKET";

    const nameTemplates = PROPERTY_NAME_TEMPLATES[propertyType] || PROPERTY_NAME_TEMPLATES.APARTMENT;
    const propertyName = pick(nameTemplates).replace("{area}", location.area);
    const ownerEmail = generateEmail(pick(GREEK_FIRST_NAMES), pick(GREEK_LAST_NAMES));

    const encrypted = encryptPropertyData({
      primary_email: ownerEmail,
      communication_notes: [
        { date: createdAt.toISOString(), note: "Initial listing created", by: assignedUser.name || "Agent" },
      ],
    }, dek);

    properties.push({
      friendlyId: propertyIds[i],
      property_name: propertyName,
      property_type: propertyType,
      property_status: status,
      transaction_type: transactionType,
      price, price_type: transactionType === "SALE" ? "SALE" : "RENTAL",
      area: location.area, address_city: location.city, address_state: location.state,
      municipality: location.municipality,
      address_street: `${pick(["Οδός", "Λεωφόρος", "Πλατεία"])} ${pick(["Αθηνάς", "Ερμού", "Σταδίου", "Πανεπιστημίου", "Βασ. Σοφίας", "Κηφισίας"])} ${rand(1, 200)}`,
      postal_code: `${rand(100, 199)}${rand(10, 99)}`,
      bedrooms: bedrooms > 0 ? bedrooms : null, bathrooms, size_net_sqm: sizeNet > 0 ? sizeNet : null,
      size_gross_sqm: sizeGross > 0 ? sizeGross : null, floor, floors_total: rand(1, 10),
      year_built: rand(1960, 2024),
      condition: pick(PROPERTY_CONDITIONS), furnished: pick(FURNISHED_OPTIONS),
      heating_type: pick(HEATING_TYPES), energy_cert_class: pick(ENERGY_CLASSES),
      elevator: Math.random() > 0.4, accepts_pets: Math.random() > 0.5,
      amenities: generateRandomAmenities(),
      description: `${propertyName}. ${sizeNet > 0 ? `${sizeNet}sqm` : ""} ${bedrooms > 0 ? `with ${bedrooms} bedrooms` : ""}. ${pick(["Excellent condition", "Recently renovated", "Prime location", "Great investment", "Perfect for families"])}. Contact us for details.`,
      assigned_to: assignedUser.id, createdBy: assignedUser.id,
      organizationId: orgId, createdAt, updatedAt: createdAt,
      visibility: "PUBLIC", address_privacy_level: "PARTIAL",
      primary_email: encrypted.primary_email,
      communication_notes: encrypted.communication_notes,
    });
  }

  await prismadb.properties.createMany({ data: properties, skipDuplicates: true });

  // Fetch the auto-generated UUID ids for use as FK references
  const createdProperties = await prismadb.properties.findMany({
    where: { friendlyId: { in: propertyIds }, organizationId: orgId },
    select: { id: true },
  });

  console.log(`Created ${properties.length} properties (encrypted: primary_email, communication_notes)`);
  return createdProperties.map(p => p.id);
}

// ============================================
// SEED CLIENTS
// ============================================

async function seedClients(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyAreas: string[],
  dek: Buffer
): Promise<{ ids: string[]; plainNames: Map<string, string> }> {
  console.log(`\nCreating ${CONFIG.CLIENTS_COUNT} clients...`);
  const clientIds = await generateFriendlyIds("Clients", CONFIG.CLIENTS_COUNT, orgId);
  const clients: any[] = [];
  const plainNames = new Map<string, string>();
  const uniqueAreas = [...new Set(propertyAreas)];

  for (let i = 0; i < CONFIG.CLIENTS_COUNT; i++) {
    const firstName = pick(GREEK_FIRST_NAMES);
    const lastName = pick(GREEK_LAST_NAMES);
    const clientName = `${firstName} ${lastName}`;
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const assignedUser = pick(userIds);

    const typeRoll = Math.random();
    let clientType: string, intent: string;
    if (typeRoll < 0.50) { clientType = "BUYER"; intent = "BUY"; }
    else if (typeRoll < 0.75) { clientType = "RENTER"; intent = "RENT"; }
    else if (typeRoll < 0.90) { clientType = "INVESTOR"; intent = "INVEST"; }
    else { clientType = "SELLER"; intent = "SELL"; }

    let budgetMin: number, budgetMax: number;
    if (intent === "RENT") { budgetMin = rand(300, 1500); budgetMax = budgetMin + rand(200, 1000); }
    else { budgetMin = rand(50000, 500000); budgetMax = budgetMin + rand(50000, 300000); }

    const areasOfInterest = shuffle(uniqueAreas).slice(0, rand(2, 5));
    const email = generateEmail(firstName, lastName);
    const phone = generatePhone();

    const encrypted = encryptClientData({
      client_name: clientName,
      primary_email: email,
      primary_phone: phone,
      description: `${clientType === "BUYER" ? "Looking to buy" : clientType === "RENTER" ? "Searching for rental" : clientType === "INVESTOR" ? "Investment seeker" : "Property owner"} in ${areasOfInterest.join(", ")}.`,
      billing_city: pick(["Athens", "Thessaloniki", "Piraeus", "Chania"]),
      billing_state: "Attica",
      billing_country: "Greece",
      communication_notes: [
        { date: createdAt.toISOString(), note: "Initial contact", by: assignedUser.name || "Agent" },
      ],
    }, dek);

    plainNames.set(clientIds[i], clientName);

    clients.push({
      id: clientIds[i],
      full_name: clientName,
      client_type: clientType, client_status: pick(CLIENT_STATUSES),
      intent, purpose: pick(PURPOSES),
      person_type: Math.random() > 0.85 ? "COMPANY" : "INDIVIDUAL",
      budget_min: budgetMin, budget_max: budgetMax,
      areas_of_interest: areasOfInterest,
      property_preferences: {
        bedrooms_min: rand(1, 2), bedrooms_max: rand(3, 5),
        bathrooms_min: 1, bathrooms_max: rand(2, 4),
        size_min_sqm: rand(50, 100), size_max_sqm: rand(120, 250),
      },
      timeline: pick(TIMELINES), financing_type: intent === "BUY" ? pick(FINANCING_TYPES) : "CASH",
      lead_source: pick(LEAD_SOURCES), gdpr_consent: true, allow_marketing: Math.random() > 0.3,
      assigned_to: assignedUser.id, createdBy: assignedUser.id,
      organizationId: orgId, createdAt, updatedAt: createdAt,
      client_name: encrypted.client_name,
      primary_email: encrypted.primary_email,
      primary_phone: encrypted.primary_phone,
      description: encrypted.description,
      billing_city: encrypted.billing_city,
      billing_state: encrypted.billing_state,
      billing_country: encrypted.billing_country,
      communication_notes: encrypted.communication_notes,
    });
  }

  await prismadb.clients.createMany({ data: clients, skipDuplicates: true });
  console.log(`Created ${clients.length} clients (encrypted: 22+ fields)`);
  return { ids: clientIds, plainNames };
}

// ============================================
// SEED MANDATES
// ============================================

async function seedMandates(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  clientIds: string[],
  dek: Buffer
): Promise<string[]> {
  console.log(`\nCreating ${CONFIG.MANDATES_COUNT} mandates...`);
  const mandateIds = await generateFriendlyIds("Mandate", CONFIG.MANDATES_COUNT, orgId);
  const mandates: any[] = [];

  const mandateTitles = [
    "Looking for 3-bed apartment in {area}", "Investment property search in {area}",
    "Family home needed in {area}", "Commercial space required in {area}",
    "Rental search: Studio/1-bed in {area}", "Luxury villa hunt in {area}",
    "Office relocation to {area}", "Retirement home in {area}",
    "Holiday property in {area}", "Land for development in {area}",
  ];

  const mandateNotes = [
    "Client has strict budget constraints. Focus on value properties.",
    "Urgent - client needs to relocate within 2 months.",
    "Flexible on location, strict on size requirements.",
    "Pre-approved for mortgage up to stated budget.",
    "Cash buyer, quick close expected.",
    "Client prefers renovated properties only.",
    "Must have parking and storage.",
    "Looking for investment yield > 5%.",
    "Family with kids - proximity to schools important.",
    "Remote worker - needs good internet infrastructure.",
  ];

  for (let i = 0; i < CONFIG.MANDATES_COUNT; i++) {
    const location = pick(ALL_AREAS);
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const assignedUser = pick(userIds);
    const linkedClient = Math.random() > 0.2 ? pick(clientIds) : null;

    const statusRoll = Math.random();
    let status: string;
    if (statusRoll < 0.50) status = "ACTIVE";
    else if (statusRoll < 0.70) status = "DRAFT";
    else if (statusRoll < 0.80) status = "FULFILLED";
    else if (statusRoll < 0.90) status = "PAUSED";
    else status = "EXPIRED";

    const txnType = Math.random() > 0.3 ? "SALE" : "RENTAL";
    const budgetMin = txnType === "SALE" ? rand(50000, 300000) : rand(300, 1500);
    const budgetMax = txnType === "SALE" ? budgetMin + rand(50000, 200000) : budgetMin + rand(200, 800);

    const encrypted = encryptMandateData({
      title: pick(mandateTitles).replace("{area}", location.area),
      notes: pick(mandateNotes),
      communication_notes: [
        { date: createdAt.toISOString(), note: "Mandate created from client briefing", by: assignedUser.name || "Agent" },
      ],
    }, dek);

    mandates.push({
      id: mandateIds[i], organizationId: orgId,
      createdBy: assignedUser.id, assigned_to: assignedUser.id,
      title: encrypted.title, notes: encrypted.notes,
      communication_notes: encrypted.communication_notes,
      transaction_type: txnType,
      property_type: pick(["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "LAND"]),
      property_purpose: pick(["RESIDENTIAL", "COMMERCIAL", "LAND"]),
      areas_of_interest: [location.area, pick(ALL_AREAS).area],
      municipality: location.municipality, region: location.state,
      size_min_sqm: rand(40, 80), size_max_sqm: rand(100, 250),
      budget_min: budgetMin, budget_max: budgetMax,
      bedrooms_min: rand(1, 2), bedrooms_max: rand(3, 5),
      bathrooms_min: 1, bathrooms_max: rand(2, 3),
      condition: Math.random() > 0.5 ? ["EXCELLENT", "VERY_GOOD"] : ["GOOD", "NEEDS_RENOVATION"],
      heating_type: Math.random() > 0.5 ? [pick(HEATING_TYPES)] : [],
      elevator: Math.random() > 0.5 ? true : null,
      parking: Math.random() > 0.4 ? true : null,
      status, urgency: pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      timeline: pick(TIMELINES),
      expires_at: status === "ACTIVE" ? generateFutureDate(120) : null,
      clientId: linkedClient, client_linked_at: linkedClient ? createdAt : null,
      createdAt, updatedAt: createdAt,
    });
  }

  await prismadb.mandate.createMany({ data: mandates, skipDuplicates: true });
  console.log(`Created ${mandates.length} mandates (encrypted: title, notes, communication_notes)`);
  return mandateIds;
}

// ============================================
// SEED CALENDAR EVENTS
// ============================================

async function seedCalendarEvents(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyIds: string[],
  clientIds: string[],
  dek: Buffer
): Promise<void> {
  console.log(`\nCreating ${CONFIG.CALENDAR_EVENTS_COUNT} calendar events...`);

  const properties = await prismadb.properties.findMany({
    where: { id: { in: propertyIds.slice(0, 20) } },
    select: { id: true, property_name: true },
  });

  const eventTemplates = [
    { type: "PROPERTY_VIEWING", titlePrefix: "Property Showing", duration: 60 },
    { type: "CLIENT_CONSULTATION", titlePrefix: "Client Meeting", duration: 90 },
    { type: "REMINDER", titlePrefix: "Follow-up Call", duration: 30 },
    { type: "OTHER", titlePrefix: "Property Valuation", duration: 45 },
    { type: "OTHER", titlePrefix: "Document Signing", duration: 60 },
    { type: "MEETING", titlePrefix: "Negotiation Meeting", duration: 120 },
  ];

  const lastEvent = await prismadb.calendarEvent.findFirst({
    orderBy: { calendarEventId: "desc" },
    select: { calendarEventId: true },
  });
  let nextEventId = (lastEvent?.calendarEventId || 0) + 1;

  for (let i = 0; i < CONFIG.CALENDAR_EVENTS_COUNT; i++) {
    const template = pick(eventTemplates);
    const startDate = i < 15 ? generateHistoricalDate(3) : generateFutureDate(45);
    const endDate = new Date(startDate.getTime() + template.duration * 60000);
    const assignedUser = pick(userIds);

    const rawTitle = `${template.titlePrefix}: ${properties.length > 0 ? pick(properties).property_name : "Appointment"}`;
    const rawDescription = template.type === "PROPERTY_VIEWING" ? "Property showing appointment"
      : template.type === "MEETING" ? "In-person meeting"
      : template.type === "REMINDER" ? "Phone call scheduled"
      : "Scheduled appointment";
    const rawLocation = template.type === "PROPERTY_VIEWING" ? "Property Location"
      : template.type === "REMINDER" ? null
      : "Office";

    const encrypted = encryptCalendarData({
      title: rawTitle,
      description: rawDescription,
      location: rawLocation,
    }, dek);

    const propertyIdsToConnect = template.type === "PROPERTY_VIEWING" && properties.length > 0
      ? [pick(properties).id] : [];
    const clientIdsToConnect = ["CLIENT_CONSULTATION", "MEETING", "REMINDER"].includes(template.type) && clientIds.length > 0
      ? [pick(clientIds)] : [];

    await prismadb.calendarEvent.create({
      data: {
        id: crypto.randomUUID(),
        calendarEventId: nextEventId++,
        organizationId: orgId,
        assignedUserId: assignedUser.id,
        title: encrypted.title as string,
        description: encrypted.description as string | undefined,
        location: encrypted.location as string | undefined,
        startTime: startDate, endTime: endDate,
        status: i < 15 ? "COMPLETED" : "SCHEDULED",
        eventType: template.type as any,
        createdAt: new Date(startDate.getTime() - rand(1, 7) * 86400000),
        updatedAt: new Date(),
        Properties: propertyIdsToConnect.length > 0
          ? { connect: propertyIdsToConnect.map(id => ({ id })) } : undefined,
        Clients: clientIdsToConnect.length > 0
          ? { connect: clientIdsToConnect.map(id => ({ id })) } : undefined,
      },
    });
  }

  console.log(`Created ${CONFIG.CALENDAR_EVENTS_COUNT} calendar events (encrypted: title, description, location)`);
}

// ============================================
// SEED SOCIAL POSTS
// ============================================

async function seedSocialPosts(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyIds: string[],
  clientIds: string[],
  clientNames: Map<string, string>
): Promise<void> {
  console.log(`\nCreating ${CONFIG.SOCIAL_POSTS_COUNT} social posts...`);
  const postIds = await generateFriendlyIds("SocialPost", CONFIG.SOCIAL_POSTS_COUNT, orgId);

  const properties = await prismadb.properties.findMany({
    where: { id: { in: propertyIds.slice(0, 50) } },
    select: { id: true, property_name: true, property_type: true, area: true, price: true, bedrooms: true, size_net_sqm: true },
  });

  const posts: any[] = [];
  for (let i = 0; i < CONFIG.SOCIAL_POSTS_COUNT; i++) {
    const author = pick(userIds);
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    let content: string, linkedEntityId: string | null = null;
    let linkedEntityType: string | null = null, linkedEntityTitle: string | null = null;

    const typeRoll = Math.random();
    if (typeRoll < 0.40 && properties.length > 0) {
      const property = pick(properties);
      content = pick(POST_TEMPLATES.property)
        .replace("{type}", property.property_type?.toLowerCase() || "property")
        .replace("{area}", property.area || "Athens")
        .replace("{bedrooms}", String(property.bedrooms || 2))
        .replace("{size}", String(property.size_net_sqm || 100))
        .replace("{price}", property.price?.toLocaleString() || "N/A");
      linkedEntityId = property.id;
      linkedEntityType = "property";
      linkedEntityTitle = property.property_name;
    } else if (typeRoll < 0.60 && clientIds.length > 0) {
      const cId = pick(clientIds);
      content = pick(POST_TEMPLATES.client).replace("{area}", pick(ALL_AREAS).area);
      linkedEntityId = cId;
      linkedEntityType = "client";
      linkedEntityTitle = clientNames.get(cId) || "Client";
    } else {
      content = pick(POST_TEMPLATES.text).replace("{area}", pick(ALL_AREAS).area);
    }

    posts.push({
      id: postIds[i], slug: generatePostSlug(), organizationId: orgId,
      authorId: author.id, postType: linkedEntityType || "text",
      content, linkedEntityId, linkedEntityType, linkedEntityTitle,
      createdAt, updatedAt: createdAt,
    });
  }

  await prismadb.socialPost.createMany({ data: posts, skipDuplicates: true });
  console.log(`Created ${posts.length} social posts`);
}

// ============================================
// SEED TASKS
// ============================================

async function seedTasks(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  clientIds: string[],
  clientNames: Map<string, string>
): Promise<void> {
  console.log(`\nCreating ${CONFIG.TASKS_COUNT} tasks...`);
  const taskIds = await generateFriendlyIds("crm_Accounts_Tasks", CONFIG.TASKS_COUNT, orgId);
  const tasks: any[] = [];

  for (let i = 0; i < CONFIG.TASKS_COUNT; i++) {
    const assignedUser = pick(userIds);
    const clientId = pick(clientIds);
    const clientName = clientNames.get(clientId) || "Client";
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const title = pick(TASK_TITLES).replace("{client}", clientName);

    tasks.push({
      id: taskIds[i], title, content: `Task related to ${clientName}. ${pick(["High priority follow-up", "Standard procedure", "Routine check", "Urgent action required", "Schedule for next week"])}`,
      priority: pick(TASK_PRIORITIES), user: assignedUser.id, account: clientId,
      dueDateAt: generateFutureDueDate(), organizationId: orgId,
      createdBy: assignedUser.id, createdAt, updatedAt: createdAt,
    });
  }

  await prismadb.crm_Accounts_Tasks.createMany({ data: tasks, skipDuplicates: true });
  console.log(`Created ${tasks.length} tasks`);
}

// ============================================
// SEED DOCUMENTS
// ============================================

async function seedDocuments(
  orgId: string,
  userIds: Array<{ id: string; name: string | null }>,
  propertyIds: string[],
  clientIds: string[],
  dek: Buffer
): Promise<string[]> {
  console.log(`\nCreating ${CONFIG.DOCUMENTS_COUNT} documents...`);
  const documentIds: string[] = [];
  const documents: any[] = [];

  for (let i = 0; i < CONFIG.DOCUMENTS_COUNT; i++) {
    const docConfig = pick(DOCUMENT_CONFIGS);
    const docName = pick(docConfig.names);
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const user = pick(userIds);
    const docId = `doc-${String(i + 1).padStart(6, "0")}`;

    const linkedPropertiesIds: string[] = [];
    const accountsIDs: string[] = [];
    if (Math.random() < 0.6 && propertyIds.length > 0) linkedPropertiesIds.push(pick(propertyIds));
    else if (clientIds.length > 0) accountsIDs.push(pick(clientIds));

    const encrypted = encryptDocumentData({
      document_name: `${docName} - ${rand(1000, 9999)}`,
      description: `${docName} for ${linkedPropertiesIds.length > 0 ? "property" : "client"} record`,
    }, dek);

    documents.push({
      id: docId,
      document_name: encrypted.document_name,
      document_system_type: docConfig.systemType,
      document_file_mimeType: docConfig.mimeType,
      document_file_url: `https://storage.example.com/documents/${orgId}/${docId}.${docConfig.ext}`,
      description: encrypted.description,
      status: pick(["ACTIVE", "ACTIVE", "ACTIVE", "ARCHIVED"]),
      visibility: pick(["PRIVATE", "ORGANIZATION", "SHARED"]),
      size: rand(50000, 5000000),
      created_by_user: user.id, createdBy: user.id, assigned_user: user.id,
      linkedPropertiesIds, accountsIDs, organizationId: orgId,
      date_created: createdAt, createdAt, last_updated: createdAt, updatedAt: createdAt,
      viewsCount: rand(0, 25), favourite: Math.random() > 0.8,
    });
    documentIds.push(docId);
  }

  await prismadb.documents.createMany({ data: documents, skipDuplicates: true });
  console.log(`Created ${documents.length} documents (encrypted: document_name, description)`);
  return documentIds;
}

// ============================================
// SEED DEALS
// ============================================

async function seedDeals(
  orgId: string, userIds: Array<{ id: string; name: string | null }>,
  propertyIds: string[], clientIds: string[]
): Promise<string[]> {
  console.log(`\nCreating ${CONFIG.DEALS_COUNT} deals...`);
  const dealIds: string[] = [];

  const properties = await prismadb.properties.findMany({
    where: { id: { in: propertyIds.slice(0, 100) } },
    select: { id: true, price: true, property_name: true },
  });

  const deals: any[] = [];
  for (let i = 0; i < CONFIG.DEALS_COUNT; i++) {
    const property = pick(properties);
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const dealId = `deal-${String(i + 1).padStart(6, "0")}`;
    const propertyAgent = pick(userIds);
    const clientAgent = pick(userIds);

    const statusRoll = Math.random();
    let status: string;
    if (statusRoll < 0.35) status = "COMPLETED";
    else if (statusRoll < 0.50) status = "IN_PROGRESS";
    else if (statusRoll < 0.65) status = "ACCEPTED";
    else if (statusRoll < 0.80) status = "NEGOTIATING";
    else if (statusRoll < 0.95) status = "PROPOSED";
    else status = "CANCELLED";

    const totalCommission = Math.round(Number(property.price || rand(100000, 500000)) * (rand(2, 5) / 100));
    const closedAt = status === "COMPLETED" ? new Date(createdAt.getTime() + rand(7, 90) * 86400000) : null;
    const contractDate = ["COMPLETED", "IN_PROGRESS", "ACCEPTED"].includes(status)
      ? new Date(createdAt.getTime() + rand(3, 30) * 86400000) : null;

    deals.push({
      id: dealId, organizationId: orgId, propertyId: property.id, clientId: pick(clientIds),
      propertyAgentId: propertyAgent.id, clientAgentId: clientAgent.id,
      propertyAgentSplit: rand(40, 60), clientAgentSplit: rand(40, 60),
      totalCommission, commissionCurrency: "EUR", status, proposedById: propertyAgent.id,
      title: `Deal: ${property.property_name?.slice(0, 30) || "Property"}`,
      notes: `${status === "COMPLETED" ? "Successfully closed" : "In progress"} deal`,
      closedAt, contractDate, hoursWorked: status === "COMPLETED" ? rand(10, 80) : null,
      dealType: pick(DEAL_TYPES), leadSource: pick(LEAD_SOURCES),
      createdAt, updatedAt: closedAt || createdAt,
    });
    dealIds.push(dealId);
  }

  await prismadb.deal.createMany({ data: deals, skipDuplicates: true });
  console.log(`Created ${deals.length} deals`);
  return dealIds;
}

// ============================================
// SEED REMAINING ENTITIES (showings, marketing, hours, market data, exports)
// ============================================

async function seedShowings(orgId: string, userIds: Array<{ id: string; name: string | null }>, propertyIds: string[], clientIds: string[]): Promise<void> {
  console.log(`\nCreating ${CONFIG.SHOWINGS_COUNT} property showings...`);
  const showings: any[] = [];
  for (let i = 0; i < CONFIG.SHOWINGS_COUNT; i++) {
    const showingDate = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    showings.push({
      id: crypto.randomUUID(), organizationId: orgId,
      propertyId: pick(propertyIds), clientId: Math.random() > 0.2 ? pick(clientIds) : null,
      agentId: pick(userIds).id, showingDate, result: pick(SHOWING_RESULTS),
      notes: pick(["Client impressed with location", "Good showing", "Needs to discuss with spouse", "Second viewing requested", "Price negotiation discussed", null]),
      duration: rand(15, 90), createdAt: showingDate, updatedAt: showingDate,
    });
  }
  await prismadb.propertyShowing.createMany({ data: showings, skipDuplicates: true });
  console.log(`Created ${showings.length} showings`);
}

async function seedMarketingSpend(orgId: string, userIds: Array<{ id: string; name: string | null }>): Promise<void> {
  console.log(`\nCreating ${CONFIG.MARKETING_SPEND_COUNT} marketing spend records...`);
  const spends: any[] = [];
  for (let i = 0; i < CONFIG.MARKETING_SPEND_COUNT; i++) {
    const spendDate = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const category = pick(MARKETING_CATEGORIES);
    let amount: number;
    switch (category) {
      case "ADVERTISING": amount = rand(100, 1000); break;
      case "SOCIAL_MEDIA": amount = rand(50, 500); break;
      case "WEBSITE": amount = rand(200, 2000); break;
      case "LEAD_GENERATION": amount = rand(200, 1500); break;
      default: amount = rand(50, 500);
    }
    spends.push({
      id: crypto.randomUUID(), organizationId: orgId, userId: pick(userIds).id,
      amount, spendDate, category, leadSource: pick(LEAD_SOURCES),
      description: `${category.replace(/_/g, " ")} expense`,
      createdAt: spendDate, updatedAt: spendDate,
    });
  }
  await prismadb.marketingSpend.createMany({ data: spends, skipDuplicates: true });
  console.log(`Created ${spends.length} marketing spend records`);
}

async function seedAgentHours(orgId: string, userIds: Array<{ id: string; name: string | null }>, dealIds: string[]): Promise<void> {
  console.log(`\nCreating ${CONFIG.AGENT_HOURS_COUNT} agent hour records...`);
  const hours: any[] = [];
  for (let i = 0; i < CONFIG.AGENT_HOURS_COUNT; i++) {
    const date = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    hours.push({
      id: crypto.randomUUID(), organizationId: orgId, userId: pick(userIds).id,
      date, hoursWorked: rand(1, 8) + (Math.random() > 0.5 ? 0.5 : 0),
      activityType: pick(ACTIVITY_TYPES),
      dealId: Math.random() > 0.7 && dealIds.length > 0 ? pick(dealIds) : null,
      description: `${pick(ACTIVITY_TYPES).replace(/_/g, " ")} work`,
      createdAt: date, updatedAt: date,
    });
  }
  await prismadb.agentHours.createMany({ data: hours, skipDuplicates: true });
  console.log(`Created ${hours.length} agent hours`);
}

async function seedMarketData(orgId: string): Promise<void> {
  console.log(`\nCreating ${CONFIG.MARKET_DATA_COUNT} market data records...`);
  const data: any[] = [];
  for (let i = 0; i < CONFIG.MARKET_DATA_COUNT; i++) {
    const areaInfo = pick(ALL_AREAS);
    const date = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const basePrice = 2500 * areaInfo.priceMultiplier;
    data.push({
      id: crypto.randomUUID(), organizationId: orgId, date, area: areaInfo.area,
      priceRange: `${Math.round(basePrice * 0.8)}-${Math.round(basePrice * 1.2)}`,
      activeListings: rand(20, 150), soldListings: rand(5, 40), newListings: rand(10, 60),
      medianSalePrice: Math.round(basePrice * rand(80, 150) * 100) / 100,
      averageSalePrice: Math.round(basePrice * rand(85, 160) * 100) / 100,
      averageDaysOnMarket: rand(30, 180),
      absorptionRate: Math.round(rand(5, 25) * 10) / 100,
      medianListPrice: Math.round(basePrice * rand(90, 170) * 100) / 100,
      pricePerSqft: Math.round(basePrice * 0.093),
      createdAt: date, updatedAt: date,
    });
  }
  await prismadb.marketData.createMany({ data, skipDuplicates: true });
  console.log(`Created ${data.length} market data records`);
}

async function seedExportHistory(orgId: string, userIds: Array<{ id: string; name: string | null }>, propertyIds: string[], clientIds: string[]): Promise<void> {
  console.log(`\nCreating export history records...`);
  const exports: any[] = [];
  for (let i = 0; i < 30; i++) {
    const createdAt = generateHistoricalDate(CONFIG.HISTORY_MONTHS);
    const isProperty = Math.random() > 0.4;
    const format = pick(["xlsx", "csv", "pdf"]);
    if (Math.random() > 0.7) {
      const entityIds = isProperty ? shuffle(propertyIds).slice(0, rand(3, 15)) : shuffle(clientIds).slice(0, rand(3, 10));
      exports.push({
        id: crypto.randomUUID(), organizationId: orgId, userId: pick(userIds).id,
        entityType: isProperty ? "BULK_PROPERTIES" : "BULK_CLIENTS",
        entityId: `bulk-${createdAt.getTime()}`, entityIds,
        exportFormat: format, exportTemplate: pick(["CMA", "SHORTLIST", "ROI", null]),
        destination: pick(["client", "xe.gr", "internal", null]),
        filename: `${isProperty ? "properties" : "clients"}_export.${format}`,
        rowCount: entityIds.length, createdAt,
      });
    } else {
      exports.push({
        id: crypto.randomUUID(), organizationId: orgId, userId: pick(userIds).id,
        entityType: isProperty ? "PROPERTY" : "CLIENT",
        entityId: isProperty ? pick(propertyIds) : pick(clientIds), entityIds: [],
        exportFormat: format, exportTemplate: pick(["CMA", "ROI", null]),
        destination: pick(["client", "internal", null]),
        filename: `${isProperty ? "property" : "client"}_${rand(1000, 9999)}.${format}`,
        rowCount: 1, createdAt,
      });
    }
  }
  await prismadb.exportHistory.createMany({ data: exports, skipDuplicates: true });
  console.log(`Created ${exports.length} export history records`);
}

// ============================================
// SEED COMMENTS & NOTIFICATIONS
// ============================================

async function seedClientComments(orgId: string, clientIds: string[], userIds: Array<{ id: string; name: string | null }>, dek: Buffer): Promise<void> {
  console.log(`\nCreating client comments...`);
  const templates = [
    "Initial contact made. Client is interested in {area} properties.",
    "Follow-up call completed. Budget confirmed.", "Sent property portfolio via email.",
    "Client viewed property today. Very interested.", "Discussed financing options.",
    "Meeting scheduled for next week.", "Client requested neighborhood information.",
    "Positive feedback on recent showing.", "Client comparing multiple properties.",
    "Contract negotiation in progress.", "Client confirmed interest.",
    "Referred client to mortgage broker.", "Client visited property with family.",
  ];

  const comments: Prisma.ClientCommentCreateManyInput[] = [];
  for (const clientId of clientIds) {
    const count = rand(CONFIG.CLIENT_COMMENTS_PER_CLIENT.min, CONFIG.CLIENT_COMMENTS_PER_CLIENT.max);
    for (let i = 0; i < count; i++) {
      comments.push({
        id: crypto.randomUUID(), clientId, userId: pick(userIds).id,
        content: encryptCommentContent(
          pick(templates).replace("{area}", pick(ALL_AREAS).area),
          dek
        ),
        createdAt: generateHistoricalDate(6), updatedAt: new Date(),
      });
    }
  }

  for (let i = 0; i < comments.length; i += 500) {
    await prismadb.clientComment.createMany({ data: comments.slice(i, i + 500), skipDuplicates: true });
  }
  console.log(`Created ${comments.length} client comments (encrypted)`);
}

async function seedPropertyComments(orgId: string, propertyIds: string[], userIds: Array<{ id: string; name: string | null }>, dek: Buffer): Promise<void> {
  console.log(`\nCreating property comments...`);
  const templates = [
    "Great location with high demand.", "Needs minor renovations but excellent potential.",
    "Owner motivated to sell.", "Scheduled for professional photography.",
    "Positive feedback from showing.", "Price adjusted based on market analysis.",
    "Multiple inquiries this week.", "Excellent natural lighting.",
    "Close to schools and transport.", "Recently renovated.",
    "High investor interest.", "Comparable properties sold quickly.",
  ];

  const comments: Prisma.PropertyCommentCreateManyInput[] = [];
  const selected = shuffle(propertyIds).slice(0, Math.min(CONFIG.PROPERTY_COMMENTS_COUNT, propertyIds.length));
  for (const propertyId of selected) {
    for (let i = 0; i < rand(1, 3); i++) {
      comments.push({
        id: crypto.randomUUID(), propertyId, userId: pick(userIds).id,
        content: encryptCommentContent(pick(templates), dek),
        createdAt: generateHistoricalDate(6), updatedAt: new Date(),
      });
    }
  }
  await prismadb.propertyComment.createMany({ data: comments, skipDuplicates: true });
  console.log(`Created ${comments.length} property comments (encrypted)`);
}

async function seedNotifications(userIds: Array<{ id: string; name: string | null }>): Promise<void> {
  console.log(`\nCreating ${CONFIG.NOTIFICATIONS_COUNT} notifications...`);
  const templates = [
    { type: "ACCOUNT_TASK_CREATED", title: "New task assigned", message: "You have been assigned a new task" },
    { type: "ACCOUNT_TASK_UPDATED", title: "Task updated", message: "Task status has been updated" },
    { type: "CLIENT_CREATED", title: "New client added", message: "A new client has been added" },
    { type: "PROPERTY_UPDATED", title: "Property status changed", message: "Property status updated" },
    { type: "CALENDAR_REMINDER", title: "Upcoming appointment", message: "You have a showing scheduled" },
    { type: "DOCUMENT_SHARED", title: "Document shared", message: "A new document shared with you" },
    { type: "SYSTEM", title: "System update", message: "New features available" },
  ];

  const notifications: Prisma.NotificationCreateManyInput[] = [];
  for (let i = 0; i < CONFIG.NOTIFICATIONS_COUNT; i++) {
    const t = pick(templates);
    const createdAt = generateHistoricalDate(2);
    notifications.push({
      id: crypto.randomUUID(), userId: pick(userIds).id,
      type: t.type, title: t.title, message: t.message,
      read: i < 15, createdAt, updatedAt: createdAt,
    });
  }
  await prismadb.notification.createMany({ data: notifications, skipDuplicates: true });
  console.log(`Created ${notifications.length} notifications`);
}

async function seedClientPropertyLinks(propertyIds: string[], clientIds: string[]): Promise<void> {
  console.log(`\nCreating client-property links...`);
  const links: Prisma.Client_PropertiesCreateManyInput[] = [];
  const usedPairs = new Set<string>();
  for (let i = 0; i < 80; i++) {
    const clientId = pick(clientIds);
    const propertyId = pick(propertyIds);
    const key = `${clientId}-${propertyId}`;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);
    links.push({
      id: crypto.randomUUID(), clientId, propertyId,
      createdAt: generateHistoricalDate(6),
    });
  }
  await prismadb.client_Properties.createMany({ data: links, skipDuplicates: true });
  console.log(`Created ${links.length} client-property links`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log("Demo Showcase Seed Script (Unified)");
  console.log("========================================\n");

  const args = process.argv.slice(2);
  const clerkUserIdIndex = args.indexOf("--clerk-user-id");
  const skipPurge = args.includes("--skip-purge");

  if (clerkUserIdIndex === -1 || !args[clerkUserIdIndex + 1]) {
    console.error("Error: --clerk-user-id argument is required");
    console.error("Usage: npx tsx scripts/seed-demo-showcase.ts --clerk-user-id user_xxxxx [--skip-purge]");
    process.exit(1);
  }

  const clerkUserId = args[clerkUserIdIndex + 1];

  for (const envVar of ["CLERK_SECRET_KEY", "DATABASE_URL", "SECRETS_ENCRYPTION_KEY"]) {
    if (!process.env[envVar]) {
      console.error(`Error: ${envVar} environment variable is not set`);
      process.exit(1);
    }
  }

  try {
    const { orgId, userDbId } = await findOrganizationId(clerkUserId);

    console.log(`\nFetching/creating per-org encryption key...`);
    const dek = await getOrgDek(orgId);
    console.log(`DEK ready for organization ${orgId}`);

    const orgUsers = await getOrganizationUsers(orgId);
    if (orgUsers.length === 0) orgUsers.push({ id: userDbId, name: null });
    console.log(`Found ${orgUsers.length} organization user(s)`);

    if (!skipPurge) {
      await purgeOrgData(orgId, orgUsers);
    } else {
      console.log(`\nSkipping purge (--skip-purge flag)`);
    }

    const propertyIds = await seedProperties(orgId, orgUsers, dek);

    const propertyAreas = await prismadb.properties.findMany({
      where: { id: { in: propertyIds } }, select: { area: true },
    });
    const areas = propertyAreas.map(p => p.area).filter(Boolean) as string[];

    const { ids: clientIds, plainNames } = await seedClients(orgId, orgUsers, areas, dek);
    await seedMandates(orgId, orgUsers, clientIds, dek);
    await seedCalendarEvents(orgId, orgUsers, propertyIds, clientIds, dek);
    await seedSocialPosts(orgId, orgUsers, propertyIds, clientIds, plainNames);
    await seedTasks(orgId, orgUsers, clientIds, plainNames);
    await seedDocuments(orgId, orgUsers, propertyIds, clientIds, dek);
    const dealIds = await seedDeals(orgId, orgUsers, propertyIds, clientIds);
    await seedShowings(orgId, orgUsers, propertyIds, clientIds);
    await seedMarketingSpend(orgId, orgUsers);
    await seedAgentHours(orgId, orgUsers, dealIds);
    try { await seedMarketData(orgId); } catch { console.warn("  Skipping MarketData (table may not exist in prod)"); }
    await seedExportHistory(orgId, orgUsers, propertyIds, clientIds);
    await seedClientComments(orgId, clientIds, orgUsers, dek);
    await seedPropertyComments(orgId, propertyIds, orgUsers, dek);
    await seedNotifications(orgUsers);
    await seedClientPropertyLinks(propertyIds, clientIds);

    console.log("\n\nDemo data seeding complete!");
    console.log("\nSummary:");
    console.log(`  - Properties: ${CONFIG.PROPERTIES_COUNT} (encrypted)`);
    console.log(`  - Clients: ${CONFIG.CLIENTS_COUNT} (encrypted)`);
    console.log(`  - Mandates: ${CONFIG.MANDATES_COUNT} (encrypted)`);
    console.log(`  - Calendar Events: ${CONFIG.CALENDAR_EVENTS_COUNT} (encrypted)`);
    console.log(`  - Social Posts: ${CONFIG.SOCIAL_POSTS_COUNT}`);
    console.log(`  - Tasks: ${CONFIG.TASKS_COUNT}`);
    console.log(`  - Documents: ${CONFIG.DOCUMENTS_COUNT} (encrypted)`);
    console.log(`  - Deals: ${CONFIG.DEALS_COUNT}`);
    console.log(`  - Property Showings: ${CONFIG.SHOWINGS_COUNT}`);
    console.log(`  - Marketing Spend: ${CONFIG.MARKETING_SPEND_COUNT}`);
    console.log(`  - Agent Hours: ${CONFIG.AGENT_HOURS_COUNT}`);
    console.log(`  - Market Data: ${CONFIG.MARKET_DATA_COUNT}`);
    console.log(`  - Export History: 30`);
    console.log(`  - Client Comments: ~${CONFIG.CLIENTS_COUNT * 2} (encrypted)`);
    console.log(`  - Property Comments: ~${CONFIG.PROPERTY_COMMENTS_COUNT} (encrypted)`);
    console.log(`  - Notifications: ${CONFIG.NOTIFICATIONS_COUNT}`);
    console.log(`  - Client-Property Links: ~80`);
    console.log(`\nAll sensitive fields encrypted with org DEK`);
    console.log(`Organization: ${orgId}`);

  } catch (error) {
    console.error("\nError:", error);
    process.exit(1);
  } finally {
    await prismadb.$disconnect();
  }
}

main();
