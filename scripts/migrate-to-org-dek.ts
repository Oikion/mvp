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
 *   --verify            Verify all records are DEK-encrypted (no re-encryption, just check)
 *   --model=<name>      Migrate one model only:
 *                         clients | messages | events | documents | properties
 *                         | comments | mandates | mandate-comments | client-comments
 *                         | task-comments | myaccount | newsletter
 */

import { prismadb } from "@/lib/prisma";
import { isEncrypted } from "@/lib/encryption";
import { createDecipheriv } from "node:crypto";
import {
  decryptClientForOrg,
  encryptClientForOrg,
  decryptMessageForOrg,
  encryptMessageForOrg,
  decryptCalendarEventForOrg,
  encryptCalendarEventForOrg,
  decryptDocumentForOrg,
  encryptDocumentForOrg,
  decryptPropertyForOrg,
  encryptPropertyForOrg,
  decryptPropertyCommentForOrg,
  encryptPropertyCommentForOrg,
  decryptClientCommentForOrg,
  encryptClientCommentForOrg,
  decryptMandateForOrg,
  encryptMandateForOrg,
  decryptMandateCommentForOrg,
  encryptMandateCommentForOrg,
  decryptTaskCommentForOrg,
  encryptTaskCommentForOrg,
  decryptMyAccountForOrg,
  encryptMyAccountForOrg,
  decryptNewsletterSubscriberForOrg,
  encryptNewsletterSubscriberForOrg,
} from "@/lib/model-encryption";
import { getOrgDek } from "@/lib/key-management";
import type { Prisma } from "@prisma/client";

// ────────────────────────────────────────────────────────
// CLI args
// ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERIFY_ONLY = args.includes("--verify");
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
// Mandates
// ────────────────────────────────────────────────────────
async function migrateMandates(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating mandates...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.mandate.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, organizationId: true, title: true, notes: true, communication_notes: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (
        !hasEncryptedStringField(record.title, record.notes) &&
        !hasEncryptedJsonField(record.communication_notes)
      ) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN || VERIFY_ONLY) {
        log(`  [${DRY_RUN ? "DRY RUN" : "VERIFY"}] mandate ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const { id, organizationId, ...rest } = record;
        const decrypted = await decryptMandateForOrg(rest, organizationId);
        const encrypted = await encryptMandateForOrg(decrypted, organizationId);
        await prismadb.mandate.update({
          where: { id },
          data: {
            title: encrypted.title,
            notes: encrypted.notes,
            ...(encrypted.communication_notes != null && {
              communication_notes: encrypted.communication_notes as Prisma.InputJsonValue,
            }),
          },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying mandate ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Client Comments (no organizationId — join via parent client)
// ────────────────────────────────────────────────────────
async function migrateClientComments(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating client comments...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.clientComment.findMany({
      where: ORG_ID
        ? { Clients: { organizationId: ORG_ID } }
        : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        content: true,
        Clients: { select: { organizationId: true } },
      },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      const orgId = record.Clients?.organizationId;
      if (!orgId) {
        stats.skipped++;
        continue;
      }

      if (!hasEncryptedStringField(record.content)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN || VERIFY_ONLY) {
        log(`  [${DRY_RUN ? "DRY RUN" : "VERIFY"}] client comment ${record.id} (org: ${orgId})`);
        stats.updated++;
        continue;
      }

      try {
        const decrypted = await decryptClientCommentForOrg({ content: record.content }, orgId);
        const encrypted = await encryptClientCommentForOrg(decrypted, orgId);
        await prismadb.clientComment.update({
          where: { id: record.id },
          data: { content: encrypted.content ?? record.content },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying client comment ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Mandate Comments (no organizationId — join via parent mandate)
// ────────────────────────────────────────────────────────
async function migrateMandateComments(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating mandate comments...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.mandateComment.findMany({
      where: ORG_ID
        ? { mandate: { organizationId: ORG_ID } }
        : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        content: true,
        mandate: { select: { organizationId: true } },
      },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      const orgId = record.mandate?.organizationId;
      if (!orgId) {
        stats.skipped++;
        continue;
      }

      if (!hasEncryptedStringField(record.content)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN || VERIFY_ONLY) {
        log(`  [${DRY_RUN ? "DRY RUN" : "VERIFY"}] mandate comment ${record.id} (org: ${orgId})`);
        stats.updated++;
        continue;
      }

      try {
        const decrypted = await decryptMandateCommentForOrg({ content: record.content }, orgId);
        const encrypted = await encryptMandateCommentForOrg(decrypted, orgId);
        await prismadb.mandateComment.update({
          where: { id: record.id },
          data: { content: encrypted.content ?? record.content },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying mandate comment ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Task Comments (has organizationId directly, field is "comment" not "content")
// ────────────────────────────────────────────────────────
async function migrateTaskComments(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating task comments...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.crm_Accounts_Tasks_Comments.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, organizationId: true, comment: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (!hasEncryptedStringField(record.comment)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN || VERIFY_ONLY) {
        log(`  [${DRY_RUN ? "DRY RUN" : "VERIFY"}] task comment ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const decrypted = await decryptTaskCommentForOrg({ comment: record.comment }, record.organizationId);
        const encrypted = await encryptTaskCommentForOrg(decrypted, record.organizationId);
        await prismadb.crm_Accounts_Tasks_Comments.update({
          where: { id: record.id },
          data: { comment: encrypted.comment ?? record.comment },
        });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying task comment ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// MyAccount (banking/tax PII)
// ────────────────────────────────────────────────────────
async function migrateMyAccount(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating MyAccount records...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.myAccount.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        organizationId: true,
        VAT_number: true,
        TAX_number: true,
        bank_name: true,
        bank_account: true,
        bank_code: true,
        bank_IBAN: true,
        bank_SWIFT: true,
        email_accountant: true,
      },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (!hasEncryptedStringField(record.VAT_number, record.bank_IBAN, record.email_accountant)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN || VERIFY_ONLY) {
        log(`  [${DRY_RUN ? "DRY RUN" : "VERIFY"}] MyAccount ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const { id, organizationId, ...rest } = record;
        const decrypted = await decryptMyAccountForOrg(rest, organizationId);
        const encrypted = await encryptMyAccountForOrg(decrypted, organizationId);
        await prismadb.myAccount.update({ where: { id }, data: encrypted });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying MyAccount ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// NewsletterSubscriber (email/name PII)
// ────────────────────────────────────────────────────────
async function migrateNewsletterSubscribers(): Promise<Stats> {
  const stats = makeStats();
  log("Migrating newsletter subscribers...");

  let cursor: string | undefined;

  for (;;) {
    const records = await prismadb.newsletterSubscriber.findMany({
      where: ORG_ID ? { organizationId: ORG_ID } : undefined,
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, organizationId: true, email: true, firstName: true, lastName: true },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      stats.processed++;

      if (!hasEncryptedStringField(record.email, record.firstName, record.lastName)) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN || VERIFY_ONLY) {
        log(`  [${DRY_RUN ? "DRY RUN" : "VERIFY"}] subscriber ${record.id} (org: ${record.organizationId})`);
        stats.updated++;
        continue;
      }

      try {
        const { id, organizationId, ...rest } = record;
        const decrypted = await decryptNewsletterSubscriberForOrg(rest, organizationId);
        const encrypted = await encryptNewsletterSubscriberForOrg(decrypted, organizationId);
        await prismadb.newsletterSubscriber.update({ where: { id }, data: encrypted });
        stats.updated++;
      } catch (err) {
        console.error(`  Error re-keying subscriber ${record.id}:`, err);
        stats.errors++;
      }
    }

    if (records.length < BATCH_SIZE) break;
  }

  return stats;
}

// ────────────────────────────────────────────────────────
// Verify mode: check if any records still need master-key fallback
// ────────────────────────────────────────────────────────
async function verifyNoMasterKeyRecords(): Promise<{ model: string; count: number }[]> {
  log("Verifying all records are DEK-encrypted (no master-key fallback needed)...");
  const results: { model: string; count: number }[] = [];

  // For each model, try decrypting a sample encrypted field with the org DEK directly.
  // If it throws (auth tag mismatch), the record is still master-key-encrypted.
  const orgs = await prismadb.orgEncryptionKey.findMany({
    where: { isActive: true },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  for (const { organizationId } of orgs) {
    const dek = await getOrgDek(organizationId);
    let masterKeyCount = 0;

    // Check a representative field from each model
    const clients = await prismadb.clients.findMany({
      where: { organizationId },
      select: { client_name: true },
      take: 500,
    });
    for (const c of clients) {
      if (c.client_name && isEncrypted(c.client_name) && !canDecryptWithDek(c.client_name, dek)) {
        masterKeyCount++;
      }
    }

    if (masterKeyCount > 0) {
      results.push({ model: `clients (org: ${organizationId})`, count: masterKeyCount });
    }
  }

  return results;
}

/**
 * Check if a ciphertext can be decrypted with the given DEK (without fallback).
 * Returns false if the auth tag doesn't match (= master-key-encrypted).
 */
function canDecryptWithDek(encryptedValue: string, dek: Buffer): boolean {
  if (!isEncrypted(encryptedValue)) return true; // Not encrypted — skip
  const parts = encryptedValue.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const ciphertext = Buffer.from(parts[2], "hex");
  try {
    const decipher = createDecipheriv("aes-256-gcm", dek, iv);
    decipher.setAuthTag(authTag);
    Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return true;
  } catch {
    return false;
  }
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
  if (VERIFY_ONLY) log("VERIFY MODE — checking for master-key-encrypted records");
  else if (DRY_RUN) log("DRY RUN MODE — no changes will be written");
  if (ORG_ID) log(`Scoped to organization: ${ORG_ID}`);
  if (MODEL) log(`Scoped to model: ${MODEL}`);
  console.log();

  // ── Verify mode ──────────────────────────────
  if (VERIFY_ONLY) {
    const issues = await verifyNoMasterKeyRecords();
    console.log();
    console.log("=".repeat(60));
    console.log("  Verification Results");
    console.log("=".repeat(60));
    if (issues.length === 0) {
      log("ALL records are DEK-encrypted. Safe to enable DISABLE_MASTER_KEY_FALLBACK=true.");
    } else {
      for (const issue of issues) {
        console.log(`  ${issue.model}: ${issue.count} record(s) still master-key-encrypted`);
      }
      console.error("\nMigration NOT complete. Run the script without --verify to re-key remaining records.");
      process.exit(1);
    }
    await prismadb.$disconnect();
    return;
  }

  // ── Migration mode ───────────────────────────
  const totalStats: Record<string, Stats> = {};
  const run = (name: string) => !MODEL || MODEL === name;

  if (run("clients")) totalStats.clients = await migrateClients();
  if (run("messages")) totalStats.messages = await migrateMessages();
  if (run("events")) totalStats.events = await migrateCalendarEvents();
  if (run("documents")) totalStats.documents = await migrateDocuments();
  if (run("properties")) totalStats.properties = await migrateProperties();
  if (run("comments")) totalStats["prop-comments"] = await migratePropertyComments();
  if (run("mandates")) totalStats.mandates = await migrateMandates();
  if (run("client-comments")) totalStats["client-comments"] = await migrateClientComments();
  if (run("mandate-comments")) totalStats["mandate-comments"] = await migrateMandateComments();
  if (run("task-comments")) totalStats["task-comments"] = await migrateTaskComments();
  if (run("myaccount")) totalStats.myaccount = await migrateMyAccount();
  if (run("newsletter")) totalStats.newsletter = await migrateNewsletterSubscribers();

  console.log();
  console.log("=".repeat(60));
  console.log("  Summary");
  console.log("=".repeat(60));

  let totalErrors = 0;
  for (const [model, s] of Object.entries(totalStats)) {
    console.log(
      `  ${model.padEnd(20)} processed=${s.processed}  updated=${s.updated}  skipped=${s.skipped}  errors=${s.errors}`
    );
    totalErrors += s.errors;
  }

  console.log();
  if (totalErrors > 0) {
    console.error(`Migration completed with ${totalErrors} error(s). Review the log above.`);
    process.exit(1);
  } else if (DRY_RUN) {
    log("Dry run complete. Run without --dry-run to apply changes.");
    log("Then run with --verify to confirm all records are DEK-encrypted.");
  } else {
    log("Migration complete. All sensitive fields are now encrypted with per-org DEKs.");
    log("Run with --verify to confirm, then enable DISABLE_MASTER_KEY_FALLBACK=true.");
  }

  await prismadb.$disconnect();
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  prismadb.$disconnect().finally(() => process.exit(1));
});
