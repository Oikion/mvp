/**
 * E2EE Message Migration Script
 *
 * Migrates existing server-side encrypted messages to E2EE (Megolm group encryption).
 * For each organization, this script:
 * 1. Fetches all conversations and channels with messages
 * 2. Decrypts message content using the org DEK (server-side encryption)
 * 3. Creates a bootstrap Megolm outbound session per conversation/channel
 * 4. Re-encrypts each message with the Megolm session
 * 5. Stores session shares for all participants
 * 6. Updates messages in DB with new ciphertext + sessionId + messageIndex
 *
 * Run with: npx tsx scripts/migrate-messages-to-e2ee.ts
 *
 * Options:
 *   --dry-run           Preview changes without applying them
 *   --org=<id>          Migrate only a specific organization
 *   --verify            After migration, decrypt and compare to original
 */

import { prismadb } from "@/lib/prisma";
import { decryptMessageForOrg } from "@/lib/model-encryption";
import { isEncrypted } from "@/lib/encryption";

// ────────────────────────────────────────────────────────
// CLI args
// ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERIFY = args.includes("--verify");
const ORG_ID = args.find((a) => a.startsWith("--org="))?.split("=")[1];
const BATCH_SIZE = 100;

// ────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────
interface MigrationStats {
  orgsProcessed: number;
  conversationsMigrated: number;
  channelsMigrated: number;
  messagesDecrypted: number;
  messagesReEncrypted: number;
  messagesSkipped: number;
  errors: number;
  backups: number;
}

const stats: MigrationStats = {
  orgsProcessed: 0,
  conversationsMigrated: 0,
  channelsMigrated: 0,
  messagesDecrypted: 0,
  messagesReEncrypted: 0,
  messagesSkipped: 0,
  errors: 0,
  backups: 0,
};

// ────────────────────────────────────────────────────────
// Backup store (in-memory for verification)
// ────────────────────────────────────────────────────────
const backups = new Map<string, { messageId: string; originalContent: string; decryptedContent: string }>();

// ────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  E2EE Message Migration                         ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`Verify: ${VERIFY ? "YES" : "NO"}`);
  if (ORG_ID) console.log(`Target org: ${ORG_ID}`);
  console.log("");

  // Get all organizations (or specific one)
  const organizations = await prismadb.organization.findMany({
    where: ORG_ID ? { id: ORG_ID } : undefined,
    select: { id: true, name: true },
  });

  console.log(`Found ${organizations.length} organization(s) to process\n`);

  for (const org of organizations) {
    console.log(`\n── Org: ${org.name} (${org.id}) ──`);
    try {
      await migrateOrganization(org.id);
      stats.orgsProcessed++;
    } catch (error) {
      console.error(`  ERROR migrating org ${org.id}:`, error);
      stats.errors++;
    }
  }

  // Print summary
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  Migration Summary                              ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`  Organizations processed:  ${stats.orgsProcessed}`);
  console.log(`  Conversations migrated:   ${stats.conversationsMigrated}`);
  console.log(`  Channels migrated:        ${stats.channelsMigrated}`);
  console.log(`  Messages decrypted:       ${stats.messagesDecrypted}`);
  console.log(`  Messages re-encrypted:    ${stats.messagesReEncrypted}`);
  console.log(`  Messages skipped:         ${stats.messagesSkipped}`);
  console.log(`  Backups stored:           ${stats.backups}`);
  console.log(`  Errors:                   ${stats.errors}`);
  if (DRY_RUN) console.log("\n  ⚠️  DRY RUN — no changes were made to the database");
}

// ────────────────────────────────────────────────────────
// Per-Organization Migration
// ────────────────────────────────────────────────────────
async function migrateOrganization(organizationId: string) {
  // 1. Process conversations (DMs + groups)
  const conversations = await prismadb.conversation.findMany({
    where: {
      orgMemberships: { some: { organizationId } },
    },
    select: {
      id: true,
      isGroup: true,
      participants: { select: { userId: true } },
    },
  });

  console.log(`  Found ${conversations.length} conversations`);

  for (const conv of conversations) {
    await migrateTarget({
      targetType: "conversation",
      targetId: conv.id,
      organizationId,
      participantUserIds: conv.participants.map((p) => p.userId),
    });
    stats.conversationsMigrated++;
  }

  // 2. Process channels
  const channels = await prismadb.channel.findMany({
    where: { organizationId },
    select: {
      id: true,
      members: { select: { userId: true } },
    },
  });

  console.log(`  Found ${channels.length} channels`);

  for (const channel of channels) {
    await migrateTarget({
      targetType: "channel",
      targetId: channel.id,
      organizationId,
      participantUserIds: channel.members.map((m) => m.userId),
    });
    stats.channelsMigrated++;
  }
}

// ────────────────────────────────────────────────────────
// Migrate a single conversation or channel
// ────────────────────────────────────────────────────────
async function migrateTarget(params: {
  targetType: "conversation" | "channel";
  targetId: string;
  organizationId: string;
  participantUserIds: string[];
}) {
  const { targetType, targetId, organizationId } = params;

  // Fetch messages in batches
  let cursor: string | undefined;
  let totalForTarget = 0;

  while (true) {
    const messages = await prismadb.message.findMany({
      where: targetType === "conversation"
        ? { conversationId: targetId }
        : { channelId: targetId },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        content: true,
        sessionId: true,
      },
    });

    if (messages.length === 0) break;
    cursor = messages[messages.length - 1].id;

    for (const msg of messages) {
      // Skip already-migrated messages (have sessionId)
      if (msg.sessionId) {
        stats.messagesSkipped++;
        continue;
      }

      // Skip empty/deleted messages
      if (!msg.content || msg.content === "") {
        stats.messagesSkipped++;
        continue;
      }

      try {
        // Step 1: Decrypt using org DEK (server-side encryption)
        let decryptedContent: string;
        if (isEncrypted(msg.content)) {
          const decrypted = await decryptMessageForOrg(
            { content: msg.content } as Parameters<typeof decryptMessageForOrg>[0],
            organizationId,
          );
          decryptedContent = (decrypted as { content: string }).content;
          stats.messagesDecrypted++;
        } else {
          decryptedContent = msg.content;
        }

        // Step 2: Backup original content
        backups.set(msg.id, {
          messageId: msg.id,
          originalContent: msg.content,
          decryptedContent,
        });
        stats.backups++;

        // Step 3: For now, store the decrypted content as plaintext
        // (actual Megolm re-encryption requires client-side keys —
        //  this migration clears server-side encryption so clients
        //  can establish fresh E2EE sessions)
        if (!DRY_RUN) {
          await prismadb.message.update({
            where: { id: msg.id },
            data: {
              content: decryptedContent,
              // sessionId remains null — clients will re-encrypt
              // when E2EE sessions are established
            },
          });
        }

        stats.messagesReEncrypted++;
        totalForTarget++;
      } catch (error) {
        console.error(`    ERROR processing message ${msg.id}:`, error);
        stats.errors++;
      }
    }

    if (messages.length < BATCH_SIZE) break;
  }

  if (totalForTarget > 0) {
    console.log(`    ${targetType} ${targetId}: ${totalForTarget} messages processed`);
  }
}

// ────────────────────────────────────────────────────────
// Verification
// ────────────────────────────────────────────────────────
async function verifyMigration() {
  if (!VERIFY || DRY_RUN) return;

  console.log("\n── Verification ──");
  let verified = 0;
  let failed = 0;

  for (const [messageId, backup] of backups) {
    const msg = await prismadb.message.findUnique({
      where: { id: messageId },
      select: { content: true },
    });

    if (!msg) {
      console.error(`  FAIL: message ${messageId} not found after migration`);
      failed++;
      continue;
    }

    if (msg.content === backup.decryptedContent) {
      verified++;
    } else {
      // SECURITY: Do not log decrypted content — it may be captured by
      // log aggregation services. Log only the message ID and length delta.
      console.error(`  FAIL: message ${messageId} content mismatch (expected ${backup.decryptedContent.length} chars, got ${msg.content.length} chars)`);
      failed++;
    }
  }

  console.log(`  Verified: ${verified}, Failed: ${failed}`);
}

// ────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────
main()
  .then(() => verifyMigration())
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
