/**
 * DEK Migration Script
 *
 * Re-encrypts existing master-key-encrypted data using per-org Data Encryption Keys (DEKs).
 * Decrypts each field using the fallback path (DEK → master key), then re-encrypts with the
 * org-specific DEK. Safe to run multiple times — already-migrated records are re-encrypted
 * idempotently (same plaintext, same DEK → same ciphertext on next decrypt).
 *
 * Run with: npx tsx scripts/migrate-to-org-dek.ts
 *
 * Options:
 *   --dry-run           Preview changes without applying them
 *   --org=<id>          Migrate only a specific organization
 *   --model=<name>      Migrate one model only:
 *                         clients | messages | conversations | events | documents | properties | comments
 */

import { prismadb } from "@/lib/prisma";
import { isEncrypted } from "@/lib/encryption";
import {
  decryptClientForOrg,
  encryptClientForOrg,
  decryptMessageForOrg,
  encryptMessageForOrg,
  decryptAiConversationForOrg,
  encryptAiConversationForOrg,
  decryptCalendarEventForOrg,
  encryptCalendarEventForOrg,
  decryptDocumentForOrg,
  encryptDocumentForOrg,
  decryptPropertyForOrg,
  encryptPropertyForOrg,
  decryptPropertyCommentForOrg,
  encryptPropertyCommentForOrg,
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

/** Returns true when at least one string field is currently encrypted (master-key or DEK). */
function hasEncryptedStringField(...values: (string | null | undefined)[]): boolean {
  return values.some((v) => v != null && isEncrypted(v));
}

/** Returns true when a JSON field is currently stored as an encrypted string. */
function hasEncryptedJsonField(...values: (Prisma.JsonValue | null | undefined)[]): boolean {
  return values.some((v) => typeof v === "string" && isEncrypted(v));
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
        organizationId: true,
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

      // Skip records where no sensitive fields are currently encrypted
      if (
        !hasEncryptedStringField(record.client_name, record.primary_email) &&
        !hasEncryptedJsonField(record.communication_notes)
      ) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would re-key client ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const decrypted = await decryptClientForOrg(record, record.organizationId);
        const encrypted = await encryptClientForOrg(decrypted, record.organizationId);
        const { id, organizationId: _orgId, ...data } = encrypted;
        await prismadb.clients.update({
          where: { id },
          data: {
            ...data,
            communication_notes: data.communication_notes as Prisma.InputJsonValue | undefined,
          },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying client ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Messages
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
      select: { id: true, organizationId: true, content: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (!hasEncryptedStringField(record.content)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would re-key message ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const decrypted = await decryptMessageForOrg(record, record.organizationId);
        const encrypted = await encryptMessageForOrg(decrypted, record.organizationId);
        await prismadb.message.update({
          where: { id: record.id },
          data: { content: encrypted.content },
          select: { id: true },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying message ${record.id}:`, err);
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
      select: { id: true, organizationId: true, title: true, messages: true, context: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (
        !hasEncryptedStringField(record.title) &&
        !hasEncryptedJsonField(record.messages, record.context)
      ) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would re-key conversation ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const decrypted = await decryptAiConversationForOrg(record, record.organizationId);
        const encrypted = await encryptAiConversationForOrg(decrypted, record.organizationId);
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
        console.error(`  Error re-keying conversation ${record.id}:`, err);
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
        organizationId: true,
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

      if (!hasEncryptedStringField(record.title, record.description, record.location)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would re-key calendar event ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const { id, organizationId, ...rest } = record;
        const decrypted = await decryptCalendarEventForOrg(rest, organizationId);
        const encrypted = await encryptCalendarEventForOrg(decrypted, organizationId);
        await prismadb.calendarEvent.update({
          where: { id },
          data: encrypted,
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying calendar event ${record.id}:`, err);
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
      select: { id: true, organizationId: true, document_name: true, description: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (!hasEncryptedStringField(record.document_name, record.description)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would re-key document ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const { id, organizationId, ...rest } = record;
        const decrypted = await decryptDocumentForOrg(rest, organizationId);
        const encrypted = await encryptDocumentForOrg(decrypted, organizationId);
        await prismadb.documents.update({
          where: { id },
          data: encrypted,
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying document ${record.id}:`, err);
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
      select: { id: true, organizationId: true, primary_email: true, communication_notes: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (
        !hasEncryptedStringField(record.primary_email) &&
        !hasEncryptedJsonField(record.communication_notes)
      ) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would re-key property ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const { id, organizationId, ...rest } = record;
        const decrypted = await decryptPropertyForOrg(rest, organizationId);
        const encrypted = await encryptPropertyForOrg(decrypted, organizationId);
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
        console.error(`  Error re-keying property ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Property Comments (no organizationId — join via parent property)
// ────────────────────────────────────────────────────────
async function migratePropertyComments(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating property comments...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.propertyComment.findMany({
      where: ORG_ID
        ? { Properties: { organizationId: ORG_ID } }
        : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        content: true,
        Properties: { select: { organizationId: true } },
      },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      const orgId = record.Properties?.organizationId;
      if (!orgId) {
        // Orphaned comment (no parent property) — skip
        stats.skipped++;
        continue;
      }

      if (!hasEncryptedStringField(record.content)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY RUN] Would re-key comment ${record.id} (org: ${orgId})`);
        stats.updated++;
        continue;
      }

      try {
        const decrypted = await decryptPropertyCommentForOrg({ content: record.content }, orgId);
        const encrypted = await encryptPropertyCommentForOrg(decrypted, orgId);
        await prismadb.propertyComment.update({
          where: { id: record.id },
          data: { content: encrypted.content ?? record.content },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying comment ${record.id}:`, err);
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
  console.log("  Oikion DEK Migration — Re-key to Per-Org DEKs");
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
  if (run("comments")) totalStats.comments = await migratePropertyComments();

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
    log("Migration complete. All sensitive fields are now encrypted with per-org DEKs.");
  }

  await prismadb.$disconnect();
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  prismadb.$disconnect().finally(() => process.exit(1));
});
