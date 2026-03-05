# Three-Scope Messaging Architecture

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement three conversation scopes (ORG, PERSONAL, SHARED) with per-conversation encryption keys and auto-sync org membership for cross-org groups.

**Architecture:** Conversations gain a `scope` field: `ORG` (intra-agency channels/groups/entity chats, encrypted with agency DEK), `PERSONAL` (1:1 DMs in personal workspace, encrypted with personal workspace DEK), `SHARED` (cross-org groups with per-conversation symmetric keys wrapped for each participant). When an entire organization is invited to a SHARED conversation, a `ConversationOrgMembership` record enables auto-sync — new org members automatically join and receive a wrapped copy of the conversation key.

**Tech Stack:** Prisma (PostgreSQL), Node.js `crypto` (AES-256-GCM), Clerk (auth + org metadata), Ably (real-time), Next.js server actions, SWR hooks, React (shadcn/ui)

---

## Phase 1: Database Schema

### Task 1: Add ConversationScope Enum and Scope Field

**Files:**
- Modify: `prisma/schema.prisma` (Conversation model ~line 2198, add enum after ConversationEntityType ~line 2241)
- Create: `prisma/migrations/20260308000000_add_conversation_scopes/migration.sql`

**Step 1: Add the enum and modify the Conversation model in schema.prisma**

Add enum after `ConversationEntityType`:
```prisma
/// Conversation scope determines encryption and visibility rules
enum ConversationScope {
  ORG       // Intra-org: groups, entity chats. Encrypted with org DEK.
  PERSONAL  // 1:1 DMs in personal workspace. Encrypted with personal workspace DEK.
  SHARED    // Cross-org groups. Encrypted with per-conversation key.
}
```

Modify Conversation model — make `organizationId` optional and add `scope`:
```prisma
model Conversation {
  id             String                    @id @default(uuid())
  organizationId String?                   // null for SHARED scope
  scope          ConversationScope         @default(ORG)
  name           String?
  isGroup        Boolean                   @default(false)
  createdById    String?
  createdAt      DateTime                  @default(now())
  updatedAt      DateTime                  @updatedAt

  entityType     ConversationEntityType?
  entityId       String?

  messages       Message[]
  participants   ConversationParticipant[]
  keyShares      ConversationKeyShare[]
  orgMemberships ConversationOrgMembership[]

  @@index([organizationId])
  @@index([scope])
  @@index([entityType, entityId])
  @@index([createdById])
}
```

**Step 2: Generate the migration**

Run: `pnpm prisma migrate dev --name add_conversation_scopes`

**Step 3: Verify migration SQL includes**
- `CREATE TYPE "ConversationScope"` with three values
- `ALTER TABLE "Conversation" ADD COLUMN "scope"` with default `ORG`
- `ALTER TABLE "Conversation" ALTER COLUMN "organizationId" DROP NOT NULL`
- Index on `scope`

**Step 4: Verify Prisma client regenerated**

Run: `pnpm prisma generate`

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260308000000_add_conversation_scopes/
git commit -m "feat(messaging): add ConversationScope enum and scope field to Conversation"
```

---

### Task 2: Add ConversationKeyShare Model

**Files:**
- Modify: `prisma/schema.prisma` (add model after Conversation)
- Create: `prisma/migrations/20260308100000_add_conversation_key_share/migration.sql`

**Step 1: Add the ConversationKeyShare model to schema.prisma**

```prisma
/// Per-conversation encryption key share.
/// For SHARED conversations, each participant gets the conversation's symmetric key
/// wrapped (encrypted) with their personal workspace org DEK.
model ConversationKeyShare {
  id             String   @id @default(uuid())
  conversationId String
  userId         String
  encryptedKey   String   @db.Text  // Conversation AES-256 key, encrypted with user's personal workspace DEK

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
  @@index([userId])
}
```

**Step 2: Generate migration**

Run: `pnpm prisma migrate dev --name add_conversation_key_share`

**Step 3: Verify migration creates table with unique constraint and indexes**

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260308100000_add_conversation_key_share/
git commit -m "feat(messaging): add ConversationKeyShare model for per-conversation encryption"
```

---

### Task 3: Add ConversationOrgMembership Model

**Files:**
- Modify: `prisma/schema.prisma` (add model after ConversationKeyShare)
- Create: `prisma/migrations/20260308200000_add_conversation_org_membership/migration.sql`

**Step 1: Add the ConversationOrgMembership model**

```prisma
/// Tracks which organizations are invited to a SHARED conversation.
/// When autoSync is true, new members joining the org are automatically
/// added to the conversation and given a ConversationKeyShare.
model ConversationOrgMembership {
  id             String   @id @default(uuid())
  conversationId String
  organizationId String
  autoSync       Boolean  @default(true)   // Auto-add new org members
  addedById      String                     // Who invited the org
  addedAt        DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@unique([conversationId, organizationId])
  @@index([organizationId])
}
```

**Step 2: Generate migration**

Run: `pnpm prisma migrate dev --name add_conversation_org_membership`

**Step 3: Verify migration**

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260308200000_add_conversation_org_membership/
git commit -m "feat(messaging): add ConversationOrgMembership model for org-level invites with auto-sync"
```

---

### Task 4: Data Migration — Set Scope on Existing Conversations

**Files:**
- Create: `scripts/migrate-conversation-scopes.ts`

**Step 1: Write the migration script**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(dryRun ? "DRY RUN — no changes will be made" : "LIVE RUN");

  // 1. All existing conversations with isGroup=false and no entityType → PERSONAL (1:1 DMs)
  const dms = await prisma.conversation.count({
    where: { isGroup: false, entityType: null },
  });
  console.log(`Found ${dms} DM conversations → will set scope=PERSONAL`);

  // 2. All existing conversations with isGroup=true or entityType set → ORG
  const orgConvos = await prisma.conversation.count({
    where: { OR: [{ isGroup: true }, { entityType: { not: null } }] },
  });
  console.log(`Found ${orgConvos} group/entity conversations → will set scope=ORG`);

  if (!dryRun) {
    const [dmResult, orgResult] = await prisma.$transaction([
      prisma.conversation.updateMany({
        where: { isGroup: false, entityType: null },
        data: { scope: "PERSONAL" },
      }),
      prisma.conversation.updateMany({
        where: { OR: [{ isGroup: true }, { entityType: { not: null } }] },
        data: { scope: "ORG" },
      }),
    ]);
    console.log(`Updated ${dmResult.count} DMs to PERSONAL`);
    console.log(`Updated ${orgResult.count} group/entity conversations to ORG`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: Dry run the script**

Run: `npx tsx scripts/migrate-conversation-scopes.ts --dry-run`
Expected: Counts printed, no data changed

**Step 3: Run the migration**

Run: `npx tsx scripts/migrate-conversation-scopes.ts`
Expected: Counts match dry run, all conversations scoped

**Step 4: Commit**

```bash
git add scripts/migrate-conversation-scopes.ts
git commit -m "feat(messaging): add data migration script for conversation scopes"
```

---

## Phase 2: Per-Conversation Encryption

### Task 5: Create Conversation Encryption Module

**Files:**
- Create: `lib/conversation-encryption.ts`
- Reference: `lib/encryption.ts` (for `encryptWithKey`, `decryptWithKey`)
- Reference: `lib/key-management.ts` (for `getOrgDek`)

**Step 1: Implement the conversation encryption module**

```typescript
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import prismadb from "@/lib/prisma";
import { getOrgDek } from "@/lib/key-management";
import { encryptWithKey, decryptWithKey } from "@/lib/encryption";

const CONVERSATION_DEK_CACHE = new Map<string, { key: Buffer; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a new 32-byte AES-256 key for a SHARED conversation.
 * Returns the raw key as a Buffer.
 */
export function generateConversationKey(): Buffer {
  return randomBytes(32);
}

/**
 * Wrap (encrypt) a conversation key with a user's personal workspace DEK.
 * The wrapped key is stored in ConversationKeyShare.encryptedKey.
 */
export function wrapKeyWithDek(conversationKey: Buffer, userDek: Buffer): string {
  return encryptWithKey(conversationKey.toString("hex"), userDek);
}

/**
 * Unwrap (decrypt) a conversation key using a user's personal workspace DEK.
 * Returns the raw conversation key as a Buffer.
 */
export function unwrapKeyWithDek(wrappedKey: string, userDek: Buffer): Buffer {
  const hexKey = decryptWithKey(wrappedKey, userDek);
  return Buffer.from(hexKey, "hex");
}

/**
 * Create a conversation key and wrap it for each participant.
 * Call this when creating a new SHARED conversation.
 *
 * @param conversationId - The conversation ID
 * @param participantUserIds - User IDs of all participants
 * @param personalOrgIds - Map of userId → personal workspace organizationId
 */
export async function createConversationKeyShares(
  conversationId: string,
  participantUserIds: string[],
  personalOrgIds: Map<string, string>
): Promise<void> {
  const conversationKey = generateConversationKey();

  const shares = await Promise.all(
    participantUserIds.map(async (userId) => {
      const personalOrgId = personalOrgIds.get(userId);
      if (!personalOrgId) {
        throw new Error(`No personal workspace found for user ${userId}`);
      }
      const userDek = await getOrgDek(personalOrgId);
      const wrappedKey = wrapKeyWithDek(conversationKey, userDek);
      return {
        conversationId,
        userId,
        encryptedKey: wrappedKey,
      };
    })
  );

  await prismadb.conversationKeyShare.createMany({ data: shares });
}

/**
 * Add a key share for a new participant in an existing SHARED conversation.
 * Uses an existing participant's share to recover the conversation key,
 * then wraps it for the new participant.
 *
 * @param conversationId - The conversation ID
 * @param newUserId - The new participant's user ID
 * @param newUserPersonalOrgId - The new participant's personal workspace org ID
 * @param existingUserId - An existing participant who has a key share
 * @param existingUserPersonalOrgId - The existing participant's personal workspace org ID
 */
export async function addKeyShareForUser(
  conversationId: string,
  newUserId: string,
  newUserPersonalOrgId: string,
  existingUserId: string,
  existingUserPersonalOrgId: string
): Promise<void> {
  // Recover conversation key from existing participant's share
  const existingShare = await prismadb.conversationKeyShare.findUnique({
    where: { conversationId_userId: { conversationId, userId: existingUserId } },
  });
  if (!existingShare) {
    throw new Error(`No key share found for user ${existingUserId} in conversation ${conversationId}`);
  }

  const existingDek = await getOrgDek(existingUserPersonalOrgId);
  const conversationKey = unwrapKeyWithDek(existingShare.encryptedKey, existingDek);

  // Wrap for new participant
  const newDek = await getOrgDek(newUserPersonalOrgId);
  const wrappedKey = wrapKeyWithDek(conversationKey, newDek);

  await prismadb.conversationKeyShare.upsert({
    where: { conversationId_userId: { conversationId, userId: newUserId } },
    create: { conversationId, userId: newUserId, encryptedKey: wrappedKey },
    update: { encryptedKey: wrappedKey },
  });
}

/**
 * Get the conversation DEK for a SHARED conversation.
 * Looks up the user's key share and unwraps with their personal workspace DEK.
 * Caches the result for 5 minutes.
 *
 * @param conversationId - The conversation ID
 * @param userId - The requesting user's ID
 * @param personalOrgId - The user's personal workspace org ID
 */
export async function getConversationDek(
  conversationId: string,
  userId: string,
  personalOrgId: string
): Promise<Buffer> {
  const cacheKey = `${conversationId}:${userId}`;
  const cached = CONVERSATION_DEK_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  const keyShare = await prismadb.conversationKeyShare.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });

  if (!keyShare) {
    throw new Error(`No key share found for user ${userId} in conversation ${conversationId}`);
  }

  const userDek = await getOrgDek(personalOrgId);
  const conversationKey = unwrapKeyWithDek(keyShare.encryptedKey, userDek);

  CONVERSATION_DEK_CACHE.set(cacheKey, {
    key: conversationKey,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return conversationKey;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit lib/conversation-encryption.ts` (or let next build catch it)

**Step 3: Commit**

```bash
git add lib/conversation-encryption.ts
git commit -m "feat(messaging): add per-conversation encryption with key wrapping"
```

---

### Task 6: Update Message Encryption for Scope Awareness

**Files:**
- Modify: `lib/model-encryption.ts` (add scope-aware message encryption functions)

**Step 1: Add scope-aware encryption helpers to lib/model-encryption.ts**

Add at the end of the file, after the existing `encryptMessageForOrg` / `decryptMessageForOrg` functions:

```typescript
import { getConversationDek } from "@/lib/conversation-encryption";

type MessageEncryptionContext = {
  scope: "ORG" | "PERSONAL" | "SHARED";
  organizationId?: string | null;
  conversationId?: string;
  userId?: string;
  personalOrgId?: string;
};

/**
 * Encrypt message content based on conversation scope.
 * - ORG: uses org DEK (existing behavior)
 * - PERSONAL: uses personal workspace org DEK
 * - SHARED: uses per-conversation key
 */
export async function encryptMessageByScope<T extends MessageWithContent>(
  data: T,
  ctx: MessageEncryptionContext
): Promise<T> {
  if (!("content" in data) || !data.content) return data;

  switch (ctx.scope) {
    case "ORG":
    case "PERSONAL": {
      if (!ctx.organizationId) throw new Error("organizationId required for ORG/PERSONAL scope");
      return encryptMessageForOrg(data, ctx.organizationId);
    }
    case "SHARED": {
      if (!ctx.conversationId || !ctx.userId || !ctx.personalOrgId) {
        throw new Error("conversationId, userId, and personalOrgId required for SHARED scope");
      }
      const dek = await getConversationDek(ctx.conversationId, ctx.userId, ctx.personalOrgId);
      return {
        ...data,
        content: isEncrypted(data.content) ? data.content : encryptFieldWithKey(data.content, dek),
      };
    }
    default:
      return data;
  }
}

/**
 * Decrypt message content based on conversation scope.
 */
export async function decryptMessageByScope<T extends MessageWithContent>(
  record: T,
  ctx: MessageEncryptionContext
): Promise<T> {
  if (!("content" in record) || !record.content || !isEncrypted(record.content)) return record;

  switch (ctx.scope) {
    case "ORG":
    case "PERSONAL": {
      if (!ctx.organizationId) throw new Error("organizationId required for ORG/PERSONAL scope");
      return decryptMessageForOrg(record, ctx.organizationId);
    }
    case "SHARED": {
      if (!ctx.conversationId || !ctx.userId || !ctx.personalOrgId) {
        throw new Error("conversationId, userId, and personalOrgId required for SHARED scope");
      }
      try {
        const dek = await getConversationDek(ctx.conversationId, ctx.userId, ctx.personalOrgId);
        return {
          ...record,
          content: decryptFieldWithKey(record.content, dek),
        };
      } catch {
        return { ...record, content: "[message could not be decrypted]" };
      }
    }
    default:
      return record;
  }
}
```

**Step 2: Verify no type errors**

Run: `pnpm build` (or check with `npx tsc --noEmit`)

**Step 3: Commit**

```bash
git add lib/model-encryption.ts
git commit -m "feat(messaging): add scope-aware message encryption/decryption"
```

---

## Phase 3: Server-Side Personal Workspace Resolution

### Task 7: Add Server-Side Personal Workspace Helper

**Files:**
- Modify: `lib/personal-workspace-guard.ts` (add `getPersonalWorkspaceOrgId`)

**Step 1: Add helper function to lib/personal-workspace-guard.ts**

```typescript
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Get a user's personal workspace organization ID.
 * Queries Clerk for the user's org memberships and finds the one
 * with publicMetadata.type === "personal".
 *
 * @throws if user has no personal workspace (should not happen in normal flow)
 */
export async function getPersonalWorkspaceOrgId(userId: string): Promise<string> {
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 100,
  });

  const personalMembership = memberships.data?.find((m) => {
    const metadata = m.organization.publicMetadata as Record<string, unknown>;
    return metadata?.type === "personal";
  });

  if (!personalMembership) {
    throw new Error(`No personal workspace found for user ${userId}`);
  }

  return personalMembership.organization.id;
}

/**
 * Batch-resolve personal workspace org IDs for multiple users.
 * Returns a Map of userId → personalOrgId.
 */
export async function getPersonalWorkspaceOrgIds(
  userIds: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  // Process in parallel with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const resolved = await Promise.all(
      batch.map(async (userId) => {
        const orgId = await getPersonalWorkspaceOrgId(userId);
        return [userId, orgId] as const;
      })
    );
    for (const [userId, orgId] of resolved) {
      results.set(userId, orgId);
    }
  }
  return results;
}
```

**Step 2: Verify compilation**

Run: `pnpm build` (partial check)

**Step 3: Commit**

```bash
git add lib/personal-workspace-guard.ts
git commit -m "feat(messaging): add server-side personal workspace org ID resolution"
```

---

## Phase 4: Fix DM Scoping & Create Shared Groups

### Task 8: Fix startDirectMessage to Use Personal Workspace

**Files:**
- Modify: `actions/messaging/direct-messages.ts` (lines ~28-70, startDirectMessage function)

**Step 1: Read the current startDirectMessage function**

Reference the current implementation which finds DMs without organizationId scoping. The fix:
- Resolve both users' personal workspace org IDs
- Scope the conversation to the creator's personal workspace
- Set `scope: "PERSONAL"` on the conversation

**Step 2: Update startDirectMessage**

Replace the existing conversation lookup and creation logic:

```typescript
import { getPersonalWorkspaceOrgId } from "@/lib/personal-workspace-guard";

export async function startDirectMessage(targetUserId: string) {
  const user = await requireAuth();
  await requireAction("messaging:create_dm");

  // Resolve personal workspace for DM scoping
  const personalOrgId = await getPersonalWorkspaceOrgId(user.id);

  // Find existing 1:1 DM scoped to personal workspace
  const existingConversation = await prismadb.conversation.findFirst({
    where: {
      scope: "PERSONAL",
      isGroup: false,
      entityType: null,
      AND: [
        { participants: { some: { userId: user.id, leftAt: null } } },
        { participants: { some: { userId: targetUserId, leftAt: null } } },
      ],
    },
    include: {
      participants: { where: { leftAt: null } },
    },
  });

  if (existingConversation && existingConversation.participants.length === 2) {
    return { success: true, conversationId: existingConversation.id };
  }

  // Create new DM in personal workspace scope
  const conversation = await prismadb.conversation.create({
    data: {
      organizationId: personalOrgId,
      scope: "PERSONAL",
      isGroup: false,
      createdById: user.id,
      participants: {
        create: [
          { userId: user.id },
          { userId: targetUserId },
        ],
      },
    },
  });

  // Notify both users via their personal Ably channels
  await Promise.all([
    publishToChannel(getUserChannelName(targetUserId), "conversation:created", {
      id: conversation.id,
      isGroup: false,
    }),
    publishToChannel(getUserChannelName(user.id), "conversation:created", {
      id: conversation.id,
      isGroup: false,
    }),
  ]);

  return { success: true, conversationId: conversation.id };
}
```

**Step 3: Update the sendMessage function in actions/messaging/messages.ts**

Where messages are encrypted before storage, replace the hardcoded `encryptMessageForOrg` call with scope-aware encryption. When fetching the conversation/channel to validate, also retrieve the `scope` field:

```typescript
// In sendMessage(), after fetching the conversation:
const conversation = await prismadb.conversation.findUnique({
  where: { id: params.conversationId },
  select: { id: true, organizationId: true, scope: true, /* existing fields */ },
});

// Replace:
//   const encryptedContent = (await encryptMessageForOrg({ content: params.content }, organizationId)).content;
// With:
const encryptedContent = (
  await encryptMessageByScope(
    { content: params.content },
    {
      scope: conversation.scope,
      organizationId: conversation.organizationId,
      conversationId: conversation.id,
      userId: user.id,
      personalOrgId: conversation.scope === "SHARED"
        ? await getPersonalWorkspaceOrgId(user.id)
        : undefined,
    }
  )
).content ?? params.content;
```

Similarly update `getMessages()` for decryption:
```typescript
// In getMessages(), when decrypting each message:
// Fetch conversation scope once at the top:
const conversationScope = container?.scope ?? "ORG";
const personalOrgId = conversationScope === "SHARED"
  ? await getPersonalWorkspaceOrgId(user.id)
  : undefined;

// Replace per-message decryption:
//   decrypted = await decryptMessageForOrg(msg, msg.organizationId);
// With:
decrypted = await decryptMessageByScope(msg, {
  scope: conversationScope,
  organizationId: msg.organizationId,
  conversationId: msg.conversationId ?? undefined,
  userId: user.id,
  personalOrgId,
});
```

**Step 4: Verify build passes**

Run: `pnpm build`

**Step 5: Commit**

```bash
git add actions/messaging/direct-messages.ts actions/messaging/messages.ts
git commit -m "fix(messaging): scope DMs to personal workspace, add scope-aware encryption"
```

---

### Task 9: Add Shared Group Creation Server Action

**Files:**
- Create: `actions/messaging/shared-conversations.ts`

**Step 1: Implement the shared group creation action**

```typescript
"use server";

import prismadb from "@/lib/prisma";
import { requireAuth, requireAction } from "@/lib/auth";
import { publishToChannel, getUserChannelName } from "@/lib/ably";
import {
  getPersonalWorkspaceOrgId,
  getPersonalWorkspaceOrgIds,
} from "@/lib/personal-workspace-guard";
import { createConversationKeyShares, addKeyShareForUser } from "@/lib/conversation-encryption";

/**
 * Create a SHARED conversation (cross-org group).
 *
 * @param name - Group name
 * @param participantUserIds - User IDs to include (from any org)
 * @param orgInvites - Organization IDs to invite (all current members added)
 */
export async function createSharedGroup(params: {
  name: string;
  participantUserIds: string[];
  orgInvites?: string[];
}) {
  const user = await requireAuth();
  await requireAction("messaging:create_group");

  const { name, participantUserIds, orgInvites = [] } = params;

  // Collect all individual user IDs (direct invites + org members)
  const allUserIds = new Set([user.id, ...participantUserIds]);

  // For each org invite, fetch current members
  const orgMemberMap = new Map<string, string[]>(); // orgId → userIds
  for (const orgId of orgInvites) {
    const orgMembers = await prismadb.users.findMany({
      where: {
        organizationMemberships: { some: { organizationId: orgId } },
        userStatus: "ACTIVE",
      },
      select: { id: true },
    });
    const memberIds = orgMembers.map((m) => m.id);
    orgMemberMap.set(orgId, memberIds);
    memberIds.forEach((id) => allUserIds.add(id));
  }

  const participantArray = Array.from(allUserIds);

  if (participantArray.length < 2) {
    return { error: "A shared group requires at least 2 participants" };
  }

  // Resolve personal workspace org IDs for all participants
  const personalOrgIds = await getPersonalWorkspaceOrgIds(participantArray);

  // Create the conversation
  const conversation = await prismadb.conversation.create({
    data: {
      organizationId: null, // SHARED conversations have no owning org
      scope: "SHARED",
      name: name.trim(),
      isGroup: true,
      createdById: user.id,
      participants: {
        create: participantArray.map((userId) => ({ userId })),
      },
      // Record org-level memberships for auto-sync
      orgMemberships: orgInvites.length > 0
        ? {
            create: orgInvites.map((orgId) => ({
              organizationId: orgId,
              addedById: user.id,
              autoSync: true,
            })),
          }
        : undefined,
    },
  });

  // Generate and distribute conversation encryption key
  await createConversationKeyShares(conversation.id, participantArray, personalOrgIds);

  // Notify all participants via their personal Ably channels
  await Promise.all(
    participantArray.map((userId) =>
      publishToChannel(getUserChannelName(userId), "conversation:created", {
        id: conversation.id,
        isGroup: true,
        scope: "SHARED",
        name: name.trim(),
      })
    )
  );

  return { success: true, conversationId: conversation.id };
}

/**
 * Add a new participant to an existing SHARED conversation.
 * Generates a key share for them using the adder's key share.
 */
export async function addSharedGroupMember(
  conversationId: string,
  newUserId: string
) {
  const user = await requireAuth();
  await requireAction("messaging:manage_members");

  // Verify conversation is SHARED and user is a participant
  const conversation = await prismadb.conversation.findFirst({
    where: {
      id: conversationId,
      scope: "SHARED",
      participants: { some: { userId: user.id, leftAt: null } },
    },
  });

  if (!conversation) {
    return { error: "Conversation not found or access denied" };
  }

  // Resolve personal workspace org IDs
  const [adderPersonalOrgId, newUserPersonalOrgId] = await Promise.all([
    getPersonalWorkspaceOrgId(user.id),
    getPersonalWorkspaceOrgId(newUserId),
  ]);

  // Add participant
  await prismadb.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId, userId: newUserId } },
    create: { conversationId, userId: newUserId },
    update: { leftAt: null },
  });

  // Create key share
  await addKeyShareForUser(
    conversationId,
    newUserId,
    newUserPersonalOrgId,
    user.id,
    adderPersonalOrgId
  );

  // Notify new participant
  await publishToChannel(getUserChannelName(newUserId), "conversation:joined", {
    id: conversationId,
    isGroup: true,
    scope: "SHARED",
  });

  return { success: true };
}

/**
 * Invite an entire organization to a SHARED conversation.
 * Adds all current members and creates a ConversationOrgMembership for auto-sync.
 */
export async function inviteOrgToSharedGroup(
  conversationId: string,
  organizationId: string
) {
  const user = await requireAuth();
  await requireAction("messaging:manage_members");

  // Verify conversation is SHARED and user is a participant
  const conversation = await prismadb.conversation.findFirst({
    where: {
      id: conversationId,
      scope: "SHARED",
      participants: { some: { userId: user.id, leftAt: null } },
    },
  });

  if (!conversation) {
    return { error: "Conversation not found or access denied" };
  }

  // Get all active members of the target org
  const orgMembers = await prismadb.users.findMany({
    where: {
      organizationMemberships: { some: { organizationId } },
      userStatus: "ACTIVE",
    },
    select: { id: true },
  });

  // Get existing participants to avoid duplicates
  const existingParticipants = await prismadb.conversationParticipant.findMany({
    where: { conversationId, leftAt: null },
    select: { userId: true },
  });
  const existingUserIds = new Set(existingParticipants.map((p) => p.userId));

  const newUserIds = orgMembers
    .map((m) => m.id)
    .filter((id) => !existingUserIds.has(id));

  if (newUserIds.length === 0) {
    // Still create the org membership for auto-sync even if all members already present
    await prismadb.conversationOrgMembership.upsert({
      where: { conversationId_organizationId: { conversationId, organizationId } },
      create: { conversationId, organizationId, addedById: user.id, autoSync: true },
      update: { autoSync: true },
    });
    return { success: true, addedCount: 0 };
  }

  // Resolve personal workspace org IDs for new users
  const adderPersonalOrgId = await getPersonalWorkspaceOrgId(user.id);
  const newUserPersonalOrgIds = await getPersonalWorkspaceOrgIds(newUserIds);

  // Add participants and key shares
  await prismadb.conversationParticipant.createMany({
    data: newUserIds.map((userId) => ({ conversationId, userId })),
    skipDuplicates: true,
  });

  // Create key shares for all new users (using adder's key share)
  await Promise.all(
    newUserIds.map((newUserId) => {
      const newUserPersonalOrgId = newUserPersonalOrgIds.get(newUserId);
      if (!newUserPersonalOrgId) return Promise.resolve();
      return addKeyShareForUser(
        conversationId,
        newUserId,
        newUserPersonalOrgId,
        user.id,
        adderPersonalOrgId
      );
    })
  );

  // Create org membership record for auto-sync
  await prismadb.conversationOrgMembership.upsert({
    where: { conversationId_organizationId: { conversationId, organizationId } },
    create: { conversationId, organizationId, addedById: user.id, autoSync: true },
    update: { autoSync: true },
  });

  // Notify new participants
  await Promise.all(
    newUserIds.map((userId) =>
      publishToChannel(getUserChannelName(userId), "conversation:joined", {
        id: conversationId,
        isGroup: true,
        scope: "SHARED",
      })
    )
  );

  return { success: true, addedCount: newUserIds.length };
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add actions/messaging/shared-conversations.ts
git commit -m "feat(messaging): add SHARED group creation, member invite, and org invite actions"
```

---

## Phase 5: Auto-Sync on Org Membership

### Task 10: Add Auto-Sync to Clerk Webhook Handler

**Files:**
- Modify: `app/api/webhooks/clerk/route.ts` (add `organizationMembership.created` handler)
- Create: `actions/messaging/auto-sync-shared-conversations.ts`

**Step 1: Create the auto-sync action**

```typescript
"use server";

import prismadb from "@/lib/prisma";
import { publishToChannel, getUserChannelName } from "@/lib/ably";
import {
  getPersonalWorkspaceOrgId,
} from "@/lib/personal-workspace-guard";
import { addKeyShareForUser } from "@/lib/conversation-encryption";

/**
 * When a user joins an organization, automatically add them to any SHARED
 * conversations that have a ConversationOrgMembership record with autoSync=true
 * for that organization.
 *
 * Called from the Clerk webhook handler on organizationMembership.created.
 */
export async function autoSyncSharedConversationsForNewMember(
  userId: string,
  organizationId: string
) {
  // Find all SHARED conversations with auto-sync enabled for this org
  const orgMemberships = await prismadb.conversationOrgMembership.findMany({
    where: {
      organizationId,
      autoSync: true,
    },
    include: {
      conversation: {
        include: {
          participants: {
            where: { leftAt: null },
            select: { userId: true },
            take: 1, // Just need one existing participant for key wrapping
          },
        },
      },
    },
  });

  if (orgMemberships.length === 0) return;

  const newUserPersonalOrgId = await getPersonalWorkspaceOrgId(userId);

  for (const membership of orgMemberships) {
    const conversation = membership.conversation;

    // Skip if user is already a participant
    const isAlreadyParticipant = await prismadb.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId,
        },
      },
    });

    if (isAlreadyParticipant && !isAlreadyParticipant.leftAt) continue;

    // Find an existing active participant to use for key wrapping
    const existingParticipant = conversation.participants[0];
    if (!existingParticipant) continue; // Shouldn't happen, but guard

    const existingUserPersonalOrgId = await getPersonalWorkspaceOrgId(
      existingParticipant.userId
    );

    // Add as participant
    await prismadb.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId,
        },
      },
      create: { conversationId: conversation.id, userId },
      update: { leftAt: null },
    });

    // Create key share
    await addKeyShareForUser(
      conversation.id,
      userId,
      newUserPersonalOrgId,
      existingParticipant.userId,
      existingUserPersonalOrgId
    );

    // Notify the new participant
    await publishToChannel(getUserChannelName(userId), "conversation:joined", {
      id: conversation.id,
      isGroup: true,
      scope: "SHARED",
    });
  }
}
```

**Step 2: Add webhook handler for organizationMembership.created**

In `app/api/webhooks/clerk/route.ts`, add a new case in the event handler (after the existing `organizationMembership.deleted` handler):

```typescript
if (eventType === "organizationMembership.created") {
  const { organization, public_user_data } = evt.data;
  const orgId = organization?.id;
  const userId = public_user_data?.user_id;

  if (orgId && userId) {
    // Auto-join default messaging channels (existing behavior)
    syncUserToMessaging(userId).catch(console.error);

    // Auto-sync to SHARED conversations with org auto-sync enabled
    autoSyncSharedConversationsForNewMember(userId, orgId).catch((error) => {
      console.error("Failed to auto-sync shared conversations:", error);
    });
  }
}
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add actions/messaging/auto-sync-shared-conversations.ts app/api/webhooks/clerk/route.ts
git commit -m "feat(messaging): auto-sync new org members to SHARED conversations"
```

---

## Phase 6: Ably Real-Time for Shared Conversations

### Task 11: Add Shared Conversation Ably Channel Pattern

**Files:**
- Modify: `lib/ably.ts` (add shared conversation channel naming + token capabilities)

**Step 1: Add shared conversation channel helpers to lib/ably.ts**

Add new channel naming function:
```typescript
/**
 * Ably channel name for SHARED conversations (not org-scoped).
 * Format: shared:conversation:{conversationId}
 */
export function getSharedConversationChannelName(conversationId: string): string {
  return `shared:conversation:${conversationId}`;
}
```

**Step 2: Update token capabilities in createAblyTokenRequest**

The challenge: shared conversation channels are not org-scoped, so you can't use a wildcard like `org:${orgId}:*`. Instead, fetch the user's shared conversations and grant explicit capabilities:

```typescript
// In createAblyTokenRequest(), after existing capabilities:

// Fetch user's SHARED conversations for explicit channel grants
const sharedConversations = await prismadb.conversationParticipant.findMany({
  where: {
    userId,
    leftAt: null,
    conversation: { scope: "SHARED" },
  },
  select: { conversationId: true },
});

for (const { conversationId } of sharedConversations) {
  capability[`shared:conversation:${conversationId}`] = ["subscribe", "publish", "presence"];
}
```

**Step 3: Update sendMessage in actions/messaging/messages.ts**

Where Ably events are published for messages, add scope-awareness:

```typescript
// When publishing message events, use the correct channel:
const ablyChannelName = conversation.scope === "SHARED"
  ? getSharedConversationChannelName(conversation.id)
  : getConversationChannelName(conversation.organizationId!, conversation.id);
```

**Step 4: Verify build**

Run: `pnpm build`

**Step 5: Commit**

```bash
git add lib/ably.ts actions/messaging/messages.ts
git commit -m "feat(messaging): add Ably support for SHARED conversation channels"
```

---

## Phase 7: Conversation Queries — Scope-Aware Fetching

### Task 12: Update getUserConversations for Multi-Scope Support

**Files:**
- Modify: `actions/messaging/direct-messages.ts` (getUserConversations function)
- Modify: `app/api/messaging/conversations/route.ts`

**Step 1: Update getUserConversations to handle all scopes**

The current function filters by `organizationId`. Update it to return:
- ORG conversations when in an agency workspace
- PERSONAL + SHARED conversations when in a personal workspace

```typescript
export async function getUserConversations(workspaceScope?: "agency" | "personal") {
  const user = await requireAuth();
  const organizationId = await getCurrentOrgId();
  const isPersonal = await isCurrentOrgPersonal();

  let whereClause;

  if (isPersonal || workspaceScope === "personal") {
    // In personal workspace: show PERSONAL DMs + SHARED groups
    whereClause = {
      participants: { some: { userId: user.id, leftAt: null } },
      OR: [
        { scope: "PERSONAL" as const },
        { scope: "SHARED" as const },
      ],
    };
  } else {
    // In agency workspace: show ORG conversations only
    whereClause = {
      organizationId,
      scope: "ORG" as const,
      participants: { some: { userId: user.id, leftAt: null } },
    };
  }

  const conversations = await prismadb.conversation.findMany({
    where: whereClause,
    include: {
      participants: {
        where: { leftAt: null },
        include: { /* user info */ },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Decrypt last message preview for each conversation
  // (scope-aware decryption)
  // ...

  return conversations;
}
```

**Step 2: Update the conversations API route to accept a `scope` query param**

```typescript
// In app/api/messaging/conversations/route.ts
const scope = searchParams.get("scope") as "agency" | "personal" | null;
const conversations = await getUserConversations(scope ?? undefined);
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add actions/messaging/direct-messages.ts app/api/messaging/conversations/route.ts
git commit -m "feat(messaging): scope-aware conversation fetching for personal vs agency"
```

---

## Phase 8: UI — Workspace-Aware MessagesPage

### Task 13: Update MessagesPage for Workspace Awareness

**Files:**
- Modify: `app/[locale]/app/(routes)/network/messages/components/MessagesPage.tsx`
- Modify: `hooks/swr/useMessaging.ts` (update useConversations hook)

**Step 1: Update useConversations SWR hook to accept workspace scope**

In `hooks/swr/useMessaging.ts`:

```typescript
export function useConversations(options?: {
  enabled?: boolean;
  refreshInterval?: number;
  scope?: "agency" | "personal";
}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    options?.enabled === false ? null : `/api/messaging/conversations?scope=${options?.scope ?? ""}`,
    fetcher,
    { refreshInterval: options?.refreshInterval ?? 30000 }
  );
  return { conversations: data?.conversations ?? [], isLoading, isValidating, error, mutate };
}
```

**Step 2: Update MessagesPage to detect workspace type and adjust UI**

```typescript
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

// Inside MessagesPage component:
const { isPersonalWorkspace, isAgencyWorkspace } = useWorkspaceContext();

// Fetch conversations based on workspace type
const { conversations } = useConversations({
  enabled: isAuthenticated,
  scope: isPersonalWorkspace ? "personal" : "agency",
});

// Conditionally render tabs:
// Personal workspace: "Messages" (DMs) + "Shared" (cross-org groups)
// Agency workspace: "Internal" (groups/entity) + "External" (integrations) + "Channels"
```

**Step 3: Update tab rendering**

```tsx
{isPersonalWorkspace ? (
  // Personal workspace tabs
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="messages">
      <MessageCircle className="h-4 w-4" />
      {t("tabs.messages")}
    </TabsTrigger>
    <TabsTrigger value="shared">
      <Users className="h-4 w-4" />
      {t("tabs.shared")}
    </TabsTrigger>
  </TabsList>
) : (
  // Agency workspace tabs (existing 3-tab layout)
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="internal">...</TabsTrigger>
    <TabsTrigger value="external">...</TabsTrigger>
    <TabsTrigger value="channels">...</TabsTrigger>
  </TabsList>
)}
```

**Step 4: Add i18n keys**

Add to `locales/en/messages.json` and `locales/el/messages.json`:
```json
{
  "tabs": {
    "messages": "Messages",
    "shared": "Shared Groups"
  }
}
```
```json
{
  "tabs": {
    "messages": "Μηνύματα",
    "shared": "Κοινόχρηστες Ομάδες"
  }
}
```

**Step 5: Filter conversations by type in each tab**

```typescript
// Personal workspace
const personalDms = conversations.filter((c) => c.scope === "PERSONAL" && !c.isGroup);
const sharedGroups = conversations.filter((c) => c.scope === "SHARED");

// Agency workspace
const orgGroups = conversations.filter((c) => c.scope === "ORG" && c.isGroup);
const entityConversations = conversations.filter((c) => c.scope === "ORG" && c.entityType);
```

**Step 6: Adjust action buttons per workspace**

```tsx
{isPersonalWorkspace ? (
  // Personal: "New DM" + "New Shared Group"
  <>
    <StartDMDialog dict={dict} />
    <CreateSharedGroupDialog dict={dict} />
  </>
) : (
  // Agency: "Create Channel" + "New Group" (intra-org only)
  <>
    <CreateChannelDialog dict={dict} />
    <StartDMDialog dict={dict} mode="group" />
  </>
)}
```

**Step 7: Verify build**

Run: `pnpm build`

**Step 8: Commit**

```bash
git add app/[locale]/app/(routes)/network/messages/components/MessagesPage.tsx hooks/swr/useMessaging.ts locales/en/messages.json locales/el/messages.json
git commit -m "feat(messaging): workspace-aware MessagesPage with personal/agency tab layouts"
```

---

### Task 14: Create Shared Group Dialog Component

**Files:**
- Create: `app/[locale]/app/(routes)/network/messages/components/CreateSharedGroupDialog.tsx`

**Step 1: Implement the dialog**

Build a dialog that allows:
1. Setting a group name
2. Searching for individual users across the platform (not just current org)
3. Searching for organizations to invite (with member count display)
4. Toggle auto-sync per org invite
5. Creating the shared group via the `createSharedGroup` action

The component should follow the same patterns as `StartDMDialog.tsx` and `CreateChannelDialog.tsx` — use shadcn Dialog, Command (for search), Badge (for selections), and Button components.

Key differences from StartDMDialog:
- User search queries ALL platform users, not just current org
- Additional "Organizations" tab in the search to find and invite entire orgs
- Each org selection shows member count and auto-sync toggle

**Step 2: Add SWR mutation hook**

In `hooks/swr/useMessaging.ts`:
```typescript
export function useCreateSharedGroup() {
  const { mutate: mutateConversations } = useConversations({ enabled: false });
  const [isCreating, setIsCreating] = useState(false);

  const createSharedGroup = async (params: {
    name: string;
    participantUserIds: string[];
    orgInvites?: string[];
  }) => {
    setIsCreating(true);
    try {
      const result = await createSharedGroupAction(params);
      if (result.success) {
        await mutateConversations();
      }
      return result;
    } finally {
      setIsCreating(false);
    }
  };

  return { createSharedGroup, isCreating };
}
```

**Step 3: Add API route for platform-wide user search**

Create `app/api/messaging/users/search/route.ts`:
```typescript
// GET /api/messaging/users/search?q=searchTerm
// Returns users across all organizations (for shared group invites)
// Excludes current user, returns: id, name, email, imageUrl, orgMemberships
```

**Step 4: Add API route for organization search**

Create `app/api/messaging/organizations/search/route.ts`:
```typescript
// GET /api/messaging/organizations/search?q=searchTerm
// Returns organizations the current user can see (public orgs, orgs they're in)
// Returns: id, name, slug, memberCount, imageUrl
```

**Step 5: Verify build**

Run: `pnpm build`

**Step 6: Commit**

```bash
git add app/[locale]/app/(routes)/network/messages/components/CreateSharedGroupDialog.tsx hooks/swr/useMessaging.ts app/api/messaging/users/search/route.ts app/api/messaging/organizations/search/route.ts
git commit -m "feat(messaging): add CreateSharedGroupDialog with cross-org user and org search"
```

---

## Phase 9: Permissions & Cleanup

### Task 15: Update Permissions for New Actions

**Files:**
- Modify: `lib/permissions/action-defaults.ts`
- Modify: `lib/permissions/types.ts`

**Step 1: Add new permission actions**

```typescript
// In types.ts, add to the messaging action list:
"messaging:create_shared_group"
"messaging:invite_org"

// In action-defaults.ts, add defaults:
"messaging:create_shared_group": { ORG_OWNER: true, ADMIN: true, AGENT: true, VIEWER: false },
"messaging:invite_org": { ORG_OWNER: true, ADMIN: true, AGENT: false, VIEWER: false },
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add lib/permissions/action-defaults.ts lib/permissions/types.ts
git commit -m "feat(messaging): add permissions for shared group and org invite actions"
```

---

### Task 16: Update Navigation Config for Workspace-Aware Messaging

**Files:**
- Modify: `config/navigation.tsx` (messaging entry)

**Step 1: Verify messaging nav item works in both workspace types**

The messaging nav entry already points to `/app/network/messages` and uses the `social` module. No changes needed to the navigation link itself — the workspace awareness is handled inside `MessagesPage`.

Verify that the messaging feature is accessible from both personal and agency workspaces in the navigation config. If `canAccess("social")` is false for personal workspaces, update accordingly.

**Step 2: Commit (if changes needed)**

---

### Task 17: Add i18n Keys for All New UI Elements

**Files:**
- Modify: `locales/en/messages.json`
- Modify: `locales/el/messages.json`

**Step 1: Add all new translation keys**

```json
{
  "tabs": {
    "messages": "Messages",
    "shared": "Shared Groups"
  },
  "shared": {
    "create": "New Shared Group",
    "createTitle": "Create a shared group",
    "createDescription": "Shared groups allow you to chat with people from different organizations.",
    "name": "Group name",
    "namePlaceholder": "e.g. Property Deal Discussion",
    "searchUsers": "Search users across Oikion...",
    "searchOrgs": "Search organizations...",
    "inviteOrg": "Invite Organization",
    "inviteOrgDescription": "All current members will be added. New members joining the org will be added automatically.",
    "autoSync": "Auto-add new members",
    "autoSyncDescription": "When new people join this organization, they'll be automatically added to this group.",
    "members": "members",
    "participants": "Participants",
    "organizations": "Organizations",
    "noResults": "No results found",
    "creating": "Creating group..."
  }
}
```

Greek translations:
```json
{
  "tabs": {
    "messages": "Μηνύματα",
    "shared": "Κοινόχρηστες Ομάδες"
  },
  "shared": {
    "create": "Νέα Κοινόχρηστη Ομάδα",
    "createTitle": "Δημιουργία κοινόχρηστης ομάδας",
    "createDescription": "Οι κοινόχρηστες ομάδες σας επιτρέπουν να συνομιλείτε με άτομα από διαφορετικούς οργανισμούς.",
    "name": "Όνομα ομάδας",
    "namePlaceholder": "π.χ. Συζήτηση Συμφωνίας Ακινήτου",
    "searchUsers": "Αναζήτηση χρηστών στο Oikion...",
    "searchOrgs": "Αναζήτηση οργανισμών...",
    "inviteOrg": "Πρόσκληση Οργανισμού",
    "inviteOrgDescription": "Όλα τα τρέχοντα μέλη θα προστεθούν. Νέα μέλη που θα ενταχθούν στον οργανισμό θα προστεθούν αυτόματα.",
    "autoSync": "Αυτόματη προσθήκη νέων μελών",
    "autoSyncDescription": "Όταν νέα άτομα ενταχθούν σε αυτόν τον οργανισμό, θα προστεθούν αυτόματα σε αυτή την ομάδα.",
    "members": "μέλη",
    "participants": "Συμμετέχοντες",
    "organizations": "Οργανισμοί",
    "noResults": "Δεν βρέθηκαν αποτελέσματα",
    "creating": "Δημιουργία ομάδας..."
  }
}
```

**Step 2: Commit**

```bash
git add locales/en/messages.json locales/el/messages.json
git commit -m "feat(messaging): add i18n keys for shared groups and workspace-aware tabs"
```

---

## Summary: Task Dependency Graph

```
Phase 1: Schema (Tasks 1→2→3→4) — sequential, each migration depends on previous

Phase 2: Encryption (Tasks 5→6) — depends on Phase 1 (ConversationKeyShare model)

Phase 3: Personal Workspace (Task 7) — independent of Phase 2, depends on Phase 1

Phase 4: Server Actions (Tasks 8→9) — depends on Phases 2+3

Phase 5: Auto-Sync (Task 10) — depends on Phase 4

Phase 6: Ably (Task 11) — depends on Phase 1

Phase 7: Queries (Task 12) — depends on Phases 2+3

Phase 8: UI (Tasks 13→14) — depends on Phases 4+7

Phase 9: Cleanup (Tasks 15→16→17) — depends on Phase 8
```

**Parallelizable:**
- Phase 2 and Phase 3 can run in parallel (both depend only on Phase 1)
- Phase 6 (Ably) can run in parallel with Phases 2-5
- Tasks 15 and 17 can be done anytime after the code they reference

**Critical Path:** Schema → Encryption → Personal Workspace → DM Fix → Shared Groups → Auto-Sync → UI

---

## Testing Checklist

After all phases complete, verify:

- [ ] Existing ORG conversations still work (no regression)
- [ ] New DMs are created with scope=PERSONAL in personal workspace
- [ ] Existing DMs migrated to scope=PERSONAL
- [ ] Shared groups can be created with participants from multiple orgs
- [ ] Messages in shared groups are encrypted with per-conversation key
- [ ] Messages in shared groups can be decrypted by all participants
- [ ] Inviting an org adds all current members
- [ ] New members joining an org with auto-sync are added to shared conversations
- [ ] New members receive a valid key share and can read existing messages
- [ ] Personal workspace shows DMs + Shared Groups tabs
- [ ] Agency workspace shows Internal + External + Channels tabs
- [ ] Ably real-time works for shared conversations
- [ ] Starting a DM from agency workspace creates it in personal workspace scope
- [ ] i18n works for both en and el locales
- [ ] Build passes: `pnpm build`
- [ ] Lint passes: `pnpm lint`
