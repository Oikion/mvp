# Comprehensive Test Seed Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `scripts/seed-test-data.ts` — a two-org, scenario-driven test seed that exercises every major feature of Oikion (MLS, CRM, Mandates, Deals, Matchmaking, Feed, Messaging, Documents, Calendar, Tasks, Sharing, Notifications, Network).

**Architecture:** Single self-contained TypeScript script using direct Prisma calls with inline AES-256-GCM encryption (same pattern as `seed-demo-showcase.ts`). Two real Clerk users resolve to their orgs; synthetic DB-only users are added for null-safety testing. Purge-and-recreate by default.

**Tech Stack:** TypeScript, Prisma Client, Clerk Backend SDK, Node crypto (AES-256-GCM), `dotenv`

**Spec:** `docs/superpowers/specs/2026-03-11-comprehensive-test-seed-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/seed-test-data.ts` | The complete seed script (single file, self-contained) |

This is intentionally a single file following the pattern of `scripts/seed-demo-showcase.ts`. All encryption, helpers, data definitions, and seeding logic are inline — no external `@/` imports (the script runs via `npx tsx` outside of Next.js).

---

## Chunk 1: Boilerplate, Encryption, Helpers, CLI

### Task 1: Script header, imports, Prisma/Clerk setup

**Files:**
- Create: `scripts/seed-test-data.ts`

- [ ] **Step 1: Create the file with imports and Prisma/Clerk client setup**

Copy the proven boilerplate from `seed-demo-showcase.ts:1-56` (dotenv, PrismaClient with Accelerate detection, Clerk client). Adapt the file header comment to describe the two-org test seed, its entity counts, and CLI usage.

```typescript
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
```

- [ ] **Step 2: Add CLI argument parsing**

Parse `--alpha-user`, `--beta-user`, and `--skip-purge` from `process.argv`. Exit with usage message if required args are missing.

```typescript
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
```

- [ ] **Step 3: Verify the file compiles**

Run: `cd /Users/stapo/Desktop/Oikion/MVP && npx tsx --eval "import './scripts/seed-test-data'" 2>&1 | head -5`
Expected: No syntax errors (may fail at runtime due to no args — that's fine).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): scaffold seed-test-data.ts with imports and CLI parsing"
```

### Task 2: Inline encryption (copy from seed-demo-showcase.ts)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Add encryption functions**

Copy verbatim from `seed-demo-showcase.ts:62-214`:
- `getMasterKey()`, `encryptRaw()`, `isEncrypted()`, `getOrgDek()`
- `encryptField()`, `encryptJson()`
- `CLIENT_ENCRYPTED_STRING_FIELDS` (25 fields — must include `full_name`, `company_name`, `company_id` which are in the model but were missing from the older seed)
- `encryptClientData()`, `encryptPropertyData()`, `encryptCalendarData()`, `encryptDocumentData()`
- `MANDATE_ENCRYPTED_STRING_FIELDS`, `encryptMandateData()`
- `encryptCommentContent()`

Verify the `CLIENT_ENCRYPTED_STRING_FIELDS` array has exactly 25 entries:
`client_name, full_name, company_name, company_id, primary_email, secondary_email, primary_phone, secondary_phone, office_phone, fax, afm, vat, doy, id_doc, company_gemi, description, billing_street, billing_city, billing_state, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_state, shipping_postal_code`

- [ ] **Step 2: Verify compilation**

Run: `npx tsx --eval "import './scripts/seed-test-data'" 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add inline AES-256-GCM encryption helpers"
```

### Task 3: Utility functions and Clerk helpers

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Add utility functions**

Copy from `seed-demo-showcase.ts:411-449` and add:
- `rand()`, `pick()`, `pickWeighted()`, `shuffle()`
- `generateHistoricalDate()` — from showcase seed
- `generateFutureDate(daysAhead: number)` — returns date N days in future
- `uuid()` — wrapper for `crypto.randomUUID()`

```typescript
function uuid(): string { return crypto.randomUUID(); }

function generateFutureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + rand(1, daysAhead));
  d.setHours(rand(9, 18), rand(0, 59), 0);
  return d;
}
```

- [ ] **Step 2: Add Clerk resolution helpers**

Copy `findOrganizationId()` and `getOrganizationUsers()` from `seed-demo-showcase.ts:540-582`. Both are unchanged.

- [ ] **Step 3: Add `generateFriendlyIds()`**

Copy from `seed-demo-showcase.ts:489-534`. Add new entity prefixes to `ENTITY_PREFIXES`:

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add utility functions, Clerk helpers, and friendly ID generation"
```

### Task 4: Greek data constants

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Add Greek location, name, and template data**

Copy from `seed-demo-showcase.ts:243-406`:
- `ATHENS_AREAS`, `THESSALONIKI_AREAS`, `ISLAND_AREAS`, `ALL_AREAS`
- `GREEK_FIRST_NAMES`, `GREEK_LAST_NAMES`
- `PROPERTY_NAME_TEMPLATES`, `PROPERTY_CONDITIONS`, `FURNISHED_OPTIONS`, `HEATING_TYPES`, `ENERGY_CLASSES`, `AMENITIES_LIST`
- `POST_TEMPLATES`, `TASK_TITLES`, `TASK_PRIORITIES`
- `DOCUMENT_CONFIGS`, `DEAL_TYPES`, `SHOWING_RESULTS`

Add additional constants not in the showcase seed:

```typescript
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
    "Καλημέρα σε όλους! 🏠",
    "Has anyone seen the new listings in Kolonaki?",
    "Reminder: team meeting tomorrow at 10am",
    "Just closed a deal in Glyfada — great quarter!",
    "Updated the property photos for the Kifisia house",
    "Anyone available for a viewing this Friday?",
    "Market report is ready, check your email",
    "New client referral from the Marousi office",
    "Welcome to the team @newagent!",
    "Happy Friday everyone! 🎉",
  ],
  management: [
    "Q2 targets: we need 15% more viewings",
    "Budget approved for the new CRM integration",
    "Let's discuss the Psychiko portfolio at tomorrow's meeting",
    "Compliance audit passed — good work team",
  ],
  announcements: [
    "📢 New company policy: all viewings must be logged within 24 hours",
    "🎉 Congratulations to our top agent this month!",
  ],
};

const DM_MESSAGES = {
  deal_discussion: [
    "Hey, I have a client interested in your Kolonaki listing",
    "Great! Which one? The 3-bed apartment or the penthouse?",
    "The 3-bed. Budget is around €300K. Can we arrange a viewing?",
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add Greek data constants and message templates"
```

---

## Chunk 2: Purge and Core Entity Seeding (Users, Clients, Properties, Mandates)

### Task 5: Purge function

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write the purge function**

Based on the spec's 24-step purge order. Follow the pattern from `seed-demo-showcase.ts:588-640` but extend it to cover all new entity types (messaging, channels, conversations, agency profiles, property images, etc.).

```typescript
async function purgeOrgData(
  orgId: string,
  orgUsers: Array<{ id: string; name: string | null }>
): Promise<void> {
  console.log(`\n🗑️  Purging data for org ${orgId}...`);
  const orgUserIds = orgUsers.map(u => u.id);
  // Also include synthetic seed users
  const seedUsers = await prismadb.users.findMany({
    where: { clerkUserId: { startsWith: "user_seed_" } },
    select: { id: true },
  });
  const allUserIds = [...orgUserIds, ...seedUsers.map(u => u.id)];

  // Collect parent IDs for FK-safe child deletes
  const orgPropertyIds = (await prismadb.properties.findMany({ where: { organizationId: orgId }, select: { id: true } })).map(p => p.id);
  const orgClientIds = (await prismadb.clients.findMany({ where: { organizationId: orgId }, select: { id: true } })).map(c => c.id);
  const orgMandateIds = (await prismadb.mandate.findMany({ where: { organizationId: orgId }, select: { id: true } })).map(m => m.id);
  const orgTaskIds = (await prismadb.crm_Accounts_Tasks.findMany({ where: { organizationId: orgId }, select: { id: true } })).map(t => t.id);
  const orgEventIds = (await prismadb.calendarEvent.findMany({ where: { organizationId: orgId }, select: { id: true } })).map(e => e.id);
  const orgPostIds = (await prismadb.socialPost.findMany({ where: { organizationId: orgId }, select: { id: true } })).map(p => p.id);
  const orgChannelIds = (await prismadb.channel.findMany({ where: { organizationId: orgId }, select: { id: true } })).map(c => c.id);
  const orgConvIds = (await prismadb.conversation.findMany({ where: { organizationId: orgId }, select: { id: true } })).map(c => c.id);
  const orgDocIds = (await prismadb.documents.findMany({ where: { organizationId: orgId }, select: { id: true } })).map(d => d.id);
  const orgMessageIds = (await prismadb.message.findMany({ where: { OR: [{ channelId: { in: orgChannelIds } }, { conversationId: { in: orgConvIds } }] }, select: { id: true } })).map(m => m.id);
  const orgProfileIds = (await prismadb.agentProfile.findMany({ where: { userId: { in: allUserIds } }, select: { id: true } })).map(p => p.id);

  // Ordered deletes (spec purge steps 1-24)
  const deletes: Array<{ name: string; run: () => Promise<{ count: number }> }> = [
    // 1. Message sub-entities
    { name: "message reactions", run: () => prismadb.messageReaction.deleteMany({ where: { messageId: { in: orgMessageIds } } }) },
    { name: "message reads", run: () => prismadb.messageRead.deleteMany({ where: { messageId: { in: orgMessageIds } } }) },
    { name: "message mentions", run: () => prismadb.messageMention.deleteMany({ where: { messageId: { in: orgMessageIds } } }) },
    { name: "message attachments", run: () => prismadb.messageAttachment.deleteMany({ where: { messageId: { in: orgMessageIds } } }) },
    // 2. Messages
    { name: "messages", run: () => prismadb.message.deleteMany({ where: { id: { in: orgMessageIds } } }) },
    // 3. Channel/conversation members
    { name: "channel members", run: () => prismadb.channelMember.deleteMany({ where: { channelId: { in: orgChannelIds } } }) },
    { name: "conversation participants", run: () => prismadb.conversationParticipant.deleteMany({ where: { conversationId: { in: orgConvIds } } }) },
    { name: "conversation org memberships", run: () => prismadb.conversationOrgMembership.deleteMany({ where: { conversationId: { in: orgConvIds } } }) },
    // 4. Channels and conversations
    { name: "channels", run: () => prismadb.channel.deleteMany({ where: { organizationId: orgId } }) },
    { name: "conversations", run: () => prismadb.conversation.deleteMany({ where: { id: { in: orgConvIds } } }) },
    // 5-6. Social
    { name: "social post likes", run: () => prismadb.socialPostLike.deleteMany({ where: { postId: { in: orgPostIds } } }) },
    { name: "social post comments", run: () => prismadb.socialPostComment.deleteMany({ where: { postId: { in: orgPostIds } } }) },
    { name: "attachments", run: () => prismadb.attachment.deleteMany({ where: { organizationId: orgId } }) },
    { name: "social posts", run: () => prismadb.socialPost.deleteMany({ where: { organizationId: orgId } }) },
    // 7. Entity comments
    { name: "property comments", run: () => prismadb.propertyComment.deleteMany({ where: { propertyId: { in: orgPropertyIds } } }) },
    { name: "client comments", run: () => prismadb.clientComment.deleteMany({ where: { clientId: { in: orgClientIds } } }) },
    { name: "mandate comments", run: () => prismadb.mandateComment.deleteMany({ where: { mandateId: { in: orgMandateIds } } }) },
    // 8. Tasks
    { name: "task comments", run: () => prismadb.crm_Accounts_Tasks_Comments.deleteMany({ where: { crm_account_task: { in: orgTaskIds } } }) },
    { name: "tasks", run: () => prismadb.crm_Accounts_Tasks.deleteMany({ where: { organizationId: orgId } }) },
    // 9. Calendar
    { name: "calendar reminders", run: () => prismadb.calendarReminder.deleteMany({ where: { eventId: { in: orgEventIds } } }) },
    { name: "event invitees", run: () => prismadb.eventInvitee.deleteMany({ where: { eventId: { in: orgEventIds } } }) },
    { name: "calendar events", run: () => prismadb.calendarEvent.deleteMany({ where: { organizationId: orgId } }) },
    // 10. Showings
    { name: "property showings", run: () => prismadb.propertyShowing.deleteMany({ where: { organizationId: orgId } }) },
    // 11. Deals (before properties/clients — FK Restrict)
    { name: "deals", run: () => prismadb.deal.deleteMany({ where: { organizationId: orgId } }) },
    // 12. Join tables
    { name: "client-property links", run: () => prismadb.client_Properties.deleteMany({ where: { OR: [{ clientId: { in: orgClientIds } }, { propertyId: { in: orgPropertyIds } }] } }) },
    { name: "mandate-property links", run: () => prismadb.mandate_Properties.deleteMany({ where: { OR: [{ mandateId: { in: orgMandateIds } }, { propertyId: { in: orgPropertyIds } }] } }) },
    { name: "mandate-client links", run: () => prismadb.mandate_Clients.deleteMany({ where: { OR: [{ mandateId: { in: orgMandateIds } }, { clientId: { in: orgClientIds } }] } }) },
    // 13. Property images
    { name: "property images", run: () => prismadb.propertyImage.deleteMany({ where: { organizationId: orgId } }) },
    // 14. Documents
    { name: "document views", run: () => prismadb.documentView.deleteMany({ where: { documentId: { in: orgDocIds } } }) },
    { name: "documents", run: () => prismadb.documents.deleteMany({ where: { organizationId: orgId } }) },
    // 15. Shared entities
    { name: "shared entities", run: () => prismadb.sharedEntity.deleteMany({ where: { OR: [{ sharedById: { in: allUserIds } }, { sharedWithId: { in: allUserIds } }] } }) },
    // 16. Notifications
    { name: "notifications", run: () => prismadb.notification.deleteMany({ where: { organizationId: orgId } }) },
    // 17. Agent profiles
    { name: "agent contact submissions", run: () => prismadb.agentContactSubmission.deleteMany({ where: { profileId: { in: orgProfileIds } } }) },
    { name: "profile showcase properties", run: () => prismadb.profileShowcaseProperty.deleteMany({ where: { profileId: { in: orgProfileIds } } }) },
    { name: "agent profiles", run: () => prismadb.agentProfile.deleteMany({ where: { userId: { in: allUserIds } } }) },
    // 18. Agency profiles
    { name: "agency contact submissions", run: () => prismadb.agencyContactSubmission.deleteMany({ where: { profile: { organizationId: orgId } } }) },
    { name: "agency profiles", run: () => prismadb.agencyProfile.deleteMany({ where: { organizationId: orgId } }) },
    // 19. Agent connections
    { name: "agent connections", run: () => prismadb.agentConnection.deleteMany({ where: { OR: [{ followerId: { in: allUserIds } }, { followingId: { in: allUserIds } }] } }) },
    // 20. Network
    { name: "cross-org matches", run: () => prismadb.crossOrgMatch.deleteMany({ where: { OR: [{ mandateOrgId: orgId }, { propertyOrgId: orgId }] } }) },
    { name: "network partners", run: () => prismadb.orgNetworkPartner.deleteMany({ where: { OR: [{ initiatorOrgId: orgId }, { partnerOrgId: orgId }] } }) },
    { name: "network settings", run: () => prismadb.orgNetworkSettings.deleteMany({ where: { organizationId: orgId } }) },
    // 21-23. Core entities (order: mandates → properties → clients)
    { name: "mandates", run: () => prismadb.mandate.deleteMany({ where: { organizationId: orgId } }) },
    { name: "properties", run: () => prismadb.properties.deleteMany({ where: { organizationId: orgId } }) },
    { name: "clients", run: () => prismadb.clients.deleteMany({ where: { organizationId: orgId } }) },
  ];

  for (const del of deletes) {
    try {
      const result = await del.run();
      if (result.count > 0) console.log(`  ✓ ${result.count} ${del.name}`);
    } catch (e: unknown) {
      console.warn(`  ⚠ ${del.name}: ${(e as Error).message}`);
    }
  }

  // 24. Synthetic users
  const syntheticResult = await prismadb.users.deleteMany({
    where: { clerkUserId: { startsWith: "user_seed_" } },
  });
  if (syntheticResult.count > 0) console.log(`  ✓ ${syntheticResult.count} synthetic users`);

  console.log(`  ✅ Purge complete for ${orgId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add purge function with 24-step dependency-ordered deletes"
```

### Task 6: Synthetic users

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write synthetic user creation**

```typescript
interface OrgContext {
  orgId: string;
  primaryUserId: string;      // DB id of the real Clerk user
  primaryClerkId: string;     // Clerk user ID
  allUsers: Array<{ id: string; name: string | null; clerkUserId?: string }>;
  dek: Buffer;
  prefix: "alpha" | "beta";
}

async function createSyntheticUsers(ctx: OrgContext): Promise<void> {
  console.log(`\n👤 Creating synthetic users for ${ctx.prefix}...`);
  const now = new Date();

  const synthetics = [
    {
      id: uuid(),
      clerkUserId: `user_seed_${ctx.prefix}_departed`,
      email: `departed.agent.${ctx.prefix}@seed.oikion.test`,
      name: ctx.prefix === "alpha" ? "Nikos Departed" : "Sofia Departed",
      firstName: ctx.prefix === "alpha" ? "Nikos" : "Sofia",
      lastName: "Departed",
      account_name: `Departed Agent (${ctx.prefix})`,
      userStatus: "INACTIVE" as const,
      userLanguage: "el" as const,
      created_on: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
    },
    {
      id: uuid(),
      clerkUserId: `user_seed_${ctx.prefix}_inactive`,
      email: `inactive.agent.${ctx.prefix}@seed.oikion.test`,
      name: ctx.prefix === "alpha" ? "Dimitris Inactive" : "Elena Inactive",
      firstName: ctx.prefix === "alpha" ? "Dimitris" : "Elena",
      lastName: "Inactive",
      account_name: `Inactive Agent (${ctx.prefix})`,
      userStatus: "INACTIVE" as const,
      userLanguage: "el" as const,
      created_on: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
    },
    {
      id: uuid(),
      clerkUserId: `user_seed_${ctx.prefix}_deleted`,
      email: `deleted.agent.${ctx.prefix}@seed.oikion.test`,
      name: null, // GDPR-deleted
      firstName: null,
      lastName: null,
      account_name: `[Deleted User]`,
      userStatus: "INACTIVE" as const,
      userLanguage: "el" as const,
      created_on: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    },
  ];

  await prismadb.users.createMany({ data: synthetics });

  // Add to context
  for (const s of synthetics) {
    ctx.allUsers.push({ id: s.id, name: s.name, clerkUserId: s.clerkUserId });
  }

  console.log(`  ✓ ${synthetics.length} synthetic users created`);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add synthetic user creation (departed, inactive, deleted)"
```

### Task 7: Seed clients (15 per org)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write the client seeding function**

Create all 15 scenario-specific clients per the spec table. Each client is hand-crafted with specific field values to test a scenario. Encrypt all 25 string fields + communication_notes JSON.

Key implementation notes:
- Client #10 gets `assigned_to` set to the departed user's DB id
- Client #9 gets `draft_status: true` but still has `client_name` (NOT NULL)
- Client #13 gets all billing/shipping address fields filled
- Client #14 gets Greek tax fields (AFM: 9 digits, DOY, GEMI)
- Use `generateFriendlyIds("Clients", 15, orgId)` for friendly IDs
- Encrypt via `encryptClientData(data, ctx.dek)` before `createMany()`

```typescript
async function seedClients(ctx: OrgContext): Promise<string[]> {
  console.log(`\n👥 Seeding clients for ${ctx.prefix}...`);
  const ids = await generateFriendlyIds("Clients", 15, ctx.orgId);
  const departedUser = ctx.allUsers.find(u => u.clerkUserId === `user_seed_${ctx.prefix}_departed`);
  const primaryUser = ctx.primaryUserId;
  const now = new Date();

  const clientsRaw: Array<Record<string, unknown>> = [
    // 1-2: Active buyers with full contact info
    ...([0, 1].map(i => ({
      id: uuid(), friendlyId: ids[i], organizationId: ctx.orgId,
      client_name: ["Αλέξανδρος Παπαδόπουλος", "Μαρία Κωνσταντίνου"][i],
      client_type: "BUYER", client_status: "ACTIVE", visibility: "PERSONAL",
      person_type: "INDIVIDUAL", lead_source: ["REFERRAL", "WEB"][i],
      primary_email: [`alex.papa${i}@example.com`][0],
      primary_phone: `+3069${rand(1000000, 9999999)}`,
      secondary_phone: `+3021${rand(1000000, 9999999)}`,
      full_name: ["Alexandros Papadopoulos", "Maria Konstantinou"][i],
      language: "el", gdpr_consent: true, allow_marketing: true,
      assigned_to: primaryUser,
      communication_notes: JSON.stringify([{ date: now.toISOString(), note: "Initial consultation completed", by: primaryUser }]),
      created_at: generateHistoricalDate(6), updated_at: now,
    }))),
    // 3-4: Sellers linked to properties (Client_Properties created later)
    ...([2, 3].map(i => ({
      id: uuid(), friendlyId: ids[i], organizationId: ctx.orgId,
      client_name: [`Γιώργος Νικολάου`, `Ελένη Δημητρίου`][i - 2],
      client_type: "SELLER", client_status: "ACTIVE", visibility: "SECURE",
      person_type: "INDIVIDUAL", lead_source: "WALK_IN",
      primary_email: `seller${i}@example.com`,
      primary_phone: `+3069${rand(1000000, 9999999)}`,
      assigned_to: primaryUser,
      created_at: generateHistoricalDate(8), updated_at: now,
    }))),
    // 5: Renter with mandate
    { id: uuid(), friendlyId: ids[4], organizationId: ctx.orgId,
      client_name: "Κώστας Αντωνίου", client_type: "RENTER", client_status: "LEAD",
      visibility: "PERSONAL", person_type: "INDIVIDUAL", lead_source: "PORTAL",
      primary_email: "kostas.a@example.com", primary_phone: `+3069${rand(1000000, 9999999)}`,
      assigned_to: primaryUser, created_at: generateHistoricalDate(2), updated_at: now },
    // 6: Investor with multiple properties
    { id: uuid(), friendlyId: ids[5], organizationId: ctx.orgId,
      client_name: "Σταύρος Γεωργίου", client_type: "INVESTOR", client_status: "ACTIVE",
      visibility: "PUBLIC", person_type: "INVESTOR", lead_source: "REFERRAL",
      primary_email: "stavros.g@example.com", primary_phone: `+3069${rand(1000000, 9999999)}`,
      company_name: "Γεωργίου Investments Α.Ε.", company_id: "12345678",
      assigned_to: primaryUser, created_at: generateHistoricalDate(10), updated_at: now },
    // 7: Referral partner (company)
    { id: uuid(), friendlyId: ids[6], organizationId: ctx.orgId,
      client_name: "Ελληνική Κτηματική Α.Ε.", client_type: "REFERRAL_PARTNER", client_status: "CONVERTED",
      visibility: "SECURE", person_type: "COMPANY", lead_source: "REFERRAL",
      primary_email: "info@elliniki-ktimatiki.gr", office_phone: "+302101234567",
      company_name: "Ελληνική Κτηματική Α.Ε.", company_id: "87654321",
      assigned_to: primaryUser, created_at: generateHistoricalDate(12), updated_at: now },
    // 8: Lost lead
    { id: uuid(), friendlyId: ids[7], organizationId: ctx.orgId,
      client_name: "Πέτρος Βασιλείου", client_type: "BUYER", client_status: "LOST",
      visibility: "PERSONAL", person_type: "INDIVIDUAL", lead_source: "SOCIAL",
      primary_email: "petros.v@example.com", primary_phone: `+3069${rand(1000000, 9999999)}`,
      assigned_to: primaryUser, created_at: generateHistoricalDate(4), updated_at: now },
    // 9: Draft client (incomplete but client_name is NOT NULL)
    { id: uuid(), friendlyId: ids[8], organizationId: ctx.orgId,
      client_name: "Νέος Πελάτης (Draft)", client_type: "BUYER", client_status: "LEAD",
      visibility: "PERSONAL", draft_status: true,
      assigned_to: primaryUser, created_at: now, updated_at: now },
    // 10: Assigned to departed agent
    { id: uuid(), friendlyId: ids[9], organizationId: ctx.orgId,
      client_name: "Ανδρέας Μακρής", client_type: "SELLER", client_status: "ACTIVE",
      visibility: "PERSONAL", person_type: "INDIVIDUAL", lead_source: "WEB",
      primary_email: "andreas.m@example.com", primary_phone: `+3069${rand(1000000, 9999999)}`,
      assigned_to: departedUser?.id ?? null,
      created_at: generateHistoricalDate(6), updated_at: now },
    // 11-12: Shared cross-org
    ...([10, 11].map(i => ({
      id: uuid(), friendlyId: ids[i], organizationId: ctx.orgId,
      client_name: [`Χριστίνα Στεφάνου`, `Μιχάλης Αλεξίου`][i - 10],
      client_type: "BUYER", client_status: "ACTIVE", visibility: "SECURE",
      person_type: "INDIVIDUAL", lead_source: "REFERRAL",
      primary_email: `shared.client${i}@example.com`, primary_phone: `+3069${rand(1000000, 9999999)}`,
      assigned_to: primaryUser, created_at: generateHistoricalDate(3), updated_at: now,
    }))),
    // 13: Company with full billing/shipping
    { id: uuid(), friendlyId: ids[12], organizationId: ctx.orgId,
      client_name: "Μεσογειακά Ακίνητα Α.Ε.", client_type: "INVESTOR", client_status: "ACTIVE",
      visibility: "PUBLIC", person_type: "COMPANY", lead_source: "WEB",
      primary_email: "info@mesogeiaka.gr", office_phone: "+302109876543",
      company_name: "Μεσογειακά Ακίνητα Α.Ε.", company_id: "99887766",
      billing_street: "Λεωφ. Κηφισίας 100", billing_city: "Μαρούσι", billing_state: "Αττική",
      billing_postal_code: "15125", billing_country: "GR",
      shipping_street: "Βασ. Σοφίας 50", shipping_city: "Αθήνα", shipping_state: "Αττική",
      shipping_postal_code: "10674", shipping_country: "GR",
      assigned_to: primaryUser, created_at: generateHistoricalDate(8), updated_at: now },
    // 14: Greek-specific fields (AFM, DOY, GEMI)
    { id: uuid(), friendlyId: ids[13], organizationId: ctx.orgId,
      client_name: "Δημήτρης Οικονόμου", client_type: "SELLER", client_status: "ACTIVE",
      visibility: "PERSONAL", person_type: "INDIVIDUAL", lead_source: "WALK_IN",
      primary_email: "dimitris.o@example.com", primary_phone: `+3069${rand(1000000, 9999999)}`,
      afm: "123456789", doy: "Α' Αθηνών", id_doc: "ΑΚ123456",
      company_gemi: "123456789000",
      assigned_to: primaryUser, created_at: generateHistoricalDate(5), updated_at: now },
    // 15: Inactive client
    { id: uuid(), friendlyId: ids[14], organizationId: ctx.orgId,
      client_name: "Ειρήνη Χριστοδούλου", client_type: "BUYER", client_status: "INACTIVE",
      visibility: "PERSONAL", person_type: "INDIVIDUAL", lead_source: "PORTAL",
      primary_email: "irini.c@example.com",
      assigned_to: primaryUser, created_at: generateHistoricalDate(10), updated_at: now },
  ];

  // Encrypt all client data
  const clientsEncrypted = clientsRaw.map(c => encryptClientData(c, ctx.dek));
  await prismadb.clients.createMany({ data: clientsEncrypted as any[] });

  console.log(`  ✓ ${clientsEncrypted.length} clients`);
  return clientsRaw.map(c => c.id as string);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add client seeding — 15 scenario-specific clients per org"
```

### Task 8: Seed properties (20 per org)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write the property seeding function**

Create all 20 scenario-specific properties per the spec. Key properties:
- #1-3: Active apartments in Athens (Kolonaki, Kifisia, Glyfada) with varied sizes/prices
- #8: PLOT type must have `plot_size_sqm > 0`
- #9: SOLD status with `salePrice` and `saleDate`
- #13: RENTAL with `transaction_type: "RENTAL"` and `price_type: "RENTAL"`
- #14: SHORT_TERM vacation
- #15: Draft with `draft_status: true`
- #16: `assigned_to` → departed user
- #17: Full legal docs (KAEK 5-14 digits, permits)
- #18: Luxury with full amenities, high price
- #19-20: Matchmaking targets — Kolonaki, 80-120sqm, €200k-€350k, SECURE visibility

Encrypt `primary_email` and `communication_notes` via `encryptPropertyData()`.

The function should return an array of `{ id, friendlyId }` for later linking.

Implementation follows the same pattern as `seedClients()` — array of hand-crafted objects, encrypt, `createMany()`.

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add property seeding — 20 scenario-specific properties per org"
```

### Task 9: Seed mandates (11 per org)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write the mandate seeding function**

Create all 11 mandates per the spec. Key mandates:
- #1-2: Active buyer mandates with `areas_of_interest` matching SECURE properties
- #3: CRITICAL urgency, IMMEDIATE timeline
- #5: FULFILLED, linked to completed deal (Mandate_Properties created later)
- #6: EXPIRED with `expires_at` in the past
- #9: CANCELLED status
- #10: ACTIVE land search for PLOT type
- #11: Cross-org match target — Kolonaki, 70-130sqm, budget €180k-€400k, SECURE

Encrypt `title`, `notes` (string fields) and `communication_notes` (JSON) via `encryptMandateData()`.

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add mandate seeding — 11 scenario-specific mandates per org"
```

---

## Chunk 3: Deals, Documents, Calendar, Tasks, Showings

### Task 10: Seed deals (6 per org)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write the deal seeding function**

Takes client IDs and property IDs as input. Creates 6 deals per spec:
- Deal 1 (COMPLETED): links SOLD property (#9) + CONVERTED client (#7), sets `closedAt`, `salePrice`, `totalCommission`, `propertyAgentSplit`/`clientAgentSplit`
- Deal 2 (IN_PROGRESS): links pending property (#10), both agent IDs set
- Deal 3 (ACCEPTED): `contractDate` set
- Deal 4 (NEGOTIATING): early stage
- Deal 5 (PROPOSED): will be cross-org (created separately in cross-org seeding)
- Deal 6 (CANCELLED): `closedAt` set

No encryption on Deal fields (none are in the encryption lists).

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add deal seeding — 6 deals per org covering full lifecycle"
```

### Task 11: Seed documents (8 per org)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write the document seeding function**

Creates 8 documents per spec. Each has:
- Realistic filename, `document_file_mimeType`, `size`
- Placeholder `document_file_url` (e.g., `https://placehold.co/800x1200.png?text=Contract`)
- `linkedPropertiesIds` / `accountsIDs` arrays linking to relevant entities
- `document_system_type` per spec table

Encrypt `document_name` and `description` via `encryptDocumentData()`.

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add document seeding — 8 documents per org with placeholder URLs"
```

### Task 12: Seed calendar events (10 per org)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write the calendar event seeding function**

Creates 10 events per spec. Critical field: each event must have a **unique `calendarEventId` Int** — use offset 1000 for Alpha, 2000 for Beta, incrementing from there.

Each event gets:
- `reminderMinutes: [30, 60]`
- Linked properties/clients via the relation arrays
- 1-2 `EventInvitee` records (created via separate `createMany`)
- 1-2 `CalendarReminder` records (mix PENDING/SENT)

Events #1-3 and #9-10 are PROPERTY_VIEWING type linked to properties + clients.
Event #9 is future-dated. Events #4, #10 are past-dated.

Encrypt via `encryptCalendarData()`.

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add calendar event seeding with reminders and invitees"
```

### Task 13: Seed tasks (8 per org) and property showings (6 per org)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write the task seeding function**

Creates 8 tasks per spec. Each gets 1-3 `crm_Accounts_Tasks_Comments`.
- Task #1: overdue (`dueDateAt` in past), linked to client
- Task #5: `user` (assigned) → departed user ID
- Task #7: `user` → null (unassigned)
- Task #3: status marker in `tags` for "completed"

Comment content is encrypted via `encryptCommentContent()` for task comments.

- [ ] **Step 2: Write the property showing seeding function**

Creates 6 showings per org. Each requires:
- `propertyId`, `clientId`, `agentId` (raw Clerk userId string, NOT NULL)
- `organizationId`
- `showingDate`, `result` (one of each ShowingResult value), `duration`, `notes`

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add task and property showing seeding"
```

---

## Chunk 4: Comments, Social Feed, Messaging

### Task 14: Seed entity comments

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write comment seeding for properties, clients, mandates**

- **PropertyComment**: 3-5 per property on ~8 properties. Encrypt content via `encryptCommentContent()`.
- **ClientComment**: 2-4 per client on ~10 clients. **NOT encrypted** (no helper exists).
- **MandateComment**: 2-3 per mandate on ~6 mandates. Encrypt content via `encryptCommentContent()`.

Some comments assigned to departed users (null-safety test). Mix of dates spanning the last 6 months.

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add entity comments (property, client, mandate)"
```

### Task 15: Seed social feed (12 posts per org with engagement)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write social post seeding with likes, comments, replies**

Creates 12 `SocialPost` records per org per the spec table. For each post, creates:
- `SocialPostLike` records (varying counts per spec)
- `SocialPostComment` records, some with `parentId` for threaded replies
- `Attachment` record for post #10

Post #9 has `authorId` set to departed user.
Post #12 has oldest `createdAt` (pagination boundary).

Use `generateFriendlyIds("SocialPost", 12, orgId)` for slugs.

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add social feed with likes, comments, and threaded replies"
```

### Task 16: Seed messaging (channels, conversations, messages)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write channel seeding (3 per org)**

Creates `#general` (PUBLIC), `#management` (PRIVATE), `#announcements` (ANNOUNCEMENT) per org. Each gets `ChannelMember` records for appropriate users.

- [ ] **Step 2: Write conversation seeding (5 total)**

Creates 5 `Conversation` records:
- 2 org-scoped 1:1 DMs (`isGroup: false`)
- 1 org-scoped group DM (`isGroup: true`, `name: "Alpha Team Chat"`)
- 1 cross-org SHARED DM (`scope: "SHARED"`, with `ConversationOrgMembership` for both orgs)
- 1 DM with departed user

Each gets `ConversationParticipant` records.

- [ ] **Step 3: Write message seeding**

Creates ~50 messages total across channels and conversations using the `CHANNEL_MESSAGES` and `DM_MESSAGES` templates.

For the `#general` channel, create one message with 3 thread replies (`parentId`).

Add message sub-entities:
- `MessageReaction` (👍, 🏠) on 3-4 messages
- `MessageAttachment` on 2 messages (placeholder URLs)
- `MessageMention` on 3-4 messages
- `MessageRead` for ~60% of messages

Messages in the departed-user conversation have `senderId: null` for some.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add messaging — channels, conversations, messages with threads/reactions"
```

---

## Chunk 5: Cross-Org, Profiles, Notifications, Main Function

### Task 17: Seed join tables (Client_Properties, Mandate_Properties, Mandate_Clients)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write join table seeding**

Using the IDs from previously seeded entities:
- **Client_Properties**: Sellers (#3-4) linked to 1-2 properties. Investor (#6) linked to 4+ properties. Buyers linked to 2-3 properties of interest.
- **Mandate_Properties**: Fulfilled mandate (#5) linked to SOLD property (#9). Active mandates linked to 2-3 candidate properties.
- **Mandate_Clients**: Each mandate linked to 1 client. Some mandates linked to 2 clients (co-buyers).

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add entity join tables (client-property, mandate-property, mandate-client)"
```

### Task 18: Seed profiles, connections, sharing, images

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write agent profile + agency profile seeding**

- **AgentProfile**: One per real Clerk user (4 total). Fields per spec (bio, specializations, etc.). 2 PUBLIC, 1 SECURE, 1 PERSONAL visibility. PUBLIC profiles get `ProfileShowcaseProperty` records.
- **AgencyProfile**: One per org (2 total). Full fields with `contactFormEnabled: true`.
- **AgentContactSubmission**: 4 records with NEW/READ/CONTACTED/ARCHIVED statuses.

- [ ] **Step 2: Write agent connections**

4 `AgentConnection` records: 2 ACCEPTED, 1 PENDING, 1 REJECTED.

- [ ] **Step 3: Write shared entities**

5 `SharedEntity` records per spec table. #5 has `sharedById` set to departed user.

- [ ] **Step 4: Write property images**

3-5 `PropertyImage` per org. Luxury property gets 3 images (position 0-2, first is primary). Matchmaking targets get 1-2 each. Use `https://placehold.co/` URLs.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add profiles, connections, sharing, and property images"
```

### Task 19: Seed network settings and cross-org matches

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write network + matchmaking seeding**

- `OrgNetworkSettings` for both orgs (Alpha: AGENCY_IDENTIFIED, Beta: FULL)
- `OrgNetworkPartner` between Alpha and Beta (ACCEPTED)
- `CrossOrgMatch`: 4 records with `expiresAt` set to 30 days in future
  - Beta mandate #11 → Alpha property #19 (score 92)
  - Beta mandate #11 → Alpha property #20 (score 85)
  - Alpha mandate #1 → Beta property (score 78)
  - Alpha mandate #3 → Beta property (score 75)

Each match has a `breakdown` JSON with `{location, size, budget, type}` scores.

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add network settings, partnerships, and cross-org matches"
```

### Task 20: Seed notifications (15 per org)

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write notification seeding**

Creates 15 `Notification` records per org covering all major `NotificationCategory` values from the spec: PROPERTY_CREATED, PROPERTY_UPDATED, PROPERTY_ASSIGNED, CLIENT_CREATED, CLIENT_ASSIGNED, DEAL_PROPOSED, DEAL_ACCEPTED, DEAL_COMPLETED, ACCOUNT_TASK_CREATED, TASK_ASSIGNED, CALENDAR_REMINDER, SOCIAL_POST_LIKED, SOCIAL_POST_COMMENTED, DOCUMENT_SHARED, CALENDAR_EVENT_INVITED, SYSTEM.

~40% marked `read: true` with `readAt` timestamps. Each notification links to a relevant `entityId` and `entityType`.

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add notifications — 15 per org covering all major categories"
```

### Task 21: Main function — orchestrate everything

**Files:**
- Modify: `scripts/seed-test-data.ts`

- [ ] **Step 1: Write the main orchestration function**

```typescript
async function main(): Promise<void> {
  const startTime = Date.now();
  const { alphaUser, betaUser, skipPurge } = parseArgs();

  console.log("🏗️  Comprehensive Test Seed");
  console.log("==========================\n");

  // Resolve both orgs
  const alphaOrg = await findOrganizationId(alphaUser);
  const betaOrg = await findOrganizationId(betaUser);
  const alphaUsers = await getOrganizationUsers(alphaOrg.orgId);
  const betaUsers = await getOrganizationUsers(betaOrg.orgId);

  // Get/create encryption DEKs
  const alphaDek = await getOrgDek(alphaOrg.orgId);
  const betaDek = await getOrgDek(betaOrg.orgId);

  const alphaCtx: OrgContext = {
    orgId: alphaOrg.orgId, primaryUserId: alphaOrg.userDbId, primaryClerkId: alphaUser,
    allUsers: [...alphaUsers], dek: alphaDek, prefix: "alpha",
  };
  const betaCtx: OrgContext = {
    orgId: betaOrg.orgId, primaryUserId: betaOrg.userDbId, primaryClerkId: betaUser,
    allUsers: [...betaUsers], dek: betaDek, prefix: "beta",
  };

  // Purge
  if (!skipPurge) {
    await purgeOrgData(alphaCtx.orgId, alphaCtx.allUsers);
    await purgeOrgData(betaCtx.orgId, betaCtx.allUsers);
  }

  // Seed per-org data
  for (const ctx of [alphaCtx, betaCtx]) {
    await createSyntheticUsers(ctx);
    const clientIds = await seedClients(ctx);
    const propertyIds = await seedProperties(ctx);
    const mandateIds = await seedMandates(ctx);
    const dealIds = await seedDeals(ctx, clientIds, propertyIds);
    const docIds = await seedDocuments(ctx, clientIds, propertyIds);
    const eventIds = await seedCalendarEvents(ctx, clientIds, propertyIds);
    await seedTasks(ctx, clientIds, eventIds, docIds);
    await seedPropertyShowings(ctx, clientIds, propertyIds);
    await seedEntityComments(ctx, clientIds, propertyIds, mandateIds);
    await seedSocialFeed(ctx, propertyIds);
    await seedMessaging(ctx);
    await seedJoinTables(ctx, clientIds, propertyIds, mandateIds);
    await seedPropertyImages(ctx, propertyIds);
    await seedNotifications(ctx, clientIds, propertyIds);
  }

  // Cross-org data
  await seedAgentProfiles(alphaCtx, betaCtx);
  await seedAgencyProfiles(alphaCtx, betaCtx);
  await seedAgentConnections(alphaCtx, betaCtx);
  await seedSharedEntities(alphaCtx, betaCtx);
  await seedNetworkAndMatching(alphaCtx, betaCtx);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Seed complete for 2 organizations`);
  console.log(`  Alpha (${alphaCtx.orgId}): 15 clients, 20 properties, 11 mandates, 6 deals, ...`);
  console.log(`  Beta  (${betaCtx.orgId}): 15 clients, 20 properties, 11 mandates, 6 deals, ...`);
  console.log(`  Cross-org: 4 matches, 5 shared entities, 1 partnership, 4 connections`);
  console.log(`  Total time: ${elapsed}s\n`);
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => prismadb.$disconnect());
```

- [ ] **Step 2: Compile and dry-run check**

Run: `npx tsx scripts/seed-test-data.ts 2>&1 | head -3`
Expected: Usage error (no args provided) — confirms the script loads without syntax errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-test-data.ts
git commit -m "feat(seed): add main orchestration function and complete seed-test-data.ts"
```

### Task 22: Add pnpm script alias

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add script alias**

Add to `package.json` scripts section:

```json
"seed:test": "tsx scripts/seed-test-data.ts"
```

Usage: `pnpm seed:test --alpha-user user_xxx --beta-user user_yyy`

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add pnpm seed:test script alias"
```

### Task 23: End-to-end test run

- [ ] **Step 1: Run the seed against real test orgs**

Run: `npx tsx scripts/seed-test-data.ts --alpha-user <your-clerk-id> --beta-user <second-clerk-id>`

Expected: Script completes with summary output showing all entity counts. No errors.

- [ ] **Step 2: Verify in Prisma Studio**

Run: `pnpm prisma studio`

Spot-check:
- Clients table: 30 rows across 2 orgs, encrypted `client_name` values (colon-separated hex)
- Properties table: 40 rows, check matchmaking targets have Kolonaki location
- Mandates: 22 rows, check CANCELLED status exists
- Deals: 12 rows, check ACCEPTED + COMPLETED statuses
- CrossOrgMatch: 4 rows with scores
- Channels: 6 rows, Messages: ~50 rows
- SocialPost: 24 rows with linked comments/likes

- [ ] **Step 3: Verify in the app UI**

Log in as the Alpha user. Check:
- Dashboard shows properties, clients, tasks
- MLS listing page shows 20 properties with correct statuses
- Matchmaking page shows cross-org matches
- Feed shows posts with comments and likes
- Messaging shows channels with messages
- Notifications bell shows unread notifications

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(seed): comprehensive test seed complete — verified with 2 orgs"
```
