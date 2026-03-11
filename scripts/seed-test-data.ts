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
import { withAccelerate } from "@prisma/extension-accelerate";
import { createClerkClient } from "@clerk/backend";

const databaseUrl = process.env.DATABASE_URL || "";
const isAccelerate = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://");
const prismadb = isAccelerate
  ? new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient
  : new PrismaClient();

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
  "shipping_postal_code",
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
// PLACEHOLDER MAIN (future chunks will fill in)
// ============================================

async function main() {
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

  // TODO: Chunk 2+ will add purge, seed entities, cross-org scenarios

  console.log("\n=== CHUNK 1 SCAFFOLD COMPLETE (no data seeded yet) ===");

  await prismadb.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prismadb.$disconnect();
  process.exit(1);
});
