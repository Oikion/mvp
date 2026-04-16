# Phase 4 — Activity Feed, Org Document Templates, Calendar Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add polymorphic activity logging (4.1), org-editable TipTap document templates (4.2), and replace implicit CalendarEvent M2M relations with explicit join tables (4.3).

**Architecture:** Three independent sub-initiatives executed in two waves: Wave A (Tasks 1–8) handles schema + permissions + validation — agents can run in parallel with disjoint file ownership; Wave B (Tasks 9–16) adds server actions, SWR hooks, and UI — depends on Wave A artifacts. A pre-flight step addresses the dev DB checksum drift left by Phase 3.

**Tech Stack:** Prisma 6, PostgreSQL (Prisma Postgres), Next.js 16 App Router, React 19, TypeScript strict, TipTap, shadcn/ui, SWR, next-intl (el/en), Clerk v6, Zod, Vitest

---

## Pre-Flight: Dev DB Checksum Reset

> Run this before generating any migration. Phase 3 left a dev DB checksum mismatch.

- [ ] **Step 0a: Reset dev DB**

```bash
pnpm prisma migrate reset
# Confirm when prompted — this wipes and re-applies all migrations in dev only
```

Expected: `✔ All migrations reset successfully.`

- [ ] **Step 0b: Verify schema sync**

```bash
pnpm db:status
```

Expected: `All migrations have been applied.` (no drift warnings)

- [ ] **Step 0c: Commit baseline note**

```bash
git commit --allow-empty -m "chore: dev db re-baselined before phase4 migration"
```

---

## File Structure Map

### New Files

| File | Owner | Purpose |
|------|-------|---------|
| `prisma/migrations/TIMESTAMP_phase4_activities_templates_calendar/migration.sql` | Agent-Schema | Generated migration (hand-edit for M2M data preservation) |
| `lib/validations/activities.ts` | Agent-A | Zod schemas for Activity CRUD |
| `lib/validations/document-templates.ts` | Agent-B | Zod schemas for OrgDocumentTemplate CRUD |
| `actions/activities/index.ts` | Agent-A | Server actions: createActivity, updateActivity, deleteActivity, listActivities |
| `actions/document-templates/index.ts` | Agent-B | Server actions: createTemplate, updateTemplate, deleteTemplate, publishTemplate, cloneTemplate |
| `hooks/swr/useActivities.ts` | Agent-A | SWR hook for activity feed |
| `hooks/swr/useDocumentTemplates.ts` | Agent-B | SWR hook for org templates |
| `app/[locale]/app/(routes)/admin/document-templates/page.tsx` | Agent-B | Template list page (RSC) |
| `app/[locale]/app/(routes)/admin/document-templates/components/TemplateEditorSheet.tsx` | Agent-B | TipTap editor sheet |
| `app/[locale]/app/(routes)/admin/document-templates/components/TemplateDataTable.tsx` | Agent-B | Admin table |
| `components/activity/ActivityFeed.tsx` | Agent-A | Activity timeline component (client) |
| `components/activity/QuickLogActivity.tsx` | Agent-A | Inline activity logger (client) |
| `locales/en/activities.json` | Agent-A | English strings |
| `locales/el/activities.json` | Agent-A | Greek strings |
| `locales/en/document-templates.json` | Agent-B | English strings |
| `locales/el/document-templates.json` | Agent-B | Greek strings |
| `tests/actions/activities.test.ts` | Agent-A | Vitest unit tests |
| `tests/actions/document-templates.test.ts` | Agent-B | Vitest unit tests |

### Modified Files

| File | Owner | Change |
|------|-------|--------|
| `prisma/schema.prisma` | Agent-Schema | +Activity model, +OrgDocumentTemplate model, +CalendarEventContact, +CalendarEventAgent, +4 enums, replace 2 implicit M2M on CalendarEvent |
| `lib/model-encryption.ts` | Agent-Schema | +encryptActivityForOrg, +encryptOrgDocumentTemplateForOrg, extend CALENDAR_EVENT fields |
| `lib/permissions/action-permissions.ts` | Agent-Perms | +ActivityAction (8 actions), extend TemplateAction with template:publish + template:clone |
| `lib/permissions/action-defaults.ts` | Agent-Perms | +8 activity actions to all 4 role objects, +2 template actions to all 4 role objects |
| `lib/permissions/action-service.ts` | Agent-Perms | Register activity + template module paths |
| `i18n.ts` | Agent-A | Register `activities` namespace |
| `app/[locale]/layout.tsx` | Agent-A | Register `activities` namespace (dual-registration requirement) |
| `i18n.ts` | Agent-B | Register `document-templates` namespace (coordinate with Agent-A) |
| `app/[locale]/layout.tsx` | Agent-B | Register `document-templates` namespace (coordinate with Agent-A) |
| `app/[locale]/app/(routes)/crm/contacts/[contactId]/page.tsx` | Agent-C | Add ActivityFeed tab |
| `app/[locale]/app/(routes)/components/CalendarEventDetailSheet.tsx` (or equivalent) | Agent-C | Add RSVP attendee list, link Contacts with roles |
| `lib/prisma.ts` | Agent-Schema | Add `activity` to SOFT_DELETE_MODELS array |

### Agent Parallelization Map — Wave A (no inter-agent dependencies)

```
Wave A — run in parallel:
  Agent-Schema  → prisma/schema.prisma, lib/model-encryption.ts, lib/prisma.ts
  Agent-Perms   → lib/permissions/action-permissions.ts, lib/permissions/action-defaults.ts, lib/permissions/action-service.ts
  Agent-A       → lib/validations/activities.ts, locales/en/activities.json, locales/el/activities.json
  Agent-B       → lib/validations/document-templates.ts, locales/en/document-templates.json, locales/el/document-templates.json
```

After Wave A: run `pnpm prisma generate` + `pnpm db:migrate` + `pnpm tsc --noEmit`.

### Agent Parallelization Map — Wave B (depends on Wave A)

```
Wave B — run in parallel after Wave A:
  Agent-A  → actions/activities/index.ts, hooks/swr/useActivities.ts, components/activity/, tests/actions/activities.test.ts
  Agent-B  → actions/document-templates/index.ts, hooks/swr/useDocumentTemplates.ts, app/.../admin/document-templates/, tests/actions/document-templates.test.ts
  Agent-C  → contact detail page ActivityFeed tab, CalendarEventDetailSheet attendee/RSVP UI
```

---

## Migration SQL Strategy: Implicit M2M → Explicit Join Tables

Prisma implicit M2M for `Contacts Contact[] @relation("EventToContacts")` creates a hidden table `_EventToContacts` with columns `A` (CalendarEvent.id) and `B` (Contact.id).

The migration generator will **DROP** `_EventToContacts` and create `CalendarEventContact`. You must hand-edit the generated migration SQL to preserve data before the DROP.

### Hand-edit template (insert BEFORE the DROP TABLE statement):

```sql
-- Phase 4: Migrate implicit M2M data to explicit join table
-- Run AFTER creating CalendarEventContact, BEFORE dropping _EventToContacts
INSERT INTO "CalendarEventContact" ("id", "eventId", "contactId", "role", "rsvpStatus", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "A" AS "eventId",
  "B" AS "contactId",
  'ATTENDEE'::"EventContactRole",
  'PENDING'::"RsvpStatus",
  NOW(),
  NOW()
FROM "_EventToContacts"
ON CONFLICT DO NOTHING;

-- Phase 4: Migrate implicit M2M data for Requests join table
INSERT INTO "CalendarEventRequest" ("id", "eventId", "requestId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "A" AS "eventId",
  "B" AS "requestId",
  NOW(),
  NOW()
FROM "_EventToRequests"
ON CONFLICT DO NOTHING;
```

> **CRITICAL**: The `_EventToRequests` table may not exist if no events were linked to Requests yet. Wrap the second INSERT in a `DO $$ BEGIN ... EXCEPTION WHEN ... END $$` block or check for table existence first.

### Verification after migration:

```sql
-- Should equal zero after successful migration
SELECT COUNT(*) FROM "_EventToContacts"
WHERE ("A", "B") NOT IN (
  SELECT "eventId", "contactId" FROM "CalendarEventContact"
);
```

---

## Task 1: Schema — Activity Model + 3 New Enums

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ActivityKind enum** (after existing enums, before Activity model)

```prisma
enum ActivityKind {
  EMAIL
  CALL
  MEETING
  NOTE
  TASK
  SHOWING
  DOCUMENT
  OTHER
}
```

- [ ] **Step 2: Add ActivityDirection enum**

```prisma
enum ActivityDirection {
  INBOUND
  OUTBOUND
  INTERNAL
}
```

- [ ] **Step 3: Add ActivityParentType enum**

```prisma
enum ActivityParentType {
  CONTACT
  REQUEST
  DEAL
  PROPERTY
  SHOWING
}
```

- [ ] **Step 4: Add Activity model** (after the three new enums)

```prisma
model Activity {
  id             String              @id @default(cuid())
  organizationId String
  parentType     ActivityParentType
  parentId       String
  kind           ActivityKind
  direction      ActivityDirection   @default(INTERNAL)
  subject        String?
  body           String?
  durationMin    Int?
  outcome        String?
  scheduledAt    DateTime?
  occurredAt     DateTime            @default(now())
  createdByUserId String?
  assignedToUserId String?
  deletedAt      DateTime?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  CreatedBy      Users?              @relation("ActivityCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  AssignedTo     Users?              @relation("ActivityAssignedTo", fields: [assignedToUserId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([organizationId, parentType, parentId])
  @@index([organizationId, kind])
  @@index([createdByUserId])
  @@index([assignedToUserId])
  @@index([deletedAt])
  @@map("activities")
}
```

- [ ] **Step 5: Add back-relations on Users model**

Find the `Users` model and add:
```prisma
  ActivitiesCreated  Activity[]  @relation("ActivityCreatedBy")
  ActivitiesAssigned Activity[]  @relation("ActivityAssignedTo")
```

- [ ] **Step 6: Add Activity to SOFT_DELETE_MODELS in lib/prisma.ts**

Find the `SOFT_DELETE_MODELS` array and add `"activity"`:
```typescript
const SOFT_DELETE_MODELS = [
  // ... existing entries ...
  "activity",
];
```

- [ ] **Step 7: Run prisma validate**

```bash
pnpm exec prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid!`

---

## Task 2: Schema — OrgDocumentTemplate Model + DocTemplateCategory Enum

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add DocTemplateCategory enum**

```prisma
enum DocTemplateCategory {
  LISTING_AGREEMENT
  BUYER_AGREEMENT
  OFFER
  COUNTER_OFFER
  PURCHASE_CONTRACT
  TRANSFER_DEED
  POWER_OF_ATTORNEY
  NDA
  GENERAL
}
```

- [ ] **Step 2: Add OrgDocumentTemplate model**

```prisma
model OrgDocumentTemplate {
  id             String               @id @default(cuid())
  organizationId String
  name           String
  nameEl         String?
  nameEn         String?
  category       DocTemplateCategory  @default(GENERAL)
  body           Json
  placeholders   Json                 @default("[]")
  version        Int                  @default(1)
  isPublished    Boolean              @default(false)
  baseTemplateId String?
  createdByUserId String?
  deletedAt      DateTime?
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  BaseTemplate   DocumentTemplate?    @relation("OrgFromSystemTemplate", fields: [baseTemplateId], references: [id], onDelete: SetNull)
  CreatedBy      Users?               @relation("OrgTemplateCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([organizationId, category])
  @@index([organizationId, isPublished])
  @@index([createdByUserId])
  @@map("org_document_templates")
}
```

- [ ] **Step 3: Add back-relation on DocumentTemplate model**

Find `model DocumentTemplate` and add:
```prisma
  OrgTemplates   OrgDocumentTemplate[]  @relation("OrgFromSystemTemplate")
```

- [ ] **Step 4: Add back-relation on Users model**

```prisma
  OrgTemplatesCreated  OrgDocumentTemplate[]  @relation("OrgTemplateCreatedBy")
```

- [ ] **Step 5: Run prisma validate**

```bash
pnpm exec prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid!`

---

## Task 3: Schema — Calendar Join Tables + New Enums

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add EventContactRole enum**

```prisma
enum EventContactRole {
  ATTENDEE
  BUYER
  SELLER
  WITNESS
  NOTARY
  AGENT
  OTHER
}
```

- [ ] **Step 2: Add RsvpStatus enum**

```prisma
enum RsvpStatus {
  PENDING
  ACCEPTED
  DECLINED
  TENTATIVE
}
```

- [ ] **Step 3: Add CalendarEventContact model**

```prisma
model CalendarEventContact {
  id         String           @id @default(cuid())
  eventId    String
  contactId  String
  role       EventContactRole @default(ATTENDEE)
  rsvpStatus RsvpStatus       @default(PENDING)
  note       String?
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  Event   CalendarEvent @relation("EventContacts", fields: [eventId], references: [id], onDelete: Cascade)
  Contact Contact       @relation("ContactEvents", fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([eventId, contactId])
  @@index([eventId])
  @@index([contactId])
  @@map("calendar_event_contacts")
}
```

- [ ] **Step 4: Add CalendarEventAgent model**

```prisma
model CalendarEventAgent {
  id         String     @id @default(cuid())
  eventId    String
  userId     String
  role       String?
  rsvpStatus RsvpStatus @default(PENDING)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  Event CalendarEvent @relation("EventAgents", fields: [eventId], references: [id], onDelete: Cascade)
  User  Users         @relation("AgentCalendarEvents", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([eventId])
  @@index([userId])
  @@map("calendar_event_agents")
}
```

- [ ] **Step 5: Replace implicit M2M on CalendarEvent**

Find `CalendarEvent` model. Replace:
```prisma
  Contacts  Contact[]  @relation("EventToContacts")
```
with:
```prisma
  EventContacts  CalendarEventContact[]  @relation("EventContacts")
  EventAgents    CalendarEventAgent[]    @relation("EventAgents")
```

Leave `Clients`, `Properties`, `Mandates`, `Requests` implicit for now (Phase 5 scope).

- [ ] **Step 6: Add back-relations on Contact model**

Find `model Contact` and add:
```prisma
  CalendarEventContacts  CalendarEventContact[]  @relation("ContactEvents")
```

- [ ] **Step 7: Add back-relation on Users model**

```prisma
  CalendarEventAgents  CalendarEventAgent[]  @relation("AgentCalendarEvents")
```

- [ ] **Step 8: Run prisma validate**

```bash
pnpm exec prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid!`

---

## Task 4: Generate Migration + Hand-Edit M2M Preservation

**Files:**
- Create: `prisma/migrations/TIMESTAMP_phase4_activities_templates_calendar/migration.sql`

- [ ] **Step 1: Generate migration (dev only)**

```bash
pnpm prisma migrate dev --name phase4_activities_templates_calendar --create-only
```

The `--create-only` flag creates the SQL file without applying it.

- [ ] **Step 2: Open the generated migration file**

Path will be: `prisma/migrations/TIMESTAMP_phase4_activities_templates_calendar/migration.sql`

- [ ] **Step 3: Find the DROP TABLE for _EventToContacts**

Locate the line: `DROP TABLE "_EventToContacts";`

- [ ] **Step 4: Insert data-preservation INSERT above the DROP**

Paste the following immediately BEFORE `DROP TABLE "_EventToContacts";`:

```sql
-- Phase 4: Preserve existing CalendarEvent↔Contact links
INSERT INTO "calendar_event_contacts" ("id", "eventId", "contactId", "role", "rsvpStatus", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "A" AS "eventId",
  "B" AS "contactId",
  'ATTENDEE'::"EventContactRole",
  'PENDING'::"RsvpStatus",
  NOW(),
  NOW()
FROM "_EventToContacts"
ON CONFLICT ("eventId", "contactId") DO NOTHING;
```

- [ ] **Step 5: Check for _EventToRequests table**

```bash
pnpm prisma studio
# Or: psql $DATABASE_URL -c "\dt _EventToRequests"
```

If the table exists, insert a similar preservation INSERT before its DROP statement.

- [ ] **Step 6: Apply the migration**

```bash
pnpm prisma migrate dev
# (Re-run without --create-only to apply)
```

Expected: `✔ The following migration(s) have been applied: ...phase4_activities_templates_calendar`

- [ ] **Step 7: Verify M2M data was preserved**

```bash
pnpm prisma studio
# Navigate to CalendarEventContact — should see rows for any previously linked events
```

- [ ] **Step 8: Regenerate Prisma client**

```bash
pnpm prisma generate
```

- [ ] **Step 9: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 10: Commit schema + migration**

```bash
git add prisma/schema.prisma prisma/migrations/ lib/prisma.ts
git commit -m "feat(schema): phase4 — Activity, OrgDocumentTemplate, CalendarEventContact/Agent models"
```

---

## Task 5: Encryption — New Helpers in lib/model-encryption.ts

**Files:**
- Modify: `lib/model-encryption.ts`

Pattern reference: `encryptRequestForOrg` (lines ~400–440 of the current file).

- [ ] **Step 1: Add Activity encryption constants + function**

After the existing `CALENDAR_EVENT_ENCRYPTED_STRING_FIELDS` block, add:

```typescript
// ─── Activity ────────────────────────────────────────────────────────────────

const ACTIVITY_ENCRYPTED_STRING_FIELDS = [
  "subject",
  "body",
  "outcome",
] as const;

type ActivityStringField = (typeof ACTIVITY_ENCRYPTED_STRING_FIELDS)[number];

type ActivityWithEncryptedFields = Partial<
  Record<ActivityStringField, string | null | undefined>
>;

export async function encryptActivityForOrg<T extends ActivityWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & ActivityWithEncryptedFields;
  for (const field of ACTIVITY_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

export async function decryptActivityForOrg<T extends ActivityWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & ActivityWithEncryptedFields;
  for (const field of ACTIVITY_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}
```

- [ ] **Step 2: Add OrgDocumentTemplate encryption constants + function**

```typescript
// ─── OrgDocumentTemplate ──────────────────────────────────────────────────────

const ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS = [
  "name",
] as const;

type OrgDocumentTemplateStringField =
  (typeof ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS)[number];

type OrgDocumentTemplateWithEncryptedFields = Partial<
  Record<OrgDocumentTemplateStringField, string | null | undefined>
>;

export async function encryptOrgDocumentTemplateForOrg<
  T extends OrgDocumentTemplateWithEncryptedFields
>(data: T, orgId: string): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & OrgDocumentTemplateWithEncryptedFields;
  for (const field of ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

export async function decryptOrgDocumentTemplateForOrg<
  T extends OrgDocumentTemplateWithEncryptedFields
>(data: T, orgId: string): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & OrgDocumentTemplateWithEncryptedFields;
  for (const field of ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}
```

- [ ] **Step 3: Run tsc**

```bash
pnpm tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add lib/model-encryption.ts
git commit -m "feat(encryption): add Activity + OrgDocumentTemplate encrypt/decrypt helpers"
```

---

## Task 6: Permissions — ActivityAction + Extended TemplateAction

**Files:**
- Modify: `lib/permissions/action-permissions.ts`
- Modify: `lib/permissions/action-defaults.ts`
- Modify: `lib/permissions/action-service.ts`

### 6a — action-permissions.ts

- [ ] **Step 1: Add ActivityAction type** after `DealAction`:

```typescript
export type ActivityAction =
  | "activity:read"
  | "activity:create"
  | "activity:update"
  | "activity:delete"
  | "activity:bulk_delete"
  | "activity:export"
  | "activity:reassign"
  | "activity:log_on_behalf";
```

- [ ] **Step 2: Extend TemplateAction** — find the existing `TemplateAction` type and add the two new values:

```typescript
export type TemplateAction =
  | "template:read"
  | "template:use"
  | "template:create"
  | "template:update"
  | "template:delete"
  | "template:publish"
  | "template:clone";
```

- [ ] **Step 3: Add ActivityAction to the ActionPermission union** — find the `ActionPermission` union type and add `| ActivityAction`:

```typescript
export type ActionPermission =
  // ... existing types ...
  | ActivityAction;
```

- [ ] **Step 4: Add activity and template entries to ACTION_MODULES**

```typescript
export const ACTION_MODULES = {
  // ... existing ...
  activity: "Activities",
  // template entry should already exist — verify and extend if needed
};
```

- [ ] **Step 5: Add ACTION_DESCRIPTIONS entries**

```typescript
export const ACTION_DESCRIPTIONS: Record<ActionPermission, string> = {
  // ... existing ...
  "activity:read": "View activity logs",
  "activity:create": "Log new activities",
  "activity:update": "Edit activity records",
  "activity:delete": "Delete activity records",
  "activity:bulk_delete": "Bulk delete activities",
  "activity:export": "Export activity data",
  "activity:reassign": "Reassign activities to another agent",
  "activity:log_on_behalf": "Log activities on behalf of another agent",
  "template:publish": "Publish templates to the organization",
  "template:clone": "Clone templates from system or org library",
};
```

### 6b — action-defaults.ts

> TypeScript will fail until ALL four role objects are updated — the `Record<ActionPermission, PermissionLevel>` type is exhaustive.

- [ ] **Step 6: Update VIEWER_PERMISSIONS**

Add these entries to `VIEWER_PERMISSIONS`:
```typescript
"activity:read": "all",
"activity:create": "none",
"activity:update": "none",
"activity:delete": "none",
"activity:bulk_delete": "none",
"activity:export": "none",
"activity:reassign": "none",
"activity:log_on_behalf": "none",
"template:publish": "none",
"template:clone": "none",
```

- [ ] **Step 7: Update MEMBER_PERMISSIONS**

```typescript
"activity:read": "all",
"activity:create": "all",
"activity:update": "own",
"activity:delete": "own",
"activity:bulk_delete": "none",
"activity:export": "own",
"activity:reassign": "none",
"activity:log_on_behalf": "none",
"template:publish": "none",
"template:clone": "all",
```

- [ ] **Step 8: Update LEAD_PERMISSIONS**

```typescript
"activity:read": "all",
"activity:create": "all",
"activity:update": "all",
"activity:delete": "all",
"activity:bulk_delete": "all",
"activity:export": "all",
"activity:reassign": "all",
"activity:log_on_behalf": "all",
"template:publish": "all",
"template:clone": "all",
```

- [ ] **Step 9: Update OWNER_PERMISSIONS**

```typescript
"activity:read": "all",
"activity:create": "all",
"activity:update": "all",
"activity:delete": "all",
"activity:bulk_delete": "all",
"activity:export": "all",
"activity:reassign": "all",
"activity:log_on_behalf": "all",
"template:publish": "all",
"template:clone": "all",
```

### 6c — action-service.ts

- [ ] **Step 10: Register module path**

Find where modules map to resource paths (look for existing entries like `deal: "deals"`):
```typescript
// Add to the module-to-resource mapping
activity: "activities",
```

- [ ] **Step 11: Run tsc**

```bash
pnpm tsc --noEmit
```

Expected: Zero errors. If TypeScript reports `Property 'activity:read' is missing in type`, you missed one of the four role objects — fix it.

- [ ] **Step 12: Commit**

```bash
git add lib/permissions/action-permissions.ts lib/permissions/action-defaults.ts lib/permissions/action-service.ts
git commit -m "feat(permissions): add ActivityAction (8), extend TemplateAction with publish+clone"
```

---

## Task 7: Validation Schemas

**Files:**
- Create: `lib/validations/activities.ts`
- Create: `lib/validations/document-templates.ts`

### 7a — activities.ts

- [ ] **Step 1: Write failing test**

Create `tests/validations/activities.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createActivitySchema, updateActivitySchema } from "@/lib/validations/activities";

describe("createActivitySchema", () => {
  it("rejects missing required fields", () => {
    const result = createActivitySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid activity", () => {
    const result = createActivitySchema.safeParse({
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "NOTE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (strict)", () => {
    const result = createActivitySchema.safeParse({
      parentType: "CONTACT",
      parentId: "cld123abc",
      kind: "NOTE",
      hackerField: "injected",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run tests/validations/activities.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/validations/activities'`

- [ ] **Step 3: Create lib/validations/activities.ts**

```typescript
import { z } from "zod";

export const createActivitySchema = z
  .object({
    parentType: z.enum([
      "CONTACT",
      "REQUEST",
      "DEAL",
      "PROPERTY",
      "SHOWING",
    ]),
    parentId: z.string().min(1),
    kind: z.enum([
      "EMAIL",
      "CALL",
      "MEETING",
      "NOTE",
      "TASK",
      "SHOWING",
      "DOCUMENT",
      "OTHER",
    ]),
    direction: z
      .enum(["INBOUND", "OUTBOUND", "INTERNAL"])
      .optional()
      .default("INTERNAL"),
    subject: z.string().max(255).optional(),
    body: z.string().max(10000).optional(),
    durationMin: z.number().int().positive().optional(),
    outcome: z.string().max(1000).optional(),
    scheduledAt: z.coerce.date().optional(),
    occurredAt: z.coerce.date().optional(),
    assignedToUserId: z.string().optional(),
  })
  .strict();

export const updateActivitySchema = z
  .object({
    kind: z
      .enum([
        "EMAIL",
        "CALL",
        "MEETING",
        "NOTE",
        "TASK",
        "SHOWING",
        "DOCUMENT",
        "OTHER",
      ])
      .optional(),
    direction: z.enum(["INBOUND", "OUTBOUND", "INTERNAL"]).optional(),
    subject: z.string().max(255).optional(),
    body: z.string().max(10000).optional(),
    durationMin: z.number().int().positive().optional(),
    outcome: z.string().max(1000).optional(),
    scheduledAt: z.coerce.date().optional(),
    occurredAt: z.coerce.date().optional(),
    assignedToUserId: z.string().optional(),
  })
  .strict();

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run tests/validations/activities.test.ts
```

Expected: PASS (3 tests)

### 7b — document-templates.ts

- [ ] **Step 5: Write failing test**

Create `tests/validations/document-templates.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createDocumentTemplateSchema,
  updateDocumentTemplateSchema,
} from "@/lib/validations/document-templates";

describe("createDocumentTemplateSchema", () => {
  it("rejects missing name", () => {
    const result = createDocumentTemplateSchema.safeParse({ body: {} });
    expect(result.success).toBe(false);
  });

  it("accepts valid template", () => {
    const result = createDocumentTemplateSchema.safeParse({
      name: "Listing Agreement",
      category: "LISTING_AGREEMENT",
      body: { type: "doc", content: [] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const result = createDocumentTemplateSchema.safeParse({
      name: "Test",
      category: "NOT_A_CATEGORY",
      body: {},
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm exec vitest run tests/validations/document-templates.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/validations/document-templates'`

- [ ] **Step 7: Create lib/validations/document-templates.ts**

```typescript
import { z } from "zod";

const DOC_CATEGORIES = [
  "LISTING_AGREEMENT",
  "BUYER_AGREEMENT",
  "OFFER",
  "COUNTER_OFFER",
  "PURCHASE_CONTRACT",
  "TRANSFER_DEED",
  "POWER_OF_ATTORNEY",
  "NDA",
  "GENERAL",
] as const;

export const createDocumentTemplateSchema = z
  .object({
    name: z.string().min(1).max(200),
    nameEl: z.string().max(200).optional(),
    nameEn: z.string().max(200).optional(),
    category: z.enum(DOC_CATEGORIES).default("GENERAL"),
    body: z.record(z.unknown()),
    placeholders: z.array(z.unknown()).default([]),
    baseTemplateId: z.string().optional(),
  })
  .strict();

export const updateDocumentTemplateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    nameEl: z.string().max(200).optional(),
    nameEn: z.string().max(200).optional(),
    category: z.enum(DOC_CATEGORIES).optional(),
    body: z.record(z.unknown()).optional(),
    placeholders: z.array(z.unknown()).optional(),
    isPublished: z.boolean().optional(),
  })
  .strict();

export type CreateDocumentTemplateInput = z.infer<
  typeof createDocumentTemplateSchema
>;
export type UpdateDocumentTemplateInput = z.infer<
  typeof updateDocumentTemplateSchema
>;
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pnpm exec vitest run tests/validations/document-templates.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add lib/validations/activities.ts lib/validations/document-templates.ts tests/validations/
git commit -m "feat(validation): Zod schemas for Activity and OrgDocumentTemplate"
```

---

## Task 8: i18n — New Namespaces (Dual Registration)

**Files:**
- Create: `locales/en/activities.json`
- Create: `locales/el/activities.json`
- Create: `locales/en/document-templates.json`
- Create: `locales/el/document-templates.json`
- Modify: `i18n.ts`
- Modify: `app/[locale]/layout.tsx`

> **IMPORTANT**: Registering only in `i18n.ts` causes a silent runtime failure. Both files must be updated together.

- [ ] **Step 1: Create locales/en/activities.json**

```json
{
  "title": "Activity Log",
  "empty": "No activities yet",
  "logActivity": "Log Activity",
  "kinds": {
    "EMAIL": "Email",
    "CALL": "Call",
    "MEETING": "Meeting",
    "NOTE": "Note",
    "TASK": "Task",
    "SHOWING": "Showing",
    "DOCUMENT": "Document",
    "OTHER": "Other"
  },
  "directions": {
    "INBOUND": "Inbound",
    "OUTBOUND": "Outbound",
    "INTERNAL": "Internal"
  },
  "fields": {
    "subject": "Subject",
    "body": "Notes",
    "duration": "Duration (min)",
    "outcome": "Outcome",
    "occurredAt": "Date",
    "assignedTo": "Agent"
  },
  "actions": {
    "create": "Log Activity",
    "edit": "Edit",
    "delete": "Delete",
    "confirmDelete": "Delete this activity?"
  }
}
```

- [ ] **Step 2: Create locales/el/activities.json**

```json
{
  "title": "Ιστορικό Δραστηριοτήτων",
  "empty": "Δεν υπάρχουν δραστηριότητες",
  "logActivity": "Καταγραφή Δραστηριότητας",
  "kinds": {
    "EMAIL": "Email",
    "CALL": "Κλήση",
    "MEETING": "Συνάντηση",
    "NOTE": "Σημείωση",
    "TASK": "Εργασία",
    "SHOWING": "Επίσκεψη Ακινήτου",
    "DOCUMENT": "Έγγραφο",
    "OTHER": "Άλλο"
  },
  "directions": {
    "INBOUND": "Εισερχόμενο",
    "OUTBOUND": "Εξερχόμενο",
    "INTERNAL": "Εσωτερικό"
  },
  "fields": {
    "subject": "Θέμα",
    "body": "Σημειώσεις",
    "duration": "Διάρκεια (λεπτά)",
    "outcome": "Αποτέλεσμα",
    "occurredAt": "Ημερομηνία",
    "assignedTo": "Υπεύθυνος"
  },
  "actions": {
    "create": "Καταγραφή Δραστηριότητας",
    "edit": "Επεξεργασία",
    "delete": "Διαγραφή",
    "confirmDelete": "Διαγραφή αυτής της δραστηριότητας;"
  }
}
```

- [ ] **Step 3: Create locales/en/document-templates.json**

```json
{
  "title": "Document Templates",
  "empty": "No templates yet",
  "createTemplate": "Create Template",
  "categories": {
    "LISTING_AGREEMENT": "Listing Agreement",
    "BUYER_AGREEMENT": "Buyer Agreement",
    "OFFER": "Offer",
    "COUNTER_OFFER": "Counter Offer",
    "PURCHASE_CONTRACT": "Purchase Contract",
    "TRANSFER_DEED": "Transfer Deed",
    "POWER_OF_ATTORNEY": "Power of Attorney",
    "NDA": "NDA",
    "GENERAL": "General"
  },
  "fields": {
    "name": "Template Name",
    "category": "Category",
    "status": "Status",
    "version": "Version",
    "lastModified": "Last Modified"
  },
  "status": {
    "draft": "Draft",
    "published": "Published"
  },
  "actions": {
    "publish": "Publish",
    "unpublish": "Unpublish",
    "clone": "Clone",
    "edit": "Edit",
    "delete": "Delete",
    "confirmDelete": "Delete this template?"
  }
}
```

- [ ] **Step 4: Create locales/el/document-templates.json**

```json
{
  "title": "Πρότυπα Εγγράφων",
  "empty": "Δεν υπάρχουν πρότυπα",
  "createTemplate": "Δημιουργία Προτύπου",
  "categories": {
    "LISTING_AGREEMENT": "Συμφωνητικό Ανάθεσης",
    "BUYER_AGREEMENT": "Συμφωνητικό Αγοραστή",
    "OFFER": "Προσφορά",
    "COUNTER_OFFER": "Αντιπροσφορά",
    "PURCHASE_CONTRACT": "Συμφωνητικό Αγοράς",
    "TRANSFER_DEED": "Συμβόλαιο Μεταβίβασης",
    "POWER_OF_ATTORNEY": "Πληρεξούσιο",
    "NDA": "Συμφωνητικό Εμπιστευτικότητας",
    "GENERAL": "Γενικό"
  },
  "fields": {
    "name": "Όνομα Προτύπου",
    "category": "Κατηγορία",
    "status": "Κατάσταση",
    "version": "Έκδοση",
    "lastModified": "Τελευταία Τροποποίηση"
  },
  "status": {
    "draft": "Πρόχειρο",
    "published": "Δημοσιευμένο"
  },
  "actions": {
    "publish": "Δημοσίευση",
    "unpublish": "Αποσύρσιμο",
    "clone": "Αντιγραφή",
    "edit": "Επεξεργασία",
    "delete": "Διαγραφή",
    "confirmDelete": "Διαγραφή αυτού του προτύπου;"
  }
}
```

- [ ] **Step 5: Register in i18n.ts**

Find the messages loading object (looks like `{ common: ..., crm: ..., }`) and add:
```typescript
activities: (await import(`../../locales/${locale}/activities.json`)).default,
"document-templates": (await import(`../../locales/${locale}/document-templates.json`)).default,
```

- [ ] **Step 6: Register in app/[locale]/layout.tsx**

Find the `getMessages` call or the namespace array and add both namespace names:
```typescript
// Look for something like:
// messages={await getMessages()} or loadMessages([...namespaces])
// Add: "activities", "document-templates" to whatever array is present
```

- [ ] **Step 7: Verify i18n loads (smoke test)**

```bash
pnpm dev:http
# Navigate to any page — no "MISSING_MESSAGE" console errors
```

- [ ] **Step 8: Commit**

```bash
git add locales/ i18n.ts app/
git commit -m "feat(i18n): add activities and document-templates namespaces (el + en)"
```

---

## Task 9: Server Actions — Activities

**Files:**
- Create: `actions/activities/index.ts`

Pattern reference: `actions/deals/index.ts` (11 actions, permission guards, soft delete, serializePrisma).

- [ ] **Step 1: Write failing test**

Create `tests/actions/activities.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/get-current-user", () => ({
  getCurrentOrgId: vi.fn().mockResolvedValue("org_test"),
  getCurrentUserId: vi.fn().mockResolvedValue("user_test"),
}));

vi.mock("@/lib/permissions/action-guards", () => ({
  requireAction: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/model-encryption", () => ({
  encryptActivityForOrg: vi.fn().mockImplementation(async (data) => data),
  decryptActivityForOrg: vi.fn().mockImplementation(async (data) => data),
}));

import { createActivity } from "@/actions/activities";
import { prismadb } from "@/lib/prisma";

describe("createActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates activity with organizationId", async () => {
    vi.mocked(prismadb.activity.create).mockResolvedValue({
      id: "act_1",
      organizationId: "org_test",
      parentType: "CONTACT",
      parentId: "cnt_1",
      kind: "NOTE",
      direction: "INTERNAL",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await createActivity({
      parentType: "CONTACT",
      parentId: "cnt_1",
      kind: "NOTE",
    });

    expect(result.success).toBe(true);
    expect(prismadb.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org_test" }),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run tests/actions/activities.test.ts
```

Expected: FAIL — `Cannot find module '@/actions/activities'`

- [ ] **Step 3: Create actions/activities/index.ts**

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import {
  requireAction,
  requireActionOnEntity,
} from "@/lib/permissions/action-guards";
import {
  encryptActivityForOrg,
  decryptActivityForOrg,
} from "@/lib/model-encryption";
import {
  createActivitySchema,
  updateActivitySchema,
} from "@/lib/validations/activities";
import { serializePrisma } from "@/lib/utils";

export async function createActivity(input: unknown) {
  const guard = await requireAction("activity:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const createdByUserId = await getCurrentUserId();

  const parsed = createActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input", details: parsed.error.flatten() };
  }

  const encrypted = await encryptActivityForOrg(parsed.data, organizationId);

  const activity = await prismadb.activity.create({
    data: {
      ...encrypted,
      organizationId,
      createdByUserId,
    },
  });

  return { success: true, data: serializePrisma(activity) };
}

export async function updateActivity(id: string, input: unknown) {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.activity.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) return { success: false, error: "Not found" };

  const guard = await requireActionOnEntity(
    "activity:update",
    "activity",
    id,
    existing.createdByUserId ?? undefined
  );
  if (guard) return guard;

  const parsed = updateActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input", details: parsed.error.flatten() };
  }

  const encrypted = await encryptActivityForOrg(parsed.data, organizationId);

  const updated = await prismadb.activity.update({
    where: { id },
    data: encrypted,
  });

  return { success: true, data: serializePrisma(updated) };
}

export async function deleteActivity(id: string) {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.activity.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) return { success: false, error: "Not found" };

  const guard = await requireActionOnEntity(
    "activity:delete",
    "activity",
    id,
    existing.createdByUserId ?? undefined
  );
  if (guard) return guard;

  await prismadb.activity.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

export async function listActivities(
  parentType: string,
  parentId: string
) {
  const guard = await requireAction("activity:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const activities = await prismadb.activity.findMany({
    where: {
      organizationId,
      parentType: parentType as never,
      parentId,
      deletedAt: null,
    },
    orderBy: { occurredAt: "desc" },
    include: {
      CreatedBy: { select: { id: true, firstName: true, lastName: true, imageUrl: true } },
      AssignedTo: { select: { id: true, firstName: true, lastName: true, imageUrl: true } },
    },
  });

  const decrypted = await Promise.all(
    activities.map((a) => decryptActivityForOrg(a, organizationId))
  );

  return { success: true, data: serializePrisma(decrypted) };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run tests/actions/activities.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add actions/activities/ tests/actions/activities.test.ts
git commit -m "feat(actions): Activity CRUD — create, update, delete, list with encryption + permissions"
```

---

## Task 10: Server Actions — OrgDocumentTemplate

**Files:**
- Create: `actions/document-templates/index.ts`

- [ ] **Step 1: Write failing test**

Create `tests/actions/document-templates.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    orgDocumentTemplate: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/get-current-user", () => ({
  getCurrentOrgId: vi.fn().mockResolvedValue("org_test"),
  getCurrentUserId: vi.fn().mockResolvedValue("user_test"),
}));

vi.mock("@/lib/permissions/action-guards", () => ({
  requireAction: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/model-encryption", () => ({
  encryptOrgDocumentTemplateForOrg: vi.fn().mockImplementation(async (d) => d),
  decryptOrgDocumentTemplateForOrg: vi.fn().mockImplementation(async (d) => d),
}));

import { createDocumentTemplate } from "@/actions/document-templates";
import { prismadb } from "@/lib/prisma";

describe("createDocumentTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates template with organizationId", async () => {
    vi.mocked(prismadb.orgDocumentTemplate.create).mockResolvedValue({
      id: "tpl_1",
      organizationId: "org_test",
      name: "Test Template",
      category: "GENERAL",
      body: {},
      version: 1,
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await createDocumentTemplate({
      name: "Test Template",
      category: "GENERAL",
      body: { type: "doc", content: [] },
    });

    expect(result.success).toBe(true);
    expect(prismadb.orgDocumentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org_test" }),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run tests/actions/document-templates.test.ts
```

Expected: FAIL — `Cannot find module '@/actions/document-templates'`

- [ ] **Step 3: Create actions/document-templates/index.ts**

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import {
  requireAction,
  requireActionOnEntity,
} from "@/lib/permissions/action-guards";
import {
  encryptOrgDocumentTemplateForOrg,
  decryptOrgDocumentTemplateForOrg,
} from "@/lib/model-encryption";
import {
  createDocumentTemplateSchema,
  updateDocumentTemplateSchema,
} from "@/lib/validations/document-templates";
import { serializePrisma } from "@/lib/utils";

export async function createDocumentTemplate(input: unknown) {
  const guard = await requireAction("template:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const createdByUserId = await getCurrentUserId();

  const parsed = createDocumentTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input", details: parsed.error.flatten() };
  }

  const encrypted = await encryptOrgDocumentTemplateForOrg(
    parsed.data,
    organizationId
  );

  const template = await prismadb.orgDocumentTemplate.create({
    data: {
      ...encrypted,
      organizationId,
      createdByUserId,
    },
  });

  return { success: true, data: serializePrisma(template) };
}

export async function updateDocumentTemplate(id: string, input: unknown) {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.orgDocumentTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) return { success: false, error: "Not found" };

  const guard = await requireActionOnEntity(
    "template:update",
    "orgDocumentTemplate",
    id,
    existing.createdByUserId ?? undefined
  );
  if (guard) return guard;

  const parsed = updateDocumentTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input", details: parsed.error.flatten() };
  }

  const { isPublished, ...rest } = parsed.data;

  const encrypted = await encryptOrgDocumentTemplateForOrg(rest, organizationId);

  const updated = await prismadb.orgDocumentTemplate.update({
    where: { id },
    data: {
      ...encrypted,
      ...(isPublished !== undefined ? { isPublished } : {}),
      version: { increment: 1 },
    },
  });

  return { success: true, data: serializePrisma(updated) };
}

export async function publishDocumentTemplate(id: string) {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.orgDocumentTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) return { success: false, error: "Not found" };

  const guard = await requireAction("template:publish");
  if (guard) return guard;

  const updated = await prismadb.orgDocumentTemplate.update({
    where: { id },
    data: { isPublished: true },
  });

  return { success: true, data: serializePrisma(updated) };
}

export async function cloneDocumentTemplate(id: string) {
  const guard = await requireAction("template:clone");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const createdByUserId = await getCurrentUserId();

  const source = await prismadb.orgDocumentTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!source) return { success: false, error: "Not found" };

  const decrypted = await decryptOrgDocumentTemplateForOrg(source, organizationId);

  const cloned = await prismadb.orgDocumentTemplate.create({
    data: {
      organizationId,
      createdByUserId,
      name: `${decrypted.name} (Copy)`,
      nameEl: decrypted.nameEl ?? undefined,
      nameEn: decrypted.nameEn ?? undefined,
      category: source.category,
      body: source.body as object,
      placeholders: source.placeholders as object,
      isPublished: false,
      version: 1,
    },
  });

  return { success: true, data: serializePrisma(cloned) };
}

export async function deleteDocumentTemplate(id: string) {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.orgDocumentTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) return { success: false, error: "Not found" };

  const guard = await requireActionOnEntity(
    "template:delete",
    "orgDocumentTemplate",
    id,
    existing.createdByUserId ?? undefined
  );
  if (guard) return guard;

  await prismadb.orgDocumentTemplate.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

export async function listDocumentTemplates() {
  const guard = await requireAction("template:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const templates = await prismadb.orgDocumentTemplate.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      nameEl: true,
      nameEn: true,
      category: true,
      isPublished: true,
      version: true,
      updatedAt: true,
      createdByUserId: true,
    },
  });

  const decrypted = await Promise.all(
    templates.map((t) => decryptOrgDocumentTemplateForOrg(t, organizationId))
  );

  return { success: true, data: serializePrisma(decrypted) };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run tests/actions/document-templates.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add actions/document-templates/ tests/actions/document-templates.test.ts
git commit -m "feat(actions): OrgDocumentTemplate CRUD — create, update, publish, clone, delete, list"
```

---

## Task 11: SWR Hooks

**Files:**
- Create: `hooks/swr/useActivities.ts`
- Create: `hooks/swr/useDocumentTemplates.ts`

Pattern reference: `hooks/swr/useDeals.ts` (SWR fetcher with API route, typed response).

- [ ] **Step 1: Create hooks/swr/useActivities.ts**

```typescript
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface UseActivitiesOptions {
  parentType: string;
  parentId: string;
}

export function useActivities({ parentType, parentId }: UseActivitiesOptions) {
  const key =
    parentId
      ? `/api/activities?parentType=${parentType}&parentId=${parentId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);

  return {
    activities: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}
```

- [ ] **Step 2: Create hooks/swr/useDocumentTemplates.ts**

```typescript
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useDocumentTemplates() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/document-templates",
    fetcher
  );

  return {
    templates: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/swr/useActivities.ts hooks/swr/useDocumentTemplates.ts
git commit -m "feat(hooks): SWR hooks for activities and document templates"
```

> **NOTE**: The API routes `/api/activities` and `/api/document-templates` are required for these SWR hooks but are out of scope for the MVP phase. For now, server actions provide all data access. Replace `fetcher` with direct server action calls in RSC pages or use `useTransition` + server actions in client components.

---

## Task 12: API Routes — Activities + Document Templates

**Files:**
- Create: `app/api/activities/route.ts`
- Create: `app/api/document-templates/route.ts`

- [ ] **Step 1: Create app/api/activities/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listActivities } from "@/actions/activities";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parentType = searchParams.get("parentType");
  const parentId = searchParams.get("parentId");

  if (!parentType || !parentId) {
    return NextResponse.json(
      { error: "parentType and parentId are required" },
      { status: 400 }
    );
  }

  const result = await listActivities(parentType, parentId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Create app/api/document-templates/route.ts**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listDocumentTemplates } from "@/actions/document-templates";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await listDocumentTemplates();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json(result);
}
```

- [ ] **Step 3: Run tsc**

```bash
pnpm tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/activities/ app/api/document-templates/
git commit -m "feat(api): GET routes for activities and document-templates"
```

---

## Task 13: UI — ActivityFeed + QuickLogActivity Components

**Files:**
- Create: `components/activity/ActivityFeed.tsx`
- Create: `components/activity/QuickLogActivity.tsx`

- [ ] **Step 1: Create components/activity/ActivityFeed.tsx**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useActivities } from "@/hooks/swr/useActivities";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  parentType: string;
  parentId: string;
}

export function ActivityFeed({ parentType, parentId }: ActivityFeedProps) {
  const t = useTranslations("activities");
  const { activities, isLoading } = useActivities({ parentType, parentId });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        {t("empty")}
      </p>
    );
  }

  return (
    <ol className="relative border-l border-border space-y-6 pl-6">
      {activities.map((activity: {
        id: string;
        kind: string;
        subject?: string | null;
        body?: string | null;
        occurredAt: string;
        CreatedBy?: { firstName?: string | null; lastName?: string | null } | null;
      }) => (
        <li key={activity.id} className="relative">
          <span
            className="absolute -left-[0.8125rem] flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border"
            aria-hidden
          />
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {t(`kinds.${activity.kind}`)}
                {activity.subject ? ` — ${activity.subject}` : ""}
              </span>
              <time
                dateTime={activity.occurredAt}
                className="shrink-0 text-xs text-muted-foreground"
              >
                {formatDistanceToNow(new Date(activity.occurredAt), {
                  addSuffix: true,
                })}
              </time>
            </div>
            {activity.body && (
              <p className="mt-1 text-muted-foreground line-clamp-2">
                {activity.body}
              </p>
            )}
            {activity.CreatedBy && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[activity.CreatedBy.firstName, activity.CreatedBy.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Create components/activity/QuickLogActivity.tsx**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createActivity } from "@/actions/activities";

const ACTIVITY_KINDS = [
  "EMAIL",
  "CALL",
  "MEETING",
  "NOTE",
  "TASK",
  "SHOWING",
  "DOCUMENT",
  "OTHER",
] as const;

interface QuickLogActivityProps {
  parentType: string;
  parentId: string;
  onSuccess?: () => void;
}

export function QuickLogActivity({
  parentType,
  parentId,
  onSuccess,
}: QuickLogActivityProps) {
  const t = useTranslations("activities");
  const [kind, setKind] = useState<string>("NOTE");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await createActivity({ parentType, parentId, kind, body });
      if (result.success) {
        setBody("");
        onSuccess?.();
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {t(`kinds.${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("fields.body")}
        rows={3}
        className="resize-none"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!body.trim() || isPending}
        >
          {t("actions.create")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/activity/
git commit -m "feat(ui): ActivityFeed timeline and QuickLogActivity inline logger"
```

---

## Task 14: UI — Document Template Admin Page

**Files:**
- Create: `app/[locale]/app/(routes)/admin/document-templates/page.tsx`
- Create: `app/[locale]/app/(routes)/admin/document-templates/components/TemplateDataTable.tsx`
- Create: `app/[locale]/app/(routes)/admin/document-templates/components/TemplateEditorSheet.tsx`

- [ ] **Step 1: Create page.tsx (RSC)**

```tsx
import { getTranslations } from "next-intl/server";
import { TemplateDataTable } from "./components/TemplateDataTable";
import { listDocumentTemplates } from "@/actions/document-templates";

export default async function DocumentTemplatesPage() {
  const t = await getTranslations("document-templates");
  const result = await listDocumentTemplates();
  const templates = result.success ? result.data : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
      </div>
      <TemplateDataTable initialTemplates={templates} />
    </div>
  );
}
```

- [ ] **Step 2: Create TemplateDataTable.tsx**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TemplateEditorSheet } from "./TemplateEditorSheet";
import { deleteDocumentTemplate, publishDocumentTemplate } from "@/actions/document-templates";
import { useDocumentTemplates } from "@/hooks/swr/useDocumentTemplates";

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  isPublished: boolean;
  version: number;
  updatedAt: string;
}

interface TemplateDataTableProps {
  initialTemplates: TemplateRow[];
}

export function TemplateDataTable({ initialTemplates }: TemplateDataTableProps) {
  const t = useTranslations("document-templates");
  const { templates, mutate } = useDocumentTemplates();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = templates.length > 0 ? templates : initialTemplates;

  return (
    <>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setSelectedId(null);
            setEditorOpen(true);
          }}
        >
          {t("createTemplate")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("fields.name")}</TableHead>
            <TableHead>{t("fields.category")}</TableHead>
            <TableHead>{t("fields.status")}</TableHead>
            <TableHead>{t("fields.version")}</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tpl) => (
            <TableRow key={tpl.id}>
              <TableCell className="font-medium">{tpl.name}</TableCell>
              <TableCell>
                {t(`categories.${tpl.category}`)}
              </TableCell>
              <TableCell>
                <Badge variant={tpl.isPublished ? "default" : "secondary"}>
                  {tpl.isPublished ? t("status.published") : t("status.draft")}
                </Badge>
              </TableCell>
              <TableCell>v{tpl.version}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedId(tpl.id);
                      setEditorOpen(true);
                    }}
                  >
                    {t("actions.edit")}
                  </Button>
                  {!tpl.isPublished && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await publishDocumentTemplate(tpl.id);
                        mutate();
                      }}
                    >
                      {t("actions.publish")}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TemplateEditorSheet
        open={editorOpen}
        templateId={selectedId}
        onClose={() => {
          setEditorOpen(false);
          setSelectedId(null);
          mutate();
        }}
      />
    </>
  );
}
```

- [ ] **Step 3: Create TemplateEditorSheet.tsx** (TipTap editor)

```tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDocumentTemplate,
  updateDocumentTemplate,
} from "@/actions/document-templates";

const DOC_CATEGORIES = [
  "LISTING_AGREEMENT",
  "BUYER_AGREEMENT",
  "OFFER",
  "COUNTER_OFFER",
  "PURCHASE_CONTRACT",
  "TRANSFER_DEED",
  "POWER_OF_ATTORNEY",
  "NDA",
  "GENERAL",
] as const;

interface TemplateEditorSheetProps {
  open: boolean;
  templateId: string | null;
  onClose: () => void;
}

export function TemplateEditorSheet({
  open,
  templateId,
  onClose,
}: TemplateEditorSheetProps) {
  const t = useTranslations("document-templates");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("GENERAL");
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class:
          "min-h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      },
    },
  });

  useEffect(() => {
    if (!open) {
      setName("");
      setCategory("GENERAL");
      editor?.commands.clearContent();
    }
  }, [open, editor]);

  const handleSave = async () => {
    if (!name.trim() || !editor) return;
    setIsSaving(true);

    const body = editor.getJSON();
    const input = { name, category, body };

    const result = templateId
      ? await updateDocumentTemplate(templateId, input)
      : await createDocumentTemplate(input);

    setIsSaving(false);
    if (result.success) onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {templateId ? t("actions.edit") : t("createTemplate")}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">{t("fields.name")}</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("fields.name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-category">{t("fields.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="tpl-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`categories.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Body</Label>
            <EditorContent editor={editor} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Run tsc**

```bash
pnpm tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat(ui): document templates admin page with TipTap editor sheet"
```

---

## Task 15: UI — ActivityFeed Tab on Contact Detail Page

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/contacts/[contactId]/page.tsx` (or wherever the contact detail view lives — verify path with `ls app/[locale]/app/\(routes\)/crm/contacts/`)

- [ ] **Step 1: Locate the contact detail file**

```bash
ls "app/[locale]/app/(routes)/crm/contacts/"
```

Identify the detail page or `ContactView` component.

- [ ] **Step 2: Add ActivityFeed import**

```typescript
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { QuickLogActivity } from "@/components/activity/QuickLogActivity";
```

- [ ] **Step 3: Add Activity tab**

Find the `<Tabs>` component (usually `defaultValue="overview"`) and add:
```tsx
<TabsTrigger value="activity">
  {t("activity")} {/* add "activity": "Activity" to crm.json or contacts.json */}
</TabsTrigger>
```

In the tab content:
```tsx
<TabsContent value="activity" className="space-y-4">
  <QuickLogActivity
    parentType="CONTACT"
    parentId={contact.id}
    onSuccess={() => {/* SWR mutate handled inside component */}}
  />
  <ActivityFeed parentType="CONTACT" parentId={contact.id} />
</TabsContent>
```

- [ ] **Step 4: Add "activity" key to contacts/crm i18n**

Add to `locales/en/crm.json` (or whichever namespace the contacts page uses):
```json
"activity": "Activity"
```

Add to `locales/el/crm.json`:
```json
"activity": "Δραστηριότητα"
```

- [ ] **Step 5: Run tsc**

```bash
pnpm tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 6: Commit**

```bash
git add app/ locales/
git commit -m "feat(ui): ActivityFeed + QuickLogActivity tab on Contact detail page"
```

---

## Task 16: UI — CalendarEventDetailSheet RSVP Attendee List

**Files:**
- Modify: CalendarEventDetailSheet (find path: `grep -r "CalendarEventDetailSheet" app/ --include="*.tsx" -l`)

- [ ] **Step 1: Locate the calendar detail sheet**

```bash
grep -r "CalendarEventDetailSheet\|CalendarEventDetail" app/ --include="*.tsx" -l
```

- [ ] **Step 2: Add RSVP attendee display section**

In the sheet body, after existing fields, add:

```tsx
{/* Attendees with RSVP status */}
{event.EventContacts && event.EventContacts.length > 0 && (
  <section>
    <h3 className="text-sm font-medium mb-2">
      {t("attendees")} {/* add "attendees": "Attendees" to calendar namespace */}
    </h3>
    <ul className="space-y-1.5">
      {event.EventContacts.map((ec: {
        contactId: string;
        role: string;
        rsvpStatus: string;
        Contact: { id: string; client_name?: string | null };
      }) => (
        <li key={ec.contactId} className="flex items-center justify-between text-sm">
          <span>{ec.Contact?.client_name ?? ec.contactId}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t(`roles.${ec.role}`)}
            </span>
            <span
              className="text-xs font-medium"
              data-status={ec.rsvpStatus} // use data attribute for styling, not color alone (WCAG 1.4.1)
            >
              {t(`rsvp.${ec.rsvpStatus}`)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  </section>
)}
```

- [ ] **Step 3: Add i18n keys to calendar namespace**

In `locales/en/calendar.json` (or equivalent):
```json
"attendees": "Attendees",
"roles": {
  "ATTENDEE": "Attendee",
  "BUYER": "Buyer",
  "SELLER": "Seller",
  "WITNESS": "Witness",
  "NOTARY": "Notary",
  "AGENT": "Agent",
  "OTHER": "Other"
},
"rsvp": {
  "PENDING": "Pending",
  "ACCEPTED": "Accepted",
  "DECLINED": "Declined",
  "TENTATIVE": "Tentative"
}
```

In `locales/el/calendar.json`:
```json
"attendees": "Συμμετέχοντες",
"roles": {
  "ATTENDEE": "Συμμετέχων",
  "BUYER": "Αγοραστής",
  "SELLER": "Πωλητής",
  "WITNESS": "Μάρτυρας",
  "NOTARY": "Συμβολαιογράφος",
  "AGENT": "Μεσίτης",
  "OTHER": "Άλλο"
},
"rsvp": {
  "PENDING": "Εκκρεμεί",
  "ACCEPTED": "Αποδεκτό",
  "DECLINED": "Απορρίφθηκε",
  "TENTATIVE": "Πιθανό"
}
```

- [ ] **Step 4: Update CalendarEvent fetch query to include EventContacts**

In the action or API that fetches the single CalendarEvent, add the include:
```typescript
include: {
  EventContacts: {
    include: {
      Contact: { select: { id: true, client_name: true } }
    }
  },
  EventAgents: {
    include: {
      User: { select: { id: true, firstName: true, lastName: true, imageUrl: true } }
    }
  },
}
```

- [ ] **Step 5: Run tsc**

```bash
pnpm tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 6: Commit**

```bash
git add app/ locales/
git commit -m "feat(ui): RSVP attendee list on CalendarEventDetailSheet with roles and status"
```

---

## Review Gates

### After Wave A (Tasks 1–8):

- [ ] `pnpm prisma validate` passes
- [ ] `pnpm db:migrate` applies successfully
- [ ] Migration data check: `SELECT COUNT(*) FROM "_EventToContacts"` after migration returns 0 (all rows migrated) or table is gone
- [ ] `pnpm tsc --noEmit` zero errors
- [ ] `pnpm exec vitest run tests/validations/` all pass
- [ ] `ActivityType` enum on `AgentHours` is unchanged — verify: `grep -n "ActivityType" prisma/schema.prisma` shows only `AgentHours` field and the original `ActivityType` enum
- [ ] No `TemplateAction` regression — grep for existing template permission tests

### After Wave B (Tasks 9–16):

- [ ] `pnpm exec vitest run tests/actions/` all pass
- [ ] `pnpm build` no warnings on activities or document-templates pages
- [ ] ActivityFeed renders on Contact detail page in browser
- [ ] Document templates page loads in browser at `/app/admin/document-templates`
- [ ] CalendarEventDetailSheet shows attendee section when EventContacts exist
- [ ] RSVP status uses `data-status` attribute (not color-only) — check WCAG 1.4.1
- [ ] Greek strings don't overflow in ActivityFeed (Greek ~30% longer than English — test with `el` locale)

---

## Agent Orchestration Notes

### Disjoint file ownership (Wave A):

```
Agent-Schema   OWNS: prisma/schema.prisma, lib/model-encryption.ts, lib/prisma.ts
Agent-Perms    OWNS: lib/permissions/action-permissions.ts, lib/permissions/action-defaults.ts, lib/permissions/action-service.ts
Agent-A        OWNS: lib/validations/activities.ts, locales/*/activities.json
Agent-B        OWNS: lib/validations/document-templates.ts, locales/*/document-templates.json
```

**i18n dual-registration conflict**: Both Agent-A and Agent-B need to modify `i18n.ts` and `app/[locale]/layout.tsx`. Either:
1. Serialize these two edits (Agent-A first, Agent-B second), or
2. Have a single "i18n coordinator" agent handle both registrations after Wave A artifacts are ready.

### Verification mandate:
After each agent reports completion, **grep to verify** rather than trusting the report:

```bash
# Verify Agent-Schema
grep -n "ActivityKind\|ActivityParentType\|ActivityDirection\|CalendarEventContact\|OrgDocumentTemplate" prisma/schema.prisma

# Verify Agent-Perms — must show 8 entries
grep -n "activity:" lib/permissions/action-permissions.ts | wc -l

# Verify Agent-A — check dual registration
grep -n "activities" i18n.ts app/\[locale\]/layout.tsx

# Verify Agent-B — check dual registration
grep -n "document-templates" i18n.ts app/\[locale\]/layout.tsx
```

### Phase 3 lesson applied:
Agent-B must grep for `TemplateAction` in `action-permissions.ts` before writing — it already exists with 5 values. Adding `template:publish` and `template:clone` means extending the union, not replacing it.
