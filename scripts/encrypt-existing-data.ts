/**
 * Field-Level Encryption Migration Script
 *
 * Encrypts existing plaintext sensitive data in the database using AES-256-GCM.
 * Safe to run multiple times — uses isEncrypted() to detect and skip already-encrypted records.
 *
 * Run with: npx tsx scripts/encrypt-existing-data.ts
 *
 * Options:
 *   --dry-run           Preview changes without applying them
 *   --org=<id>          Migrate only a specific organization
 *   --model=<name>      Migrate one model only:
 *                         clients | messages | conversations | events | documents | properties
 */

import { prismadb } from "@/lib/prisma";
import { isEncrypted } from "@/lib/encryption";
import {
  encryptClient,
  encryptMessage,
  encryptAiConversation,
  encryptCalendarEvent,
  encryptDocument,
  encryptProperty,
} from "@/lib/model-encryption";
import type { Prisma } from "@prisma/client";

// ────────────────────────────────────────────────────────
// CLI args
// ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ORG_ID = args.find((a) => a.startsWith("--org="))?.split("=")[1];
const MODEL = args.find((a) => a.startsWith("--model="))?.split("=")[1];
const BATCH_SIZE = 100;

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────
interface Stats {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
}

function makeStats(): Stats {
  return { processed: 0, updated: 0, skipped: 0, errors: 0 };
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

/** Returns true when a string field contains unencrypted, non-empty data. */
function needsStringEncryption(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  return !isEncrypted(value);
}

/** Returns true when a JSON field contains unencrypted data (not yet stored as ciphertext string). */
function needsJsonEncryption(value: Prisma.JsonValue | null | undefined): boolean {
  if (value == null) return false;
  // After encryption, JSON fields are stored as plain strings containing the ciphertext.
  // Before encryption, they are objects/arrays.
  if (typeof value === "string") return !isEncrypted(value);
  return true; // object/array → definitely not encrypted yet
}

// ────────────────────────────────────────────────────────
// Clients
// ────────────────────────────────────────────────────────
async function migrateClients(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating clients...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.clients.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        secondary_email: true,
        primary_phone: true,
        secondary_phone: true,
        afm: true,
        vat: true,
        id_doc: true,
        description: true,
        billing_street: true,
        billing_city: true,
        billing_state: true,
        billing_postal_code: true,
        billing_country: true,
        shipping_street: true,
        shipping_city: true,
        shipping_state: true,
        shipping_postal_code: true,
        shipping_country: true,
        communication_notes: true,
      },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      // Representative check: skip if the primary string fields are already encrypted
      if (
        !needsStringEncryption(record.client_name) &&
        !needsStringEncryption(record.primary_email) &&
        !needsJsonEncryption(record.communication_notes)
      ) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would encrypt client ${record.id}`);
        stats.updated++;
        continue;
      }

      try {
        const encrypted = encryptClient(record);
        const { id, ...data } = encrypted;
        await prismadb.clients.update({
          where: { id },
          data: {
            ...data,
            communication_notes: data.communication_notes as Prisma.InputJsonValue | undefined,
          },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error encrypting client ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Messages (includes soft-deleted — their content must also be encrypted)
// ────────────────────────────────────────────────────────
async function migrateMessages(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating messages...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.message.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, content: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (!needsStringEncryption(record.content)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would encrypt message ${record.id}`);
        stats.updated++;
        continue;
      }

      try {
        const encrypted = encryptMessage(record);
        await prismadb.message.update({
          where: { id: record.id },
          data: { content: encrypted.content },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error encrypting message ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// AI Conversations
// ────────────────────────────────────────────────────────
async function migrateAiConversations(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating AI conversations...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.aiConversation.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, title: true, messages: true, context: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (
        !needsStringEncryption(record.title) &&
        !needsJsonEncryption(record.messages) &&
        !needsJsonEncryption(record.context)
      ) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would encrypt conversation ${record.id}`);
        stats.updated++;
        continue;
      }

      try {
        const encrypted = encryptAiConversation(record);
        await prismadb.aiConversation.update({
          where: { id: record.id },
          data: {
            title: encrypted.title,
            messages: encrypted.messages as Prisma.InputJsonValue,
            ...(encrypted.context != null && {
              context: encrypted.context as Prisma.InputJsonValue,
            }),
          },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error encrypting conversation ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Calendar Events
// ────────────────────────────────────────────────────────
async function migrateCalendarEvents(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating calendar events...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.calendarEvent.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        attendeeEmail: true,
        attendeeName: true,
        notes: true,
      },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (
        !needsStringEncryption(record.title) &&
        !needsStringEncryption(record.description) &&
        !needsStringEncryption(record.location)
      ) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would encrypt calendar event ${record.id}`);
        stats.updated++;
        continue;
      }

      try {
        const { id, ...rest } = record;
        const encrypted = encryptCalendarEvent(rest);
        await prismadb.calendarEvent.update({
          where: { id },
          data: encrypted,
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error encrypting calendar event ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Documents
// ────────────────────────────────────────────────────────
async function migrateDocuments(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating documents...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.documents.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, document_name: true, description: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (
        !needsStringEncryption(record.document_name) &&
        !needsStringEncryption(record.description)
      ) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would encrypt document ${record.id}`);
        stats.updated++;
        continue;
      }

      try {
        const { id, ...rest } = record;
        const encrypted = encryptDocument(rest);
        await prismadb.documents.update({
          where: { id },
          data: encrypted,
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error encrypting document ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Properties
// ────────────────────────────────────────────────────────
async function migrateProperties(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating properties...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.properties.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, primary_email: true, communication_notes: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (
        !needsStringEncryption(record.primary_email) &&
        !needsJsonEncryption(record.communication_notes)
      ) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would encrypt property ${record.id}`);
        stats.updated++;
        continue;
      }

      try {
        const { id, ...rest } = record;
        const encrypted = encryptProperty(rest);
        await prismadb.properties.update({
          where: { id },
          data: {
            primary_email: encrypted.primary_email,
            ...(encrypted.communication_notes != null && {
              communication_notes: encrypted.communication_notes as Prisma.InputJsonValue,
            }),
          },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error encrypting property ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────
async function main() {
  if (!process.env.SECRETS_ENCRYPTION_KEY) {
    console.error("ERROR: SECRETS_ENCRYPTION_KEY environment variable is not set.");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("  Oikion Field-Level Encryption Migration");
  console.log("=".repeat(60));
  if (DRY_RUN) log("DRY RUN MODE — no changes will be written");
  if (ORG_ID) log(`Scoped to organization: ${ORG_ID}`);
  if (MODEL) log(`Scoped to model: ${MODEL}`);
  console.log();

  const totalStats: Record<string, Stats> = {};
  const run = (name: string) => !MODEL || MODEL === name;

  if (run("clients")) totalStats.clients = await migrateClients();
  if (run("messages")) totalStats.messages = await migrateMessages();
  if (run("conversations")) totalStats.conversations = await migrateAiConversations();
  if (run("events")) totalStats.events = await migrateCalendarEvents();
  if (run("documents")) totalStats.documents = await migrateDocuments();
  if (run("properties")) totalStats.properties = await migrateProperties();

  console.log();
  console.log("=".repeat(60));
  console.log("  Summary");
  console.log("=".repeat(60));

  let totalErrors = 0;
  for (const [model, s] of Object.entries(totalStats)) {
    console.log(
      `  ${model.padEnd(16)} processed=${s.processed}  updated=${s.updated}  skipped=${s.skipped}  errors=${s.errors}`
    );
    totalErrors += s.errors;
  }

  console.log();
  if (totalErrors > 0) {
    console.error(`Migration completed with ${totalErrors} error(s). Review the log above.`);
    process.exit(1);
  } else if (DRY_RUN) {
    log("Dry run complete. Run without --dry-run to apply changes.");
  } else {
    log("Migration complete. All sensitive data is now encrypted.");
  }

  await prismadb.$disconnect();
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  prismadb.$disconnect().finally(() => process.exit(1));
});
