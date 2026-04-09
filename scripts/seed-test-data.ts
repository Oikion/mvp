#!/usr/bin/env npx tsx

/**
 * COMPREHENSIVE TEST SEED
 *
 * Two-org, scenario-driven seed exercising every major Oikion feature.
 * See docs/superpowers/specs/2026-03-11-comprehensive-test-seed-design.md
 *
 * Usage:
 *   npx tsx scripts/seed-test-data.ts --alpha-user user_xxx --beta-user user_yyy
 *   npx tsx scripts/seed-test-data.ts --alpha-user user_xxx --beta-user user_yyy --skip-purge
 *
 * Environment:
 *   DATABASE_URL, CLERK_SECRET_KEY, SECRETS_ENCRYPTION_KEY (64 hex chars)
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClerkClient } from "@clerk/backend";

const databaseUrl = process.env.DATABASE_URL || "";
const adapter = new PrismaPg(databaseUrl);
const prismadb = new PrismaClient({ adapter });

// ============================================
// CLI ARGUMENT PARSING
// ============================================

function parseArgs(): { alphaUser: string; betaUser: string; skipPurge: boolean } {
  const args = process.argv.slice(2);
  let alphaUser = "";
  let betaUser = "";
  let skipPurge = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--alpha-user" && args[i + 1]) alphaUser = args[++i];
    else if (args[i] === "--beta-user" && args[i + 1]) betaUser = args[++i];
    else if (args[i] === "--skip-purge") skipPurge = true;
  }

  if (!alphaUser || !betaUser) {
    console.error("Usage: npx tsx scripts/seed-test-data.ts --alpha-user <id> --beta-user <id> [--skip-purge]");
    process.exit(1);
  }
  return { alphaUser, betaUser, skipPurge };
}

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
  "client_name", "full_name", "company_name", "company_id",
  "primary_email", "secondary_email", "primary_phone",
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

function uuid(): string { return crypto.randomUUID(); }

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

function generateFutureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + rand(1, daysAhead));
  d.setHours(rand(9, 18), rand(0, 59), 0);
  return d;
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

const ENTITY_PREFIXES: Record<string, string> = {
  Properties: "prp",
  Clients: "clt",
  Mandate: "mnd",
  crm_Accounts_Tasks: "tsk",
  SocialPost: "post",
  CalendarEvent: "evt",
  Documents: "doc",
  Deal: "deal",
  Channel: "chn",
  Conversation: "conv",
};

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
  console.log(`\nLooking up organization for Clerk user: ${clerkUserId}`);
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

async function getOrganizationUsers(orgId: string): Promise<Array<{ id: string; name: string | null; clerkUserId?: string }>> {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const memberships = await clerk.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 });
  const userIds: Array<{ id: string; name: string | null; clerkUserId?: string }> = [];

  for (const membership of memberships.data) {
    const clerkUserId = membership.publicUserData?.userId;
    if (clerkUserId) {
      const dbUser = await prismadb.users.findFirst({
        where: { clerkUserId },
        select: { id: true, name: true },
      });
      if (dbUser) userIds.push({ ...dbUser, clerkUserId });
    }
  }
  return userIds;
}

// ============================================
// ORG CONTEXT INTERFACE
// ============================================

interface OrgContext {
  orgId: string;
  primaryUserId: string;
  primaryClerkId: string;
  allUsers: Array<{ id: string; name: string | null; clerkUserId?: string }>;
  dek: Buffer;
  prefix: "alpha" | "beta";
}

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
// NEW CONSTANTS — STREETS, COMPANIES, MESSAGES
// ============================================

const GREEK_STREETS = [
  "Βασ. Σοφίας", "Λεωφ. Κηφισίας", "Ερμού", "Πατησίων", "Σταδίου",
  "Ακαδημίας", "Πανεπιστημίου", "Αλεξάνδρας", "Μεσογείων", "Βουλιαγμένης",
  "Ποσειδώνος", "Αμαλίας", "Συγγρού", "Πειραιώς", "Αθηνάς",
];

const GREEK_COMPANY_NAMES = [
  "Ελληνική Κτηματική Α.Ε.", "Αθηναϊκή Ακίνητα Ε.Π.Ε.", "Πανελλήνια Μεσιτική Ο.Ε.",
  "Μεσογειακά Ακίνητα Α.Ε.", "Κτήμα Invest Μονοπρόσωπη Ε.Π.Ε.",
];

const CHANNEL_MESSAGES = {
  general: [
    "Καλημέρα σε όλους! \uD83C\uDFE0",
    "Has anyone seen the new listings in Kolonaki?",
    "Reminder: team meeting tomorrow at 10am",
    "Just closed a deal in Glyfada — great quarter!",
    "Updated the property photos for the Kifisia house",
    "Anyone available for a viewing this Friday?",
    "Market report is ready, check your email",
    "New client referral from the Marousi office",
    "Welcome to the team @newagent!",
    "Happy Friday everyone! \uD83C\uDF89",
  ],
  management: [
    "Q2 targets: we need 15% more viewings",
    "Budget approved for the new CRM integration",
    "Let's discuss the Psychiko portfolio at tomorrow's meeting",
    "Compliance audit passed — good work team",
  ],
  announcements: [
    "\uD83D\uDCE2 New company policy: all viewings must be logged within 24 hours",
    "\uD83C\uDF89 Congratulations to our top agent this month!",
  ],
};

const DM_MESSAGES = {
  deal_discussion: [
    "Hey, I have a client interested in your Kolonaki listing",
    "Great! Which one? The 3-bed apartment or the penthouse?",
    "The 3-bed. Budget is around \u20ac300K. Can we arrange a viewing?",
    "Sure, I have availability Thursday or Friday afternoon",
    "Thursday works. I'll confirm with my client and get back to you",
    "Perfect. I'll prepare the property file and energy certificate",
    "Client confirmed for Thursday 3pm. See you there!",
  ],
  general_dm: [
    "Hey, quick question about the Glyfada property",
    "Sure, what do you need to know?",
    "What's the actual condition? Photos look good but...",
    "Honestly it needs some work on the kitchen. Rest is excellent",
    "Ok, thanks for the honest feedback",
  ],
};

// ============================================
// TASK 5: PURGE ORG DATA
// ============================================

async function purgeOrgData(
  orgId: string,
  orgUsers: Array<{ id: string; name: string | null; clerkUserId?: string }>
): Promise<void> {
  console.log(`\nPurging ALL seed data for organization ${orgId}...`);

  // Collect all user IDs including synthetic seed users
  const syntheticUsers = await prismadb.users.findMany({
    where: { clerkUserId: { startsWith: "user_seed_" } },
    select: { id: true },
  });
  const allUserIds = [
    ...orgUsers.map((u) => u.id),
    ...syntheticUsers.map((u) => u.id),
  ];

  // Collect parent IDs for FK-safe child deletes
  const orgChannelIds = (await prismadb.channel.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((c) => c.id);

  const orgConversationIds = (await prismadb.conversation.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((c) => c.id);

  const orgMessageIds = (await prismadb.message.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((m) => m.id);

  const orgPostIds = (await prismadb.socialPost.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((p) => p.id);

  const orgPropertyIds = (await prismadb.properties.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((p) => p.id);

  const orgClientIds = (await prismadb.clients.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((c) => c.id);

  const orgMandateIds = (await prismadb.mandate.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((m) => m.id);

  const orgTaskIds = (await prismadb.crm_Accounts_Tasks.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((t) => t.id);

  const orgEventIds = (await prismadb.calendarEvent.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((e) => e.id);

  const orgDocIds = (await prismadb.documents.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((d) => d.id);

  // Agent profile IDs for this org's users
  const orgAgentProfileIds = (await prismadb.agentProfile.findMany({
    where: { userId: { in: allUserIds } }, select: { id: true },
  })).map((p) => p.id);

  // Agency profile IDs
  const orgAgencyProfileIds = (await prismadb.agencyProfile.findMany({
    where: { organizationId: orgId }, select: { id: true },
  })).map((p) => p.id);

  // Ordered deletes — each step wrapped in try/catch
  const deletes: Array<{ name: string; run: () => Promise<{ count: number }> }> = [
    // 1. Message sub-entities
    { name: "MessageReaction", run: () => prismadb.messageReaction.deleteMany({ where: { messageId: { in: orgMessageIds } } }) },
    { name: "MessageRead", run: () => prismadb.messageRead.deleteMany({ where: { messageId: { in: orgMessageIds } } }) },
    { name: "MessageMention", run: () => prismadb.messageMention.deleteMany({ where: { messageId: { in: orgMessageIds } } }) },
    { name: "MessageAttachment", run: () => prismadb.messageAttachment.deleteMany({ where: { messageId: { in: orgMessageIds } } }) },

    // 2. Messages
    { name: "Messages", run: () => prismadb.message.deleteMany({ where: { organizationId: orgId } }) },

    // 3. Channel/Conversation members
    { name: "ChannelMember", run: () => prismadb.channelMember.deleteMany({ where: { channelId: { in: orgChannelIds } } }) },
    { name: "ConversationParticipant", run: () => prismadb.conversationParticipant.deleteMany({ where: { conversationId: { in: orgConversationIds } } }) },
    { name: "ConversationOrgMembership", run: () => prismadb.conversationOrgMembership.deleteMany({ where: { conversationId: { in: orgConversationIds } } }) },

    // 4. Channels, Conversations
    { name: "Channels", run: () => prismadb.channel.deleteMany({ where: { organizationId: orgId } }) },
    { name: "Conversations", run: () => prismadb.conversation.deleteMany({ where: { organizationId: orgId } }) },

    // 5. Social post sub-entities
    { name: "SocialPostLike", run: () => prismadb.socialPostLike.deleteMany({ where: { postId: { in: orgPostIds } } }) },
    { name: "SocialPostComment", run: () => prismadb.socialPostComment.deleteMany({ where: { postId: { in: orgPostIds } } }) },
    { name: "Attachment (social)", run: () => prismadb.attachment.deleteMany({ where: { organizationId: orgId } }) },

    // 6. Social posts
    { name: "SocialPost", run: () => prismadb.socialPost.deleteMany({ where: { organizationId: orgId } }) },

    // 7. Entity comments
    { name: "PropertyComment", run: () => prismadb.propertyComment.deleteMany({ where: { propertyId: { in: orgPropertyIds } } }) },
    { name: "ClientComment", run: () => prismadb.clientComment.deleteMany({ where: { clientId: { in: orgClientIds } } }) },
    { name: "MandateComment", run: () => prismadb.mandateComment.deleteMany({ where: { mandateId: { in: orgMandateIds } } }) },

    // 8. Task comments → Tasks
    { name: "TaskComments", run: () => prismadb.crm_Accounts_Tasks_Comments.deleteMany({ where: { crm_account_task: { in: orgTaskIds } } }) },
    { name: "Tasks", run: () => prismadb.crm_Accounts_Tasks.deleteMany({ where: { organizationId: orgId } }) },

    // 9. Calendar sub-entities → Events
    { name: "CalendarReminder", run: () => prismadb.calendarReminder.deleteMany({ where: { eventId: { in: orgEventIds } } }) },
    { name: "EventInvitee", run: () => prismadb.eventInvitee.deleteMany({ where: { eventId: { in: orgEventIds } } }) },
    { name: "CalendarEvent", run: () => prismadb.calendarEvent.deleteMany({ where: { organizationId: orgId } }) },

    // 10. Property showings
    { name: "PropertyShowing", run: () => prismadb.propertyShowing.deleteMany({ where: { organizationId: orgId } }) },

    // 11. Deals (BEFORE properties/clients — FK Restrict)
    { name: "Deal", run: () => prismadb.deal.deleteMany({ where: { organizationId: orgId } }) },

    // 12. Join tables
    { name: "Client_Properties", run: () => prismadb.client_Properties.deleteMany({ where: { OR: [{ clientId: { in: orgClientIds } }, { propertyId: { in: orgPropertyIds } }] } }) },
    { name: "Mandate_Properties", run: () => prismadb.mandate_Properties.deleteMany({ where: { OR: [{ mandateId: { in: orgMandateIds } }, { propertyId: { in: orgPropertyIds } }] } }) },
    { name: "Mandate_Clients", run: () => prismadb.mandate_Clients.deleteMany({ where: { OR: [{ mandateId: { in: orgMandateIds } }, { clientId: { in: orgClientIds } }] } }) },

    // 13. Property images
    { name: "PropertyImage", run: () => prismadb.propertyImage.deleteMany({ where: { organizationId: orgId } }) },

    // 14. Document views → Documents
    { name: "DocumentView", run: () => prismadb.documentView.deleteMany({ where: { documentId: { in: orgDocIds } } }) },
    { name: "Documents", run: () => prismadb.documents.deleteMany({ where: { organizationId: orgId } }) },

    // 15. Shared entities
    { name: "SharedEntity", run: () => prismadb.sharedEntity.deleteMany({ where: { OR: [{ sharedById: { in: allUserIds } }, { sharedWithId: { in: allUserIds } }] } }) },

    // 16. Notifications
    { name: "Notification", run: () => prismadb.notification.deleteMany({ where: { userId: { in: allUserIds } } }) },

    // 17. Agent profiles chain
    { name: "AgentContactSubmission", run: () => prismadb.agentContactSubmission.deleteMany({ where: { profileId: { in: orgAgentProfileIds } } }) },
    { name: "ProfileShowcaseProperty", run: () => prismadb.profileShowcaseProperty.deleteMany({ where: { profileId: { in: orgAgentProfileIds } } }) },
    { name: "AgentProfile", run: () => prismadb.agentProfile.deleteMany({ where: { userId: { in: allUserIds } } }) },

    // 18. Agency profiles chain
    { name: "AgencyContactSubmission", run: () => prismadb.agencyContactSubmission.deleteMany({ where: { profileId: { in: orgAgencyProfileIds } } }) },
    { name: "AgencyProfile", run: () => prismadb.agencyProfile.deleteMany({ where: { organizationId: orgId } }) },

    // 19. Agent connections
    { name: "AgentConnection", run: () => prismadb.agentConnection.deleteMany({ where: { OR: [{ followerId: { in: allUserIds } }, { followingId: { in: allUserIds } }] } }) },

    // 20. Network entities
    { name: "CrossOrgMatch", run: () => prismadb.crossOrgMatch.deleteMany({ where: { OR: [{ mandateOrgId: orgId }, { propertyOrgId: orgId }] } }) },
    { name: "OrgNetworkPartner", run: () => prismadb.orgNetworkPartner.deleteMany({ where: { OR: [{ initiatorOrgId: orgId }, { partnerOrgId: orgId }] } }) },
    { name: "OrgNetworkSettings", run: () => prismadb.orgNetworkSettings.deleteMany({ where: { organizationId: orgId } }) },

    // 21. Core entities (mandates before properties for Mandate_Properties FK)
    { name: "Mandates", run: () => prismadb.mandate.deleteMany({ where: { organizationId: orgId } }) },
    { name: "Properties", run: () => prismadb.properties.deleteMany({ where: { organizationId: orgId } }) },
    { name: "Clients", run: () => prismadb.clients.deleteMany({ where: { organizationId: orgId } }) },

    // 22. Misc org-filtered tables
    { name: "ExportHistory", run: () => prismadb.exportHistory.deleteMany({ where: { organizationId: orgId } }) },
    { name: "AgentHours", run: () => prismadb.agentHours.deleteMany({ where: { organizationId: orgId } }) },
    { name: "MarketingSpend", run: () => prismadb.marketingSpend.deleteMany({ where: { organizationId: orgId } }) },

    // 23. Synthetic users (clerkUserId starts with "user_seed_")
    { name: "Synthetic Users", run: () => prismadb.users.deleteMany({ where: { clerkUserId: { startsWith: "user_seed_" } } }) },
  ];

  for (const del of deletes) {
    try {
      const result = await del.run();
      if (result.count > 0) console.log(`  Deleted ${result.count} ${del.name}`);
    } catch (e: any) {
      console.warn(`  Warning deleting ${del.name}: ${e.message?.slice(0, 120)}`);
    }
  }

  console.log(`Purge complete for org ${orgId}`);
}

// ============================================
// TASK 6: SYNTHETIC USERS
// ============================================

async function createSyntheticUsers(ctx: OrgContext): Promise<void> {
  console.log(`\nCreating synthetic users for ${ctx.prefix} org...`);

  const isAlpha = ctx.prefix === "alpha";
  const now = new Date();

  const synthetics = [
    {
      id: uuid(),
      clerkUserId: `user_seed_${ctx.prefix}_departed`,
      email: `departed.agent.${ctx.prefix}@seed.oikion.test`,
      name: isAlpha ? "Nikos Departed" : "Sofia Departed",
      account_name: isAlpha ? "Nikos Departed" : "Sofia Departed",
      firstName: isAlpha ? "Nikos" : "Sofia",
      lastName: "Departed",
      userStatus: "INACTIVE" as const,
      userLanguage: "el" as const,
      created_on: now,
      onboardingCompleted: true,
    },
    {
      id: uuid(),
      clerkUserId: `user_seed_${ctx.prefix}_inactive`,
      email: `inactive.agent.${ctx.prefix}@seed.oikion.test`,
      name: isAlpha ? "Dimitris Inactive" : "Elena Inactive",
      account_name: isAlpha ? "Dimitris Inactive" : "Elena Inactive",
      firstName: isAlpha ? "Dimitris" : "Elena",
      lastName: "Inactive",
      userStatus: "INACTIVE" as const,
      userLanguage: "el" as const,
      created_on: now,
      onboardingCompleted: true,
    },
    {
      id: uuid(),
      clerkUserId: `user_seed_${ctx.prefix}_deleted`,
      email: `deleted.agent.${ctx.prefix}@seed.oikion.test`,
      name: null,
      account_name: "[Deleted User]",
      firstName: null,
      lastName: null,
      userStatus: "INACTIVE" as const,
      userLanguage: "el" as const,
      created_on: now,
      onboardingCompleted: false,
    },
  ];

  await prismadb.users.createMany({ data: synthetics });

  // Push synthetic users into ctx.allUsers for later use
  for (const s of synthetics) {
    ctx.allUsers.push({ id: s.id, name: s.name, clerkUserId: s.clerkUserId });
  }

  console.log(`  Created ${synthetics.length} synthetic users (departed, inactive, deleted)`);
}

// ============================================
// TASK 7: SEED CLIENTS (15 per org)
// ============================================

async function seedClients(ctx: OrgContext): Promise<string[]> {
  console.log(`\nCreating 15 clients for ${ctx.prefix} org...`);

  const friendlyIds = await generateFriendlyIds("Clients", 15, ctx.orgId);
  const now = new Date();

  // Find departed user for client #10
  const departedUser = ctx.allUsers.find((u) => u.clerkUserId === `user_seed_${ctx.prefix}_departed`);
  const departedUserId = departedUser?.id ?? ctx.primaryUserId;

  // Greek names for deterministic variety
  const names = [
    { first: "Alexandros", last: "Papadopoulos" },
    { first: "Maria", last: "Konstantinou" },
    { first: "Giorgos", last: "Nikolaou" },
    { first: "Elena", last: "Dimitriou" },
    { first: "Nikos", last: "Georgiou" },
    { first: "Sofia", last: "Antoniou" },
    { first: "Dimitris", last: "Papanikolaou" },
    { first: "Anna", last: "Vasileiou" },
    { first: "Kostas", last: "Papadimitriou" },
    { first: "Katerina", last: "Ioannou" },
    { first: "Stavros", last: "Karagiannis" },
    { first: "Christina", last: "Makri" },
    { first: "Panagiotis", last: "Alexiou" },
    { first: "Irini", last: "Christodoulou" },
    { first: "Michalis", last: "Stefanou" },
  ];

  const clientsRaw: Record<string, unknown>[] = [];

  const makeBase = (i: number, overrides: Record<string, unknown>) => {
    const n = names[i];
    return {
      id: uuid(),
      friendlyId: friendlyIds[i],
      organizationId: ctx.orgId,
      client_name: `${n.first} ${n.last}`,
      full_name: `${n.first} ${n.last}`,
      primary_email: generateEmail(n.first, n.last),
      primary_phone: generatePhone(),
      assigned_to: ctx.primaryUserId,
      createdBy: ctx.primaryUserId,
      createdAt: generateHistoricalDate(6),
      updatedAt: now,
      language: "el",
      person_type: "INDIVIDUAL",
      gdpr_consent: true,
      allow_marketing: Math.random() > 0.5,
      ...overrides,
    };
  };

  // #1 BUYER ACTIVE PERSONAL — full contact, REFERRAL source, communication_notes
  clientsRaw.push(makeBase(0, {
    client_type: "BUYER",
    client_status: "ACTIVE",
    visibility: "PRIVATE",
    lead_source: "REFERRAL",
    secondary_email: `${names[0].first.toLowerCase()}.work@gmail.com`,
    secondary_phone: generatePhone(),
    description: "Searching for 3-bed apartment in central Athens, budget up to €350K",
    communication_notes: [
      { date: "2026-02-15", note: "Initial call — looking for Kolonaki or Pagkrati", by: ctx.primaryUserId },
      { date: "2026-02-20", note: "Sent 3 property options, awaiting feedback", by: ctx.primaryUserId },
    ],
  }));

  // #2 BUYER ACTIVE PERSONAL — full contact, WEB source, communication_notes
  clientsRaw.push(makeBase(1, {
    client_type: "BUYER",
    client_status: "ACTIVE",
    visibility: "PRIVATE",
    lead_source: "WEB",
    secondary_phone: generatePhone(),
    description: "First-time buyer, interested in Kifisia area",
    communication_notes: [
      { date: "2026-03-01", note: "Registered via website form", by: ctx.primaryUserId },
      { date: "2026-03-05", note: "Phone consultation scheduled for Friday", by: ctx.primaryUserId },
    ],
  }));

  // #3 SELLER ACTIVE SECURE — will be linked to properties
  clientsRaw.push(makeBase(2, {
    client_type: "SELLER",
    client_status: "ACTIVE",
    visibility: "SECURE",
    lead_source: "WALK_IN",
    description: "Owns apartment in Glyfada, wants to sell",
  }));

  // #4 SELLER ACTIVE SECURE — will be linked to properties
  clientsRaw.push(makeBase(3, {
    client_type: "SELLER",
    client_status: "ACTIVE",
    visibility: "SECURE",
    lead_source: "REFERRAL",
    description: "Inherited house in Marousi, looking to sell quickly",
  }));

  // #5 RENTER LEAD PERSONAL — will be linked to mandate
  clientsRaw.push(makeBase(4, {
    client_type: "RENTER",
    client_status: "LEAD",
    visibility: "PRIVATE",
    lead_source: "PORTAL",
    description: "Looking for rental in central Athens, max €1200/mo",
  }));

  // #6 INVESTOR ACTIVE PUBLIC — person_type INVESTOR, company fields
  clientsRaw.push(makeBase(5, {
    client_type: "INVESTOR",
    client_status: "ACTIVE",
    visibility: "PUBLIC",
    person_type: "INVESTOR",
    lead_source: "REFERRAL",
    company_name: "Mediterranean Investments S.A.",
    company_id: "801234567",
    description: "Portfolio investor, interested in multi-unit properties",
  }));

  // #7 REFERRAL_PARTNER CONVERTED SECURE — person_type COMPANY
  clientsRaw.push(makeBase(6, {
    client_type: "REFERRAL_PARTNER",
    client_status: "CONVERTED",
    visibility: "SECURE",
    person_type: "COMPANY",
    company_name: "Ελληνική Κτηματική Α.Ε.",
    office_phone: "2101234567",
    lead_source: "REFERRAL",
    description: "Partner agency for north Athens referrals",
  }));

  // #8 BUYER LOST PERSONAL — lead_source SOCIAL
  clientsRaw.push(makeBase(7, {
    client_type: "BUYER",
    client_status: "LOST",
    visibility: "PRIVATE",
    lead_source: "SOCIAL",
    description: "Was interested in Voula but found another agent",
  }));

  // #9 BUYER LEAD PERSONAL — draft_status true
  clientsRaw.push(makeBase(8, {
    client_type: "BUYER",
    client_status: "LEAD",
    visibility: "PRIVATE",
    draft_status: true,
    lead_source: "WEB",
    description: "Draft client — incomplete info",
  }));

  // #10 SELLER ACTIVE PERSONAL — assigned_to departed user
  clientsRaw.push(makeBase(9, {
    client_type: "SELLER",
    client_status: "ACTIVE",
    visibility: "PRIVATE",
    assigned_to: departedUserId,
    lead_source: "WALK_IN",
    description: "Assigned to departed agent — testing null-safety",
  }));

  // #11 BUYER ACTIVE SECURE — cross-org sharing
  clientsRaw.push(makeBase(10, {
    client_type: "BUYER",
    client_status: "ACTIVE",
    visibility: "SECURE",
    lead_source: "REFERRAL",
    description: "Looking for luxury property, will be shared cross-org",
  }));

  // #12 BUYER ACTIVE SECURE — cross-org sharing
  clientsRaw.push(makeBase(11, {
    client_type: "BUYER",
    client_status: "ACTIVE",
    visibility: "SECURE",
    lead_source: "WEB",
    description: "Investment buyer, interested in multiple areas",
  }));

  // #13 INVESTOR ACTIVE PUBLIC — ALL billing + shipping address fields
  clientsRaw.push(makeBase(12, {
    client_type: "INVESTOR",
    client_status: "ACTIVE",
    visibility: "PUBLIC",
    person_type: "COMPANY",
    company_name: "Αθηναϊκή Ακίνητα Ε.Π.Ε.",
    company_id: "998877665",
    lead_source: "PORTAL",
    billing_street: "Βασ. Σοφίας 42",
    billing_city: "Αθήνα",
    billing_state: "Αττική",
    billing_postal_code: "10674",
    billing_country: "GR",
    shipping_street: "Λεωφ. Κηφισίας 120",
    shipping_city: "Αθήνα",
    shipping_state: "Αττική",
    shipping_postal_code: "11526",
    shipping_country: "GR",
    description: "Corporate investor with full address records",
  }));

  // #14 SELLER ACTIVE PERSONAL — AFM, DOY, company_gemi
  clientsRaw.push(makeBase(13, {
    client_type: "SELLER",
    client_status: "ACTIVE",
    visibility: "PRIVATE",
    afm: "123456789",
    doy: "Α' Αθηνών",
    company_gemi: "123456789000",
    lead_source: "WALK_IN",
    description: "Has complete tax/legal documentation",
  }));

  // #15 BUYER INACTIVE PERSONAL — status filtering test
  clientsRaw.push(makeBase(14, {
    client_type: "BUYER",
    client_status: "INACTIVE",
    visibility: "PRIVATE",
    lead_source: "WEB",
    description: "Inactive buyer — used for status filtering tests",
  }));

  // Encrypt all clients
  const encryptedClients = clientsRaw.map((c) => encryptClientData(c, ctx.dek));

  await prismadb.clients.createMany({ data: encryptedClients as any[] });

  const ids = clientsRaw.map((c) => c.id as string);
  console.log(`  Created ${ids.length} clients`);
  return ids;
}

// ============================================
// TASK 8: SEED PROPERTIES (20 per org)
// ============================================

async function seedProperties(ctx: OrgContext): Promise<string[]> {
  console.log(`\nCreating 20 properties for ${ctx.prefix} org...`);

  const friendlyIds = await generateFriendlyIds("Properties", 20, ctx.orgId);
  const now = new Date();

  const departedUser = ctx.allUsers.find((u) => u.clerkUserId === `user_seed_${ctx.prefix}_departed`);
  const departedUserId = departedUser?.id ?? ctx.primaryUserId;

  // Helper to find area data
  const area = (name: string) => ATHENS_AREAS.find((a) => a.area === name) ?? ATHENS_AREAS[0];
  const islandArea = ISLAND_AREAS.find((a) => a.area === "Mykonos Town") ?? ISLAND_AREAS[0];

  const makeBase = (i: number, overrides: Record<string, unknown>) => {
    const loc = overrides._location as typeof ATHENS_AREAS[0] | undefined;
    delete overrides._location;
    const areaData = loc ?? pick(ATHENS_AREAS);

    return {
      id: uuid(),
      friendlyId: friendlyIds[i],
      organizationId: ctx.orgId,
      assigned_to: ctx.primaryUserId,
      createdBy: ctx.primaryUserId,
      createdAt: generateHistoricalDate(8),
      updatedAt: now,
      area: areaData.area,
      address_city: areaData.city,
      address_state: areaData.state,
      municipality: areaData.municipality,
      address_street: `${pick(GREEK_STREETS)} ${rand(1, 150)}`,
      address_zip: `${rand(10000, 19999)}`,
      condition: pick([...PROPERTY_CONDITIONS]),
      energy_cert_class: pick([...ENERGY_CLASSES]),
      heating_type: pick([...HEATING_TYPES]),
      furnished: pick([...FURNISHED_OPTIONS]),
      year_built: rand(1970, 2024),
      ...overrides,
    };
  };

  const propName = (type: string, areaName: string) => {
    const templates = PROPERTY_NAME_TEMPLATES[type] ?? [`${type} in {area}`];
    return pick(templates).replace("{area}", areaName);
  };

  const propertiesRaw: Record<string, unknown>[] = [];

  // #1 APARTMENT ACTIVE PUBLIC SALE — Kolonaki, 85sqm, 3rd floor, €280K
  propertiesRaw.push(makeBase(0, {
    _location: area("Kolonaki"),
    property_name: propName("APARTMENT", "Kolonaki"),
    property_type: "APARTMENT",
    property_status: "ACTIVE",
    visibility: "PUBLIC",
    transaction_type: "SALE",
    price: 280000,
    price_type: "SALE",
    size_net_sqm: 85,
    size_gross_sqm: 95,
    bedrooms: 2,
    bathrooms: 1,
    floor: "3",
    floors_total: 6,
    elevator: true,
    amenities: generateRandomAmenities(),
  }));

  // #2 APARTMENT ACTIVE PUBLIC SALE — Kifisia, 110sqm, 2nd floor, €320K
  propertiesRaw.push(makeBase(1, {
    _location: area("Kifisia"),
    property_name: propName("APARTMENT", "Kifisia"),
    property_type: "APARTMENT",
    property_status: "ACTIVE",
    visibility: "PUBLIC",
    transaction_type: "SALE",
    price: 320000,
    price_type: "SALE",
    size_net_sqm: 110,
    size_gross_sqm: 125,
    bedrooms: 3,
    bathrooms: 2,
    floor: "2",
    floors_total: 5,
    elevator: true,
    amenities: generateRandomAmenities(),
  }));

  // #3 APARTMENT ACTIVE PUBLIC SALE — Glyfada, 95sqm, 1st floor, €250K
  propertiesRaw.push(makeBase(2, {
    _location: area("Glyfada"),
    property_name: propName("APARTMENT", "Glyfada"),
    property_type: "APARTMENT",
    property_status: "ACTIVE",
    visibility: "PUBLIC",
    transaction_type: "SALE",
    price: 250000,
    price_type: "SALE",
    size_net_sqm: 95,
    size_gross_sqm: 105,
    bedrooms: 2,
    bathrooms: 1,
    floor: "1",
    floors_total: 4,
    elevator: true,
    amenities: generateRandomAmenities(),
  }));

  // #4 HOUSE ACTIVE SECURE SALE — Marousi, 180sqm, garden, €450K
  propertiesRaw.push(makeBase(3, {
    _location: area("Marousi"),
    property_name: propName("HOUSE", "Marousi"),
    property_type: "HOUSE",
    property_status: "ACTIVE",
    visibility: "SECURE",
    transaction_type: "SALE",
    price: 450000,
    price_type: "SALE",
    size_net_sqm: 180,
    size_gross_sqm: 200,
    lot_size: 350,
    bedrooms: 4,
    bathrooms: 2,
    floor: "0",
    floors_total: 2,
    amenities: { ...generateRandomAmenities(), garden: true },
  }));

  // #5 HOUSE ACTIVE SECURE SALE — Chalandri, 150sqm, full amenities, €380K
  propertiesRaw.push(makeBase(4, {
    _location: area("Chalandri"),
    property_name: propName("HOUSE", "Chalandri"),
    property_type: "HOUSE",
    property_status: "ACTIVE",
    visibility: "SECURE",
    transaction_type: "SALE",
    price: 380000,
    price_type: "SALE",
    size_net_sqm: 150,
    size_gross_sqm: 170,
    lot_size: 280,
    bedrooms: 3,
    bathrooms: 2,
    floor: "0",
    floors_total: 2,
    amenities: { parking: true, garden: true, pool: true, airConditioning: true, fireplace: true, security: true, storage: true, balcony: true },
  }));

  // #6 MAISONETTE ACTIVE PUBLIC SALE — Pagkrati, 120sqm, €220K
  propertiesRaw.push(makeBase(5, {
    _location: area("Pagkrati"),
    property_name: propName("MAISONETTE", "Pagkrati"),
    property_type: "MAISONETTE",
    property_status: "ACTIVE",
    visibility: "PUBLIC",
    transaction_type: "SALE",
    price: 220000,
    price_type: "SALE",
    size_net_sqm: 120,
    size_gross_sqm: 135,
    bedrooms: 3,
    bathrooms: 2,
    floor: "0",
    floors_total: 2,
    amenities: generateRandomAmenities(),
  }));

  // #7 WAREHOUSE ACTIVE SECURE SALE — Piraeus, 500sqm, €350K
  propertiesRaw.push(makeBase(6, {
    _location: area("Piraeus"),
    property_name: propName("WAREHOUSE", "Piraeus"),
    property_type: "WAREHOUSE",
    property_status: "ACTIVE",
    visibility: "SECURE",
    transaction_type: "SALE",
    price: 350000,
    price_type: "SALE",
    size_net_sqm: 500,
    size_gross_sqm: 520,
    floor: "0",
    floors_total: 1,
  }));

  // #8 PLOT ACTIVE PUBLIC SALE — Rafina, plot_size_sqm: 800, €200K
  propertiesRaw.push(makeBase(7, {
    _location: area("Rafina"),
    property_name: propName("PLOT", "Rafina"),
    property_type: "PLOT",
    property_status: "ACTIVE",
    visibility: "PUBLIC",
    transaction_type: "SALE",
    price: 200000,
    price_type: "SALE",
    plot_size_sqm: 800,
    size_net_sqm: 0,
    inside_city_plan: true,
  }));

  // #9 APARTMENT SOLD PERSONAL SALE — Kolonaki, salePrice: 295000, saleDate
  const saleDate = new Date();
  saleDate.setMonth(saleDate.getMonth() - 2);
  propertiesRaw.push(makeBase(8, {
    _location: area("Kolonaki"),
    property_name: propName("APARTMENT", "Kolonaki"),
    property_type: "APARTMENT",
    property_status: "SOLD",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    price: 300000,
    listPrice: 300000,
    salePrice: 295000,
    saleDate: saleDate,
    daysOnMarket: 45,
    price_type: "SALE",
    size_net_sqm: 90,
    size_gross_sqm: 100,
    bedrooms: 2,
    bathrooms: 1,
    floor: "4",
    floors_total: 6,
    elevator: true,
  }));

  // #10 HOUSE PENDING PERSONAL SALE — Kifisia, deal attached
  propertiesRaw.push(makeBase(9, {
    _location: area("Kifisia"),
    property_name: propName("HOUSE", "Kifisia"),
    property_type: "HOUSE",
    property_status: "PENDING",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    price: 520000,
    price_type: "SALE",
    size_net_sqm: 200,
    size_gross_sqm: 230,
    lot_size: 400,
    bedrooms: 4,
    bathrooms: 3,
    floor: "0",
    floors_total: 2,
    amenities: { ...generateRandomAmenities(), garden: true, pool: true },
  }));

  // #11 APARTMENT OFF_MARKET PERSONAL SALE — Nea Smyrni
  propertiesRaw.push(makeBase(10, {
    _location: area("Nea Smyrni"),
    property_name: propName("APARTMENT", "Nea Smyrni"),
    property_type: "APARTMENT",
    property_status: "OFF_MARKET",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    price: 180000,
    price_type: "SALE",
    size_net_sqm: 75,
    size_gross_sqm: 85,
    bedrooms: 2,
    bathrooms: 1,
    floor: "1",
    floors_total: 4,
  }));

  // #12 COMMERCIAL WITHDRAWN PERSONAL SALE — Syntagma
  propertiesRaw.push(makeBase(11, {
    _location: area("Syntagma"),
    property_name: propName("COMMERCIAL", "Syntagma"),
    property_type: "COMMERCIAL",
    property_status: "WITHDRAWN",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    price: 650000,
    price_type: "SALE",
    size_net_sqm: 200,
    size_gross_sqm: 220,
    floor: "0",
    floors_total: 1,
  }));

  // #13 APARTMENT ACTIVE PUBLIC RENTAL — Koukaki, €1200/mo
  propertiesRaw.push(makeBase(12, {
    _location: area("Koukaki"),
    property_name: propName("APARTMENT", "Koukaki"),
    property_type: "APARTMENT",
    property_status: "ACTIVE",
    visibility: "PUBLIC",
    transaction_type: "RENTAL",
    price: 1200,
    price_type: "RENTAL",
    size_net_sqm: 80,
    size_gross_sqm: 90,
    bedrooms: 2,
    bathrooms: 1,
    floor: "2",
    floors_total: 5,
    elevator: true,
    furnished: "FULLY",
    amenities: { ...generateRandomAmenities(), airConditioning: true },
  }));

  // #14 VACATION ACTIVE SECURE SHORT_TERM — Mykonos, €200/night
  propertiesRaw.push(makeBase(13, {
    _location: islandArea,
    property_name: "Mykonos Summer Villa",
    property_type: "VACATION",
    property_status: "ACTIVE",
    visibility: "SECURE",
    transaction_type: "SHORT_TERM",
    price: 200,
    price_type: "RENTAL",
    size_net_sqm: 120,
    size_gross_sqm: 140,
    bedrooms: 3,
    bathrooms: 2,
    lot_size: 500,
    furnished: "FULLY",
    amenities: { pool: true, airConditioning: true, garden: true, parking: true, jacuzzi: true },
  }));

  // #15 HOUSE ACTIVE PERSONAL SALE — draft
  propertiesRaw.push(makeBase(14, {
    _location: pick(ATHENS_AREAS),
    property_name: "Draft Property (Incomplete)",
    property_type: "HOUSE",
    property_status: "ACTIVE",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    draft_status: true,
    price: 300000,
    price_type: "SALE",
    size_net_sqm: 150,
    bedrooms: 3,
    bathrooms: 2,
  }));

  // #16 APARTMENT ACTIVE PERSONAL SALE — assigned to departed user
  propertiesRaw.push(makeBase(15, {
    _location: pick(ATHENS_AREAS),
    property_name: propName("APARTMENT", "Athens"),
    property_type: "APARTMENT",
    property_status: "ACTIVE",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    assigned_to: departedUserId,
    price: 260000,
    price_type: "SALE",
    size_net_sqm: 88,
    size_gross_sqm: 98,
    bedrooms: 2,
    bathrooms: 1,
    floor: "3",
    floors_total: 5,
  }));

  // #17 APARTMENT ACTIVE SECURE SALE — full legal fields
  propertiesRaw.push(makeBase(16, {
    _location: pick(ATHENS_AREAS),
    property_name: propName("APARTMENT", "Athens"),
    property_type: "APARTMENT",
    property_status: "ACTIVE",
    visibility: "SECURE",
    transaction_type: "SALE",
    price: 310000,
    price_type: "SALE",
    size_net_sqm: 100,
    size_gross_sqm: 115,
    bedrooms: 3,
    bathrooms: 1,
    floor: "2",
    floors_total: 5,
    land_registry_kaek: "12345678901234",
    building_permit_no: "123/2020",
    building_permit_year: 2020,
    inside_city_plan: true,
    elevator: true,
  }));

  // #18 HOUSE ACTIVE PUBLIC SALE — Psychiko, 350sqm, lot 800, €1.8M, all amenities
  propertiesRaw.push(makeBase(17, {
    _location: area("Psychiko"),
    property_name: propName("HOUSE", "Psychiko"),
    property_type: "HOUSE",
    property_status: "ACTIVE",
    visibility: "PUBLIC",
    transaction_type: "SALE",
    price: 1800000,
    price_type: "SALE",
    size_net_sqm: 350,
    size_gross_sqm: 400,
    lot_size: 800,
    bedrooms: 5,
    bathrooms: 4,
    floor: "0",
    floors_total: 3,
    condition: "EXCELLENT",
    year_built: 2022,
    amenities: {
      parking: true, storage: true, balcony: true, garden: true, pool: true,
      gym: true, security: true, fireplace: true, airConditioning: true,
      underfloorHeating: true, solarPanels: true, doubleGlazing: true,
      alarm: true, intercom: true, cctv: true, sauna: true, jacuzzi: true,
      rooftop: true,
    },
  }));

  // #19 APARTMENT ACTIVE SECURE SALE — Kolonaki, 95sqm, €280K — MATCHMAKING TARGET
  propertiesRaw.push(makeBase(18, {
    _location: area("Kolonaki"),
    property_name: "Matchmaking Target A — Kolonaki Apartment",
    property_type: "APARTMENT",
    property_status: "ACTIVE",
    visibility: "SECURE",
    transaction_type: "SALE",
    price: 280000,
    price_type: "SALE",
    size_net_sqm: 95,
    size_gross_sqm: 105,
    bedrooms: 2,
    bathrooms: 1,
    floor: "3",
    floors_total: 6,
    elevator: true,
    amenities: { balcony: true, airConditioning: true, doubleGlazing: true },
  }));

  // #20 HOUSE ACTIVE SECURE SALE — Kolonaki, 120sqm, €340K — MATCHMAKING TARGET
  propertiesRaw.push(makeBase(19, {
    _location: area("Kolonaki"),
    property_name: "Matchmaking Target B — Kolonaki House",
    property_type: "HOUSE",
    property_status: "ACTIVE",
    visibility: "SECURE",
    transaction_type: "SALE",
    price: 340000,
    price_type: "SALE",
    size_net_sqm: 120,
    size_gross_sqm: 140,
    lot_size: 200,
    bedrooms: 3,
    bathrooms: 2,
    floor: "0",
    floors_total: 2,
    amenities: { garden: true, parking: true, airConditioning: true, fireplace: true },
  }));

  // Encrypt all properties
  const encryptedProperties = propertiesRaw.map((p) => encryptPropertyData(p, ctx.dek));

  await prismadb.properties.createMany({ data: encryptedProperties as any[] });

  const ids = propertiesRaw.map((p) => p.id as string);
  console.log(`  Created ${ids.length} properties`);
  return ids;
}

// ============================================
// TASK 9: SEED MANDATES (11 per org)
// ============================================

async function seedMandates(ctx: OrgContext): Promise<string[]> {
  console.log(`\nCreating 11 mandates for ${ctx.prefix} org...`);

  const friendlyIds = await generateFriendlyIds("Mandate", 11, ctx.orgId);
  const now = new Date();

  const makeBase = (i: number, overrides: Record<string, unknown>) => ({
    id: uuid(),
    friendlyId: friendlyIds[i],
    organizationId: ctx.orgId,
    assigned_to: ctx.primaryUserId,
    createdBy: ctx.primaryUserId,
    createdAt: generateHistoricalDate(6),
    updatedAt: now,
    ...overrides,
  });

  const mandatesRaw: Record<string, unknown>[] = [];

  // #1 ACTIVE MEDIUM SECURE SALE — Kolonaki/Kifisia, 200K-400K, 70-130sqm
  mandatesRaw.push(makeBase(0, {
    title: "Buyer search: 2-3 bed apartment in Kolonaki or Kifisia",
    status: "ACTIVE",
    urgency: "MEDIUM",
    visibility: "SECURE",
    transaction_type: "SALE",
    property_type: "APARTMENT",
    areas_of_interest: ["Kolonaki", "Kifisia"],
    budget_min: 200000,
    budget_max: 400000,
    size_min_sqm: 70,
    size_max_sqm: 130,
    bedrooms_min: 2,
    bedrooms_max: 3,
    bathrooms_min: 1,
    timeline: "ONE_THREE_MONTHS",
    notes: "Client prefers high floors with elevator, modern finishes",
  }));

  // #2 ACTIVE MEDIUM SECURE SALE — Glyfada/Voula, 250K-500K
  mandatesRaw.push(makeBase(1, {
    title: "Family home search in southern suburbs",
    status: "ACTIVE",
    urgency: "MEDIUM",
    visibility: "SECURE",
    transaction_type: "SALE",
    property_type: "HOUSE",
    areas_of_interest: ["Glyfada", "Voula"],
    budget_min: 250000,
    budget_max: 500000,
    size_min_sqm: 120,
    size_max_sqm: 250,
    bedrooms_min: 3,
    bedrooms_max: 5,
    bathrooms_min: 2,
    timeline: "THREE_SIX_MONTHS",
    notes: "Family with 2 kids, needs garden and parking",
  }));

  // #3 ACTIVE CRITICAL SECURE SALE — immediate timeline
  mandatesRaw.push(makeBase(2, {
    title: "URGENT: Relocation — apartment needed ASAP",
    status: "ACTIVE",
    urgency: "CRITICAL",
    visibility: "SECURE",
    transaction_type: "SALE",
    property_type: "APARTMENT",
    areas_of_interest: ["Marousi", "Chalandri", "Kifisia"],
    budget_min: 180000,
    budget_max: 350000,
    size_min_sqm: 60,
    size_max_sqm: 120,
    bedrooms_min: 2,
    timeline: "IMMEDIATE",
    notes: "Corporate relocation, needs to close within 30 days",
  }));

  // #4 ACTIVE LOW PERSONAL RENTAL — rental mandate
  mandatesRaw.push(makeBase(3, {
    title: "Rental search: central Athens apartment",
    status: "ACTIVE",
    urgency: "LOW",
    visibility: "PRIVATE",
    transaction_type: "RENTAL",
    property_type: "APARTMENT",
    areas_of_interest: ["Koukaki", "Pagkrati", "Nea Smyrni"],
    budget_min: 800,
    budget_max: 1500,
    size_min_sqm: 50,
    size_max_sqm: 100,
    bedrooms_min: 1,
    bedrooms_max: 2,
    timeline: "ONE_THREE_MONTHS",
    notes: "Young professional, prefers furnished, pet-friendly",
  }));

  // #5 FULFILLED MEDIUM PERSONAL SALE — linked to completed deal later
  mandatesRaw.push(makeBase(4, {
    title: "Completed: Villa purchase in Kifisia",
    status: "FULFILLED",
    urgency: "MEDIUM",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    property_type: "HOUSE",
    areas_of_interest: ["Kifisia", "Ekali"],
    budget_min: 400000,
    budget_max: 700000,
    size_min_sqm: 150,
    size_max_sqm: 300,
    bedrooms_min: 3,
    timeline: "THREE_SIX_MONTHS",
    notes: "Successfully matched and closed",
  }));

  // #6 EXPIRED LOW PERSONAL SALE — expired 30 days ago
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 30);
  mandatesRaw.push(makeBase(5, {
    title: "Expired: Investment apartment search",
    status: "EXPIRED",
    urgency: "LOW",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    property_type: "APARTMENT",
    areas_of_interest: ["Kallithea", "Nea Smyrni"],
    budget_min: 100000,
    budget_max: 200000,
    size_min_sqm: 40,
    size_max_sqm: 80,
    expires_at: expiredDate,
    notes: "Client lost interest, mandate expired",
  }));

  // #7 DRAFT MEDIUM PERSONAL SALE — draft status
  mandatesRaw.push(makeBase(6, {
    title: "Draft: Preliminary property search",
    status: "DRAFT",
    urgency: "MEDIUM",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    property_type: "APARTMENT",
    draft_status: true,
    areas_of_interest: ["Pagkrati"],
    budget_min: 150000,
    budget_max: 250000,
    notes: "Incomplete — awaiting client confirmation",
  }));

  // #8 PAUSED HIGH PERSONAL SALE
  mandatesRaw.push(makeBase(7, {
    title: "Paused: Luxury penthouse search",
    status: "PAUSED",
    urgency: "HIGH",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    property_type: "APARTMENT",
    areas_of_interest: ["Kolonaki", "Psychiko", "Filothei"],
    budget_min: 500000,
    budget_max: 1200000,
    size_min_sqm: 150,
    size_max_sqm: 300,
    bedrooms_min: 3,
    bathrooms_min: 2,
    notes: "Client traveling abroad, resume search in April",
  }));

  // #9 CANCELLED LOW PERSONAL SALE
  mandatesRaw.push(makeBase(8, {
    title: "Cancelled: Office space search",
    status: "CANCELLED",
    urgency: "LOW",
    visibility: "PRIVATE",
    transaction_type: "SALE",
    property_type: "COMMERCIAL",
    areas_of_interest: ["Syntagma", "Kolonaki"],
    budget_min: 200000,
    budget_max: 500000,
    size_min_sqm: 80,
    size_max_sqm: 200,
    notes: "Client decided to lease instead of purchase",
  }));

  // #10 ACTIVE MEDIUM PUBLIC SALE — PLOT land search
  mandatesRaw.push(makeBase(9, {
    title: "Land search: buildable plot in east Attica",
    status: "ACTIVE",
    urgency: "MEDIUM",
    visibility: "PUBLIC",
    transaction_type: "SALE",
    property_type: "PLOT",
    areas_of_interest: ["Rafina"],
    budget_min: 150000,
    budget_max: 350000,
    plot_size_min_sqm: 500,
    plot_size_max_sqm: 1500,
    inside_city_plan: true,
    notes: "Developer looking for residential plot, must be inside city plan",
  }));

  // #11 ACTIVE HIGH SECURE SALE — CROSS-ORG MATCH: Kolonaki, 70-130sqm, €180K-€400K, APARTMENT
  mandatesRaw.push(makeBase(10, {
    title: "Cross-org match: Kolonaki apartment buyer",
    status: "ACTIVE",
    urgency: "HIGH",
    visibility: "SECURE",
    transaction_type: "SALE",
    property_type: "APARTMENT",
    areas_of_interest: ["Kolonaki"],
    budget_min: 180000,
    budget_max: 400000,
    size_min_sqm: 70,
    size_max_sqm: 130,
    bedrooms_min: 2,
    bedrooms_max: 3,
    bathrooms_min: 1,
    timeline: "ONE_THREE_MONTHS",
    notes: "MATCHMAKING TARGET — should match properties #19 and #20 cross-org",
  }));

  // Encrypt all mandates
  const encryptedMandates = mandatesRaw.map((m) => encryptMandateData(m, ctx.dek));

  await prismadb.mandate.createMany({ data: encryptedMandates as any[] });

  const ids = mandatesRaw.map((m) => m.id as string);
  console.log(`  Created ${ids.length} mandates`);
  return ids;
}

// ============================================
// TASK 10: SEED DEALS (6 per org)
// ============================================

async function seedDeals(
  ctx: OrgContext,
  clientIds: string[],
  propertyIds: string[]
): Promise<string[]> {
  console.log(`\nCreating 6 deals for ${ctx.prefix} org...`);

  const friendlyIds = await generateFriendlyIds("Deal", 6, ctx.orgId);
  const now = new Date();

  // Find a second user for agent assignments
  const secondUser = ctx.allUsers.find((u) => u.id !== ctx.primaryUserId);
  const secondUserId = secondUser?.id ?? ctx.primaryUserId;

  const dealsRaw = [
    // Deal 1: COMPLETED — sold property, converted client
    {
      id: uuid(),
      friendlyId: friendlyIds[0],
      organizationId: ctx.orgId,
      propertyId: propertyIds[8],
      clientId: clientIds[6],
      status: "COMPLETED" as const,
      propertyAgentId: ctx.primaryUserId,
      clientAgentId: secondUserId,
      propertyAgentSplit: 50,
      clientAgentSplit: 50,
      totalCommission: 8850, // 3% of 295000
      commissionCurrency: "EUR",
      dealType: "DUAL" as const,
      proposedById: ctx.primaryUserId,
      title: "Πώληση Κολωνάκι - Ολοκληρωμένη",
      notes: "Επιτυχής πώληση. Ο πελάτης ήταν πολύ ικανοποιημένος.",
      closedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      contractDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    // Deal 2: IN_PROGRESS — pending property, buyer client
    {
      id: uuid(),
      friendlyId: friendlyIds[1],
      organizationId: ctx.orgId,
      propertyId: propertyIds[9],
      clientId: clientIds[0],
      status: "IN_PROGRESS" as const,
      propertyAgentId: ctx.primaryUserId,
      clientAgentId: secondUserId,
      propertyAgentSplit: 50,
      clientAgentSplit: 50,
      totalCommission: null,
      commissionCurrency: "EUR",
      dealType: "BUYER" as const,
      proposedById: ctx.primaryUserId,
      title: "Αγορά σε εξέλιξη - Κηφισιά",
      notes: "Ο αγοραστής ενδιαφέρεται πολύ. Αναμένεται τελική προσφορά.",
      closedAt: null,
      contractDate: null,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    // Deal 3: ACCEPTED — house, buyer client, recent contract
    {
      id: uuid(),
      friendlyId: friendlyIds[2],
      organizationId: ctx.orgId,
      propertyId: propertyIds[3],
      clientId: clientIds[1],
      status: "ACCEPTED" as const,
      propertyAgentId: ctx.primaryUserId,
      clientAgentId: ctx.primaryUserId,
      propertyAgentSplit: 60,
      clientAgentSplit: 40,
      totalCommission: 12000,
      commissionCurrency: "EUR",
      dealType: "SELLER" as const,
      proposedById: ctx.primaryUserId,
      title: "Αποδεκτή Προσφορά - Κατοικία",
      notes: "Συμβόλαιο υπεγράφη. Αναμένεται ολοκλήρωση.",
      closedAt: null,
      contractDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    // Deal 4: NEGOTIATING — apartment, shared buyer (early stage)
    {
      id: uuid(),
      friendlyId: friendlyIds[3],
      organizationId: ctx.orgId,
      propertyId: propertyIds[1],
      clientId: clientIds[10],
      status: "NEGOTIATING" as const,
      propertyAgentId: ctx.primaryUserId,
      clientAgentId: ctx.primaryUserId,
      propertyAgentSplit: 50,
      clientAgentSplit: 50,
      totalCommission: null,
      commissionCurrency: "EUR",
      dealType: "DUAL" as const,
      proposedById: ctx.primaryUserId,
      title: "Διαπραγμάτευση - Διαμέρισμα",
      notes: "Πρώιμο στάδιο διαπραγματεύσεων. Ο αγοραστής ζήτησε μείωση τιμής.",
      closedAt: null,
      contractDate: null,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    // Deal 5: PROPOSED — luxury property, investor (cross-org scenario)
    {
      id: uuid(),
      friendlyId: friendlyIds[4],
      organizationId: ctx.orgId,
      propertyId: propertyIds[17],
      clientId: clientIds[5],
      status: "PROPOSED" as const,
      propertyAgentId: ctx.primaryUserId,
      clientAgentId: null,
      propertyAgentSplit: 50,
      clientAgentSplit: 50,
      totalCommission: null,
      commissionCurrency: "EUR",
      dealType: "SELLER" as const,
      proposedById: ctx.primaryUserId,
      title: "Πρόταση - Luxury Villa Ψυχικό",
      notes: "Αναμένεται απάντηση από τον επενδυτή.",
      closedAt: null,
      contractDate: null,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    // Deal 6: CANCELLED — fallen through
    {
      id: uuid(),
      friendlyId: friendlyIds[5],
      organizationId: ctx.orgId,
      propertyId: propertyIds[2],
      clientId: clientIds[7],
      status: "CANCELLED" as const,
      propertyAgentId: ctx.primaryUserId,
      clientAgentId: ctx.primaryUserId,
      propertyAgentSplit: 50,
      clientAgentSplit: 50,
      totalCommission: null,
      commissionCurrency: "EUR",
      dealType: "BUYER" as const,
      proposedById: ctx.primaryUserId,
      title: "Ακυρωμένη Συναλλαγή - Διαμέρισμα",
      notes: "Ο αγοραστής αποσύρθηκε λόγω αδυναμίας χρηματοδότησης.",
      closedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      contractDate: null,
      createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  ];

  await prismadb.deal.createMany({ data: dealsRaw as any[] });

  const ids = dealsRaw.map((d) => d.id);
  console.log(`  Created ${ids.length} deals`);
  return ids;
}

// ============================================
// TASK 11: SEED DOCUMENTS (8 per org)
// ============================================

async function seedDocuments(
  ctx: OrgContext,
  clientIds: string[],
  propertyIds: string[]
): Promise<string[]> {
  console.log(`\nCreating 8 documents for ${ctx.prefix} org...`);

  const friendlyIds = await generateFriendlyIds("Documents", 8, ctx.orgId);
  const now = new Date();
  const placeholderUrl = "https://placehold.co/800x1200.png?text=Document";

  const docsRaw = [
    // Doc 1: CONTRACT — sale contract linked to sold property & converted client
    {
      id: uuid(),
      friendlyId: friendlyIds[0],
      organizationId: ctx.orgId,
      document_name: "Συμβόλαιο Πώλησης - Κολωνάκι",
      document_system_type: "CONTRACT" as const,
      document_file_url: placeholderUrl,
      document_file_mimeType: "application/pdf",
      size: 245000,
      description: "Συμβόλαιο πώλησης ακινήτου στο Κολωνάκι. Υπογεγραμμένο αντίγραφο.",
      status: "active",
      created_by_user: ctx.primaryUserId,
      assigned_user: ctx.primaryUserId,
      linkedPropertiesIds: [propertyIds[8]],
      accountsIDs: [clientIds[6]],
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      date_created: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      last_updated: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    // Doc 2: INVOICE — commission invoice
    {
      id: uuid(),
      friendlyId: friendlyIds[1],
      organizationId: ctx.orgId,
      document_name: "Τιμολόγιο Μεσιτείας #2026-001",
      document_system_type: "INVOICE" as const,
      document_file_url: placeholderUrl,
      document_file_mimeType: "application/pdf",
      size: 85000,
      description: "Τιμολόγιο μεσιτικής αμοιβής για πώληση Κολωνάκι.",
      status: "active",
      created_by_user: ctx.primaryUserId,
      assigned_user: ctx.primaryUserId,
      linkedPropertiesIds: [propertyIds[8]],
      accountsIDs: [clientIds[6]],
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      date_created: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      last_updated: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    // Doc 3: OFFER — purchase offer
    {
      id: uuid(),
      friendlyId: friendlyIds[2],
      organizationId: ctx.orgId,
      document_name: "Πρόταση Αγοράς - Κηφισιά",
      document_system_type: "OFFER" as const,
      document_file_url: placeholderUrl,
      document_file_mimeType: "application/pdf",
      size: 120000,
      description: "Γραπτή πρόταση αγοράς διαμερίσματος στην Κηφισιά.",
      status: "active",
      created_by_user: ctx.primaryUserId,
      assigned_user: ctx.primaryUserId,
      linkedPropertiesIds: [propertyIds[1]],
      accountsIDs: [clientIds[10]],
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      date_created: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      last_updated: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    // Doc 4: RECEIPT — deposit payment receipt
    {
      id: uuid(),
      friendlyId: friendlyIds[3],
      organizationId: ctx.orgId,
      document_name: "Απόδειξη Πληρωμής Προκαταβολής",
      document_system_type: "RECEIPT" as const,
      document_file_url: placeholderUrl,
      document_file_mimeType: "application/pdf",
      size: 45000,
      description: "Απόδειξη πληρωμής προκαταβολής για ακίνητο Κολωνάκι.",
      status: "active",
      created_by_user: ctx.primaryUserId,
      assigned_user: ctx.primaryUserId,
      linkedPropertiesIds: [propertyIds[8]],
      accountsIDs: [],
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      date_created: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      last_updated: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    // Doc 5: OTHER — floor plan (image)
    {
      id: uuid(),
      friendlyId: friendlyIds[4],
      organizationId: ctx.orgId,
      document_name: "Κάτοψη - Luxury Villa Ψυχικό",
      document_system_type: "OTHER" as const,
      document_file_url: placeholderUrl,
      document_file_mimeType: "image/jpeg",
      size: 1500000,
      description: "Κάτοψη πολυτελούς βίλας στο Ψυχικό. Αρχιτεκτονικό σχέδιο.",
      status: "active",
      created_by_user: ctx.primaryUserId,
      assigned_user: ctx.primaryUserId,
      linkedPropertiesIds: [propertyIds[17]],
      accountsIDs: [],
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      date_created: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      last_updated: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    // Doc 6: OTHER — company ID document
    {
      id: uuid(),
      friendlyId: friendlyIds[5],
      organizationId: ctx.orgId,
      document_name: "Ταυτότητα Εταιρείας",
      document_system_type: "OTHER" as const,
      document_file_url: placeholderUrl,
      document_file_mimeType: "application/pdf",
      size: 350000,
      description: "Νομιμοποιητικά έγγραφα εταιρείας πελάτη.",
      status: "active",
      created_by_user: ctx.primaryUserId,
      assigned_user: ctx.primaryUserId,
      linkedPropertiesIds: [],
      accountsIDs: [clientIds[12]],
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      date_created: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      last_updated: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    },
    // Doc 7: CONTRACT — rental agreement
    {
      id: uuid(),
      friendlyId: friendlyIds[6],
      organizationId: ctx.orgId,
      document_name: "Μισθωτήριο Συμβόλαιο - Κουκάκι",
      document_system_type: "CONTRACT" as const,
      document_file_url: placeholderUrl,
      document_file_mimeType: "application/pdf",
      size: 180000,
      description: "Μισθωτήριο συμβόλαιο ακινήτου στο Κουκάκι.",
      status: "active",
      created_by_user: ctx.primaryUserId,
      assigned_user: ctx.primaryUserId,
      linkedPropertiesIds: [propertyIds[12]],
      accountsIDs: [clientIds[4]],
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      date_created: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      last_updated: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    // Doc 8: OTHER — energy certificate
    {
      id: uuid(),
      friendlyId: friendlyIds[7],
      organizationId: ctx.orgId,
      document_name: "Ενεργειακό Πιστοποιητικό",
      document_system_type: "OTHER" as const,
      document_file_url: placeholderUrl,
      document_file_mimeType: "application/pdf",
      size: 95000,
      description: "Ενεργειακό πιστοποιητικό ακινήτου. Κατηγορία Β+.",
      status: "active",
      created_by_user: ctx.primaryUserId,
      assigned_user: ctx.primaryUserId,
      linkedPropertiesIds: [propertyIds[16]],
      accountsIDs: [],
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      date_created: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      last_updated: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
  ];

  // Encrypt document_name and description
  const encryptedDocs = docsRaw.map((d) => encryptDocumentData(d as Record<string, unknown>, ctx.dek));

  await prismadb.documents.createMany({ data: encryptedDocs as any[] });

  const ids = docsRaw.map((d) => d.id);
  console.log(`  Created ${ids.length} documents`);
  return ids;
}

// ============================================
// TASK 12: SEED CALENDAR EVENTS (10 per org)
// ============================================

async function seedCalendarEvents(
  ctx: OrgContext,
  clientIds: string[],
  propertyIds: string[]
): Promise<string[]> {
  console.log(`\nCreating 10 calendar events for ${ctx.prefix} org...`);

  const friendlyIds = await generateFriendlyIds("CalendarEvent", 10, ctx.orgId);
  const now = new Date();
  const calIdOffset = ctx.prefix === "alpha" ? 1000 : 2000;

  function pastDate(days: number): Date {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  function futureDate(days: number): Date {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }
  function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  const eventsRaw = [
    // Event 1: Past property viewing (2 weeks ago)
    {
      id: uuid(),
      friendlyId: friendlyIds[0],
      calendarEventId: calIdOffset + 1,
      organizationId: ctx.orgId,
      title: "Προβολή Ακινήτου - Κολωνάκι",
      description: "Προβολή ακινήτου με ενδιαφερόμενο αγοραστή στο Κολωνάκι.",
      eventType: "PROPERTY_VIEWING" as const,
      startTime: pastDate(14),
      endTime: addHours(pastDate(14), 1),
      location: "Κολωνάκι, Αθήνα",
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [30, 60],
      attendeeEmail: "papadopoulos@example.com",
      attendeeName: "Αλέξανδρος Παπαδόπουλος",
      notes: "Ο πελάτης ενδιαφέρθηκε ιδιαίτερα για τον φωτισμό.",
      status: "completed",
      updatedAt: pastDate(14),
    },
    // Event 2: Past property viewing (1 week ago)
    {
      id: uuid(),
      friendlyId: friendlyIds[1],
      calendarEventId: calIdOffset + 2,
      organizationId: ctx.orgId,
      title: "Προβολή Κατοικίας - Κηφισιά",
      description: "Προβολή μονοκατοικίας στην Κηφισιά.",
      eventType: "PROPERTY_VIEWING" as const,
      startTime: pastDate(7),
      endTime: addHours(pastDate(7), 1.5),
      location: "Κηφισιά, Αθήνα",
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [30],
      attendeeEmail: "nikolaou@example.com",
      attendeeName: "Μαρία Νικολάου",
      notes: "Ο πελάτης ζήτησε δεύτερη επίσκεψη.",
      status: "completed",
      updatedAt: pastDate(7),
    },
    // Event 3: Past luxury property viewing (3 days ago)
    {
      id: uuid(),
      friendlyId: friendlyIds[2],
      calendarEventId: calIdOffset + 3,
      organizationId: ctx.orgId,
      title: "Luxury Viewing - Ψυχικό",
      description: "Προβολή πολυτελούς βίλας στο Ψυχικό για επενδυτή.",
      eventType: "PROPERTY_VIEWING" as const,
      startTime: pastDate(3),
      endTime: addHours(pastDate(3), 2),
      location: "Ψυχικό, Αθήνα",
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [30, 60],
      attendeeEmail: "investor@example.com",
      attendeeName: "Κώστας Επενδυτής",
      notes: "VIP πελάτης. Ενδιαφέρεται σοβαρά.",
      status: "completed",
      updatedAt: pastDate(3),
    },
    // Event 4: Past client consultation (1 month ago)
    {
      id: uuid(),
      friendlyId: friendlyIds[3],
      calendarEventId: calIdOffset + 4,
      organizationId: ctx.orgId,
      title: "Συμβουλευτική Πελάτη",
      description: "Αρχική συνάντηση με νέο πελάτη για αξιολόγηση αναγκών.",
      eventType: "CLIENT_CONSULTATION" as const,
      startTime: pastDate(30),
      endTime: addHours(pastDate(30), 1),
      location: "Γραφείο",
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [60],
      attendeeEmail: null,
      attendeeName: null,
      notes: "Πελάτης αναζητά 3αρι στα νότια προάστια.",
      status: "completed",
      updatedAt: pastDate(30),
    },
    // Event 5: Past team meeting (5 days ago)
    {
      id: uuid(),
      friendlyId: friendlyIds[4],
      calendarEventId: calIdOffset + 5,
      organizationId: ctx.orgId,
      title: "Weekly Team Standup",
      description: "Εβδομαδιαία ενημέρωση ομάδας.",
      eventType: "MEETING" as const,
      startTime: pastDate(5),
      endTime: addHours(pastDate(5), 1),
      location: "Αίθουσα Συνεδριάσεων",
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [30],
      attendeeEmail: null,
      attendeeName: null,
      notes: "Αναθεώρηση στόχων εβδομάδας.",
      status: "completed",
      updatedAt: pastDate(5),
    },
    // Event 6: Future reminder (3 days from now)
    {
      id: uuid(),
      friendlyId: friendlyIds[5],
      calendarEventId: calIdOffset + 6,
      organizationId: ctx.orgId,
      title: "Follow up on mandate",
      description: "Υπενθύμιση για follow-up εντολής.",
      eventType: "REMINDER" as const,
      startTime: futureDate(3),
      endTime: addHours(futureDate(3), 0.5),
      location: null,
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [30, 60],
      attendeeEmail: null,
      attendeeName: null,
      notes: "Επικοινωνία με πελάτη για ανανέωση εντολής.",
      status: "scheduled",
      updatedAt: now,
    },
    // Event 7: Future task deadline (1 week from now)
    {
      id: uuid(),
      friendlyId: friendlyIds[6],
      calendarEventId: calIdOffset + 7,
      organizationId: ctx.orgId,
      title: "Deadline: Αναφορά Αγοράς",
      description: "Προθεσμία υποβολής αναφοράς αγοράς Q1.",
      eventType: "TASK_DEADLINE" as const,
      startTime: futureDate(7),
      endTime: addHours(futureDate(7), 1),
      location: null,
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [60],
      attendeeEmail: null,
      attendeeName: null,
      notes: "Πρέπει να ολοκληρωθεί πριν την παρουσίαση.",
      status: "scheduled",
      updatedAt: now,
    },
    // Event 8: Past general event (2 weeks ago)
    {
      id: uuid(),
      friendlyId: friendlyIds[7],
      calendarEventId: calIdOffset + 8,
      organizationId: ctx.orgId,
      title: "Εκδήλωση Δικτύωσης",
      description: "Εκδήλωση networking για επαγγελματίες ακινήτων.",
      eventType: "OTHER" as const,
      startTime: pastDate(14),
      endTime: addHours(pastDate(14), 3),
      location: "Μέγαρο Μουσικής",
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [60],
      attendeeEmail: null,
      attendeeName: null,
      notes: "Γνωρίστηκαν 5 νέες επαφές.",
      status: "completed",
      updatedAt: pastDate(14),
    },
    // Event 9: Future property viewing (5 days from now) — matchmaking
    {
      id: uuid(),
      friendlyId: friendlyIds[8],
      calendarEventId: calIdOffset + 9,
      organizationId: ctx.orgId,
      title: "Προβολή Ακινήτου - Matchmaking",
      description: "Προγραμματισμένη προβολή από Polis matching.",
      eventType: "PROPERTY_VIEWING" as const,
      startTime: futureDate(5),
      endTime: addHours(futureDate(5), 1),
      location: "Γλυφάδα, Αθήνα",
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [30, 60],
      attendeeEmail: "match@example.com",
      attendeeName: "Αγοραστής από Polis",
      notes: "Ακίνητο από cross-org match.",
      status: "scheduled",
      updatedAt: now,
    },
    // Event 10: Past property viewing (4 days ago) — with result
    {
      id: uuid(),
      friendlyId: friendlyIds[9],
      calendarEventId: calIdOffset + 10,
      organizationId: ctx.orgId,
      title: "Προβολή Ακινήτου - Αποτέλεσμα",
      description: "Ολοκληρωμένη προβολή με αξιολόγηση αποτελέσματος.",
      eventType: "PROPERTY_VIEWING" as const,
      startTime: pastDate(4),
      endTime: addHours(pastDate(4), 1),
      location: "Βούλα, Αθήνα",
      assignedUserId: ctx.primaryUserId,
      reminderMinutes: [30],
      attendeeEmail: "client3@example.com",
      attendeeName: "Πελάτης Τρίτος",
      notes: "Ο πελάτης ενδιαφέρθηκε αλλά ζήτησε χρόνο.",
      status: "completed",
      updatedAt: pastDate(4),
    },
  ];

  // Encrypt calendar data
  const encryptedEvents = eventsRaw.map((e) => encryptCalendarData(e as Record<string, unknown>, ctx.dek));

  await prismadb.calendarEvent.createMany({ data: encryptedEvents as any[], skipDuplicates: true });

  // Create event-to-property and event-to-client relations via raw SQL (implicit m2m)
  const eventPropertyLinks: Array<[string, string]> = [
    [eventsRaw[0].id, propertyIds[0]],
    [eventsRaw[1].id, propertyIds[3]],
    [eventsRaw[2].id, propertyIds[17]],
    [eventsRaw[8].id, propertyIds[18]],
    [eventsRaw[9].id, propertyIds[4]],
  ];

  const eventClientLinks: Array<[string, string]> = [
    [eventsRaw[0].id, clientIds[0]],
    [eventsRaw[1].id, clientIds[1]],
    [eventsRaw[2].id, clientIds[5]],
    [eventsRaw[3].id, clientIds[2]],
    [eventsRaw[8].id, clientIds[0]],
    [eventsRaw[9].id, clientIds[3]],
  ];

  for (const [eventId, propId] of eventPropertyLinks) {
    try {
      await prismadb.$executeRaw`
        INSERT INTO "_EventToProperties" ("A", "B")
        VALUES (${eventId}, ${propId})
        ON CONFLICT DO NOTHING
      `;
    } catch (e: any) {
      console.warn(`  Warning linking event-property: ${e.message?.slice(0, 80)}`);
    }
  }

  for (const [eventId, clientId] of eventClientLinks) {
    try {
      await prismadb.$executeRaw`
        INSERT INTO "_EventToClients" ("A", "B")
        VALUES (${eventId}, ${clientId})
        ON CONFLICT DO NOTHING
      `;
    } catch (e: any) {
      console.warn(`  Warning linking event-client: ${e.message?.slice(0, 80)}`);
    }
  }

  // Create EventInvitee records (1-2 per event)
  const invitees: Array<Record<string, unknown>> = [];
  for (let i = 0; i < eventsRaw.length; i++) {
    const event = eventsRaw[i];
    // First invitee — always the primary user
    invitees.push({
      id: uuid(),
      eventId: event.id,
      userId: ctx.primaryUserId,
      status: i < 5 ? "ACCEPTED" : "PENDING",
      respondedAt: i < 5 ? pastDate(1) : null,
      organizationId: ctx.orgId,
    });
    // Second invitee for some events (team meeting, consultations)
    if (i === 4 || i === 0 || i === 8) {
      const otherUser = ctx.allUsers.find((u) => u.id !== ctx.primaryUserId);
      if (otherUser) {
        invitees.push({
          id: uuid(),
          eventId: event.id,
          userId: otherUser.id,
          status: i === 4 ? "ACCEPTED" : "PENDING",
          respondedAt: i === 4 ? pastDate(5) : null,
          organizationId: ctx.orgId,
        });
      }
    }
  }

  if (invitees.length > 0) {
    await prismadb.eventInvitee.createMany({ data: invitees as any[] });
    console.log(`  Created ${invitees.length} event invitees`);
  }

  // Create CalendarReminder records (1-2 per event)
  const reminders: Array<Record<string, unknown>> = [];
  for (let i = 0; i < eventsRaw.length; i++) {
    const event = eventsRaw[i];
    const isPast = event.startTime < now;

    // First reminder (30 min before)
    reminders.push({
      id: uuid(),
      eventId: event.id,
      reminderMinutes: 30,
      scheduledFor: new Date(event.startTime.getTime() - 30 * 60 * 1000),
      sentAt: isPast ? new Date(event.startTime.getTime() - 30 * 60 * 1000) : null,
      status: isPast ? "SENT" : "PENDING",
      notificationType: "EMAIL" as const,
      organizationId: ctx.orgId,
      updatedAt: now,
    });

    // Second reminder (60 min before) for events with reminderMinutes including 60
    if (event.reminderMinutes.includes(60)) {
      reminders.push({
        id: uuid(),
        eventId: event.id,
        reminderMinutes: 60,
        scheduledFor: new Date(event.startTime.getTime() - 60 * 60 * 1000),
        sentAt: isPast ? new Date(event.startTime.getTime() - 60 * 60 * 1000) : null,
        status: isPast ? "SENT" : "PENDING",
        notificationType: "EMAIL" as const,
        organizationId: ctx.orgId,
        updatedAt: now,
      });
    }
  }

  if (reminders.length > 0) {
    await prismadb.calendarReminder.createMany({ data: reminders as any[] });
    console.log(`  Created ${reminders.length} calendar reminders`);
  }

  const ids = eventsRaw.map((e) => e.id);
  console.log(`  Created ${ids.length} calendar events`);
  return ids;
}

// ============================================
// TASK 13: SEED TASKS (8 per org)
// ============================================

async function seedTasks(
  ctx: OrgContext,
  clientIds: string[],
  eventIds: string[],
  docIds: string[]
): Promise<void> {
  console.log(`\nCreating 8 tasks for ${ctx.prefix} org...`);

  const friendlyIds = await generateFriendlyIds("crm_Accounts_Tasks", 8, ctx.orgId);
  const now = new Date();

  // Find departed user for null-test scenario
  const departedUser = ctx.allUsers.find((u) => u.clerkUserId?.includes("departed"));

  const tasksRaw = [
    // Task 1: Overdue follow-up call
    {
      id: uuid(),
      friendlyId: friendlyIds[0],
      organizationId: ctx.orgId,
      title: "Follow-up call - Παπαδόπουλος",
      content: "Τηλεφωνική επικοινωνία με τον πελάτη Παπαδόπουλο για ενημέρωση προόδου.",
      priority: "high",
      dueDateAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // overdue
      user: ctx.primaryUserId,
      account: clientIds[0],
      calendarEventId: null,
      createdBy: ctx.primaryUserId,
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      tags: null,
    },
    // Task 2: Prepare for viewing (linked to upcoming viewing event)
    {
      id: uuid(),
      friendlyId: friendlyIds[1],
      organizationId: ctx.orgId,
      title: "Prepare for viewing",
      content: "Ετοιμασία φακέλου ακινήτου και εκτύπωση εγγράφων για την προβολή.",
      priority: "medium",
      dueDateAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      user: ctx.primaryUserId,
      account: null,
      calendarEventId: eventIds[8], // upcoming viewing event
      createdBy: ctx.primaryUserId,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      tags: null,
    },
    // Task 3: Completed task with 3 comments
    {
      id: uuid(),
      friendlyId: friendlyIds[2],
      organizationId: ctx.orgId,
      title: "Update listing photos",
      content: "Ανανέωση φωτογραφιών καταχώρησης με νέες εικόνες μετά την ανακαίνιση.",
      priority: "low",
      dueDateAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      user: ctx.primaryUserId,
      account: null,
      calendarEventId: null,
      createdBy: ctx.primaryUserId,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      tags: { status: "completed" },
    },
    // Task 4: Contract review - high priority
    {
      id: uuid(),
      friendlyId: friendlyIds[3],
      organizationId: ctx.orgId,
      title: "Contract review - Κηφισιά",
      content: "Αναθεώρηση συμβολαίου πώλησης ακινήτου στην Κηφισιά πριν την υπογραφή.",
      priority: "high",
      dueDateAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      user: ctx.primaryUserId,
      account: null,
      calendarEventId: null,
      createdBy: ctx.primaryUserId,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      tags: null,
    },
    // Task 5: Assigned to departed user (null-safety test)
    {
      id: uuid(),
      friendlyId: friendlyIds[4],
      organizationId: ctx.orgId,
      title: "Client follow-up",
      content: "Follow-up με πελάτη - ανατέθηκε σε πράκτορα που αποχώρησε.",
      priority: "medium",
      dueDateAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      user: departedUser?.id ?? null,
      account: null,
      calendarEventId: null,
      createdBy: ctx.primaryUserId,
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      tags: null,
    },
    // Task 6: Document collection (linked to docs via task relations)
    {
      id: uuid(),
      friendlyId: friendlyIds[5],
      organizationId: ctx.orgId,
      title: "Document collection",
      content: "Συλλογή απαραίτητων εγγράφων για ολοκλήρωση συναλλαγής.",
      priority: "medium",
      dueDateAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      user: ctx.primaryUserId,
      account: null,
      calendarEventId: null,
      createdBy: ctx.primaryUserId,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      tags: null,
    },
    // Task 7: Unassigned backlog
    {
      id: uuid(),
      friendlyId: friendlyIds[6],
      organizationId: ctx.orgId,
      title: "Market research report",
      content: "Σύνταξη αναφοράς αγοράς για τα νότια προάστια Q1 2026.",
      priority: "low",
      dueDateAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      user: null,
      account: null,
      calendarEventId: null,
      createdBy: ctx.primaryUserId,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      tags: null,
    },
    // Task 8: Post-viewing follow-up
    {
      id: uuid(),
      friendlyId: friendlyIds[7],
      organizationId: ctx.orgId,
      title: "Post-viewing follow-up",
      content: "Επικοινωνία με πελάτη μετά την προβολή ακινήτου για εντυπώσεις.",
      priority: "medium",
      dueDateAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      user: ctx.primaryUserId,
      account: clientIds[3],
      calendarEventId: null,
      createdBy: ctx.primaryUserId,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      tags: null,
    },
  ];

  await prismadb.crm_Accounts_Tasks.createMany({ data: tasksRaw as any[] });
  console.log(`  Created ${tasksRaw.length} tasks`);

  // Link task 6 to documents via the implicit m2m relation
  for (const docId of [docIds[0], docIds[3]]) {
    try {
      await prismadb.$executeRaw`
        INSERT INTO "_DocumentsToCrmAccountsTasks" ("A", "B")
        VALUES (${docId}, ${tasksRaw[5].id})
        ON CONFLICT DO NOTHING
      `;
    } catch (e: any) {
      console.warn(`  Warning linking task-doc: ${e.message?.slice(0, 80)}`);
    }
  }

  // Create task comments (1-3 per task, task #3 gets 3 comments)
  const comments: Array<Record<string, unknown>> = [];

  // Task 3 — 3 comments (thread test)
  const task3Comments = [
    "Οι φωτογραφίες ανέβηκαν. Χρειάζεται review.",
    "Εγκρίθηκαν! Πολύ καλές εικόνες.",
    "Δημοσιεύτηκαν στο portal. Ευχαριστώ!",
  ];
  for (let i = 0; i < task3Comments.length; i++) {
    comments.push({
      id: uuid(),
      comment: encryptCommentContent(task3Comments[i], ctx.dek),
      crm_account_task: tasksRaw[2].id,
      user: ctx.allUsers[i % ctx.allUsers.length]?.id ?? ctx.primaryUserId,
      organizationId: ctx.orgId,
      createdAt: new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000),
    });
  }

  // Other tasks — 1 comment each for tasks 1, 4, 6, 8
  const otherTaskComments: Array<[number, string]> = [
    [0, "Προσπάθησα να τηλεφωνήσω αλλά δεν απάντησε. Θα ξαναδοκιμάσω αύριο."],
    [3, "Ο δικηγόρος επιβεβαίωσε ότι το συμβόλαιο είναι σωστό."],
    [5, "Λείπει ακόμα το ενεργειακό πιστοποιητικό."],
    [7, "Ο πελάτης δήλωσε ενδιαφέρον για δεύτερη προβολή."],
  ];
  for (const [taskIdx, commentText] of otherTaskComments) {
    comments.push({
      id: uuid(),
      comment: encryptCommentContent(commentText, ctx.dek),
      crm_account_task: tasksRaw[taskIdx].id,
      user: ctx.primaryUserId,
      organizationId: ctx.orgId,
      createdAt: new Date(now.getTime() - rand(1, 5) * 24 * 60 * 60 * 1000),
    });
  }

  if (comments.length > 0) {
    await prismadb.crm_Accounts_Tasks_Comments.createMany({ data: comments as any[] });
    console.log(`  Created ${comments.length} task comments`);
  }
}

// ============================================
// TASK 13: SEED PROPERTY SHOWINGS (6 per org)
// ============================================

async function seedPropertyShowings(
  ctx: OrgContext,
  clientIds: string[],
  propertyIds: string[]
): Promise<void> {
  console.log(`\nCreating 6 property showings for ${ctx.prefix} org...`);

  const now = new Date();

  const showings = [
    // Showing 1: NO_SHOW
    {
      id: uuid(),
      organizationId: ctx.orgId,
      propertyId: propertyIds[0],
      clientId: clientIds[0],
      agentId: ctx.primaryClerkId, // Clerk user ID, NOT DB ID
      showingDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      result: "NO_SHOW" as const,
      duration: 0,
      notes: "Ο πελάτης δεν εμφανίστηκε στο ραντεβού.",
    },
    // Showing 2: NO_INTEREST
    {
      id: uuid(),
      organizationId: ctx.orgId,
      propertyId: propertyIds[1],
      clientId: clientIds[1],
      agentId: ctx.primaryClerkId,
      showingDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      result: "NO_INTEREST" as const,
      duration: 30,
      notes: "Ο πελάτης δεν ενδιαφέρθηκε. Αναζητά μεγαλύτερο ακίνητο.",
    },
    // Showing 3: INTERESTED
    {
      id: uuid(),
      organizationId: ctx.orgId,
      propertyId: propertyIds[3],
      clientId: clientIds[5],
      agentId: ctx.primaryClerkId,
      showingDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      result: "INTERESTED" as const,
      duration: 45,
      notes: "Ο πελάτης ενδιαφέρθηκε. Ζήτησε επιπλέον πληροφορίες.",
    },
    // Showing 4: VERY_INTERESTED
    {
      id: uuid(),
      organizationId: ctx.orgId,
      propertyId: propertyIds[17],
      clientId: clientIds[5],
      agentId: ctx.primaryClerkId,
      showingDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      result: "VERY_INTERESTED" as const,
      duration: 60,
      notes: "Ο πελάτης πολύ ενθουσιασμένος. Σκέφτεται να κάνει προσφορά.",
    },
    // Showing 5: OFFER_MADE
    {
      id: uuid(),
      organizationId: ctx.orgId,
      propertyId: propertyIds[18],
      clientId: clientIds[0],
      agentId: ctx.primaryClerkId,
      showingDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      result: "OFFER_MADE" as const,
      duration: 75,
      notes: "Ο πελάτης κατέθεσε γραπτή προσφορά μετά την προβολή.",
    },
    // Showing 6: CONTRACT_SIGNED
    {
      id: uuid(),
      organizationId: ctx.orgId,
      propertyId: propertyIds[8],
      clientId: clientIds[6],
      agentId: ctx.primaryClerkId,
      showingDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      result: "CONTRACT_SIGNED" as const,
      duration: 90,
      notes: "Υπογραφή συμβολαίου μετά την τελική προβολή.",
    },
  ];

  await prismadb.propertyShowing.createMany({ data: showings as any[] });
  console.log(`  Created ${showings.length} property showings`);
}

// ============================================
// TASK 14: ENTITY COMMENTS
// ============================================

async function seedEntityComments(
  ctx: OrgContext,
  clientIds: string[],
  propertyIds: string[],
  mandateIds: string[]
): Promise<void> {
  console.log(`\nSeeding entity comments for ${ctx.prefix} org...`);

  const now = new Date();
  const departedUser = ctx.allUsers.find((u) => u.clerkUserId === `user_seed_${ctx.prefix}_departed`);
  const departedUserId = departedUser?.id ?? null;
  const pickUser = () => pick(ctx.allUsers).id;

  // --- PropertyComment (encrypted content) ---
  const propCommentContents = [
    "Excellent property, client very interested",
    "Price negotiation in progress",
    "Needs minor repairs in bathroom",
    "Client requested second viewing",
    "Photos updated, ready for listing",
    "Great location, close to metro",
    "Owner flexible on price",
    "Energy certificate pending",
    "Balcony view is the main selling point",
    "Parking space included in price",
    "Recently renovated kitchen",
    "Tenant vacating end of month",
    "Building has elevator - important for elderly clients",
    "Neighborhood quiet, family-friendly",
    "Comparable sold for 10% more last month",
  ];
  const propCommentTargets = [0, 1, 3, 4, 8, 17, 18, 19];
  const propComments: Array<Record<string, unknown>> = [];
  for (const idx of propCommentTargets) {
    if (!propertyIds[idx]) continue;
    const count = rand(3, 5);
    for (let i = 0; i < count; i++) {
      const isDeparted = i === 0 && idx === 18;
      propComments.push({
        id: uuid(),
        propertyId: propertyIds[idx],
        userId: isDeparted ? departedUserId : pickUser(),
        content: encryptCommentContent(pick(propCommentContents), ctx.dek),
        createdAt: new Date(now.getTime() - rand(1, 90) * 24 * 60 * 60 * 1000),
        updatedAt: now,
      });
    }
  }
  await prismadb.propertyComment.createMany({ data: propComments as any[] });
  console.log(`  Created ${propComments.length} property comments`);

  // --- ClientComment (NOT encrypted) ---
  const clientCommentContents = [
    "Initial meeting completed",
    "Follow-up scheduled",
    "Documents pending",
    "Very responsive client",
    "Budget confirmed",
    "Prefers south-facing properties",
    "Looking for investment opportunities",
    "Referred by existing client",
    "Speaks English and Greek fluently",
    "Requires mortgage pre-approval",
    "Interested in Kolonaki area primarily",
    "Timeline: within 3 months",
  ];
  const clientCommentTargets = [0, 1, 2, 3, 5, 6, 7, 10, 13, 14];
  const clientComments: Array<Record<string, unknown>> = [];
  for (const idx of clientCommentTargets) {
    if (!clientIds[idx]) continue;
    const count = rand(2, 4);
    for (let i = 0; i < count; i++) {
      const isDeparted = i === 0 && idx === 13;
      clientComments.push({
        id: uuid(),
        clientId: clientIds[idx],
        userId: isDeparted ? departedUserId : pickUser(),
        content: pick(clientCommentContents),
        createdAt: new Date(now.getTime() - rand(1, 90) * 24 * 60 * 60 * 1000),
        updatedAt: now,
      });
    }
  }
  await prismadb.clientComment.createMany({ data: clientComments as any[] });
  console.log(`  Created ${clientComments.length} client comments`);

  // --- MandateComment (encrypted content) ---
  const mandateCommentContents = [
    "Search criteria updated",
    "3 matching properties found",
    "Client reviewing shortlist",
    "Viewing scheduled for Friday",
    "Budget revised upward by 15%",
    "Area preference changed to include Glyfada",
    "Mandate extended for 3 more months",
    "Client satisfied with progress",
  ];
  const mandateCommentTargets = [0, 1, 2, 3, 4, 10];
  const mandateComments: Array<Record<string, unknown>> = [];
  for (const idx of mandateCommentTargets) {
    if (!mandateIds[idx]) continue;
    const count = rand(2, 3);
    for (let i = 0; i < count; i++) {
      mandateComments.push({
        id: uuid(),
        mandateId: mandateIds[idx],
        userId: pickUser(),
        content: encryptCommentContent(pick(mandateCommentContents), ctx.dek),
        createdAt: new Date(now.getTime() - rand(1, 60) * 24 * 60 * 60 * 1000),
        updatedAt: now,
      });
    }
  }
  await prismadb.mandateComment.createMany({ data: mandateComments as any[] });
  console.log(`  Created ${mandateComments.length} mandate comments`);
}

// ============================================
// TASK 15: SOCIAL FEED
// ============================================

async function seedSocialFeed(ctx: OrgContext, propertyIds: string[]): Promise<void> {
  console.log(`\nSeeding social feed for ${ctx.prefix} org...`);

  const now = new Date();
  const departedUser = ctx.allUsers.find((u) => u.clerkUserId === `user_seed_${ctx.prefix}_departed`);
  const departedUserId = departedUser?.id ?? ctx.primaryUserId;

  const slugs = await generateFriendlyIds("SocialPost", 12);

  const postDefs = [
    { postType: "property_listed", content: "Just listed a stunning apartment in Kolonaki! 3 bed, 85sqm with balcony and metro access.", linkedPropIdx: 0, authorId: ctx.primaryUserId, monthsAgo: 0.5 },
    { postType: "deal_closed", content: "Another successful deal closed in Kolonaki! \uD83C\uDF89", linkedPropIdx: 8, authorId: ctx.primaryUserId, monthsAgo: 1 },
    { postType: "client_converted", content: "Welcome our newest investor client to the portfolio", linkedPropIdx: null, authorId: ctx.primaryUserId, monthsAgo: 1.5 },
    { postType: "general", content: "Team meeting highlights: great Q2 results", linkedPropIdx: null, authorId: ctx.primaryUserId, monthsAgo: 2 },
    { postType: "property_sold", content: "SOLD! Beautiful apartment in Glyfada", linkedPropIdx: 2, authorId: ctx.primaryUserId, monthsAgo: 2.5 },
    { postType: "milestone", content: "Record month for our agency! 15 viewings completed", linkedPropIdx: null, authorId: ctx.primaryUserId, monthsAgo: 3 },
    { postType: "property_listed", content: "Exclusive listing: Luxury villa in Psychiko, 350sqm with pool and garden.", linkedPropIdx: 17, authorId: ctx.primaryUserId, monthsAgo: 0.3 },
    { postType: "general", content: "Athens property market update: prices up 8% in central areas", linkedPropIdx: null, authorId: ctx.primaryUserId, monthsAgo: 1.2 },
    { postType: "property_listed", content: "New listing in Kolonaki", linkedPropIdx: 18, authorId: departedUserId, monthsAgo: 4 },
    { postType: "general", content: "Great article about the real estate market trends", linkedPropIdx: null, authorId: ctx.primaryUserId, monthsAgo: 3.5 },
    { postType: "deal_closed", content: "Cross-org collaboration: helped a colleague close a deal", linkedPropIdx: null, authorId: ctx.primaryUserId, monthsAgo: 1.8 },
    { postType: "general", content: "Happy Monday everyone!", linkedPropIdx: null, authorId: ctx.primaryUserId, monthsAgo: 6 },
  ];

  const postIds: string[] = [];
  const posts: Array<Record<string, unknown>> = [];

  for (let i = 0; i < postDefs.length; i++) {
    const def = postDefs[i];
    const id = uuid();
    postIds.push(id);
    const createdAt = new Date(now.getTime() - def.monthsAgo * 30 * 24 * 60 * 60 * 1000);
    posts.push({
      id,
      slug: slugs[i].toLowerCase(),
      organizationId: ctx.orgId,
      authorId: def.authorId,
      postType: def.postType,
      content: def.content,
      linkedEntityId: def.linkedPropIdx != null ? propertyIds[def.linkedPropIdx] : null,
      linkedEntityType: def.linkedPropIdx != null ? "PROPERTY" : null,
      linkedEntityTitle: def.linkedPropIdx != null ? `Property ${def.linkedPropIdx + 1}` : null,
      createdAt,
      updatedAt: createdAt,
    });
  }

  await prismadb.socialPost.createMany({ data: posts as any[] });
  console.log(`  Created ${posts.length} social posts`);

  // --- Likes ---
  const likeDefs: Array<{ postIdx: number; count: number }> = [
    { postIdx: 0, count: 4 }, { postIdx: 1, count: 5 }, { postIdx: 2, count: 2 },
    { postIdx: 4, count: 3 }, { postIdx: 5, count: 2 }, { postIdx: 6, count: 5 },
    { postIdx: 8, count: 1 }, { postIdx: 10, count: 3 },
  ];
  const likes: Array<Record<string, unknown>> = [];
  for (const ld of likeDefs) {
    const shuffledUsers = shuffle([...ctx.allUsers]);
    const count = Math.min(ld.count, shuffledUsers.length);
    for (let i = 0; i < count; i++) {
      likes.push({
        id: uuid(),
        postId: postIds[ld.postIdx],
        userId: shuffledUsers[i].id,
        createdAt: new Date(now.getTime() - rand(0, 30) * 24 * 60 * 60 * 1000),
      });
    }
  }
  await prismadb.socialPostLike.createMany({ data: likes as any[] });
  console.log(`  Created ${likes.length} social post likes`);

  // --- Comments (parent comments first, then replies) ---
  const commentContents = [
    "Great listing!", "Congratulations!", "Interested client here",
    "What's the asking price?", "Beautiful property", "Well done team!",
    "Amazing work!", "Keep it up!", "Fantastic news!", "Love this!",
    "Can you share more details?", "When is the open house?",
    "Perfect location", "My client might be interested",
  ];

  const parentComments: Array<Record<string, unknown> & { _postIdx: number }> = [];
  const replies: Array<Record<string, unknown>> = [];

  // Post 1 (idx 0): 3 comments, 1 reply
  for (let i = 0; i < 2; i++) {
    parentComments.push({ _postIdx: 0, id: uuid(), postId: postIds[0], userId: pickUser(), content: commentContents[i], createdAt: new Date(now.getTime() - rand(1, 14) * 24 * 60 * 60 * 1000), updatedAt: now, parentId: null });
  }
  // third is a reply to first
  const post1Parent = parentComments[0];

  // Post 2 (idx 1): 2 comments
  for (let i = 0; i < 2; i++) {
    parentComments.push({ _postIdx: 1, id: uuid(), postId: postIds[1], userId: pickUser(), content: commentContents[2 + i], createdAt: new Date(now.getTime() - rand(1, 20) * 24 * 60 * 60 * 1000), updatedAt: now, parentId: null });
  }

  // Post 4 (idx 3): 3 comments
  for (let i = 0; i < 3; i++) {
    parentComments.push({ _postIdx: 3, id: uuid(), postId: postIds[3], userId: pickUser(), content: commentContents[4 + i], createdAt: new Date(now.getTime() - rand(1, 30) * 24 * 60 * 60 * 1000), updatedAt: now, parentId: null });
  }

  // Post 7 (idx 6): 4 comments, 2 replies
  for (let i = 0; i < 2; i++) {
    parentComments.push({ _postIdx: 6, id: uuid(), postId: postIds[6], userId: pickUser(), content: commentContents[7 + i], createdAt: new Date(now.getTime() - rand(1, 10) * 24 * 60 * 60 * 1000), updatedAt: now, parentId: null });
  }
  const post7Parents = parentComments.filter(c => c._postIdx === 6);

  // Post 8 (idx 7): 1 comment
  parentComments.push({ _postIdx: 7, id: uuid(), postId: postIds[7], userId: pickUser(), content: commentContents[9], createdAt: new Date(now.getTime() - rand(1, 20) * 24 * 60 * 60 * 1000), updatedAt: now, parentId: null });

  // Post 6 (idx 5): 1 comment
  parentComments.push({ _postIdx: 5, id: uuid(), postId: postIds[5], userId: pickUser(), content: commentContents[10], createdAt: new Date(now.getTime() - rand(1, 40) * 24 * 60 * 60 * 1000), updatedAt: now, parentId: null });

  // Post 11 (idx 10): 2 comments, one from departed
  parentComments.push({ _postIdx: 10, id: uuid(), postId: postIds[10], userId: departedUserId, content: commentContents[11], createdAt: new Date(now.getTime() - rand(1, 30) * 24 * 60 * 60 * 1000), updatedAt: now, parentId: null });
  parentComments.push({ _postIdx: 10, id: uuid(), postId: postIds[10], userId: pickUser(), content: commentContents[12], createdAt: new Date(now.getTime() - rand(1, 30) * 24 * 60 * 60 * 1000), updatedAt: now, parentId: null });

  // Create parent comments (strip _postIdx)
  const parentData = parentComments.map(({ _postIdx, ...rest }) => rest);
  await prismadb.socialPostComment.createMany({ data: parentData as any[] });

  // Now create replies
  // Reply to post1Parent
  replies.push({ id: uuid(), postId: postIds[0], userId: pickUser(), content: "Thanks! Let me know if you want a viewing", parentId: post1Parent.id, createdAt: new Date(now.getTime() - rand(0, 7) * 24 * 60 * 60 * 1000), updatedAt: now });

  // 2 replies to post7Parents
  if (post7Parents.length >= 2) {
    replies.push({ id: uuid(), postId: postIds[6], userId: pickUser(), content: "My client is very interested in this one", parentId: post7Parents[0].id, createdAt: new Date(now.getTime() - rand(0, 5) * 24 * 60 * 60 * 1000), updatedAt: now });
    replies.push({ id: uuid(), postId: postIds[6], userId: pickUser(), content: "Can we arrange a private viewing?", parentId: post7Parents[1].id, createdAt: new Date(now.getTime() - rand(0, 5) * 24 * 60 * 60 * 1000), updatedAt: now });
  }

  if (replies.length > 0) {
    await prismadb.socialPostComment.createMany({ data: replies as any[] });
  }
  console.log(`  Created ${parentComments.length + replies.length} social post comments`);

  // --- Attachment on post 10 (idx 9) ---
  await prismadb.attachment.create({
    data: {
      id: uuid(),
      organizationId: ctx.orgId,
      uploadedById: ctx.primaryUserId,
      fileName: "market-trends.jpg",
      fileSize: 250000,
      fileType: "image/jpeg",
      url: "https://placehold.co/800x600.png?text=Market+Trends",
      socialPostId: postIds[9],
    },
  });
  console.log(`  Created 1 social post attachment`);

  function pickUser() { return pick(ctx.allUsers).id; }
}

// ============================================
// TASK 16: MESSAGING (CHANNELS, CONVERSATIONS, MESSAGES)
// ============================================

async function seedMessaging(ctx: OrgContext): Promise<void> {
  console.log(`\nSeeding messaging for ${ctx.prefix} org...`);

  const now = new Date();
  const departedUser = ctx.allUsers.find((u) => u.clerkUserId === `user_seed_${ctx.prefix}_departed`);
  const departedUserId = departedUser?.id ?? ctx.primaryUserId;
  const pickUser = () => pick(ctx.allUsers).id;
  const allMessageIds: string[] = [];
  const allMessageCreatedAts: Map<string, Date> = new Map();

  // --- Channels ---
  const channelDefs = [
    { name: "General", slug: "general", channelType: "PUBLIC" as const, isDefault: true },
    { name: "Management", slug: "management", channelType: "PRIVATE" as const, isDefault: false },
    { name: "Announcements", slug: "announcements", channelType: "ANNOUNCEMENT" as const, isDefault: false },
  ];

  const channelIds: string[] = [];
  for (const def of channelDefs) {
    const id = uuid();
    channelIds.push(id);
    await prismadb.channel.create({
      data: {
        id,
        organizationId: ctx.orgId,
        name: def.name,
        slug: def.slug,
        channelType: def.channelType,
        isDefault: def.isDefault,
        isArchived: false,
        isE2ee: false,
        createdById: ctx.primaryUserId,
        createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`  Created ${channelIds.length} channels`);

  // --- Channel Members ---
  const memberData: Array<Record<string, unknown>> = [];
  // #general: all users
  for (const user of ctx.allUsers) {
    memberData.push({
      id: uuid(),
      channelId: channelIds[0],
      userId: user.id,
      role: user.id === ctx.primaryUserId ? "OWNER" : "MEMBER",
    });
  }
  // #management: primary + first 1-2 real (non-synthetic) users
  const realUsers = ctx.allUsers.filter(u => !u.clerkUserId?.startsWith("user_seed_"));
  memberData.push({ id: uuid(), channelId: channelIds[1], userId: ctx.primaryUserId, role: "OWNER" });
  for (const u of realUsers.slice(0, 2)) {
    if (u.id !== ctx.primaryUserId) {
      memberData.push({ id: uuid(), channelId: channelIds[1], userId: u.id, role: "ADMIN" });
    }
  }
  // #announcements: all users
  for (const user of ctx.allUsers) {
    memberData.push({
      id: uuid(),
      channelId: channelIds[2],
      userId: user.id,
      role: user.id === ctx.primaryUserId ? "OWNER" : "MEMBER",
    });
  }
  await prismadb.channelMember.createMany({ data: memberData as any[] });
  console.log(`  Created ${memberData.length} channel members`);

  // --- Channel Messages ---
  const generalMsgs = CHANNEL_MESSAGES.general;
  const managementMsgs = CHANNEL_MESSAGES.management;
  const announcementMsgs = CHANNEL_MESSAGES.announcements;

  // Helper to create a message and track it
  function makeMsg(channelId: string, senderId: string, content: string, contentType: string, daysAgo: number, parentId?: string): Record<string, unknown> {
    const id = uuid();
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    allMessageIds.push(id);
    allMessageCreatedAts.set(id, createdAt);
    return { id, organizationId: ctx.orgId, channelId, senderId, content, contentType, createdAt, parentId: parentId ?? null, threadCount: 0 };
  }

  // #general: 10 messages + 1 system + thread
  const generalMessages: Array<Record<string, unknown>> = [];
  for (let i = 0; i < Math.min(10, generalMsgs.length); i++) {
    const sender = i === 8 ? departedUserId : pickUser();
    generalMessages.push(makeMsg(channelIds[0], sender, generalMsgs[i], "TEXT", 30 - i * 3));
  }
  // System message
  generalMessages.push(makeMsg(channelIds[0], ctx.primaryUserId, `user_seed_${ctx.prefix}_departed has left the channel`, "SYSTEM", 15));

  // Thread on first general message
  const threadParentId = generalMessages[0].id as string;
  const threadReplies = [
    makeMsg(channelIds[0], pickUser(), "Yes! The Kolonaki ones look great", "TEXT", 29),
    makeMsg(channelIds[0], pickUser(), "I have a client who might be interested", "TEXT", 28),
    makeMsg(channelIds[0], ctx.primaryUserId, "Let's discuss at the meeting", "TEXT", 27),
  ];
  for (const r of threadReplies) { r.parentId = threadParentId; }
  generalMessages[0].threadCount = 3;

  const allChannelMessages = [...generalMessages, ...threadReplies];

  // #management: 4 messages
  for (let i = 0; i < Math.min(4, managementMsgs.length); i++) {
    allChannelMessages.push(makeMsg(channelIds[1], ctx.primaryUserId, managementMsgs[i], "TEXT", 20 - i * 5));
  }

  // #announcements: 2 messages
  for (let i = 0; i < Math.min(2, announcementMsgs.length); i++) {
    allChannelMessages.push(makeMsg(channelIds[2], ctx.primaryUserId, announcementMsgs[i], "TEXT", 25 - i * 10));
  }

  await prismadb.message.createMany({ data: allChannelMessages as any[] });
  console.log(`  Created ${allChannelMessages.length} channel messages`);

  // --- Org-scoped Conversation (1:1 DM) ---
  const teammate = ctx.allUsers.find(u => u.id !== ctx.primaryUserId) ?? ctx.allUsers[0];
  const convId = uuid();
  await prismadb.conversation.create({
    data: {
      id: convId,
      organizationId: ctx.orgId,
      scope: "ORG",
      isGroup: false,
      isE2ee: false,
      createdById: ctx.primaryUserId,
    },
  });

  await prismadb.conversationParticipant.createMany({
    data: [
      { id: uuid(), conversationId: convId, userId: ctx.primaryUserId },
      { id: uuid(), conversationId: convId, userId: teammate.id },
    ],
  });

  const dmMessages = DM_MESSAGES.general_dm;
  const dmMsgRecords: Array<Record<string, unknown>> = [];
  for (let i = 0; i < dmMessages.length; i++) {
    const sender = i % 2 === 0 ? ctx.primaryUserId : teammate.id;
    const id = uuid();
    const createdAt = new Date(now.getTime() - (dmMessages.length - i) * 2 * 60 * 60 * 1000);
    allMessageIds.push(id);
    allMessageCreatedAts.set(id, createdAt);
    dmMsgRecords.push({
      id,
      organizationId: ctx.orgId,
      conversationId: convId,
      senderId: sender,
      content: dmMessages[i],
      contentType: "TEXT",
      createdAt,
      parentId: null,
      threadCount: 0,
    });
  }
  await prismadb.message.createMany({ data: dmMsgRecords as any[] });
  console.log(`  Created 1 conversation with ${dmMsgRecords.length} DM messages`);

  // --- Group DM (alpha org only) ---
  if (ctx.prefix === "alpha" && ctx.allUsers.length >= 3) {
    const groupConvId = uuid();
    const groupParticipants = ctx.allUsers.filter(u => u.id !== ctx.primaryUserId).slice(0, 2);
    await prismadb.conversation.create({
      data: {
        id: groupConvId,
        organizationId: ctx.orgId,
        scope: "ORG",
        isGroup: true,
        isE2ee: false,
        name: "Alpha Team Chat",
        createdById: ctx.primaryUserId,
      },
    });
    await prismadb.conversationParticipant.createMany({
      data: [
        { id: uuid(), conversationId: groupConvId, userId: ctx.primaryUserId },
        ...groupParticipants.map(u => ({ id: uuid(), conversationId: groupConvId, userId: u.id })),
      ],
    });
    const groupMsgContents = [
      "Hey team, let's coordinate on the Kolonaki listings",
      "Sure, I'll prepare the comparables by tomorrow",
      "I spoke with the owner — they're flexible on price",
      "Great news! Let's schedule a viewing for Thursday",
    ];
    const groupMsgRecords: Array<Record<string, unknown>> = [];
    const senders = [ctx.primaryUserId, groupParticipants[0].id, groupParticipants[1].id, ctx.primaryUserId];
    for (let i = 0; i < groupMsgContents.length; i++) {
      const id = uuid();
      const createdAt = new Date(now.getTime() - (groupMsgContents.length - i) * 3 * 60 * 60 * 1000);
      allMessageIds.push(id);
      allMessageCreatedAts.set(id, createdAt);
      groupMsgRecords.push({
        id,
        organizationId: ctx.orgId,
        conversationId: groupConvId,
        senderId: senders[i],
        content: groupMsgContents[i],
        contentType: "TEXT",
        createdAt,
        parentId: null,
        threadCount: 0,
      });
    }
    await prismadb.message.createMany({ data: groupMsgRecords as any[] });
    console.log(`  Created group DM with ${groupMsgRecords.length} messages`);
  }

  // --- Departed-user DM ---
  const departedConvId = uuid();
  await prismadb.conversation.create({
    data: {
      id: departedConvId,
      organizationId: ctx.orgId,
      scope: "ORG",
      isGroup: false,
      isE2ee: false,
      createdById: ctx.primaryUserId,
    },
  });
  await prismadb.conversationParticipant.createMany({
    data: [
      { id: uuid(), conversationId: departedConvId, userId: ctx.primaryUserId },
      { id: uuid(), conversationId: departedConvId, userId: departedUserId },
    ],
  });
  const departedMsgRecords: Array<Record<string, unknown>> = [];
  const departedMsgDefs: Array<{ sender: string; content: string; hoursAgo: number }> = [
    { sender: departedUserId, content: "Hi, I wanted to hand off the Glyfada listing notes before I leave", hoursAgo: 72 },
    { sender: ctx.primaryUserId, content: "Thanks for the heads up. Can you share the client contact details?", hoursAgo: 70 },
    { sender: ctx.primaryUserId, content: "I'll take it from here. Good luck!", hoursAgo: 68 },
  ];
  for (const def of departedMsgDefs) {
    const id = uuid();
    const createdAt = new Date(now.getTime() - def.hoursAgo * 60 * 60 * 1000);
    allMessageIds.push(id);
    allMessageCreatedAts.set(id, createdAt);
    departedMsgRecords.push({
      id,
      organizationId: ctx.orgId,
      conversationId: departedConvId,
      senderId: def.sender,
      content: def.content,
      contentType: "TEXT",
      createdAt,
      parentId: null,
      threadCount: 0,
    });
  }
  await prismadb.message.createMany({ data: departedMsgRecords as any[] });
  console.log(`  Created departed-user DM with ${departedMsgRecords.length} messages`);

  // --- Message sub-entities ---

  // MessageReaction: on 4 messages
  const reactionTargets = shuffle(allMessageIds).slice(0, 4);
  const reactions: Array<Record<string, unknown>> = [];
  for (const msgId of reactionTargets) {
    reactions.push({ id: uuid(), messageId: msgId, userId: pickUser(), emoji: "\uD83D\uDC4D" });
    reactions.push({ id: uuid(), messageId: msgId, userId: pickUser(), emoji: "\uD83C\uDFE0" });
  }
  await prismadb.messageReaction.createMany({ data: reactions as any[], skipDuplicates: true });
  console.log(`  Created ${reactions.length} message reactions`);

  // MessageAttachment: on 2 messages
  const attachTargets = shuffle(allMessageIds).slice(0, 2);
  const attachments: Array<Record<string, unknown>> = [];
  attachments.push({ id: uuid(), messageId: attachTargets[0], fileName: "floor-plan.pdf", fileSize: 150000, fileType: "application/pdf", url: "https://placehold.co/600x400.png?text=Floor+Plan" });
  attachments.push({ id: uuid(), messageId: attachTargets[1], fileName: "property-photo.jpg", fileSize: 320000, fileType: "image/jpeg", url: "https://placehold.co/800x600.png?text=Property+Photo" });
  await prismadb.messageAttachment.createMany({ data: attachments as any[] });
  console.log(`  Created ${attachments.length} message attachments`);

  // MessageMention: on 3 messages
  const mentionTargets = shuffle(allMessageIds).slice(0, 3);
  const mentions: Array<Record<string, unknown>> = [];
  for (const msgId of mentionTargets) {
    mentions.push({ id: uuid(), messageId: msgId, userId: pickUser() });
  }
  await prismadb.messageMention.createMany({ data: mentions as any[], skipDuplicates: true });
  console.log(`  Created ${mentions.length} message mentions`);

  // MessageRead: ~60% of messages
  const readCount = Math.floor(allMessageIds.length * 0.6);
  const readTargets = shuffle(allMessageIds).slice(0, readCount);
  const reads: Array<Record<string, unknown>> = [];
  for (const msgId of readTargets) {
    const msgCreated = allMessageCreatedAts.get(msgId) ?? now;
    reads.push({
      id: uuid(),
      messageId: msgId,
      userId: pickUser(),
      readAt: new Date(msgCreated.getTime() + rand(1, 30) * 60 * 1000),
    });
  }
  await prismadb.messageRead.createMany({ data: reads as any[], skipDuplicates: true });
  console.log(`  Created ${reads.length} message read receipts`);
}

// ============================================
// CHUNK 5: JOIN TABLES
// ============================================

async function seedJoinTables(
  ctx: OrgContext,
  clientIds: string[],
  propertyIds: string[],
  mandateIds: string[],
): Promise<void> {
  console.log(`\n[${ctx.prefix}] Seeding join tables...`);

  // --- Client_Properties ---
  const cpData: Array<{ id: string; clientId: string; propertyId: string }> = [];
  const addCP = (cIdx: number, pIdx: number) => {
    if (clientIds[cIdx] && propertyIds[pIdx]) {
      cpData.push({ id: uuid(), clientId: clientIds[cIdx], propertyId: propertyIds[pIdx] });
    }
  };

  // Sellers → their listings
  addCP(2, 0); addCP(2, 1);
  addCP(3, 2); addCP(3, 3);
  // Investor → 4 properties
  addCP(5, 0); addCP(5, 1); addCP(5, 3); if (propertyIds[17]) addCP(5, 17);
  // Buyers → properties of interest
  addCP(0, 0); addCP(0, 2); addCP(0, 4);
  addCP(1, 1); addCP(1, 3);

  await prismadb.client_Properties.createMany({ data: cpData, skipDuplicates: true });
  console.log(`  Created ${cpData.length} Client_Properties links`);

  // --- Mandate_Properties ---
  const mpData: Array<{ id: string; mandateId: string; propertyId: string }> = [];
  const addMP = (mIdx: number, pIdx: number) => {
    if (mandateIds[mIdx] && propertyIds[pIdx]) {
      mpData.push({ id: uuid(), mandateId: mandateIds[mIdx], propertyId: propertyIds[pIdx] });
    }
  };

  // Fulfilled mandate → SOLD property
  if (mandateIds[4]) addMP(4, 8);
  // Active mandates → candidate properties
  addMP(0, 0); addMP(0, 2); addMP(0, 4);
  addMP(1, 1); addMP(1, 3);
  // Cross-org mandate → matchmaking targets
  if (mandateIds[10]) { addMP(10, 18); addMP(10, 19); }

  await prismadb.mandate_Properties.createMany({ data: mpData, skipDuplicates: true });
  console.log(`  Created ${mpData.length} Mandate_Properties links`);

  // --- Mandate_Clients ---
  const mcData: Array<{ id: string; mandateId: string; clientId: string }> = [];
  const addMC = (mIdx: number, cIdx: number) => {
    if (mandateIds[mIdx] && clientIds[cIdx]) {
      mcData.push({ id: uuid(), mandateId: mandateIds[mIdx], clientId: clientIds[cIdx] });
    }
  };

  addMC(0, 0); addMC(0, 1); // co-buyers on mandate 0
  addMC(1, 1);
  addMC(2, 2);
  addMC(3, 3);
  addMC(4, 4);
  addMC(5, 5);
  addMC(6, 6);
  addMC(7, 7);
  addMC(8, 8);
  addMC(9, 9);
  if (mandateIds[10]) addMC(10, 10);

  await prismadb.mandate_Clients.createMany({ data: mcData, skipDuplicates: true });
  console.log(`  Created ${mcData.length} Mandate_Clients links`);
}

// ============================================
// CHUNK 5: PROPERTY IMAGES
// ============================================

async function seedPropertyImages(
  ctx: OrgContext,
  propertyIds: string[],
): Promise<void> {
  console.log(`\n[${ctx.prefix}] Seeding property images...`);

  const images: Array<Record<string, unknown>> = [];

  function addImage(propertyId: string, position: number, caption: string) {
    images.push({
      id: uuid(),
      propertyId,
      organizationId: ctx.orgId,
      url: `https://placehold.co/1200x800.png?text=Property+Photo+${position + 1}`,
      blobPathname: `${ctx.orgId}/${propertyId}/photo-${position}.jpg`,
      position,
      isPrimary: position === 0,
      caption,
      width: 1200,
      height: 800,
      fileSize: 250000,
      originalFileSize: 500000,
      mimeType: "image/jpeg",
      originalFileName: `property-photo-${position + 1}.jpg`,
    });
  }

  // Luxury property (index 17): 3 images
  if (propertyIds[17]) {
    addImage(propertyIds[17], 0, "Living room with panoramic view");
    addImage(propertyIds[17], 1, "Master bedroom suite");
    addImage(propertyIds[17], 2, "Rooftop terrace");
  }
  // Match target 1 (index 18): 2 images
  if (propertyIds[18]) {
    addImage(propertyIds[18], 0, "Exterior facade");
    addImage(propertyIds[18], 1, "Open plan kitchen");
  }
  // Match target 2 (index 19): 1 image
  if (propertyIds[19]) {
    addImage(propertyIds[19], 0, "Street view");
  }

  if (images.length > 0) {
    await prismadb.propertyImage.createMany({ data: images as any[] });
  }
  console.log(`  Created ${images.length} property images`);
}

// ============================================
// CHUNK 5: AGENT PROFILES
// ============================================

async function seedAgentProfiles(
  alpha: OrgContext,
  beta: OrgContext,
  alphaPropertyIds: string[],
  betaPropertyIds: string[],
): Promise<void> {
  console.log("\n[cross-org] Seeding agent profiles...");

  const profiles: Array<{ ctx: OrgContext; userId: string; slug: string; visibility: string; specializations: string[]; serviceAreas: string[]; years: number }> = [];

  // Helper: find a second real (non-synthetic) user
  function findSecondReal(ctx: OrgContext): string | null {
    const second = ctx.allUsers.find(u => u.id !== ctx.primaryUserId && !(u.clerkUserId ?? "").startsWith("user_seed_"));
    return second?.id ?? null;
  }

  const alphaSecond = findSecondReal(alpha);
  const betaSecond = findSecondReal(beta);

  profiles.push({ ctx: alpha, userId: alpha.primaryUserId, slug: "agent-alpha-1", visibility: "PUBLIC", specializations: ["Residential", "Luxury"], serviceAreas: ["Athens", "Kolonaki"], years: 12 });
  if (alphaSecond) {
    profiles.push({ ctx: alpha, userId: alphaSecond, slug: "agent-alpha-2", visibility: "PRIVATE", specializations: ["Commercial", "Investment"], serviceAreas: ["Piraeus", "Glyfada"], years: 8 });
  }
  profiles.push({ ctx: beta, userId: beta.primaryUserId, slug: "agent-beta-1", visibility: "PUBLIC", specializations: ["Residential", "Rentals"], serviceAreas: ["Thessaloniki", "Kalamaria"], years: 15 });
  if (betaSecond) {
    profiles.push({ ctx: beta, userId: betaSecond, slug: "agent-beta-2", visibility: "SECURE", specializations: ["Land", "Development"], serviceAreas: ["Halkidiki", "Thermi"], years: 10 });
  }

  const profileIds: string[] = [];
  for (const p of profiles) {
    const id = uuid();
    profileIds.push(id);
    await prismadb.agentProfile.create({
      data: {
        id,
        userId: p.userId,
        slug: p.slug,
        bio: `Experienced real estate agent specializing in ${p.specializations.join(" and ").toLowerCase()} properties across ${p.serviceAreas.join(", ")}.`,
        specializations: p.specializations,
        serviceAreas: p.serviceAreas,
        languages: ["el", "en"],
        yearsExperience: p.years,
        socialLinks: { linkedin: `https://linkedin.com/in/${p.slug}` },
        visibility: p.visibility as any,
        contactFormEnabled: p.visibility === "PUBLIC",
        contactFormFields: [
          { name: "name", required: true },
          { name: "email", required: true },
          { name: "phone" },
          { name: "message", required: true },
        ],
        updatedAt: new Date(),
      },
    });
  }
  console.log(`  Created ${profiles.length} agent profiles`);

  // Showcase properties for PUBLIC profiles
  const showcaseData: Array<Record<string, unknown>> = [];
  // Alpha primary (PUBLIC) → alpha properties
  const publicAlphaPropertyIndices = [0, 17, 18].filter(i => alphaPropertyIds[i]);
  for (let i = 0; i < publicAlphaPropertyIndices.length; i++) {
    showcaseData.push({ id: uuid(), profileId: profileIds[0], propertyId: alphaPropertyIds[publicAlphaPropertyIndices[i]], order: i });
  }
  // Beta primary (PUBLIC) → beta properties
  const publicBetaIdx = profiles.findIndex(p => p.slug === "agent-beta-1");
  const publicBetaPropertyIndices = [0, 1, 17].filter(i => betaPropertyIds[i]);
  for (let i = 0; i < publicBetaPropertyIndices.length; i++) {
    showcaseData.push({ id: uuid(), profileId: profileIds[publicBetaIdx], propertyId: betaPropertyIds[publicBetaPropertyIndices[i]], order: i });
  }

  if (showcaseData.length > 0) {
    await prismadb.profileShowcaseProperty.createMany({ data: showcaseData as any[] });
  }
  console.log(`  Created ${showcaseData.length} showcase property links`);

  // --- Agent Contact Submissions for PUBLIC profiles ---
  const agentSubmissions: Array<Record<string, unknown>> = [];
  for (let i = 0; i < profiles.length; i++) {
    if (profiles[i].visibility === "PUBLIC") {
      agentSubmissions.push(
        { id: uuid(), profileId: profileIds[i], formData: { name: "Interested Buyer", email: "buyer@example.com", phone: "+306912345678", message: "I'm interested in properties in Kolonaki" }, status: "NEW", senderName: "Interested Buyer", senderEmail: "buyer@example.com", createdAt: generateHistoricalDate(1) },
        { id: uuid(), profileId: profileIds[i], formData: { name: "Property Owner", email: "owner@example.com", message: "I want to list my property" }, status: "CONTACTED", senderName: "Property Owner", senderEmail: "owner@example.com", createdAt: generateHistoricalDate(3) },
      );
    }
  }
  if (agentSubmissions.length > 0) {
    await prismadb.agentContactSubmission.createMany({ data: agentSubmissions as any[] });
  }
  console.log(`  Created ${agentSubmissions.length} agent contact submissions`);
}

// ============================================
// CHUNK 5: AGENCY PROFILES
// ============================================

async function seedAgencyProfiles(
  alpha: OrgContext,
  beta: OrgContext,
): Promise<void> {
  console.log("\n[cross-org] Seeding agency profiles...");

  const contactFormFields = [
    { name: "name", required: true },
    { name: "email", required: true },
    { name: "phone" },
    { name: "message", required: true },
  ];

  const alphaProfileId = uuid();
  const betaProfileId = uuid();

  await prismadb.agencyProfile.create({
    data: {
      id: alphaProfileId,
      organizationId: alpha.orgId,
      name: "Alpha Real Estate",
      slug: "alpha-real-estate",
      description: "Premier real estate agency in Athens specializing in residential and luxury properties.",
      phone: "+30 210 1234567",
      email: "info@alpha-realestate.gr",
      website: "https://alpha-realestate.gr",
      city: "Athens",
      region: "Attica",
      country: "GR",
      visibility: "PUBLIC",
      yearFounded: 2015,
      licenseNumber: "RE-ATT-2015-001",
      contactFormEnabled: true,
      contactFormFields,
      socialLinks: { facebook: "https://facebook.com/alpha-realestate", instagram: "https://instagram.com/alpha_re" },
    },
  });

  await prismadb.agencyProfile.create({
    data: {
      id: betaProfileId,
      organizationId: beta.orgId,
      name: "Beta Properties",
      slug: "beta-properties",
      description: "Leading property management and sales firm in Thessaloniki and Northern Greece.",
      phone: "+30 2310 987654",
      email: "contact@beta-properties.gr",
      website: "https://beta-properties.gr",
      city: "Thessaloniki",
      region: "Central Macedonia",
      country: "GR",
      visibility: "PUBLIC",
      yearFounded: 2018,
      licenseNumber: "RE-THK-2018-042",
      contactFormEnabled: true,
      contactFormFields,
      socialLinks: { facebook: "https://facebook.com/beta-properties" },
    },
  });

  console.log("  Created 2 agency profiles");

  // Contact submissions
  const submissions: Array<Record<string, unknown>> = [];
  // Alpha: 2 submissions (NEW, CONTACTED)
  submissions.push({
    id: uuid(),
    profileId: alphaProfileId,
    formData: { name: "Maria Georgiou", email: "maria.g@gmail.com", phone: "6971234567", message: "Interested in Kolonaki apartment listings" },
    status: "NEW",
    senderName: "Maria Georgiou",
    senderEmail: "maria.g@gmail.com",
  });
  submissions.push({
    id: uuid(),
    profileId: alphaProfileId,
    formData: { name: "Petros Nikolaou", email: "p.nikolaou@outlook.com", message: "Looking for commercial space in Piraeus" },
    status: "CONTACTED",
    senderName: "Petros Nikolaou",
    senderEmail: "p.nikolaou@outlook.com",
    notes: "Called back, scheduled viewing for next week",
  });
  // Beta: 2 submissions (READ, ARCHIVED)
  submissions.push({
    id: uuid(),
    profileId: betaProfileId,
    formData: { name: "Elena Papadaki", email: "elena.p@yahoo.gr", phone: "6985551234", message: "Do you have rentals in Kalamaria?" },
    status: "READ",
    senderName: "Elena Papadaki",
    senderEmail: "elena.p@yahoo.gr",
  });
  submissions.push({
    id: uuid(),
    profileId: betaProfileId,
    formData: { name: "Kostas Dimitriou", email: "k.dimitriou@protonmail.com", message: "Investment opportunity inquiry" },
    status: "ARCHIVED",
    senderName: "Kostas Dimitriou",
    senderEmail: "k.dimitriou@protonmail.com",
    notes: "Not a serious lead",
  });

  await prismadb.agencyContactSubmission.createMany({ data: submissions as any[] });
  console.log(`  Created ${submissions.length} agency contact submissions`);
}

// ============================================
// CHUNK 5: AGENT CONNECTIONS
// ============================================

async function seedAgentConnections(
  alpha: OrgContext,
  beta: OrgContext,
): Promise<void> {
  console.log("\n[cross-org] Seeding agent connections...");

  const now = new Date();

  // Find second users (prefer real, fallback to synthetic)
  function findSecond(ctx: OrgContext): string {
    const second = ctx.allUsers.find(u => u.id !== ctx.primaryUserId);
    return second?.id ?? ctx.primaryUserId;
  }

  const alphaSecond = findSecond(alpha);
  const betaSecond = findSecond(beta);

  const connections: Array<Record<string, unknown>> = [
    { id: uuid(), followerId: alpha.primaryUserId, followingId: beta.primaryUserId, status: "ACCEPTED", createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), updatedAt: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000) },
    { id: uuid(), followerId: beta.primaryUserId, followingId: alpha.primaryUserId, status: "ACCEPTED", createdAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000), updatedAt: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000) },
  ];
  // Only add connections 3 & 4 when second users are distinct from primary
  if (betaSecond !== beta.primaryUserId) {
    connections.push({ id: uuid(), followerId: betaSecond, followingId: alpha.primaryUserId, status: "PENDING", createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) });
  }
  if (alphaSecond !== alpha.primaryUserId) {
    connections.push({ id: uuid(), followerId: alphaSecond, followingId: beta.primaryUserId, status: "REJECTED", createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), updatedAt: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000) });
  }

  await prismadb.agentConnection.createMany({ data: connections as any[], skipDuplicates: true });
  console.log(`  Created ${connections.length} agent connections`);
}

// ============================================
// CHUNK 5: SHARED ENTITIES
// ============================================

async function seedSharedEntities(
  alpha: OrgContext,
  beta: OrgContext,
  alphaPropertyIds: string[],
  alphaClientIds: string[],
  alphaDocIds: string[],
): Promise<void> {
  console.log("\n[cross-org] Seeding shared entities...");

  const now = new Date();
  const departedUser = alpha.allUsers.find(u => (u.clerkUserId ?? "").includes("departed"));
  const departedUserId = departedUser?.id ?? alpha.primaryUserId;

  const entities: Array<Record<string, unknown>> = [];

  if (alphaPropertyIds[17]) {
    entities.push({ id: uuid(), entityType: "PROPERTY", entityId: alphaPropertyIds[17], sharedById: alpha.primaryUserId, sharedWithId: beta.primaryUserId, permissions: "VIEW_COMMENT", message: "Check out this luxury listing", createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) });
  }
  if (alphaPropertyIds[0]) {
    entities.push({ id: uuid(), entityType: "PROPERTY", entityId: alphaPropertyIds[0], sharedById: alpha.primaryUserId, sharedWithId: beta.primaryUserId, permissions: "VIEW_ONLY", message: "For your buyer client", createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) });
  }
  if (alphaClientIds[6]) {
    entities.push({ id: uuid(), entityType: "CLIENT", entityId: alphaClientIds[6], sharedById: alpha.primaryUserId, sharedWithId: beta.primaryUserId, permissions: "VIEW_COMMENT", message: "Shared referral contact", createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) });
  }
  if (alphaDocIds[0]) {
    entities.push({ id: uuid(), entityType: "DOCUMENT", entityId: alphaDocIds[0], sharedById: alpha.primaryUserId, sharedWithId: beta.primaryUserId, permissions: "VIEW_ONLY", message: "Contract for review", createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) });
  }
  if (alphaPropertyIds[18]) {
    entities.push({ id: uuid(), entityType: "PROPERTY", entityId: alphaPropertyIds[18], sharedById: departedUserId, sharedWithId: beta.primaryUserId, permissions: "VIEW_COMMENT", message: null, createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) });
  }

  if (entities.length > 0) {
    await prismadb.sharedEntity.createMany({ data: entities as any[], skipDuplicates: true });
  }
  console.log(`  Created ${entities.length} shared entities`);
}

// ============================================
// CHUNK 5: NETWORK SETTINGS & CROSS-ORG MATCHES
// ============================================

async function seedNetworkAndMatching(
  alpha: OrgContext,
  beta: OrgContext,
  alphaMandateIds: string[],
  alphaPropertyIds: string[],
  betaMandateIds: string[],
  betaPropertyIds: string[],
): Promise<void> {
  console.log("\n[cross-org] Seeding network settings & cross-org matches...");

  const now = new Date();

  // Network settings
  await prismadb.orgNetworkSettings.create({
    data: {
      organizationId: alpha.orgId,
      membership: "BOTH",
      shareProperties: true,
      shareMandates: true,
      propertyPrivacyLevel: "AGENCY_IDENTIFIED",
      mandatePrivacyLevel: "AGENCY_IDENTIFIED",
    },
  });

  await prismadb.orgNetworkSettings.create({
    data: {
      organizationId: beta.orgId,
      membership: "BOTH",
      shareProperties: true,
      shareMandates: true,
      propertyPrivacyLevel: "FULL",
      mandatePrivacyLevel: "FULL",
    },
  });
  console.log("  Created 2 org network settings");

  // Partnership
  await prismadb.orgNetworkPartner.create({
    data: {
      initiatorOrgId: alpha.orgId,
      partnerOrgId: beta.orgId,
      status: "ACCEPTED",
      createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000),
    },
  });
  console.log("  Created 1 org network partnership");

  // Cross-org matches
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const matches: Array<Record<string, unknown>> = [];

  if (betaMandateIds[10] && alphaPropertyIds[18]) {
    matches.push({ mandateOrgId: beta.orgId, mandateId: betaMandateIds[10], propertyOrgId: alpha.orgId, propertyId: alphaPropertyIds[18], matchScore: 92, breakdown: { location: 95, size: 90, budget: 88, type: 95 }, expiresAt });
  }
  if (betaMandateIds[10] && alphaPropertyIds[19]) {
    matches.push({ mandateOrgId: beta.orgId, mandateId: betaMandateIds[10], propertyOrgId: alpha.orgId, propertyId: alphaPropertyIds[19], matchScore: 85, breakdown: { location: 95, size: 80, budget: 82, type: 85 }, expiresAt });
  }
  if (alphaMandateIds[0] && betaPropertyIds[0]) {
    matches.push({ mandateOrgId: alpha.orgId, mandateId: alphaMandateIds[0], propertyOrgId: beta.orgId, propertyId: betaPropertyIds[0], matchScore: 78, breakdown: { location: 80, size: 75, budget: 78, type: 80 }, expiresAt });
  }
  if (alphaMandateIds[2] && betaPropertyIds[1]) {
    matches.push({ mandateOrgId: alpha.orgId, mandateId: alphaMandateIds[2], propertyOrgId: beta.orgId, propertyId: betaPropertyIds[1], matchScore: 75, breakdown: { location: 72, size: 78, budget: 75, type: 76 }, expiresAt });
  }

  if (matches.length > 0) {
    await prismadb.crossOrgMatch.createMany({ data: matches as any[], skipDuplicates: true });
  }
  console.log(`  Created ${matches.length} cross-org matches`);

  // Cross-org SHARED conversation
  const convId = uuid();
  await prismadb.conversation.create({
    data: {
      id: convId,
      organizationId: null,
      scope: "SHARED",
      isGroup: false,
      isE2ee: false,
      createdById: alpha.primaryUserId,
    },
  });

  await prismadb.conversationParticipant.createMany({
    data: [
      { id: uuid(), conversationId: convId, userId: alpha.primaryUserId },
      { id: uuid(), conversationId: convId, userId: beta.primaryUserId },
    ],
  });

  await prismadb.conversationOrgMembership.createMany({
    data: [
      { id: uuid(), conversationId: convId, organizationId: alpha.orgId, addedById: alpha.primaryUserId },
      { id: uuid(), conversationId: convId, organizationId: beta.orgId, addedById: beta.primaryUserId },
    ],
  });

  const dealMsgs = DM_MESSAGES.deal_discussion;
  const msgRecords: Array<Record<string, unknown>> = [];
  for (let i = 0; i < dealMsgs.length; i++) {
    const sender = i % 2 === 0 ? alpha.primaryUserId : beta.primaryUserId;
    const senderOrgId = i % 2 === 0 ? alpha.orgId : beta.orgId;
    msgRecords.push({
      id: uuid(),
      organizationId: senderOrgId,
      conversationId: convId,
      senderId: sender,
      content: dealMsgs[i],
      contentType: "TEXT",
      createdAt: new Date(now.getTime() - (dealMsgs.length - i) * 3 * 60 * 60 * 1000),
      parentId: null,
      threadCount: 0,
    });
  }

  await prismadb.message.createMany({ data: msgRecords as any[] });
  console.log(`  Created 1 shared conversation with ${msgRecords.length} messages`);
}

// ============================================
// CHUNK 5: NOTIFICATIONS
// ============================================

async function seedNotifications(
  ctx: OrgContext,
  clientIds: string[],
  propertyIds: string[],
): Promise<void> {
  console.log(`\n[${ctx.prefix}] Seeding notifications...`);

  const now = new Date();
  const secondUser = ctx.allUsers.find(u => u.id !== ctx.primaryUserId);

  const templates = [
    { type: "PROPERTY_CREATED", entityType: "PROPERTY", entityId: propertyIds[0], title: "New Property", message: "New property listing created in Kolonaki" },
    { type: "PROPERTY_UPDATED", entityType: "PROPERTY", entityId: propertyIds[1], title: "Property Updated", message: "Property details updated for Kifisia apartment" },
    { type: "PROPERTY_ASSIGNED", entityType: "PROPERTY", entityId: propertyIds[3], title: "Property Assigned", message: "You have been assigned a new property" },
    { type: "CLIENT_CREATED", entityType: "ACCOUNT", entityId: clientIds[0], title: "New Client", message: "New client added to your portfolio" },
    { type: "CLIENT_ASSIGNED", entityType: "ACCOUNT", entityId: clientIds[1], title: "Client Assigned", message: "New client assigned to you" },
    { type: "DEAL_PROPOSED", entityType: "DEAL", entityId: null, title: "Deal Proposed", message: "A new deal has been proposed for your property" },
    { type: "DEAL_ACCEPTED", entityType: "DEAL", entityId: null, title: "Deal Accepted", message: "Your deal proposal has been accepted" },
    { type: "DEAL_COMPLETED", entityType: "DEAL", entityId: null, title: "Deal Completed", message: "Congratulations! Deal closed successfully" },
    { type: "ACCOUNT_TASK_CREATED", entityType: "TASK", entityId: null, title: "New Task", message: "A new task has been created for your client" },
    { type: "TASK_ASSIGNED", entityType: "TASK", entityId: null, title: "Task Assigned", message: "You have been assigned a new task" },
    { type: "CALENDAR_REMINDER", entityType: "CALENDAR_EVENT", entityId: null, title: "Reminder", message: "Property viewing in 30 minutes" },
    { type: "SOCIAL_POST_LIKED", entityType: "SOCIAL_POST", entityId: null, title: "Post Liked", message: "Someone liked your post" },
    { type: "SOCIAL_POST_COMMENTED", entityType: "SOCIAL_POST", entityId: null, title: "New Comment", message: "New comment on your post" },
    { type: "DOCUMENT_SHARED", entityType: "DOCUMENT", entityId: null, title: "Document Shared", message: "A document has been shared with you" },
    { type: "SYSTEM", entityType: "USER", entityId: null, title: "System Update", message: "Platform maintenance scheduled for this weekend" },
  ];

  const notifications: Array<Record<string, unknown>> = [];
  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    const isRead = i < 6; // first 6 are read
    const isSocial = t.type === "SOCIAL_POST_LIKED" || t.type === "SOCIAL_POST_COMMENTED";
    const createdAt = new Date(now.getTime() - (templates.length - i) * 4 * 60 * 60 * 1000);

    notifications.push({
      id: uuid(),
      userId: ctx.primaryUserId,
      organizationId: ctx.orgId,
      type: t.type,
      title: t.title,
      message: t.message,
      entityType: t.entityType,
      entityId: t.entityId,
      read: isRead,
      readAt: isRead ? new Date(createdAt.getTime() + rand(5, 120) * 60 * 1000) : null,
      actorId: isSocial ? (secondUser?.id ?? ctx.primaryUserId) : null,
      actorName: isSocial ? (secondUser?.name ?? "Agent") : null,
      createdAt,
      updatedAt: createdAt,
    });
  }

  await prismadb.notification.createMany({ data: notifications as any[] });
  console.log(`  Created ${notifications.length} notifications (${notifications.filter(n => n.read).length} read)`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const startTime = Date.now();
  console.log("=== COMPREHENSIVE TEST SEED ===\n");

  const { alphaUser, betaUser, skipPurge } = parseArgs();

  console.log(`Alpha user: ${alphaUser}`);
  console.log(`Beta user:  ${betaUser}`);
  console.log(`Skip purge: ${skipPurge}`);

  // Resolve orgs
  const alphaInfo = await findOrganizationId(alphaUser);
  const betaInfo = await findOrganizationId(betaUser);

  // Get DEKs
  const alphaDek = await getOrgDek(alphaInfo.orgId);
  const betaDek = await getOrgDek(betaInfo.orgId);

  // Get all users per org
  const alphaUsers = await getOrganizationUsers(alphaInfo.orgId);
  const betaUsers = await getOrganizationUsers(betaInfo.orgId);

  const alphaCtx: OrgContext = {
    orgId: alphaInfo.orgId,
    primaryUserId: alphaInfo.userDbId,
    primaryClerkId: alphaUser,
    allUsers: alphaUsers,
    dek: alphaDek,
    prefix: "alpha",
  };

  const betaCtx: OrgContext = {
    orgId: betaInfo.orgId,
    primaryUserId: betaInfo.userDbId,
    primaryClerkId: betaUser,
    allUsers: betaUsers,
    dek: betaDek,
    prefix: "beta",
  };

  console.log(`\nAlpha org: ${alphaCtx.orgId} (${alphaCtx.allUsers.length} users)`);
  console.log(`Beta org:  ${betaCtx.orgId} (${betaCtx.allUsers.length} users)`);

  // Step 1: Purge existing data
  if (!skipPurge) {
    await purgeOrgData(alphaCtx.orgId, alphaCtx.allUsers);
    await purgeOrgData(betaCtx.orgId, betaCtx.allUsers);
  } else {
    console.log("\nSkipping purge (--skip-purge flag)");
  }

  // Step 2: Create synthetic users
  await createSyntheticUsers(alphaCtx);
  await createSyntheticUsers(betaCtx);

  // Step 3: Seed per-org entities, storing IDs
  interface OrgData {
    clientIds: string[];
    propertyIds: string[];
    mandateIds: string[];
    dealIds: string[];
    docIds: string[];
    eventIds: string[];
  }

  async function seedOrg(ctx: OrgContext): Promise<OrgData> {
    const clientIds = await seedClients(ctx);
    const propertyIds = await seedProperties(ctx);
    const mandateIds = await seedMandates(ctx);
    console.log(`\n${ctx.prefix} org seeded: ${clientIds.length} clients, ${propertyIds.length} properties, ${mandateIds.length} mandates`);

    const dealIds = await seedDeals(ctx, clientIds, propertyIds);
    const docIds = await seedDocuments(ctx, clientIds, propertyIds);
    const eventIds = await seedCalendarEvents(ctx, clientIds, propertyIds);
    await seedTasks(ctx, clientIds, eventIds, docIds);
    await seedPropertyShowings(ctx, clientIds, propertyIds);
    await seedEntityComments(ctx, clientIds, propertyIds, mandateIds);
    await seedSocialFeed(ctx, propertyIds);
    await seedMessaging(ctx);

    // Chunk 5 per-org: join tables, images, notifications
    await seedJoinTables(ctx, clientIds, propertyIds, mandateIds);
    await seedPropertyImages(ctx, propertyIds);
    await seedNotifications(ctx, clientIds, propertyIds);

    console.log(`\n${ctx.prefix} org complete: ${dealIds.length} deals, ${docIds.length} docs, ${eventIds.length} events`);
    return { clientIds, propertyIds, mandateIds, dealIds, docIds, eventIds };
  }

  const alphaData = await seedOrg(alphaCtx);
  const betaData = await seedOrg(betaCtx);

  // Step 4: Cross-org seeding
  console.log("\n--- Cross-org seeding ---");
  await seedAgentProfiles(alphaCtx, betaCtx, alphaData.propertyIds, betaData.propertyIds);
  await seedAgencyProfiles(alphaCtx, betaCtx);
  await seedAgentConnections(alphaCtx, betaCtx);
  await seedSharedEntities(alphaCtx, betaCtx, alphaData.propertyIds, alphaData.clientIds, alphaData.docIds);
  await seedNetworkAndMatching(
    alphaCtx, betaCtx,
    alphaData.mandateIds, alphaData.propertyIds,
    betaData.mandateIds, betaData.propertyIds,
  );

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`
✅ Seed complete for 2 organizations
  Alpha (${alphaCtx.orgId}): ${alphaData.clientIds.length} clients, ${alphaData.propertyIds.length} properties, ${alphaData.mandateIds.length} mandates, ${alphaData.dealIds.length} deals, ${alphaData.docIds.length} docs, ${alphaData.eventIds.length} events
  Beta  (${betaCtx.orgId}): ${betaData.clientIds.length} clients, ${betaData.propertyIds.length} properties, ${betaData.mandateIds.length} mandates, ${betaData.dealIds.length} deals, ${betaData.docIds.length} docs, ${betaData.eventIds.length} events
  Cross-org: 4 matches, 5 shared entities, 1 partnership, 4 connections, 1 shared conversation
  Total time: ${elapsed}s
`);

  await prismadb.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prismadb.$disconnect();
  process.exit(1);
});
