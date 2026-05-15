# Demo Sandbox & Onboarding Tour — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After profile onboarding completes, place new users in a pre-seeded demo org and guide them through a Driver.js overlay tour (orient → edit/link → import → create-org CTA), with write simulation guarding destructive API routes in demo mode.

**Architecture:** A new `lib/demo/` module handles org seeding, tour step config, and the demo guard. A `DemoModeProvider` context wraps the `(routes)` layout — reading `org.publicMetadata.isDemo` from Clerk — and mounts the `TourController` which drives Driver.js. Three API routes receive `isDemoOrg()` guards that return mock success payloads instead of executing real writes.

**Tech Stack:** driver.js v1.x, Clerk SDK (organizations API), Prisma (OrganizationSettings), Next.js App Router, React context

---

## File Map

### New files

| Path | Responsibility |
|---|---|
| `lib/demo/demo-guard.ts` | `isDemoOrg(orgId)` — reads `OrganizationSettings.isDemo` |
| `lib/demo/seed-demo-org.ts` | Seeds all demo entities in one Prisma transaction |
| `lib/demo/tour-steps.ts` | Locale-aware Driver.js step config (12 steps, 4 chapters) |
| `lib/demo/create-demo-org.ts` | Creates the Clerk demo org + calls `seedDemoOrg` |
| `components/demo/DemoModeProvider.tsx` | React context; reads Clerk org metadata |
| `components/demo/DemoBanner.tsx` | Sticky demo-mode banner with CTA |
| `components/demo/TourController.tsx` | Mounts Driver.js, manages step state, calls tour-progress API |
| `app/api/user/tour-progress/route.ts` | `PATCH` — updates `publicMetadata.tourStep` on Clerk user |
| `app/api/cron/cleanup-demo-orgs/route.ts` | Daily purge of stale demo orgs |
| `tests/lib/demo/demo-guard.test.ts` | Unit tests for `isDemoOrg` |
| `tests/lib/demo/seed-demo-org.test.ts` | Unit tests for `seedDemoOrg` |

### Modified files

| Path | Change |
|---|---|
| `prisma/schema.prisma` | Add `isDemo Boolean @default(false)` to `OrganizationSettings` |
| `actions/user/complete-onboarding.ts` | Call `createDemoOrgForUser()` after profile setup |
| `app/[locale]/app/(routes)/layout.tsx` | Wrap children with `DemoModeProvider` |
| `app/api/import/unified/route.ts` | Add `isDemoOrg` guard — return mock import success |
| `app/api/crm/contacts/[contactId]/route.ts` | Add `isDemoOrg` guard on `DELETE` |
| `app/api/mls/properties/[propertyId]/route.ts` | Add `isDemoOrg` guard on `DELETE` |
| `app/api/requests/[requestId]/route.ts` | Add `isDemoOrg` guard on `DELETE` |
| `app/api/documents/[documentId]/route.ts` | Add `isDemoOrg` guard on `DELETE` |
| `app/api/deals/[dealId]/route.ts` | Add `isDemoOrg` guard on `DELETE` |
| `vercel.json` | Add cleanup cron entry |

---

## Task 1: Install driver.js

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
pnpm add driver.js
```

- [ ] **Step 2: Verify the types are available**

```bash
node -e "require('driver.js'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add driver.js for onboarding tour"
```

---

## Task 2: Schema — add isDemo to OrganizationSettings

**Files:**
- Modify: `prisma/schema.prisma:2893`

- [ ] **Step 1: Add the field**

In `prisma/schema.prisma`, locate the `OrganizationSettings` model (line ~2893) and add `isDemo` after the `createdBy` field:

```prisma
  createdBy String? // User who created these settings

  // Demo sandbox flag — set true for auto-generated onboarding demo orgs
  isDemo Boolean @default(false)
```

- [ ] **Step 2: Run the migration**

```bash
pnpm prisma migrate dev --name add_is_demo_to_org_settings
```

Expected output: `The following migration(s) have been created and applied: migrations/..._add_is_demo_to_org_settings`

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add isDemo flag to OrganizationSettings"
```

---

## Task 3: lib/demo/demo-guard.ts

**Files:**
- Create: `lib/demo/demo-guard.ts`
- Create: `tests/lib/demo/demo-guard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/demo/demo-guard.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prismadb
vi.mock("@/lib/prisma", () => ({
  prismadb: {
    organizationSettings: {
      findUnique: vi.fn(),
    },
  },
}));

import { isDemoOrg } from "@/lib/demo/demo-guard";
import { prismadb } from "@/lib/prisma";

describe("isDemoOrg", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when OrganizationSettings.isDemo is true", async () => {
    vi.mocked(prismadb.organizationSettings.findUnique).mockResolvedValue({
      isDemo: true,
    } as never);
    expect(await isDemoOrg("org_abc")).toBe(true);
  });

  it("returns false when OrganizationSettings.isDemo is false", async () => {
    vi.mocked(prismadb.organizationSettings.findUnique).mockResolvedValue({
      isDemo: false,
    } as never);
    expect(await isDemoOrg("org_abc")).toBe(false);
  });

  it("returns false when no OrganizationSettings row exists", async () => {
    vi.mocked(prismadb.organizationSettings.findUnique).mockResolvedValue(null);
    expect(await isDemoOrg("org_abc")).toBe(false);
  });

  it("throws when orgId is empty", async () => {
    await expect(isDemoOrg("")).rejects.toThrow("orgId is required");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/lib/demo/demo-guard.test.ts
```

Expected: FAIL — `isDemoOrg` is not defined

- [ ] **Step 3: Implement demo-guard.ts**

Create `lib/demo/demo-guard.ts`:

```typescript
import { prismadb } from "@/lib/prisma";

export async function isDemoOrg(orgId: string): Promise<boolean> {
  if (!orgId) throw new Error("[demo-guard] isDemoOrg: orgId is required");

  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { isDemo: true },
  });

  return settings?.isDemo === true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/lib/demo/demo-guard.test.ts
```

Expected: 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/demo/demo-guard.ts tests/lib/demo/demo-guard.test.ts
git commit -m "feat(demo): add isDemoOrg guard"
```

---

## Task 4: lib/demo/tour-steps.ts

**Files:**
- Create: `lib/demo/tour-steps.ts`

- [ ] **Step 1: Create the step config**

Create `lib/demo/tour-steps.ts`:

```typescript
export interface TourStep {
  /** CSS selector for the highlighted element. Omit for full-screen steps. */
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "bottom" | "left" | "right";
  };
}

/**
 * Steps where the user must complete an action before Next is enabled.
 * 0-indexed — matches the array index in getTourSteps().
 */
export const ACTION_REQUIRED_STEPS = [4, 5, 8] as const;

const steps_el: TourStep[] = [
  // Chapter 1 — Orientation (steps 0–2, observational)
  {
    element: "[data-tour='sidebar-nav']",
    popover: {
      title: "Το κέντρο ελέγχου σου",
      description: "Από εδώ έχεις πρόσβαση σε CRM, MLS, μηνύματα και έγγραφα — όλα σε ένα μέρος.",
      side: "right",
    },
  },
  {
    element: "[data-tour='oikosync-feed']",
    popover: {
      title: "Ζωντανή ροή ομάδας",
      description: "Μηνύματα, ενημερώσεις, pin ακινήτων και αντιδράσεις εμφανίζονται εδώ σε πραγματικό χρόνο.",
      side: "right",
    },
  },
  {
    element: "[data-tour='first-message']",
    popover: {
      title: "Η ομάδα σου είναι ενεργή",
      description: "Ο demo χώρος εργασίας σου έχει ήδη δραστηριότητα. Κάνε κλικ σε οποιοδήποτε μήνυμα για να το ανοίξεις.",
      side: "top",
    },
  },
  // Chapter 2 — Editing & Linking (steps 3–6, mixed)
  {
    element: "[data-tour='crm-nav']",
    popover: {
      title: "Βάση επαφών σου",
      description: "Στο CRM βρίσκεις όλες τις επαφές, πελάτες και συνεργάτες σου, οργανωμένους και ασφαλισμένους.",
      side: "right",
    },
  },
  {
    element: "[data-tour='first-contact-row']",
    popover: {
      title: "Επαφές — κάνε κλικ για να ανοίξεις",
      description: "Κάθε επαφή αποθηκεύεται κρυπτογραφημένη. Κάνε κλικ σε αυτήν για να δεις τις λεπτομέρειες.",
      side: "top",
    },
  },
  {
    element: "[data-tour='contact-edit-btn']",
    popover: {
      title: "Επεξεργασία επαφής",
      description: "Κάνε κλικ στο Επεξεργασία για να τροποποιήσεις τα στοιχεία. Οι αλλαγές κρυπτογραφούνται αυτόματα.",
      side: "left",
    },
  },
  {
    element: "[data-tour='link-entity-btn']",
    popover: {
      title: "Σύνδεση οντοτήτων",
      description: "Συνδέεις επαφές με ακίνητα, αιτήματα ή συμφωνίες — δημιουργώντας ένα ολοκληρωμένο ιστορικό.",
      side: "left",
    },
  },
  // Chapter 3 — Importing (steps 7–9, mixed)
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Μαζική εισαγωγή",
      description: "Εισάγεις επαφές ή ακίνητα από CSV με ένα βήμα — το σύστημα αντιστοιχεί τα πεδία αυτόματα.",
      side: "right",
    },
  },
  {
    element: "[data-tour='import-upload-zone']",
    popover: {
      title: "Ανέβασε το αρχείο σου",
      description: "Σύρε ένα CSV ή κάνε κλικ για να επιλέξεις αρχείο. Δοκίμασε τώρα — τα δεδομένα δεν θα αποθηκευτούν στον demo χώρο.",
      side: "top",
    },
  },
  {
    element: "[data-tour='import-execute-btn']",
    popover: {
      title: "Εκτέλεση εισαγωγής",
      description: "Κάνε κλικ για να ξεκινήσει η εισαγωγή. Στον demo χώρο, τα αποτελέσματα είναι προσομοιωμένα.",
      side: "top",
    },
  },
  // Chapter 4 — Create Org CTA (steps 10–11)
  {
    element: "[data-tour='demo-banner-cta']",
    popover: {
      title: "Έτοιμος να ξεκινήσεις;",
      description: "Όταν είσαι έτοιμος, δημιούργησε τον πραγματικό σου οργανισμό και εισήγαγε τα δεδομένα σου.",
      side: "bottom",
    },
  },
  {
    // no element — full-screen completion overlay
    popover: {
      title: "Ολοκλήρωσες τον οδηγό! 🎉",
      description: "Τώρα μπορείς να εξερευνήσεις ελεύθερα τον demo χώρο σου ή να δημιουργήσεις τον πραγματικό σου οργανισμό.",
    },
  },
];

const steps_en: TourStep[] = [
  // Chapter 1 — Orientation (steps 0–2, observational)
  {
    element: "[data-tour='sidebar-nav']",
    popover: {
      title: "Your command centre",
      description: "CRM, MLS, messages, and documents — everything in one place.",
      side: "right",
    },
  },
  {
    element: "[data-tour='oikosync-feed']",
    popover: {
      title: "Live team feed",
      description: "Messages, updates, property pins, and reactions appear here in real time.",
      side: "right",
    },
  },
  {
    element: "[data-tour='first-message']",
    popover: {
      title: "Your team is already active",
      description: "Your demo workspace has pre-loaded activity. Click any message to expand it.",
      side: "top",
    },
  },
  // Chapter 2 — Editing & Linking (steps 3–6, mixed)
  {
    element: "[data-tour='crm-nav']",
    popover: {
      title: "Your contact database",
      description: "All contacts, clients, and partners — organised and encrypted.",
      side: "right",
    },
  },
  {
    element: "[data-tour='first-contact-row']",
    popover: {
      title: "Contacts — click to open",
      description: "Each contact is stored encrypted. Click one to see their full profile.",
      side: "top",
    },
  },
  {
    element: "[data-tour='contact-edit-btn']",
    popover: {
      title: "Edit a contact",
      description: "Click Edit to update contact details. Changes are encrypted automatically.",
      side: "left",
    },
  },
  {
    element: "[data-tour='link-entity-btn']",
    popover: {
      title: "Link entities",
      description: "Connect contacts to properties, requests, or deals — building a complete activity history.",
      side: "left",
    },
  },
  // Chapter 3 — Importing (steps 7–9, mixed)
  {
    element: "[data-tour='import-nav']",
    popover: {
      title: "Bulk import",
      description: "Import contacts or properties from a CSV in one step — fields are mapped automatically.",
      side: "right",
    },
  },
  {
    element: "[data-tour='import-upload-zone']",
    popover: {
      title: "Upload your file",
      description: "Drag a CSV or click to choose a file. Try it now — data won't be saved in the demo.",
      side: "top",
    },
  },
  {
    element: "[data-tour='import-execute-btn']",
    popover: {
      title: "Run the import",
      description: "Click to start the import. In the demo, results are simulated.",
      side: "top",
    },
  },
  // Chapter 4 — Create Org CTA (steps 10–11)
  {
    element: "[data-tour='demo-banner-cta']",
    popover: {
      title: "Ready to start?",
      description: "When you're ready, create your real agency and import your actual data.",
      side: "bottom",
    },
  },
  {
    // no element — full-screen completion overlay
    popover: {
      title: "Tour complete! 🎉",
      description: "You can now explore your demo workspace freely, or create your real agency to get started.",
    },
  },
];

export function getTourSteps(locale: string): TourStep[] {
  return locale === "el" ? steps_el : steps_en;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/demo/tour-steps.ts
git commit -m "feat(demo): add locale-aware Driver.js tour step config"
```

---

## Task 5: lib/demo/seed-demo-org.ts

**Files:**
- Create: `lib/demo/seed-demo-org.ts`
- Create: `tests/lib/demo/seed-demo-org.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/demo/seed-demo-org.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(mockTx);
    }),
    organizationSettings: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/model-encryption", () => ({
  encryptContactForOrg: vi.fn(async (data: unknown) => data),
  encryptPropertyForOrg: vi.fn(async (data: unknown) => data),
  encryptRequestForOrg: vi.fn(async (data: unknown) => data),
}));

const mockTx = {
  channel: { create: vi.fn().mockResolvedValue({ id: "ch_1" }) },
  channelMember: { create: vi.fn() },
  contact: { createMany: vi.fn() },
  properties: { createMany: vi.fn() },
  request: { createMany: vi.fn() },
  message: { createMany: vi.fn() },
  documents: { createMany: vi.fn() },
  contactComment: { createMany: vi.fn() },
  organizationSettings: { upsert: vi.fn() },
};

import { seedDemoOrg } from "@/lib/demo/seed-demo-org";
import { prismadb } from "@/lib/prisma";

describe("seedDemoOrg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockTx).forEach((fn) => {
      if (typeof fn === "object") return;
      (fn as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });
    mockTx.channel.create.mockResolvedValue({ id: "ch_1" });
  });

  it("runs inside a Prisma transaction", async () => {
    await seedDemoOrg("org_test", "user_test", "en");
    expect(prismadb.$transaction).toHaveBeenCalledOnce();
  });

  it("creates a General channel for messages", async () => {
    await seedDemoOrg("org_test", "user_test", "en");
    expect(mockTx.channel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org_test", slug: "general" }),
      })
    );
  });

  it("seeds contacts with the correct organizationId", async () => {
    await seedDemoOrg("org_test", "user_test", "en");
    expect(mockTx.contact.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ organizationId: "org_test" }),
        ]),
      })
    );
  });

  it("seeds properties with the correct organizationId", async () => {
    await seedDemoOrg("org_test", "user_test", "en");
    expect(mockTx.properties.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ organizationId: "org_test" }),
        ]),
      })
    );
  });

  it("marks OrganizationSettings as isDemo: true", async () => {
    await seedDemoOrg("org_test", "user_test", "en");
    expect(mockTx.organizationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_test" },
        create: expect.objectContaining({ isDemo: true }),
        update: expect.objectContaining({ isDemo: true }),
      })
    );
  });

  it("throws when orgId is empty", async () => {
    await expect(seedDemoOrg("", "user_test", "en")).rejects.toThrow("orgId is required");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/lib/demo/seed-demo-org.test.ts
```

Expected: FAIL — `seedDemoOrg` is not defined

- [ ] **Step 3: Implement seed-demo-org.ts**

Create `lib/demo/seed-demo-org.ts`:

```typescript
import { prismadb } from "@/lib/prisma";
import {
  encryptContactForOrg,
  encryptPropertyForOrg,
  encryptRequestForOrg,
} from "@/lib/model-encryption";

const GREEK_AGENCY_NAMES = [
  "Αθηναϊκή Κτηματομεσιτική",
  "Aegean Properties",
  "Αττική Real Estate",
  "Μεσογειακή Ακίνητα",
  "Ελληνική Κτηματαγορά",
  "Πειραϊκή Μεσιτική",
];

const GREEK_NAMES_POOL = [
  { firstName: "Νίκος", lastName: "Παπαδόπουλος" },
  { firstName: "Ελένη", lastName: "Κωνσταντίνου" },
  { firstName: "Γιώργος", lastName: "Αλεξίου" },
  { firstName: "Μαρία", lastName: "Δημητρίου" },
  { firstName: "Κώστας", lastName: "Παπαγεωργίου" },
  { firstName: "Άννα", lastName: "Νικολάου" },
  { firstName: "Δημήτρης", lastName: "Χριστοδούλου" },
  { firstName: "Σοφία", lastName: "Αντωνίου" },
  { firstName: "Πέτρος", lastName: "Γεωργίου" },
  { firstName: "Ευαγγελία", lastName: "Μακρή" },
  { firstName: "Σταύρος", lastName: "Παπανικολάου" },
  { firstName: "Χριστίνα", lastName: "Κουτσούκη" },
];

const EN_NAMES_POOL = [
  { firstName: "Alex", lastName: "Papadopoulos" },
  { firstName: "Elena", lastName: "Konstantinou" },
  { firstName: "George", lastName: "Alexiou" },
  { firstName: "Maria", lastName: "Dimitriou" },
  { firstName: "Kostas", lastName: "Papageorgiou" },
  { firstName: "Anna", lastName: "Nikolaou" },
  { firstName: "Dimitris", lastName: "Christodoulou" },
  { firstName: "Sofia", lastName: "Antoniou" },
  { firstName: "Petros", lastName: "Georgiou" },
  { firstName: "Eva", lastName: "Makri" },
  { firstName: "Stavros", lastName: "Papanikolaou" },
  { firstName: "Christina", lastName: "Koutsouki" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function pickDemoAgencyName(): string {
  return pick(GREEK_AGENCY_NAMES);
}

export async function seedDemoOrg(
  orgId: string,
  userId: string,
  locale: string
): Promise<void> {
  if (!orgId) throw new Error("[seed-demo-org] seedDemoOrg: orgId is required");

  const namePool = locale === "el" ? GREEK_NAMES_POOL : EN_NAMES_POOL;
  const selectedNames = shuffle(namePool).slice(0, 8);

  // Pre-encrypt contact data before the transaction
  const rawContacts = selectedNames.map((name, i) => ({
    organizationId: orgId,
    displayName: `${name.firstName} ${name.lastName}`,
    firstName: name.firstName,
    lastName: name.lastName,
    email: `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}@example.com`,
    primaryPhone: `69${String(10000000 + i * 11111111).slice(0, 8)}`,
    category: i % 3 === 0 ? ["BUYER" as const] : i % 3 === 1 ? ["SELLER" as const] : ["INVESTOR" as const],
    status: "ACTIVE" as const,
    createdBy: userId,
    gdprConsentGiven: true,
    gdprConsentDate: new Date(),
  }));

  const encryptedContacts = await Promise.all(
    rawContacts.map((c) => encryptContactForOrg(c, orgId))
  );

  const rawProperties = [
    { city: "Αθήνα", neighbourhood: "Κολωνάκι", type: "APARTMENT" as const, price: 320000, sqm: 85, bedrooms: 2 },
    { city: "Αθήνα", neighbourhood: "Παγκράτι", type: "APARTMENT" as const, price: 195000, sqm: 68, bedrooms: 2 },
    { city: "Γλυφάδα", neighbourhood: "Γλυφάδα", type: "HOUSE" as const, price: 580000, sqm: 180, bedrooms: 4 },
    { city: "Πειραιάς", neighbourhood: "Πασαλιμάνι", type: "APARTMENT" as const, price: 145000, sqm: 55, bedrooms: 1 },
    { city: "Κηφισιά", neighbourhood: "Κηφισιά", type: "HOUSE" as const, price: 750000, sqm: 220, bedrooms: 5 },
    { city: "Μαρούσι", neighbourhood: "Μαρούσι", type: "APARTMENT" as const, price: 230000, sqm: 90, bedrooms: 3 },
    { city: "Θεσσαλονίκη", neighbourhood: "Κέντρο", type: "APARTMENT" as const, price: 180000, sqm: 75, bedrooms: 2 },
  ].map((p, i) => ({
    id: `demo_prop_${orgId}_${i}`,
    organizationId: orgId,
    title: `${p.type === "APARTMENT" ? "Διαμέρισμα" : "Μονοκατοικία"} ${p.neighbourhood}`,
    price: p.price,
    size_net_sqm: p.sqm,
    bedrooms: p.bedrooms,
    property_type: p.type,
    status: "ACTIVE" as const,
    purpose: "RESIDENTIAL" as const,
    address_city: p.city,
    address_area: p.neighbourhood,
    address_country: "Greece",
    createdBy: userId,
    friendlyId: `DEMO-P${String(i + 1).padStart(3, "0")}`,
  }));

  const encryptedProperties = await Promise.all(
    rawProperties.map((p) => encryptPropertyForOrg(p, orgId))
  );

  const rawRequests = [
    {
      requestType: "BUY" as const,
      propertyCategory: "RESIDENTIAL" as const,
      propertyTypes: ["APARTMENT" as const],
      budgetMin: 150000,
      budgetMax: 280000,
      surfaceMin: 60,
      bedroomsMin: 2,
      title: locale === "el" ? "Αναζήτηση διαμερίσματος Αθήνα" : "Apartment search Athens",
      status: "ACTIVE" as const,
    },
    {
      requestType: "BUY" as const,
      propertyCategory: "RESIDENTIAL" as const,
      propertyTypes: ["HOUSE" as const],
      budgetMin: 400000,
      budgetMax: 700000,
      surfaceMin: 150,
      bedroomsMin: 3,
      title: locale === "el" ? "Αναζήτηση μονοκατοικίας Βόρεια Προάστια" : "House search Northern Suburbs",
      status: "ACTIVE" as const,
    },
    {
      requestType: "RENT" as const,
      propertyCategory: "RESIDENTIAL" as const,
      propertyTypes: ["APARTMENT" as const],
      budgetMin: 600,
      budgetMax: 1000,
      surfaceMin: 50,
      bedroomsMin: 1,
      title: locale === "el" ? "Ενοικίαση διαμερίσματος κέντρο" : "Apartment rental city centre",
      status: "ACTIVE" as const,
    },
  ].map((r, i) => ({
    ...r,
    id: `demo_req_${orgId}_${i}`,
    organizationId: orgId,
    friendlyId: `DEMO-R${String(i + 1).padStart(3, "0")}`,
    createdBy: userId,
  }));

  const encryptedRequests = await Promise.all(
    rawRequests.map((r) => encryptRequestForOrg(r, orgId))
  );

  const messageContents =
    locale === "el"
      ? [
          "Ο πελάτης Παπαδόπουλος θέλει να δει το ακίνητο στο Κολωνάκι αύριο στις 11:00.",
          "Ανανέωσα τα στοιχεία επικοινωνίας για τον Αλεξίου.",
          "Νέα αίτηση από portal — αναθέστε σε διαθέσιμο μεσίτη.",
          "Η σύμβαση για το ακίνητο DEMO-P002 υπογράφηκε. 🎉",
          "Θυμίζω: ανανέωση άδειας ακινήτου DEMO-P005 στις 30/6.",
          "Ο Γεωργίου επιβεβαίωσε το ραντεβού για Παρασκευή.",
          "Εισαγωγή 12 νέων επαφών από την έκθεση ολοκληρώθηκε.",
          "Το ακίνητο DEMO-P003 ανέβηκε στο portal XE.GR.",
          "Νέα αντιστοίχιση: DEMO-R001 ←→ DEMO-P001 (σκορ 87%)",
          "Ο πελάτης Κωνσταντίνου ζητά βεβαίωση ΔΕΗ για το DEMO-P007.",
        ]
      : [
          "Client Papadopoulos wants to view the Kolonaki property tomorrow at 11:00.",
          "Updated contact details for Alexiou.",
          "New lead from portal — assign to available agent.",
          "Contract for property DEMO-P002 signed. 🎉",
          "Reminder: licence renewal for property DEMO-P005 on 30/6.",
          "Georgiou confirmed the Friday appointment.",
          "Import of 12 contacts from the exhibition completed.",
          "Property DEMO-P003 listed on portal.",
          "New match: DEMO-R001 ←→ DEMO-P001 (score 87%)",
          "Client Konstantinou requests utility certificate for DEMO-P007.",
        ];

  await prismadb.$transaction(async (tx) => {
    // 1. Mark as demo org
    await (tx as typeof prismadb).organizationSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, isDemo: true, createdBy: userId },
      update: { isDemo: true },
    });

    // 2. Create a General channel for messages
    const channel = await (tx as typeof prismadb).channel.create({
      data: {
        organizationId: orgId,
        name: locale === "el" ? "Γενικά" : "General",
        slug: "general",
        isDefault: true,
        isE2ee: false,
        createdById: userId,
      },
    });

    // 3. Add user as channel member
    await (tx as typeof prismadb).channelMember.create({
      data: { channelId: channel.id, userId },
    });

    // 4. Seed contacts
    await (tx as typeof prismadb).contact.createMany({ data: encryptedContacts });

    // 5. Seed properties
    await (tx as typeof prismadb).properties.createMany({ data: encryptedProperties });

    // 6. Seed requests
    await (tx as typeof prismadb).request.createMany({ data: encryptedRequests });

    // 7. Seed messages
    await (tx as typeof prismadb).message.createMany({
      data: messageContents.map((content, i) => ({
        organizationId: orgId,
        channelId: channel.id,
        senderId: userId,
        content,
        contentType: "TEXT" as const,
        createdAt: new Date(Date.now() - (messageContents.length - i) * 3_600_000),
      })),
    });

    // 8. Seed documents (2 on properties, 2 on contacts)
    const docBase = {
      organizationId: orgId,
      createdBy: userId,
      created_by_user: userId,
      document_file_mimeType: "application/pdf",
      document_file_url: "https://example.com/demo-placeholder.pdf",
      friendlyId: "",
      document_name: "",
    };

    await (tx as typeof prismadb).documents.createMany({
      data: [
        {
          ...docBase,
          id: `demo_doc_${orgId}_0`,
          friendlyId: `DEMO-D001`,
          document_name: locale === "el" ? "Πιστοποιητικό Ενέργειας" : "Energy Certificate",
          document_system_type: "OTHER" as const,
          linkedPropertiesIds: [`demo_prop_${orgId}_0`],
        },
        {
          ...docBase,
          id: `demo_doc_${orgId}_1`,
          friendlyId: `DEMO-D002`,
          document_name: locale === "el" ? "Κάτοψη Ακινήτου" : "Floor Plan",
          document_system_type: "OTHER" as const,
          linkedPropertiesIds: [`demo_prop_${orgId}_1`],
        },
        {
          ...docBase,
          id: `demo_doc_${orgId}_2`,
          friendlyId: `DEMO-D003`,
          document_name: locale === "el" ? "Συμφωνητικό Εντολής" : "Client Agreement",
          document_system_type: "CONTRACT" as const,
          contactsIDs: [],
        },
        {
          ...docBase,
          id: `demo_doc_${orgId}_3`,
          friendlyId: `DEMO-D004`,
          document_name: locale === "el" ? "Ταυτότητα Πελάτη" : "Client ID Copy",
          document_system_type: "OTHER" as const,
          contactsIDs: [],
        },
      ],
    });

    // 9. Seed comments on documents
    const commentContent =
      locale === "el"
        ? [
            "Ελέγχθηκε — όλα εντάξει.",
            "Χρειάζεται υπογραφή από τον πελάτη.",
            "Εγκρίθηκε από τον νομικό σύμβουλο.",
            "Αναμένουμε επιβεβαίωση από Δ.Ο.Υ.",
            "Εστάλη στον πελάτη για υπογραφή.",
            "Ανανεώνεται κάθε 10 χρόνια — επόμενη ανανέωση 2031.",
          ]
        : [
            "Checked — all in order.",
            "Requires client signature.",
            "Approved by legal counsel.",
            "Awaiting tax office confirmation.",
            "Sent to client for signature.",
            "Renewed every 10 years — next renewal 2031.",
          ];

    await (tx as typeof prismadb).contactComment.createMany({
      data: [
        {
          organizationId: orgId,
          documentId: `demo_doc_${orgId}_0`,
          content: commentContent[0],
          authorId: userId,
        },
        {
          organizationId: orgId,
          documentId: `demo_doc_${orgId}_0`,
          content: commentContent[5],
          authorId: userId,
        },
        {
          organizationId: orgId,
          documentId: `demo_doc_${orgId}_2`,
          content: commentContent[1],
          authorId: userId,
        },
        {
          organizationId: orgId,
          documentId: `demo_doc_${orgId}_2`,
          content: commentContent[4],
          authorId: userId,
        },
        {
          organizationId: orgId,
          documentId: `demo_doc_${orgId}_3`,
          content: commentContent[2],
          authorId: userId,
        },
        {
          organizationId: orgId,
          documentId: `demo_doc_${orgId}_3`,
          content: commentContent[3],
          authorId: userId,
        },
      ],
    });
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/lib/demo/seed-demo-org.test.ts
```

Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/demo/seed-demo-org.ts tests/lib/demo/seed-demo-org.test.ts
git commit -m "feat(demo): add demo org seeder with encrypted entities"
```

---

## Task 6: lib/demo/create-demo-org.ts

**Files:**
- Create: `lib/demo/create-demo-org.ts`

- [ ] **Step 1: Create the module**

Create `lib/demo/create-demo-org.ts`:

```typescript
import { createClerkClient } from "@clerk/backend";
import { seedDemoOrg, pickDemoAgencyName } from "@/lib/demo/seed-demo-org";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export interface CreateDemoOrgResult {
  demoOrgId: string;
}

export async function createDemoOrgForUser(
  userId: string,
  locale: string
): Promise<CreateDemoOrgResult> {
  const agencyName = pickDemoAgencyName();

  const demoOrg = await clerkClient.organizations.createOrganization({
    name: agencyName,
    createdBy: userId,
    publicMetadata: {
      isDemo: true,
      demoSeededAt: new Date().toISOString(),
    },
  });

  await seedDemoOrg(demoOrg.id, userId, locale);

  return { demoOrgId: demoOrg.id };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/demo/create-demo-org.ts
git commit -m "feat(demo): add createDemoOrgForUser helper"
```

---

## Task 7: Wire createDemoOrgForUser into complete-onboarding

**Files:**
- Modify: `actions/user/complete-onboarding.ts`

- [ ] **Step 1: Locate the completion point**

Open `actions/user/complete-onboarding.ts`. Find the section where `onboardingCompleted: true` is written to Clerk `publicMetadata` (around line 177). The pattern currently looks like:

```typescript
await clerkClient.users.updateUser(userId, {
  publicMetadata: { ...existingMeta, onboardingCompleted: true },
});
```

- [ ] **Step 2: Add the demo org creation**

Replace the block above with the following (both the Clerk user update and demo org creation run concurrently, then publicMetadata is updated with `demoOrgId`):

```typescript
import { createDemoOrgForUser } from "@/lib/demo/create-demo-org";

// ... inside the action, replacing the single updateUser call:

const [, { demoOrgId }] = await Promise.all([
  // existing profile work already done above this point
  Promise.resolve(), // placeholder if profile update already ran
  createDemoOrgForUser(userId, params.language),
]);

await clerkClient.users.updateUser(userId, {
  publicMetadata: {
    ...existingMeta,
    onboardingCompleted: true,
    demoOrgId,
    tourStep: 0,
  },
});
```

> **Note:** Read the full function before editing. The exact placement depends on where the Clerk `updateUser` call currently lives. The key requirement: `createDemoOrgForUser` must run after the Clerk user profile exists, and `demoOrgId` must be set on `publicMetadata` in the same `updateUser` call as `onboardingCompleted`.

- [ ] **Step 3: Verify the build passes**

```bash
pnpm build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no TypeScript errors in `actions/user/complete-onboarding.ts`

- [ ] **Step 4: Commit**

```bash
git add actions/user/complete-onboarding.ts
git commit -m "feat(onboarding): create demo org after profile setup completes"
```

---

## Task 8: app/api/user/tour-progress/route.ts

**Files:**
- Create: `app/api/user/tour-progress/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/user/tour-progress/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const bodySchema = z.object({
  step: z.number().int().min(-1),
});

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid step value" }, { status: 400 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const existing = (user.publicMetadata ?? {}) as Record<string, unknown>;

    await clerk.users.updateUser(userId, {
      publicMetadata: { ...existing, tourStep: parsed.data.step },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TOUR_PROGRESS]", error);
    return NextResponse.json({ error: "Failed to update tour progress" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the build**

```bash
pnpm build 2>&1 | grep "tour-progress" | head -5
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/user/tour-progress/route.ts
git commit -m "feat(api): add PATCH /api/user/tour-progress"
```

---

## Task 9: Write simulation guards on API routes

**Files:**
- Modify: `app/api/import/unified/route.ts`
- Modify: `app/api/crm/contacts/[contactId]/route.ts:238`
- Modify: `app/api/mls/properties/[propertyId]/route.ts:56`
- Modify: `app/api/requests/[requestId]/route.ts:268`
- Modify: `app/api/documents/[documentId]/route.ts:128`
- Modify: `app/api/deals/[dealId]/route.ts:292`

- [ ] **Step 1: Guard the unified import route**

In `app/api/import/unified/route.ts`, add this import at the top:

```typescript
import { isDemoOrg } from "@/lib/demo/demo-guard";
```

Inside the `POST` handler, immediately after `const organizationId = await getCurrentOrgId();`, add:

```typescript
if (await isDemoOrg(organizationId)) {
  return NextResponse.json(
    {
      success: true,
      imported: 12,
      skipped: 0,
      errors: [],
      importHistoryId: "demo_import_preview",
    },
    { status: 200 }
  );
}
```

- [ ] **Step 2: Guard the contact DELETE handler**

In `app/api/crm/contacts/[contactId]/route.ts`, add this import:

```typescript
import { isDemoOrg } from "@/lib/demo/demo-guard";
```

Inside `DELETE`, immediately after `const organizationId = await getCurrentOrgId();`, add:

```typescript
if (await isDemoOrg(organizationId)) {
  return NextResponse.json({ success: true }, { status: 200 });
}
```

- [ ] **Step 3: Guard the property DELETE handler**

In `app/api/mls/properties/[propertyId]/route.ts`, add the same import and guard inside `DELETE`, after `const organizationId = await getCurrentOrgId();`:

```typescript
import { isDemoOrg } from "@/lib/demo/demo-guard";

// inside DELETE, after organizationId:
if (await isDemoOrg(organizationId)) {
  return NextResponse.json({ success: true }, { status: 200 });
}
```

- [ ] **Step 4: Guard the request DELETE handler**

In `app/api/requests/[requestId]/route.ts`, same pattern: import `isDemoOrg`, add early return in `DELETE` after `organizationId` is resolved.

- [ ] **Step 5: Guard the document DELETE handler**

In `app/api/documents/[documentId]/route.ts`, same pattern.

- [ ] **Step 6: Guard the deal DELETE handler**

In `app/api/deals/[dealId]/route.ts`, same pattern.

- [ ] **Step 7: Verify the build**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no TypeScript errors

- [ ] **Step 8: Commit**

```bash
git add \
  app/api/import/unified/route.ts \
  app/api/crm/contacts/\[contactId\]/route.ts \
  app/api/mls/properties/\[propertyId\]/route.ts \
  app/api/requests/\[requestId\]/route.ts \
  app/api/documents/\[documentId\]/route.ts \
  app/api/deals/\[dealId\]/route.ts
git commit -m "feat(demo): add write simulation guards on DELETE and import routes"
```

---

## Task 10: components/demo/DemoBanner.tsx

**Files:**
- Create: `components/demo/DemoBanner.tsx`

- [ ] **Step 1: Create the component**

Create `components/demo/DemoBanner.tsx`:

```typescript
"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useDemoMode } from "@/components/demo/DemoModeProvider";

export function DemoBanner() {
  const { isDemoMode, tourStep } = useDemoMode();
  const locale = useLocale();

  if (!isDemoMode) return null;

  const isGreek = locale === "el";
  const inTour = tourStep >= 0;

  return (
    <div className="sticky top-[var(--nav-height,56px)] z-40 flex items-center justify-between gap-4 border-b bg-muted/60 px-4 py-2 text-sm backdrop-blur-sm">
      <span className="text-muted-foreground">
        {isGreek
          ? inTour
            ? "Demo χώρος εργασίας · Τα δεδομένα δεν αποθηκεύονται."
            : "Demo χώρος εργασίας"
          : inTour
            ? "Demo workspace · Your data is not saved."
            : "Demo workspace"}
      </span>
      <Link
        href={`/${locale}/app/create-organization`}
        data-tour="demo-banner-cta"
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {isGreek ? "Δημιούργησε τον οργανισμό σου →" : "Create my agency →"}
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/demo/DemoBanner.tsx
git commit -m "feat(demo): add DemoBanner component"
```

---

## Task 11: components/demo/DemoModeProvider.tsx

**Files:**
- Create: `components/demo/DemoModeProvider.tsx`

- [ ] **Step 1: Create the provider**

Create `components/demo/DemoModeProvider.tsx`:

```typescript
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOrganization } from "@clerk/nextjs";

interface DemoModeContextValue {
  isDemoMode: boolean;
  tourStep: number;
  advanceTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  markActionComplete: (step: number) => void;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  tourStep: -1,
  advanceTour: () => {},
  completeTour: () => {},
  skipTour: () => {},
  markActionComplete: () => {},
});

export function useDemoMode(): DemoModeContextValue {
  return useContext(DemoModeContext);
}

async function patchTourStep(step: number): Promise<void> {
  await fetch("/api/user/tour-progress", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step }),
  });
}

interface DemoModeProviderProps {
  children: React.ReactNode;
  initialTourStep: number;
}

export function DemoModeProvider({
  children,
  initialTourStep,
}: DemoModeProviderProps) {
  const { organization } = useOrganization();
  const isDemoMode = organization?.publicMetadata?.isDemo === true;

  const [tourStep, setTourStep] = useState<number>(initialTourStep);
  const completedActions = useRef<Set<number>>(new Set());

  const advanceTour = useCallback(async () => {
    const next = tourStep + 1;
    setTourStep(next);
    await patchTourStep(next);
  }, [tourStep]);

  const completeTour = useCallback(async () => {
    setTourStep(-1);
    await patchTourStep(-1);
  }, []);

  const skipTour = useCallback(async () => {
    setTourStep(-1);
    await patchTourStep(-1);
  }, []);

  const markActionComplete = useCallback((step: number) => {
    completedActions.current.add(step);
  }, []);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode,
      tourStep,
      advanceTour,
      completeTour,
      skipTour,
      markActionComplete,
    }),
    [isDemoMode, tourStep, advanceTour, completeTour, skipTour, markActionComplete]
  );

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/demo/DemoModeProvider.tsx
git commit -m "feat(demo): add DemoModeProvider context"
```

---

## Task 12: components/demo/TourController.tsx

**Files:**
- Create: `components/demo/TourController.tsx`

- [ ] **Step 1: Create the controller**

Create `components/demo/TourController.tsx`:

```typescript
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useDemoMode } from "@/components/demo/DemoModeProvider";
import { getTourSteps, ACTION_REQUIRED_STEPS } from "@/lib/demo/tour-steps";
import type { Config } from "driver.js";

export function TourController() {
  const { isDemoMode, tourStep, advanceTour, completeTour, skipTour, markActionComplete } =
    useDemoMode();
  const locale = useLocale();
  const pathname = usePathname();
  const driverRef = useRef<ReturnType<typeof import("driver.js")["driver"]> | null>(null);

  useEffect(() => {
    if (!isDemoMode || tourStep < 0) return;

    let destroyed = false;

    async function initDriver() {
      const { driver } = await import("driver.js");
      await import("driver.js/dist/driver.css");

      if (destroyed) return;

      const steps = getTourSteps(locale);

      // Destroy any existing instance before reinitialising (handles route changes)
      driverRef.current?.destroy();

      const config: Config = {
        showProgress: true,
        allowClose: true,
        steps: steps.map((s) => ({
          element: s.element,
          popover: {
            ...s.popover,
            showButtons: ["next", "previous", "close"],
          },
        })),
        onNextClick: () => {
          const current = driverRef.current?.getActiveIndex() ?? 0;
          const isActionRequired = (ACTION_REQUIRED_STEPS as readonly number[]).includes(current);
          if (isActionRequired) {
            // Visual feedback: shake the Next button
            const btn = document.querySelector(".driver-popover-next-btn") as HTMLElement | null;
            btn?.classList.add("animate-shake");
            setTimeout(() => btn?.classList.remove("animate-shake"), 400);
            return;
          }
          if (current >= steps.length - 1) {
            completeTour();
            driverRef.current?.destroy();
          } else {
            advanceTour();
            driverRef.current?.moveNext();
          }
        },
        onCloseClick: () => {
          skipTour();
          driverRef.current?.destroy();
        },
        onDestroyStarted: () => {
          if (!driverRef.current?.hasNextStep()) {
            completeTour();
          }
        },
      };

      const d = driver(config);
      driverRef.current = d;
      d.drive(tourStep);

      // Register action completion listeners
      setupActionListeners(markActionComplete);
    }

    initDriver();

    return () => {
      destroyed = true;
      driverRef.current?.destroy();
    };
  // Re-run when pathname changes so Driver.js targets exist in the new page's DOM
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, pathname, locale]);

  return null;
}

function setupActionListeners(markActionComplete: (step: number) => void) {
  // Step 4 (0-indexed): user opens a contact row
  document.querySelector("[data-tour='first-contact-row']")?.addEventListener(
    "click",
    () => markActionComplete(4),
    { once: true }
  );

  // Step 5: user opens the edit panel
  document.querySelector("[data-tour='contact-edit-btn']")?.addEventListener(
    "click",
    () => markActionComplete(5),
    { once: true }
  );

  // Step 8: file input receives a file
  const fileInput = document.querySelector(
    "[data-tour='import-upload-zone'] input[type='file']"
  ) as HTMLInputElement | null;
  fileInput?.addEventListener("change", () => markActionComplete(8), { once: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add components/demo/TourController.tsx
git commit -m "feat(demo): add TourController with Driver.js integration"
```

---

## Task 13: Wire DemoModeProvider into (routes)/layout.tsx

**Files:**
- Modify: `app/[locale]/app/(routes)/layout.tsx`

- [ ] **Step 1: Read the current layout**

Open `app/[locale]/app/(routes)/layout.tsx` and identify where `children` is rendered.

- [ ] **Step 2: Add the provider and banner**

Add these imports at the top:

```typescript
import { auth } from "@clerk/nextjs/server";
import { DemoModeProvider } from "@/components/demo/DemoModeProvider";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { TourController } from "@/components/demo/TourController";
```

Inside the layout's server component function, read the tour step from Clerk user metadata:

```typescript
const { sessionClaims } = await auth();
const tourStep = typeof sessionClaims?.publicMetadata?.tourStep === "number"
  ? (sessionClaims.publicMetadata.tourStep as number)
  : -1;
```

Wrap the existing `children` render with:

```typescript
<DemoModeProvider initialTourStep={tourStep}>
  <DemoBanner />
  <TourController />
  {/* existing layout children */}
</DemoModeProvider>
```

- [ ] **Step 3: Verify the build**

```bash
pnpm build 2>&1 | grep "error TS" | head -10
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/layout.tsx
git commit -m "feat(demo): wire DemoModeProvider and TourController into routes layout"
```

---

## Task 14: Add data-tour attributes to target components

**Files:** Various existing components (read each one to find the right element)

The goal: add `data-tour="<value>"` to the exact DOM element that Driver.js will spotlight. Do not add extra wrappers or change any styling.

- [ ] **Step 1: Sidebar nav**

Find the sidebar navigation container (likely in `components/layout/Sidebar.tsx` or similar). Add `data-tour="sidebar-nav"` to the outermost `<nav>` or sidebar wrapper element.

Run: `grep -rn "sidebar\|Sidebar\|side-nav" app/\[locale\]/app/\(routes\)/layout.tsx components/` to locate the file.

- [ ] **Step 2: Oikosync feed**

Find the Oikosync/messages feed container. Add `data-tour="oikosync-feed"` to the feed wrapper.

Run: `grep -rn "oikosync\|OikosyncFeed\|MessageFeed\|social-feed" components/ app/` to locate.

- [ ] **Step 3: First message item**

Find the component that renders a single message row/card in the feed. Add `data-tour="first-message"` to the **first rendered item only** — use a conditional like `index === 0 ? { "data-tour": "first-message" } : {}`.

- [ ] **Step 4: CRM nav item**

Find the sidebar nav item that links to `/crm` or `/contacts`. Add `data-tour="crm-nav"` to that `<a>` or `<Link>` element.

- [ ] **Step 5: First contact row**

Find the component that renders a single contact row in the contacts list. Add `data-tour="first-contact-row"` to the first row only (same conditional pattern as Step 3).

- [ ] **Step 6: Contact edit button**

Find the Edit button on the contact detail/view page. Add `data-tour="contact-edit-btn"` to the `<Button>` element.

- [ ] **Step 7: Link entity button**

Find the "Link" or "Add link" button on the contact detail page. Add `data-tour="link-entity-btn"`.

- [ ] **Step 8: Import nav item**

Find the sidebar nav item that links to `/import`. Add `data-tour="import-nav"`.

- [ ] **Step 9: Import upload zone**

Find the file drop zone on the import page. Add `data-tour="import-upload-zone"` to the drop zone wrapper.

- [ ] **Step 10: Import execute button**

Find the "Start Import" / "Execute" button on the import review step. Add `data-tour="import-execute-btn"`.

- [ ] **Step 11: Commit**

```bash
git add -p  # stage only the data-tour attribute changes
git commit -m "feat(demo): add data-tour target attributes to tour-spotlighted elements"
```

---

## Task 15: app/api/cron/cleanup-demo-orgs/route.ts

**Files:**
- Create: `app/api/cron/cleanup-demo-orgs/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the cron route**

Create `app/api/cron/cleanup-demo-orgs/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { prismadb } from "@/lib/prisma";

const _HMAC_KEY = Buffer.alloc(32);
function verifyAuthToken(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = createHmac("sha256", _HMAC_KEY).update(`Bearer ${expected}`).digest();
  const b = createHmac("sha256", _HMAC_KEY).update(provided).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const staleSettings = await prismadb.organizationSettings.findMany({
    where: {
      isDemo: true,
      createdAt: { lt: thirtyDaysAgo },
    },
    select: { organizationId: true },
  });

  if (staleSettings.length === 0) {
    return NextResponse.json({ ok: true, purged: 0 });
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  let purged = 0;
  let errors = 0;

  for (const { organizationId } of staleSettings) {
    try {
      // Delete seeded data by organizationId (no single cascade root)
      await prismadb.$transaction([
        prismadb.message.deleteMany({ where: { organizationId } }),
        prismadb.contactComment.deleteMany({ where: { organizationId } }),
        prismadb.documents.deleteMany({ where: { organizationId } }),
        prismadb.request.deleteMany({ where: { organizationId } }),
        prismadb.contact.deleteMany({ where: { organizationId } }),
        prismadb.properties.deleteMany({ where: { organizationId } }),
        prismadb.channel.deleteMany({ where: { organizationId } }),
        prismadb.organizationSettings.delete({ where: { organizationId } }),
      ]);
      await clerk.organizations.deleteOrganization(organizationId);
      purged++;
    } catch (err) {
      console.error("[CRON cleanup-demo-orgs] Failed to purge org", organizationId, err);
      errors++;
    }
  }

  console.log(`[CRON cleanup-demo-orgs] purged=${purged} errors=${errors}`);
  return NextResponse.json({ ok: true, purged, errors });
}
```

- [ ] **Step 2: Add the cron entry to vercel.json**

Open `vercel.json`. Find the `"crons"` array and append:

```json
{ "path": "/api/cron/cleanup-demo-orgs", "schedule": "0 3 * * *" }
```

The final `crons` array should look like:

```json
"crons": [
  { "path": "/api/cron/reminders", "schedule": "0 8 * * *" },
  { "path": "/api/cron/cross-org-matches", "schedule": "0 4 * * *" },
  { "path": "/api/cron/cleanup-orphan-images", "schedule": "0 3 * * *" },
  { "path": "/api/cron/intra-org-matches", "schedule": "0 5 * * *" },
  { "path": "/api/cron/cleanup-demo-orgs", "schedule": "0 3 * * *" }
]
```

- [ ] **Step 3: Verify the build**

```bash
pnpm build 2>&1 | grep "cleanup-demo" | head -5
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/cleanup-demo-orgs/route.ts vercel.json
git commit -m "feat(cron): add daily cleanup for stale demo orgs"
```

---

## Task 16: Manual verification checklist

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Create a new test account and complete onboarding**

Navigate to `/register`, create a fresh account, complete all onboarding steps. Verify:
- After redirect, the active org has a Greek agency name
- `DemoBanner` is visible below the top nav
- Driver.js tour starts automatically on step 0

- [ ] **Step 3: Walk through the tour**

- Steps 1–3 (observational): click Next — verify spotlight moves correctly
- Step 5 (contact row): verify Next is blocked until you click the row
- Step 6 (edit button): verify Next is blocked until you click Edit
- Step 9 (file upload): verify Next is blocked until you select a file
- Step 10 (import execute): click the button — verify mock success response appears

- [ ] **Step 4: Verify write simulation**

While in demo mode, attempt to delete a contact — verify the contact is still present after the action (mock 200 was returned, no actual delete).

- [ ] **Step 5: Verify tour completion overlay**

Reach step 12 — verify the full-screen overlay shows "Create my agency" and "Keep exploring" CTAs.

- [ ] **Step 6: Verify "Keep exploring" persists the sandbox**

Click "Keep exploring" — verify the banner text changes to the shorter form and the tour is gone.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: demo sandbox onboarding tour — complete implementation"
```
