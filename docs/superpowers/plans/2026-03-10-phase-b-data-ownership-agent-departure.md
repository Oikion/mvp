# Phase B: Data Ownership Toggle & Agent Departure Migration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-org data ownership policy (AGENCY vs AGENT mode), agent consent flows, and departure-time data migration so agents' assigned entities move to their personal workspace when leaving an AGENT-mode org.

**Architecture:** Extends Phase A's unified `handleUserDeparture()` with a data ownership branch. Org admins set the policy at creation; agents consent at invitation acceptance. On departure, each entity is evaluated against the policy era it was created in. AGENT mode triggers migration to the agent's personal workspace; AGENCY mode uses Phase A's SetNull behavior.

**Tech Stack:** Next.js 16, Prisma ORM (PostgreSQL), Clerk (auth/orgs), next-intl (i18n), shadcn/ui, React 19

**Depends on:** Phase A must be fully deployed and stable before starting Phase B.

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `prisma/migrations/YYYYMMDD_phase_b_data_ownership/migration.sql` | Schema migration (enum, models, fields) |
| `lib/data-ownership/index.ts` | Core data ownership service — policy era lookup, migration decision logic |
| `lib/data-ownership/entity-migrator.ts` | Entity migration — copy entities to personal workspace, handle encryption, images, child records |
| `lib/data-ownership/types.ts` | TypeScript types for policy history, migration results, JSON field shapes |
| `actions/data-ownership/set-ownership-mode.ts` | Server action: set org's data ownership mode |
| `actions/data-ownership/change-ownership-mode.ts` | Server action: change policy with version increment |
| `actions/data-ownership/record-consent.ts` | Server action: record agent consent |
| `actions/data-ownership/get-departure-logs.ts` | Server action: fetch departure logs for org |
| `components/data-ownership/DataOwnershipSelector.tsx` | Two-card picker component (AGENCY/AGENT) |
| `components/data-ownership/DataPolicyConsentModal.tsx` | Consent modal (invitation + re-consent variants) |
| `components/data-ownership/DataOwnershipBanner.tsx` | Persistent banner for existing orgs |
| `app/[locale]/app/(routes)/invitation/[invitationId]/page.tsx` | Invitation acceptance page with consent |
| `app/[locale]/app/(routes)/settings/departures/page.tsx` | Departure log list page |
| `app/[locale]/app/(routes)/settings/departures/[departureId]/page.tsx` | Single departure report page |
| `locales/en/dataOwnership.json` | English translations |
| `locales/el/dataOwnership.json` | Greek translations |
| `emails/notifications/AgentDepartureReport.tsx` | Departure report email template |
| `tests/lib/data-ownership/policy-era.test.ts` | Unit tests: policy era lookup |
| `tests/lib/data-ownership/entity-migrator.test.ts` | Unit tests: entity migration logic |
| `tests/lib/data-ownership/departure-integration.test.ts` | Integration tests: full departure flow |

### Modified Files

| File | Changes |
|---|---|
| `prisma/schema.prisma` | Add `DataOwnershipMode` enum, `DepartureReason` enum, `OrgMemberConsent` model, `DepartureLog` model, extend `OrganizationSettings`, add `cancellationReason` to `Deal` |
| `lib/user-departure/index.ts` | Add data ownership branch to `handleUserDeparture()` |
| `proxy.ts` | Add consent enforcement check for authenticated routes |
| `app/[locale]/app/(onboarding)/onboard/components/OnboardingSteps.tsx` | Add data ownership step after org creation |
| `app/[locale]/app/(routes)/settings/components/OrgSettingsPage.tsx` | Add "Data Ownership" section |
| `config/navigation.tsx` | Add departures route to settings nav |
| `locales/en/common.json` | Add `deletedUser` related strings if not from Phase A |
| `locales/el/common.json` | Same |

---

## Chunk 1: Schema Migration & Core Types

### Task 1: Prisma Schema — Enums and New Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add DataOwnershipMode enum**

Add after the existing enums section (near line ~1210):

```prisma
enum DataOwnershipMode {
  AGENCY
  AGENT
}
```

- [ ] **Step 2: Add DepartureReason enum**

Add right after `DataOwnershipMode`:

```prisma
enum DepartureReason {
  LEFT_ORG
  REMOVED_FROM_ORG
  ACCOUNT_DELETED
  ADMIN_FORCE_DELETED
}
```

- [ ] **Step 3: Extend OrganizationSettings model**

Add these fields to the `OrganizationSettings` model (after the existing `createdBy` field, around line 2834):

```prisma
  // Data Ownership Policy
  dataOwnershipMode      DataOwnershipMode @default(AGENCY)
  dataOwnershipSetAt     DateTime?
  dataOwnershipChangedAt DateTime?
  dataOwnershipChangedBy String?
  policyVersion          Int               @default(1)
  policyHistory          Json?             // [{mode: "AGENCY"|"AGENT", from: ISO, to: ISO|null}]
```

- [ ] **Step 4: Add OrgMemberConsent model**

Add after `OrganizationSettingsAudit`:

```prisma
model OrgMemberConsent {
  id               String            @id @default(uuid())
  organizationId   String
  userId           String
  consentedMode    DataOwnershipMode
  consentedAt      DateTime          @default(now())
  policyVersion    Int               @default(1)

  @@unique([organizationId, userId, policyVersion])
  @@index([organizationId, userId])
}
```

- [ ] **Step 5: Add DepartureLog model**

Add after `OrgMemberConsent`:

```prisma
model DepartureLog {
  id               String            @id @default(uuid())
  organizationId   String
  userId           String
  userName         String
  reason           DepartureReason
  policyApplied    DataOwnershipMode
  migratedEntities Json
  cancelledDeals   Json
  entityCounts     Json
  createdAt        DateTime          @default(now())

  @@index([organizationId, createdAt])
  @@index([userId])
}
```

- [ ] **Step 6: Add cancellationReason to Deal model**

Find the `Deal` model (around line 309) and add after the `notes` field:

```prisma
  cancellationReason  String?
```

- [ ] **Step 7: Generate and review migration**

Run:
```bash
pnpm db:migrate --name phase_b_data_ownership
```

Review the generated SQL in `prisma/migrations/YYYYMMDD_phase_b_data_ownership/migration.sql`. Verify:
- CREATE TYPE for both enums
- ALTER TABLE on OrganizationSettings for 6 new columns
- CREATE TABLE for OrgMemberConsent and DepartureLog
- ALTER TABLE on Deal for cancellationReason
- CREATE INDEX and UNIQUE constraints

- [ ] **Step 8: Regenerate Prisma client**

Run:
```bash
pnpm prisma generate
```

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(phase-b): add data ownership schema — enums, models, Deal.cancellationReason"
```

### Task 2: Core TypeScript Types

**Files:**
- Create: `lib/data-ownership/types.ts`

- [ ] **Step 1: Create types file**

```typescript
import { DataOwnershipMode, DepartureReason } from "@prisma/client";

// ─── Policy History ──────────────────────────────────────

export interface PolicyEra {
  mode: DataOwnershipMode;
  from: string; // ISO date
  to: string | null; // null = current era
}

// ─── Migration Results ───────────────────────────────────

export interface MigratedEntity {
  id: string;
  title: string;
}

export interface MigratedEntities {
  properties: MigratedEntity[];
  clients: { id: string; name: string }[];
  mandates: MigratedEntity[];
}

export type CancelledDeals = { id: string; title: string }[];

export interface EntityCounts {
  properties: number;
  clients: number;
  mandates: number;
  deals: number;
}

export interface DepartureResult {
  orgId: string;
  userId: string;
  reason: DepartureReason;
  policyApplied: DataOwnershipMode;
  migratedEntities: MigratedEntities;
  cancelledDeals: CancelledDeals;
  entityCounts: EntityCounts;
  departureLogId: string;
}

// ─── Policy Lookup ───────────────────────────────────────

export interface PolicyForEntity {
  mode: DataOwnershipMode;
  era: PolicyEra;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/data-ownership/types.ts
git commit -m "feat(phase-b): add data ownership TypeScript types"
```

### Task 3: Policy Era Lookup Service

**Files:**
- Create: `lib/data-ownership/index.ts`
- Create: `tests/lib/data-ownership/policy-era.test.ts`

- [ ] **Step 1: Write failing tests for policy era lookup**

```typescript
// tests/lib/data-ownership/policy-era.test.ts
import { getPolicyForEntity } from "@/lib/data-ownership";
import { DataOwnershipMode } from "@prisma/client";
import type { PolicyEra } from "@/lib/data-ownership/types";

describe("getPolicyForEntity", () => {
  it("returns current mode when no policy history", () => {
    const result = getPolicyForEntity(
      new Date("2026-06-01"),
      DataOwnershipMode.AGENCY,
      null // no history
    );
    expect(result.mode).toBe("AGENCY");
  });

  it("returns old mode for entity created before policy change", () => {
    const history: PolicyEra[] = [
      { mode: "AGENT", from: "2026-01-01T00:00:00Z", to: "2026-06-01T00:00:00Z" },
      { mode: "AGENCY", from: "2026-06-01T00:00:00Z", to: null },
    ];
    const result = getPolicyForEntity(
      new Date("2026-03-15"), // created during AGENT era
      DataOwnershipMode.AGENCY, // current mode
      history
    );
    expect(result.mode).toBe("AGENT");
  });

  it("returns new mode for entity created after policy change", () => {
    const history: PolicyEra[] = [
      { mode: "AGENT", from: "2026-01-01T00:00:00Z", to: "2026-06-01T00:00:00Z" },
      { mode: "AGENCY", from: "2026-06-01T00:00:00Z", to: null },
    ];
    const result = getPolicyForEntity(
      new Date("2026-07-15"), // created during AGENCY era
      DataOwnershipMode.AGENCY,
      history
    );
    expect(result.mode).toBe("AGENCY");
  });

  it("handles multiple policy changes correctly", () => {
    const history: PolicyEra[] = [
      { mode: "AGENCY", from: "2026-01-01T00:00:00Z", to: "2026-03-01T00:00:00Z" },
      { mode: "AGENT", from: "2026-03-01T00:00:00Z", to: "2026-06-01T00:00:00Z" },
      { mode: "AGENCY", from: "2026-06-01T00:00:00Z", to: null },
    ];
    // Entity in middle era
    const result = getPolicyForEntity(
      new Date("2026-04-15"),
      DataOwnershipMode.AGENCY,
      history
    );
    expect(result.mode).toBe("AGENT");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm jest tests/lib/data-ownership/policy-era.test.ts --no-coverage
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement policy era lookup**

```typescript
// lib/data-ownership/index.ts
import { DataOwnershipMode, DepartureReason } from "@prisma/client";
import type { PolicyEra, PolicyForEntity } from "./types";

/**
 * Determine which data ownership policy applies to an entity
 * based on when it was created relative to policy change history.
 */
export function getPolicyForEntity(
  entityCreatedAt: Date,
  currentMode: DataOwnershipMode,
  policyHistory: PolicyEra[] | null
): PolicyForEntity {
  // No history — everything follows current mode
  if (!policyHistory || policyHistory.length === 0) {
    return {
      mode: currentMode,
      era: { mode: currentMode, from: new Date(0).toISOString(), to: null },
    };
  }

  const createdMs = entityCreatedAt.getTime();

  // Walk through eras to find which one the entity was created in
  for (const era of policyHistory) {
    const eraStart = new Date(era.from).getTime();
    const eraEnd = era.to ? new Date(era.to).getTime() : Infinity;

    if (createdMs >= eraStart && createdMs < eraEnd) {
      return { mode: era.mode, era };
    }
  }

  // Fallback: entity predates all history — use earliest era
  return { mode: policyHistory[0].mode, era: policyHistory[0] };
}

/**
 * Should AGENT mode migration be used for this departure?
 * Account deletion always uses AGENCY mode (personal workspace will be deleted too).
 */
export function shouldMigrateData(
  reason: DepartureReason,
  policyMode: DataOwnershipMode
): boolean {
  if (reason === "ACCOUNT_DELETED" || reason === "ADMIN_FORCE_DELETED") {
    return false; // Always AGENCY mode for account deletion
  }
  return policyMode === DataOwnershipMode.AGENT;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm jest tests/lib/data-ownership/policy-era.test.ts --no-coverage
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/data-ownership/index.ts tests/lib/data-ownership/policy-era.test.ts
git commit -m "feat(phase-b): add policy era lookup service with tests"
```

---

## Chunk 2: Server Actions & Consent Management

### Task 4: Set Data Ownership Mode Action

**Files:**
- Create: `actions/data-ownership/set-ownership-mode.ts`

- [ ] **Step 1: Create the server action**

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/service";
import { DataOwnershipMode } from "@prisma/client";

/**
 * Set the data ownership mode for the current org.
 * Called during org creation or from the existing-org banner.
 * Only ORG_OWNER or ADMIN can call this.
 */
export async function setOwnershipMode(mode: DataOwnershipMode) {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgIdSafe();
  if (!user || !organizationId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireAction("org:manage_settings");

  const now = new Date();

  // Upsert OrganizationSettings with ownership fields
  await prismadb.organizationSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      dataOwnershipMode: mode,
      dataOwnershipSetAt: now,
      policyVersion: 1,
      policyHistory: [{ mode, from: now.toISOString(), to: null }],
      createdBy: user.id,
    },
    update: {
      dataOwnershipMode: mode,
      dataOwnershipSetAt: now,
      policyVersion: 1,
      policyHistory: [{ mode, from: now.toISOString(), to: null }],
    },
  });

  // Create consent record for the admin who set the policy
  await prismadb.orgMemberConsent.upsert({
    where: {
      organizationId_userId_policyVersion: {
        organizationId,
        userId: user.id,
        policyVersion: 1,
      },
    },
    create: {
      organizationId,
      userId: user.id,
      consentedMode: mode,
      policyVersion: 1,
    },
    update: {
      consentedMode: mode,
      consentedAt: now,
    },
  });

  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/data-ownership/set-ownership-mode.ts
git commit -m "feat(phase-b): add setOwnershipMode server action"
```

### Task 5: Change Ownership Mode Action

**Files:**
- Create: `actions/data-ownership/change-ownership-mode.ts`

- [ ] **Step 1: Create the server action**

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/service";
import { DataOwnershipMode } from "@prisma/client";
import type { PolicyEra } from "@/lib/data-ownership/types";

/**
 * Change the data ownership mode for the current org.
 * Increments policyVersion, updates policyHistory, creates owner consent.
 * All other agents must re-consent on next login.
 */
export async function changeOwnershipMode(newMode: DataOwnershipMode) {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgIdSafe();
  if (!user || !organizationId) {
    return { success: false, error: "Unauthorized" };
  }

  await requireAction("org:manage_settings");

  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    return { success: false, error: "Organization settings not found. Set initial policy first." };
  }

  if (settings.dataOwnershipMode === newMode) {
    return { success: false, error: "Already using this mode." };
  }

  const now = new Date();
  const newVersion = settings.policyVersion + 1;

  // Close current era and append new one
  const history = (settings.policyHistory as PolicyEra[] | null) || [];
  const updatedHistory = history.map((era) =>
    era.to === null ? { ...era, to: now.toISOString() } : era
  );
  updatedHistory.push({ mode: newMode, from: now.toISOString(), to: null });

  await prismadb.$transaction([
    // Update settings
    prismadb.organizationSettings.update({
      where: { organizationId },
      data: {
        dataOwnershipMode: newMode,
        dataOwnershipChangedAt: now,
        dataOwnershipChangedBy: user.id,
        policyVersion: newVersion,
        policyHistory: updatedHistory,
      },
    }),
    // Create consent for the owner who made the change
    prismadb.orgMemberConsent.create({
      data: {
        organizationId,
        userId: user.id,
        consentedMode: newMode,
        policyVersion: newVersion,
      },
    }),
  ]);

  return { success: true, newVersion };
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/data-ownership/change-ownership-mode.ts
git commit -m "feat(phase-b): add changeOwnershipMode server action with policy history"
```

### Task 6: Record Consent Action

**Files:**
- Create: `actions/data-ownership/record-consent.ts`

- [ ] **Step 1: Create the server action**

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { DataOwnershipMode } from "@prisma/client";

/**
 * Record an agent's consent to the org's data ownership policy.
 * Called from invitation acceptance and re-consent modal.
 */
export async function recordConsent(
  targetOrgId?: string // For invitation flow where agent isn't yet in the org
) {
  const user = await getCurrentUser();
  const organizationId = targetOrgId || (await getCurrentOrgIdSafe());
  if (!user || !organizationId) {
    return { success: false, error: "Unauthorized" };
  }

  // Get current policy version
  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { dataOwnershipMode: true, policyVersion: true },
  });

  if (!settings) {
    return { success: false, error: "Organization has no data ownership policy set." };
  }

  await prismadb.orgMemberConsent.upsert({
    where: {
      organizationId_userId_policyVersion: {
        organizationId,
        userId: user.id,
        policyVersion: settings.policyVersion,
      },
    },
    create: {
      organizationId,
      userId: user.id,
      consentedMode: settings.dataOwnershipMode,
      policyVersion: settings.policyVersion,
    },
    update: {
      consentedAt: new Date(),
    },
  });

  return { success: true };
}

/**
 * Check if the current user has consented to the current policy version.
 */
export async function hasCurrentConsent(orgId?: string): Promise<boolean> {
  const user = await getCurrentUser();
  const organizationId = orgId || (await getCurrentOrgIdSafe());
  if (!user || !organizationId) return false;

  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { policyVersion: true, dataOwnershipSetAt: true },
  });

  // No policy set yet — no consent needed
  if (!settings?.dataOwnershipSetAt) return true;

  const consent = await prismadb.orgMemberConsent.findUnique({
    where: {
      organizationId_userId_policyVersion: {
        organizationId,
        userId: user.id,
        policyVersion: settings.policyVersion,
      },
    },
  });

  return !!consent;
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/data-ownership/record-consent.ts
git commit -m "feat(phase-b): add recordConsent and hasCurrentConsent actions"
```

### Task 7: Get Departure Logs Action

**Files:**
- Create: `actions/data-ownership/get-departure-logs.ts`

- [ ] **Step 1: Create the server action**

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/service";

/**
 * Get departure logs for the current org.
 */
export async function getDepartureLogs() {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgIdSafe();
  if (!user || !organizationId) {
    return { success: false, error: "Unauthorized", logs: [] };
  }

  await requireAction("org:manage_settings");

  const logs = await prismadb.departureLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { success: true, logs };
}

/**
 * Get a single departure log by ID.
 */
export async function getDepartureLog(departureId: string) {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgIdSafe();
  if (!user || !organizationId) {
    return { success: false, error: "Unauthorized", log: null };
  }

  await requireAction("org:manage_settings");

  const log = await prismadb.departureLog.findFirst({
    where: { id: departureId, organizationId },
  });

  if (!log) {
    return { success: false, error: "Departure log not found", log: null };
  }

  return { success: true, log };
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/data-ownership/get-departure-logs.ts
git commit -m "feat(phase-b): add getDepartureLogs server actions"
```

---

## Chunk 3: Entity Migration Service & Departure Integration

### Task 8: Entity Migrator

**Files:**
- Create: `lib/data-ownership/entity-migrator.ts`

This is the core migration logic — copies entities from org to personal workspace.

- [ ] **Step 1: Create entity migrator**

```typescript
// lib/data-ownership/entity-migrator.ts
import { prismadb } from "@/lib/prisma";
import { Prisma, DataOwnershipMode } from "@prisma/client";
import { decryptPropertyForOrg, encryptPropertyForOrg } from "@/lib/model-encryption";
import { decryptClientForOrg, encryptClientForOrg } from "@/lib/model-encryption";
import { decryptMandateForOrg, encryptMandateForOrg } from "@/lib/model-encryption";
import { getOrgDek } from "@/lib/key-management";
import { isOrgPersonal } from "@/lib/personal-workspace-guard";
import type { MigratedEntities, CancelledDeals, EntityCounts } from "./types";

interface MigrationContext {
  userId: string;
  sourceOrgId: string;
  personalOrgId: string;
}

/**
 * Migrate all entities assigned to the departing agent from source org
 * to their personal workspace.
 *
 * Must be called within a Prisma interactive transaction.
 */
export async function migrateAgentEntities(
  tx: Prisma.TransactionClient,
  ctx: MigrationContext
): Promise<{ migratedEntities: MigratedEntities; cancelledDeals: CancelledDeals; entityCounts: EntityCounts }> {
  const migratedEntities: MigratedEntities = { properties: [], clients: [], mandates: [] };
  const cancelledDeals: CancelledDeals = [];

  // ─── Properties ───────────────────────────────
  const properties = await tx.properties.findMany({
    where: { organizationId: ctx.sourceOrgId, assigned_to: ctx.userId },
    include: { PropertyImage: true },
  });

  for (const prop of properties) {
    // Decrypt from source org
    const decrypted = await decryptPropertyForOrg(prop, ctx.sourceOrgId);

    // Re-encrypt for personal workspace
    const encrypted = await encryptPropertyForOrg(
      { primary_email: decrypted.primary_email, communication_notes: decrypted.communication_notes },
      ctx.personalOrgId
    );

    // Create in personal workspace (new ID, new orgId)
    const { id: _oldId, organizationId: _oldOrg, PropertyImage: images, ...propData } = decrypted;
    const newProp = await tx.properties.create({
      data: {
        ...propData,
        ...encrypted,
        organizationId: ctx.personalOrgId,
        assigned_to: ctx.userId,
      },
    });

    // Copy property images
    if (images && images.length > 0) {
      await tx.propertyImage.createMany({
        data: images.map((img: { url: string; alt: string | null; order: number; isPrimary: boolean }) => ({
          propertyId: newProp.id,
          url: img.url,
          alt: img.alt,
          order: img.order,
          isPrimary: img.isPrimary,
        })),
      });
    }

    migratedEntities.properties.push({ id: newProp.id, title: prop.title || prop.id });

    // Cancel active deals for this property
    const activeDeals = await tx.deal.findMany({
      where: {
        propertyId: prop.id,
        organizationId: ctx.sourceOrgId,
        status: { in: ["PROPOSED", "NEGOTIATING", "ACCEPTED", "IN_PROGRESS"] },
      },
    });

    for (const deal of activeDeals) {
      await tx.deal.update({
        where: { id: deal.id },
        data: { status: "CANCELLED", cancellationReason: "AGENT_DEPARTED" },
      });
      cancelledDeals.push({ id: deal.id, title: deal.title || deal.id });
    }

    // Invalidate shared entity links
    await tx.sharedEntity.deleteMany({
      where: { entityId: prop.id, entityType: "property" },
    });

    // Delete child records explicitly (Phase A uses SetNull, not Cascade)
    await tx.propertyComment.deleteMany({ where: { propertyId: prop.id } });
    await tx.property_Contacts.deleteMany({ where: { property: prop.id } });
    await tx.propertyImage.deleteMany({ where: { propertyId: prop.id } });

    // Delete original property from org
    await tx.properties.delete({ where: { id: prop.id } });
  }

  // ─── Clients ──────────────────────────────────
  const clients = await tx.clients.findMany({
    where: { organizationId: ctx.sourceOrgId, assigned_to: ctx.userId },
  });

  for (const client of clients) {
    const decrypted = await decryptClientForOrg(client, ctx.sourceOrgId);
    const encrypted = await encryptClientForOrg(decrypted, ctx.personalOrgId);

    const { id: _oldId, organizationId: _oldOrg, ...clientData } = decrypted;
    const newClient = await tx.clients.create({
      data: {
        ...clientData,
        ...encrypted,
        organizationId: ctx.personalOrgId,
        assigned_to: ctx.userId,
      },
    });

    migratedEntities.clients.push({ id: newClient.id, name: client.client_name || client.id });

    // Delete child records
    await tx.clientComment.deleteMany({ where: { clientId: client.id } });
    await tx.client_Contacts.deleteMany({ where: { client: client.id } });
    await tx.sharedEntity.deleteMany({ where: { entityId: client.id, entityType: "client" } });

    await tx.clients.delete({ where: { id: client.id } });
  }

  // ─── Mandates ─────────────────────────────────
  const mandates = await tx.mandate.findMany({
    where: { organizationId: ctx.sourceOrgId, assigned_to: ctx.userId },
  });

  for (const mandate of mandates) {
    const decrypted = await decryptMandateForOrg(mandate, ctx.sourceOrgId);
    const encrypted = await encryptMandateForOrg(decrypted, ctx.personalOrgId);

    const { id: _oldId, organizationId: _oldOrg, ...mandateData } = decrypted;
    const newMandate = await tx.mandate.create({
      data: {
        ...mandateData,
        ...encrypted,
        organizationId: ctx.personalOrgId,
        assigned_to: ctx.userId,
      },
    });

    migratedEntities.mandates.push({ id: newMandate.id, title: mandate.title || mandate.id });

    // Delete child records
    await tx.mandateComment.deleteMany({ where: { mandateId: mandate.id } });
    await tx.sharedEntity.deleteMany({ where: { entityId: mandate.id, entityType: "mandate" } });

    await tx.mandate.delete({ where: { id: mandate.id } });
  }

  const entityCounts: EntityCounts = {
    properties: migratedEntities.properties.length,
    clients: migratedEntities.clients.length,
    mandates: migratedEntities.mandates.length,
    deals: cancelledDeals.length,
  };

  return { migratedEntities, cancelledDeals, entityCounts };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/data-ownership/entity-migrator.ts
git commit -m "feat(phase-b): add entity migrator — copies entities to personal workspace"
```

### Task 9: Extend handleUserDeparture with Data Ownership Branch

**Files:**
- Modify: `lib/user-departure/index.ts` (Phase A's departure service)

- [ ] **Step 1: Add data ownership branch**

At the top of `handleUserDeparture()`, after the existing pre-flight checks, add the data ownership lookup:

```typescript
import { getPolicyForEntity, shouldMigrateData } from "@/lib/data-ownership";
import { migrateAgentEntities } from "@/lib/data-ownership/entity-migrator";
import type { PolicyEra } from "@/lib/data-ownership/types";

// Inside handleUserDeparture, after pre-flight checks:

// Phase B: Check org's data ownership policy
const orgSettings = await prismadb.organizationSettings.findUnique({
  where: { organizationId: orgId },
  select: {
    dataOwnershipMode: true,
    policyHistory: true,
    dataOwnershipSetAt: true,
  },
});

const ownershipMode = orgSettings?.dataOwnershipMode ?? "AGENCY";
const policyHistory = (orgSettings?.policyHistory as PolicyEra[] | null) ?? null;

// Determine if we need AGENT-mode migration
// Account deletion always uses AGENCY mode
const useAgentMigration = shouldMigrateData(reason, ownershipMode);

if (useAgentMigration) {
  // Find agent's personal workspace
  const personalOrg = await findPersonalWorkspace(userId);
  if (!personalOrg) {
    throw new Error("Agent has no personal workspace. Cannot migrate data.");
  }

  // Run migration in serializable transaction
  const migrationResult = await prismadb.$transaction(
    async (tx) => {
      return migrateAgentEntities(tx, {
        userId,
        sourceOrgId: orgId,
        personalOrgId: personalOrg.id,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  // Create departure log
  const userName = await getUserNameSnapshot(userId);
  await prismadb.departureLog.create({
    data: {
      organizationId: orgId,
      userId,
      userName,
      reason,
      policyApplied: "AGENT",
      migratedEntities: migrationResult.migratedEntities,
      cancelledDeals: migrationResult.cancelledDeals,
      entityCounts: migrationResult.entityCounts,
    },
  });

  // Send notifications (email to org owner + in-app to other deal agents)
  // ... notification code ...

  return migrationResult;
}

// If not AGENT mode, fall through to Phase A's SetNull behavior
// ... existing Phase A code ...

// After Phase A SetNull, still create departure log
await prismadb.departureLog.create({
  data: {
    organizationId: orgId,
    userId,
    userName: await getUserNameSnapshot(userId),
    reason,
    policyApplied: "AGENCY",
    migratedEntities: { properties: [], clients: [], mandates: [] },
    cancelledDeals: [],
    entityCounts: { properties: 0, clients: 0, mandates: 0, deals: 0 },
  },
});
```

Add the helper to find personal workspace:

```typescript
async function findPersonalWorkspace(userId: string): Promise<{ id: string } | null> {
  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { clerkUserId: true },
  });
  if (!user?.clerkUserId) return null;

  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId: user.clerkUserId,
  });

  for (const membership of memberships.data) {
    const org = membership.organization;
    const metadata = org.publicMetadata as Record<string, unknown>;
    if (metadata?.type === "personal") {
      return { id: org.id };
    }
  }
  return null;
}

async function getUserNameSnapshot(userId: string): Promise<string> {
  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return user?.name || user?.email || "Unknown User";
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/user-departure/index.ts
git commit -m "feat(phase-b): extend handleUserDeparture with AGENT mode migration branch"
```

---

## Chunk 4: UI Components — Selector, Banner, Consent Modal

### Task 10: Translations

**Files:**
- Create: `locales/en/dataOwnership.json`
- Create: `locales/el/dataOwnership.json`

- [ ] **Step 1: Create English translations**

```json
{
  "selector": {
    "title": "How is data managed in your agency?",
    "agencyOwned": {
      "title": "Agency-Owned",
      "description": "Properties, Clients, and Mandates uploaded by team members belong to the agency. If a member leaves, the data stays with the organization."
    },
    "agentOwned": {
      "title": "Agent-Owned",
      "description": "Properties, Clients, and Mandates remain under the control of the team member who manages them. If a member leaves, their assigned data moves with them to their personal workspace."
    },
    "note": "This can be changed later from Organization Settings. If changed, existing data follows the original policy — the new policy applies to data created after the change."
  },
  "banner": {
    "title": "Important: Please select your organization's data ownership policy.",
    "action": "Choose now"
  },
  "consent": {
    "invitation": {
      "title": "You're invited to {orgName}!",
      "agencyPolicy": "This agency's policy: Data you upload (Properties, Clients, Mandates) belongs to the organization. If you leave or are removed, the data stays with the agency.",
      "agentPolicy": "This agency's policy: Data you manage (Properties, Clients, Mandates assigned to you) remains under your control. If you leave, your assigned data moves to your personal workspace.",
      "checkbox": "I understand and accept this organization's data policy",
      "accept": "Accept & Join",
      "decline": "Decline"
    },
    "policyChange": {
      "title": "{orgName} has updated their data policy",
      "accept": "Accept & Continue",
      "leaveInstead": "I'd like to leave instead",
      "leaveAgencyOwned": "If you leave, all Properties, Clients, and Mandates you created or are assigned to will stay with {orgName}.",
      "leaveAgentOwned": "If you leave, Properties, Clients, and Mandates currently assigned to you will be moved to your personal workspace. Active Deals involving your properties will be cancelled.",
      "confirmLeave": "Leave {orgName}"
    }
  },
  "settings": {
    "title": "Data Ownership",
    "currentMode": "Current policy: {mode}",
    "changeButton": "Change Policy",
    "changeWarning": "Existing data follows the current policy. The new policy applies to data created after the change. All team members will need to re-consent."
  },
  "departures": {
    "title": "Departure History",
    "empty": "No departures recorded.",
    "agentName": "Agent",
    "date": "Date",
    "reason": "Reason",
    "policy": "Policy Applied",
    "report": {
      "title": "Departure Report",
      "summary": "{properties} properties, {clients} clients, {mandates} mandates affected. {deals} deals cancelled.",
      "properties": "Properties",
      "clients": "Clients",
      "mandates": "Mandates",
      "cancelledDeals": "Cancelled Deals"
    },
    "reasons": {
      "LEFT_ORG": "Left organization",
      "REMOVED_FROM_ORG": "Removed by admin",
      "ACCOUNT_DELETED": "Account deleted",
      "ADMIN_FORCE_DELETED": "Force deleted by platform admin"
    }
  }
}
```

- [ ] **Step 2: Create Greek translations**

```json
{
  "selector": {
    "title": "Πώς διαχειρίζονται τα δεδομένα στο γραφείο σας;",
    "agencyOwned": {
      "title": "Ιδιοκτησία Γραφείου",
      "description": "Τα Ακίνητα, Πελάτες και Εντολές που ανεβάζουν τα μέλη της ομάδας ανήκουν στο γραφείο. Αν ένα μέλος αποχωρήσει, τα δεδομένα παραμένουν στον οργανισμό."
    },
    "agentOwned": {
      "title": "Ιδιοκτησία Συνεργάτη",
      "description": "Τα Ακίνητα, Πελάτες και Εντολές παραμένουν υπό τον έλεγχο του μέλους που τα διαχειρίζεται. Αν αποχωρήσει, τα δεδομένα που του έχουν ανατεθεί μεταφέρονται στον προσωπικό του χώρο εργασίας."
    },
    "note": "Αυτό μπορεί να αλλάξει αργότερα από τις Ρυθμίσεις Οργανισμού. Σε περίπτωση αλλαγής, τα υπάρχοντα δεδομένα ακολουθούν την αρχική πολιτική — η νέα πολιτική ισχύει για δεδομένα που δημιουργούνται μετά την αλλαγή."
  },
  "banner": {
    "title": "Σημαντικό: Επιλέξτε την πολιτική ιδιοκτησίας δεδομένων του οργανισμού σας.",
    "action": "Επιλέξτε τώρα"
  },
  "consent": {
    "invitation": {
      "title": "Σας προσκαλούν στο {orgName}!",
      "agencyPolicy": "Πολιτική γραφείου: Τα δεδομένα που ανεβάζετε (Ακίνητα, Πελάτες, Εντολές) ανήκουν στον οργανισμό. Αν αποχωρήσετε, τα δεδομένα παραμένουν στο γραφείο.",
      "agentPolicy": "Πολιτική γραφείου: Τα δεδομένα που διαχειρίζεστε (Ακίνητα, Πελάτες, Εντολές που σας έχουν ανατεθεί) παραμένουν υπό τον έλεγχό σας. Αν αποχωρήσετε, μεταφέρονται στον προσωπικό σας χώρο εργασίας.",
      "checkbox": "Κατανοώ και αποδέχομαι την πολιτική δεδομένων αυτού του οργανισμού",
      "accept": "Αποδοχή & Είσοδος",
      "decline": "Απόρριψη"
    },
    "policyChange": {
      "title": "Το {orgName} ενημέρωσε την πολιτική δεδομένων",
      "accept": "Αποδοχή & Συνέχεια",
      "leaveInstead": "Θέλω να αποχωρήσω",
      "leaveAgencyOwned": "Αν αποχωρήσετε, όλα τα Ακίνητα, Πελάτες και Εντολές που δημιουργήσατε ή σας έχουν ανατεθεί θα παραμείνουν στο {orgName}.",
      "leaveAgentOwned": "Αν αποχωρήσετε, τα Ακίνητα, Πελάτες και Εντολές που σας έχουν ανατεθεί θα μεταφερθούν στον προσωπικό σας χώρο εργασίας. Ενεργές Συμφωνίες που αφορούν τα ακίνητά σας θα ακυρωθούν.",
      "confirmLeave": "Αποχώρηση από {orgName}"
    }
  },
  "settings": {
    "title": "Ιδιοκτησία Δεδομένων",
    "currentMode": "Τρέχουσα πολιτική: {mode}",
    "changeButton": "Αλλαγή Πολιτικής",
    "changeWarning": "Τα υπάρχοντα δεδομένα ακολουθούν την τρέχουσα πολιτική. Η νέα πολιτική ισχύει για δεδομένα μετά την αλλαγή. Όλα τα μέλη θα πρέπει να συναινέσουν εκ νέου."
  },
  "departures": {
    "title": "Ιστορικό Αποχωρήσεων",
    "empty": "Δεν υπάρχουν καταγεγραμμένες αποχωρήσεις.",
    "agentName": "Συνεργάτης",
    "date": "Ημερομηνία",
    "reason": "Αιτία",
    "policy": "Πολιτική",
    "report": {
      "title": "Αναφορά Αποχώρησης",
      "summary": "{properties} ακίνητα, {clients} πελάτες, {mandates} εντολές επηρεάστηκαν. {deals} συμφωνίες ακυρώθηκαν.",
      "properties": "Ακίνητα",
      "clients": "Πελάτες",
      "mandates": "Εντολές",
      "cancelledDeals": "Ακυρωμένες Συμφωνίες"
    },
    "reasons": {
      "LEFT_ORG": "Αποχώρησε από τον οργανισμό",
      "REMOVED_FROM_ORG": "Αφαιρέθηκε από διαχειριστή",
      "ACCOUNT_DELETED": "Διαγραφή λογαριασμού",
      "ADMIN_FORCE_DELETED": "Αναγκαστική διαγραφή από διαχειριστή πλατφόρμας"
    }
  }
}
```

- [ ] **Step 3: Register namespace in i18n config**

In `i18n.ts`, add `"dataOwnership"` to the messages namespace list.

- [ ] **Step 4: Commit**

```bash
git add locales/en/dataOwnership.json locales/el/dataOwnership.json i18n.ts
git commit -m "feat(phase-b): add dataOwnership translations (en + el)"
```

### Task 11: DataOwnershipSelector Component

**Files:**
- Create: `components/data-ownership/DataOwnershipSelector.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataOwnershipMode } from "@prisma/client";

interface DataOwnershipSelectorProps {
  defaultValue?: DataOwnershipMode;
  onChange: (mode: DataOwnershipMode) => void;
  disabled?: boolean;
}

export function DataOwnershipSelector({
  defaultValue = "AGENCY",
  onChange,
  disabled = false,
}: DataOwnershipSelectorProps) {
  const t = useTranslations("dataOwnership.selector");
  const [selected, setSelected] = useState<DataOwnershipMode>(defaultValue);

  const handleSelect = (mode: DataOwnershipMode) => {
    if (disabled) return;
    setSelected(mode);
    onChange(mode);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t("title")}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-all border-2",
            selected === "AGENCY"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => handleSelect("AGENCY")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Building2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t("agencyOwned.title")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("agencyOwned.description")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all border-2",
            selected === "AGENT"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => handleSelect("AGENT")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <UserCircle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t("agentOwned.title")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("agentOwned.description")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/data-ownership/DataOwnershipSelector.tsx
git commit -m "feat(phase-b): add DataOwnershipSelector component"
```

### Task 12: DataPolicyConsentModal Component

**Files:**
- Create: `components/data-ownership/DataPolicyConsentModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, UserCircle, AlertTriangle } from "lucide-react";
import { DataOwnershipMode } from "@prisma/client";

interface DataPolicyConsentModalProps {
  open: boolean;
  orgName: string;
  mode: DataOwnershipMode;
  variant: "invitation" | "policy-change";
  /** For policy-change variant: the mode the agent originally joined under */
  originalMode?: DataOwnershipMode;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export function DataPolicyConsentModal({
  open,
  orgName,
  mode,
  variant,
  originalMode,
  onAccept,
  onDecline,
  loading = false,
}: DataPolicyConsentModalProps) {
  const t = useTranslations("dataOwnership.consent");
  const [agreed, setAgreed] = useState(false);
  const [showLeaveInfo, setShowLeaveInfo] = useState(false);

  const isInvitation = variant === "invitation";
  const prefix = isInvitation ? "invitation" : "policyChange";
  const title = t(`${prefix}.title`, { orgName });

  const policyText =
    mode === "AGENCY"
      ? t(`${isInvitation ? "invitation" : "policyChange"}.${isInvitation ? "agencyPolicy" : "accept"}`)
      : t(`${isInvitation ? "invitation" : "policyChange"}.${isInvitation ? "agentPolicy" : "accept"}`);

  const policyDescription =
    mode === "AGENCY"
      ? t("invitation.agencyPolicy")
      : t("invitation.agentPolicy");

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "AGENCY" ? (
              <Building2 className="h-5 w-5" />
            ) : (
              <UserCircle className="h-5 w-5" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertDescription>{policyDescription}</AlertDescription>
          </Alert>

          <div className="flex items-start gap-2">
            <Checkbox
              id="consent"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(!!checked)}
            />
            <label htmlFor="consent" className="text-sm cursor-pointer">
              {t("invitation.checkbox")}
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={onAccept} disabled={!agreed || loading}>
              {loading ? "..." : t(`${prefix}.accept`)}
            </Button>

            {isInvitation ? (
              <Button variant="outline" onClick={onDecline} disabled={loading}>
                {t("invitation.decline")}
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setShowLeaveInfo(!showLeaveInfo)}
                disabled={loading}
              >
                {t("policyChange.leaveInstead")}
              </Button>
            )}
          </div>

          {showLeaveInfo && !isInvitation && (
            <div className="space-y-3 border-t pt-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {originalMode === "AGENCY"
                    ? t("policyChange.leaveAgencyOwned", { orgName })
                    : t("policyChange.leaveAgentOwned", { orgName })}
                </AlertDescription>
              </Alert>
              <Button variant="destructive" onClick={onDecline} disabled={loading}>
                {t("policyChange.confirmLeave", { orgName })}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/data-ownership/DataPolicyConsentModal.tsx
git commit -m "feat(phase-b): add DataPolicyConsentModal component"
```

### Task 13: DataOwnershipBanner Component

**Files:**
- Create: `components/data-ownership/DataOwnershipBanner.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { DataOwnershipSelector } from "./DataOwnershipSelector";
import { setOwnershipMode } from "@/actions/data-ownership/set-ownership-mode";
import { DataOwnershipMode } from "@prisma/client";
import { useAppToast } from "@/hooks/use-app-toast";
import { useRouter } from "next/navigation";

interface DataOwnershipBannerProps {
  /** True if the org hasn't set a data ownership policy yet */
  needsSelection: boolean;
}

export function DataOwnershipBanner({ needsSelection }: DataOwnershipBannerProps) {
  const t = useTranslations("dataOwnership.banner");
  const { toast } = useAppToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DataOwnershipMode>("AGENCY");
  const [saving, setSaving] = useState(false);

  if (!needsSelection) return null;

  const handleSave = async () => {
    setSaving(true);
    const result = await setOwnershipMode(selected);
    setSaving(false);

    if (result.success) {
      toast({ title: "Policy saved", variant: "default" });
      setOpen(false);
      router.refresh();
    } else {
      toast({ title: result.error || "Failed to save", variant: "destructive" });
    }
  };

  return (
    <>
      <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between">
          <span>{t("title")}</span>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            {t("action")}
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <DataOwnershipSelector
            defaultValue="AGENCY"
            onChange={setSelected}
          />
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/data-ownership/DataOwnershipBanner.tsx
git commit -m "feat(phase-b): add DataOwnershipBanner component"
```

---

## Chunk 5: Pages, Middleware, and Integration

### Task 14: Invitation Acceptance Page

**Files:**
- Create: `app/[locale]/app/(routes)/invitation/[invitationId]/page.tsx`

- [ ] **Step 1: Create the invitation page**

This page is shown after Clerk processes the invitation link. It displays the org's data policy and requires consent before completing the join.

```tsx
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import { InvitationAcceptanceClient } from "./InvitationAcceptanceClient";

interface Props {
  params: { locale: string; invitationId: string };
}

export default async function InvitationPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect(`/${params.locale}/app/sign-in`);

  const clerk = await clerkClient();

  // Fetch invitation details
  // The invitationId comes from Clerk's invitation flow
  // We need to get the org details to show the data policy
  try {
    const invitation = await clerk.invitations.getInvitation(params.invitationId);
    const orgId = (invitation as any).organizationId;

    if (!orgId) redirect(`/${params.locale}/app`);

    const org = await clerk.organizations.getOrganization({ organizationId: orgId });

    // Get data ownership settings
    const settings = await prismadb.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: { dataOwnershipMode: true, dataOwnershipSetAt: true },
    });

    return (
      <InvitationAcceptanceClient
        invitationId={params.invitationId}
        orgId={orgId}
        orgName={org.name}
        orgImageUrl={org.imageUrl}
        dataOwnershipMode={settings?.dataOwnershipMode ?? "AGENCY"}
        hasPolicy={!!settings?.dataOwnershipSetAt}
        locale={params.locale}
      />
    );
  } catch {
    redirect(`/${params.locale}/app`);
  }
}
```

Create the client component in the same directory:

```tsx
// app/[locale]/app/(routes)/invitation/[invitationId]/InvitationAcceptanceClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataPolicyConsentModal } from "@/components/data-ownership/DataPolicyConsentModal";
import { recordConsent } from "@/actions/data-ownership/record-consent";
import { DataOwnershipMode } from "@prisma/client";
import { useAppToast } from "@/hooks/use-app-toast";

interface Props {
  invitationId: string;
  orgId: string;
  orgName: string;
  orgImageUrl: string | null;
  dataOwnershipMode: DataOwnershipMode;
  hasPolicy: boolean;
  locale: string;
}

export function InvitationAcceptanceClient({
  invitationId,
  orgId,
  orgName,
  orgImageUrl,
  dataOwnershipMode,
  hasPolicy,
  locale,
}: Props) {
  const router = useRouter();
  const { toast } = useAppToast();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      // Record consent
      if (hasPolicy) {
        await recordConsent(orgId);
      }

      // Accept the Clerk invitation
      const res = await fetch(`/api/invitations/${invitationId}/accept`, {
        method: "POST",
      });

      if (res.ok) {
        router.push(`/${locale}/app`);
      } else {
        toast({ title: "Failed to accept invitation", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to accept invitation", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await fetch(`/api/invitations/${invitationId}/decline`, { method: "POST" });
      router.push(`/${locale}/app`);
    } catch {
      router.push(`/${locale}/app`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <DataPolicyConsentModal
        open={true}
        orgName={orgName}
        mode={dataOwnershipMode}
        variant="invitation"
        onAccept={handleAccept}
        onDecline={handleDecline}
        loading={loading}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/app/(routes)/invitation/"
git commit -m "feat(phase-b): add invitation acceptance page with consent"
```

### Task 15: Departure Report Pages

**Files:**
- Create: `app/[locale]/app/(routes)/settings/departures/page.tsx`
- Create: `app/[locale]/app/(routes)/settings/departures/[departureId]/page.tsx`

- [ ] **Step 1: Create departure list page**

```tsx
import { getDepartureLogs } from "@/actions/data-ownership/get-departure-logs";
import { getTranslations } from "next-intl/server";
import { format } from "date-fns";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EntityCounts } from "@/lib/data-ownership/types";

export default async function DeparturesPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations("dataOwnership.departures");
  const { logs } = await getDepartureLogs();

  if (!logs || logs.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <p className="text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("agentName")}</TableHead>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("reason")}</TableHead>
            <TableHead>{t("policy")}</TableHead>
            <TableHead>Summary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const counts = log.entityCounts as unknown as EntityCounts;
            return (
              <TableRow key={log.id}>
                <TableCell>
                  <Link
                    href={`/${params.locale}/app/settings/departures/${log.id}`}
                    className="text-primary hover:underline"
                  >
                    {log.userName}
                  </Link>
                </TableCell>
                <TableCell>{format(new Date(log.createdAt), "dd/MM/yyyy")}</TableCell>
                <TableCell>{t(`reasons.${log.reason}`)}</TableCell>
                <TableCell>{log.policyApplied}</TableCell>
                <TableCell>
                  {t("report.summary", {
                    properties: counts.properties,
                    clients: counts.clients,
                    mandates: counts.mandates,
                    deals: counts.deals,
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Create single departure report page**

```tsx
import { getDepartureLog } from "@/actions/data-ownership/get-departure-logs";
import { getTranslations } from "next-intl/server";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { MigratedEntities, CancelledDeals, EntityCounts } from "@/lib/data-ownership/types";

interface Props {
  params: { locale: string; departureId: string };
}

export default async function DepartureReportPage({ params }: Props) {
  const t = await getTranslations("dataOwnership.departures");
  const { log } = await getDepartureLog(params.departureId);

  if (!log) notFound();

  const entities = log.migratedEntities as unknown as MigratedEntities;
  const deals = log.cancelledDeals as unknown as CancelledDeals;
  const counts = log.entityCounts as unknown as EntityCounts;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">{t("report.title")}</h1>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <span className="text-muted-foreground">{t("agentName")}:</span>{" "}
          <strong>{log.userName}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">{t("date")}:</span>{" "}
          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
        </div>
        <div>
          <span className="text-muted-foreground">{t("reason")}:</span>{" "}
          {t(`reasons.${log.reason}`)}
        </div>
        <div>
          <span className="text-muted-foreground">{t("policy")}:</span>{" "}
          {log.policyApplied}
        </div>
      </div>

      <p className="mb-6 text-sm">
        {t("report.summary", {
          properties: counts.properties,
          clients: counts.clients,
          mandates: counts.mandates,
          deals: counts.deals,
        })}
      </p>

      {entities.properties.length > 0 && (
        <Collapsible className="mb-4">
          <CollapsibleTrigger className="flex items-center gap-2 font-semibold">
            <ChevronDown className="h-4 w-4" />
            {t("report.properties")} ({entities.properties.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 mt-2">
            <ul className="list-disc list-inside text-sm space-y-1">
              {entities.properties.map((p) => (
                <li key={p.id}>{p.title}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {entities.clients.length > 0 && (
        <Collapsible className="mb-4">
          <CollapsibleTrigger className="flex items-center gap-2 font-semibold">
            <ChevronDown className="h-4 w-4" />
            {t("report.clients")} ({entities.clients.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 mt-2">
            <ul className="list-disc list-inside text-sm space-y-1">
              {entities.clients.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {entities.mandates.length > 0 && (
        <Collapsible className="mb-4">
          <CollapsibleTrigger className="flex items-center gap-2 font-semibold">
            <ChevronDown className="h-4 w-4" />
            {t("report.mandates")} ({entities.mandates.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 mt-2">
            <ul className="list-disc list-inside text-sm space-y-1">
              {entities.mandates.map((m) => (
                <li key={m.id}>{m.title}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {deals.length > 0 && (
        <Collapsible className="mb-4">
          <CollapsibleTrigger className="flex items-center gap-2 font-semibold">
            <ChevronDown className="h-4 w-4" />
            {t("report.cancelledDeals")} ({deals.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 mt-2">
            <ul className="list-disc list-inside text-sm space-y-1">
              {deals.map((d) => (
                <li key={d.id}>{d.title}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/app/(routes)/settings/departures/"
git commit -m "feat(phase-b): add departure report pages (list + detail)"
```

### Task 16: Consent Enforcement in Middleware

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Add consent check to middleware**

After the existing Clerk auth block in `proxy.ts` (the section that checks if a route requires auth), add consent enforcement. This should be a lightweight check — query once per session, not every request.

The approach: set a cookie `consent_v` with the policy version the user has consented to. On policy change, the cookie becomes stale and the middleware redirects to the re-consent page.

Add after the platform admin check block:

```typescript
// Phase B: Consent enforcement for org data policy
if (auth.orgId && auth.userId && !isPublicRoute(req)) {
  const consentVersion = req.cookies.get("consent_v")?.value;
  const orgId = auth.orgId;

  // Only check if we don't have a cached consent cookie
  if (!consentVersion) {
    // Fetch from DB (lightweight query)
    const settings = await prismadb.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: { policyVersion: true, dataOwnershipSetAt: true },
    });

    if (settings?.dataOwnershipSetAt) {
      const consent = await prismadb.orgMemberConsent.findUnique({
        where: {
          organizationId_userId_policyVersion: {
            organizationId: orgId,
            userId: auth.userId,
            policyVersion: settings.policyVersion,
          },
        },
      });

      if (!consent) {
        // Redirect to re-consent page
        const locale = req.nextUrl.pathname.split("/")[1] || "el";
        return NextResponse.redirect(
          new URL(`/${locale}/app/consent-required`, req.url)
        );
      }

      // Set cookie to skip DB check on subsequent requests
      const response = NextResponse.next();
      response.cookies.set("consent_v", String(settings.policyVersion), {
        httpOnly: true,
        maxAge: 60 * 60 * 24, // 24 hours
      });
      return response;
    }
  }
}
```

**Note:** The implementing engineer should evaluate whether DB queries in middleware are acceptable for the production load. An alternative is to check consent client-side via a React context provider that fetches on mount.

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat(phase-b): add consent enforcement in middleware"
```

### Task 17: Onboarding Integration

**Files:**
- Modify: `app/[locale]/app/(onboarding)/onboard/components/OnboardingSteps.tsx`

- [ ] **Step 1: Add data ownership step to onboarding**

After the org creation step (step 3: UsernameOrg), add a data ownership selection step. This only shows if the user just created an org (not if they joined an existing one).

In the step definitions, add a new step between UsernameOrg and NotificationsWhat. Update `TOTAL_STEPS` from 8 to 9.

Add state:
```typescript
const [dataOwnershipMode, setDataOwnershipMode] = useState<DataOwnershipMode>("AGENCY");
```

Add the step render (in the switch/conditional for step rendering):
```tsx
{currentStep === 4 && createdOrg && (
  <DataOwnershipSelector
    defaultValue="AGENCY"
    onChange={setDataOwnershipMode}
  />
)}
```

In the completion handler, call `setOwnershipMode(dataOwnershipMode)` after org creation.

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/app/(onboarding)/onboard/components/OnboardingSteps.tsx"
git commit -m "feat(phase-b): add data ownership step to onboarding flow"
```

### Task 18: Departure Notification Email

**Files:**
- Create: `emails/notifications/AgentDepartureReport.tsx`

- [ ] **Step 1: Create the email template**

Follow the existing email template pattern (using `BaseLayout` from `emails/components/BaseLayout.tsx`):

```tsx
import { BaseLayout } from "../components/BaseLayout";

interface AgentDepartureReportProps {
  orgName: string;
  agentName: string;
  departureDate: string;
  policyApplied: string;
  propertiesCount: number;
  clientsCount: number;
  mandatesCount: number;
  dealsCount: number;
  reportUrl: string;
}

export function AgentDepartureReport({
  orgName,
  agentName,
  departureDate,
  policyApplied,
  propertiesCount,
  clientsCount,
  mandatesCount,
  dealsCount,
  reportUrl,
}: AgentDepartureReportProps) {
  return (
    <BaseLayout
      previewText={`${agentName} has departed from ${orgName}`}
    >
      <h1>Agent Departure Report</h1>
      <p>
        <strong>{agentName}</strong> has departed from <strong>{orgName}</strong> on {departureDate}.
      </p>
      <p>
        <strong>Policy applied:</strong> {policyApplied}
      </p>
      <p>
        <strong>Summary:</strong> {propertiesCount} properties, {clientsCount} clients,{" "}
        {mandatesCount} mandates affected. {dealsCount} deals cancelled.
      </p>
      <a
        href={reportUrl}
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: "#000",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "6px",
          marginTop: "16px",
        }}
      >
        View Departure Report
      </a>
    </BaseLayout>
  );
}

export default AgentDepartureReport;
```

- [ ] **Step 2: Commit**

```bash
git add emails/notifications/AgentDepartureReport.tsx
git commit -m "feat(phase-b): add AgentDepartureReport email template"
```

### Task 19: Wire Banner into Dashboard Layout

**Files:**
- Modify: The main dashboard layout or page that all org routes share

- [ ] **Step 1: Add DataOwnershipBanner to the app layout**

In the main app layout (e.g., `app/[locale]/app/(routes)/layout.tsx`), fetch the org's `dataOwnershipSetAt` and render the banner if null:

```tsx
import { DataOwnershipBanner } from "@/components/data-ownership/DataOwnershipBanner";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

// In the layout component:
const organizationId = await getCurrentOrgIdSafe();
let needsOwnershipSelection = false;

if (organizationId) {
  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { dataOwnershipSetAt: true },
  });
  needsOwnershipSelection = !settings?.dataOwnershipSetAt;
}

// In the JSX, before the main content:
<DataOwnershipBanner needsSelection={needsOwnershipSelection} />
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/app/(routes)/layout.tsx"
git commit -m "feat(phase-b): wire DataOwnershipBanner into dashboard layout"
```

### Task 20: Final Integration — Navigation and Settings

**Files:**
- Modify: `config/navigation.tsx` — add departures route
- Modify: Org settings page — add Data Ownership section

- [ ] **Step 1: Add departures to settings navigation**

In `config/navigation.tsx`, add to the settings submenu:

```typescript
{
  title: t("departures"),
  href: "/settings/departures",
  icon: UserMinus,
}
```

- [ ] **Step 2: Add Data Ownership section to org settings page**

Find the org settings page component and add a new section using `DataOwnershipSelector` with `changeOwnershipMode` action. Show current mode, change button, and warning text.

- [ ] **Step 3: Build and verify**

```bash
pnpm build
```

Fix any TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add config/navigation.tsx
git commit -m "feat(phase-b): add departures to settings navigation and ownership section"
```

### Task 21: Final Verification

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

- [ ] **Step 2: Run linter**

```bash
pnpm lint
```

- [ ] **Step 3: Run tests**

```bash
pnpm jest tests/lib/data-ownership/ --no-coverage
```

- [ ] **Step 4: Verify database migration**

```bash
pnpm db:status
```

- [ ] **Step 5: Manual verification checklist**

- [ ] Create new org → data ownership selector appears in onboarding
- [ ] Existing org → persistent banner appears on dashboard
- [ ] Select AGENCY mode → banner disappears, settings saved
- [ ] Invite agent → invitation page shows data policy consent
- [ ] Agent accepts → consent record created
- [ ] Change policy → agents see re-consent modal on next login
- [ ] Agent leaves AGENT-mode org → entities migrated to personal workspace
- [ ] Departure report page shows correct entity names
- [ ] Org owner receives departure email with report link
- [ ] Active deals cancelled, completed deals untouched
