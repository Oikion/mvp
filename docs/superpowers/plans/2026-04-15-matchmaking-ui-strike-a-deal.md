# Matchmaking UI Upgrade — "Strike a Deal" Quick Action

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Matchmaking dashboard so each Request×Property match card displays all linked contacts with avatars, and adds a "Strike a Deal" quick action that atomically creates a deal pre-filled from the match context and auto-adds property-linked persons as deal parties.

**Architecture:** A new `strikeDeal` server action handles the atomic transaction (deal + all parties in one `$transaction`). The `getPersistedMatches` query is expanded to return all request contacts (with contact IDs for deal-party creation) and the property owner. A new `StrikeDealDialog` client component wraps the action call behind a confirmation UI with role checkboxes.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma, `@prisma/client`, shadcn/ui (`Dialog`, `Avatar`, `Checkbox`, `Badge`), `useTransition`, `useAppToast`, `next-intl`.

---

## File Map

| Status | File | Responsibility |
|--------|------|----------------|
| Modify | `actions/matchmaking/get-persisted-matches.ts` | Remove `take: 1`, add contact IDs, add property owner fields |
| Create | `actions/matchmaking/strike-deal.ts` | Atomic deal + DealParty creation in `$transaction` |
| Modify | `app/[locale]/app/(routes)/matchmaking/components/RequestMatchesTab.tsx` | Contact avatar stack, "Strike a Deal" button, wire dialog |
| Create | `app/[locale]/app/(routes)/matchmaking/components/StrikeDealDialog.tsx` | Dialog UI — contact selection, role assignment, submit |
| Modify | `locales/el/matchmaking.json` | Greek i18n keys for Strike a Deal dialog |
| Modify | `locales/en/matchmaking.json` | English i18n keys for Strike a Deal dialog |

---

## Task 1: Expand `getPersistedMatches` — all contacts + property owner

**Files:**
- Modify: `actions/matchmaking/get-persisted-matches.ts`

- [ ] **Step 1.1: Update `PersistedMatchItem` interface**

Replace the entire interface at the top of the file (lines 7–35):

```typescript
export interface PersistedMatchItem {
  id: string;
  propertyId: string;
  requestId: string;
  matchScore: number;
  scoreBreakdown: Record<string, unknown> | null;
  status: string;
  property: {
    id: string;
    friendlyId: string | null;
    property_name: string | null;
    price: number | null;
    bedrooms: number | null;
    area: string | null;
    address_city: string | null;
    owner: {
      id: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
  request: {
    id: string;
    friendlyId: string | null;
    title: string | null;
    requestContacts: {
      contact: {
        id: string;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
      };
    }[];
  };
}
```

- [ ] **Step 1.2: Update the Prisma query — remove `take: 1`, add `id` to contacts, add owner select**

Replace the `request` and `property` select blocks inside the `findMany` call:

```typescript
      property: {
        select: {
          id: true,
          friendlyId: true,
          property_name: true,
          price: true,
          bedrooms: true,
          area: true,
          address_city: true,
          owner: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      request: {
        select: {
          id: true,
          friendlyId: true,
          title: true,
          requestContacts: {
            // removed take: 1 — return all linked contacts
            select: {
              contact: {
                select: {
                  id: true,
                  displayName: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
```

- [ ] **Step 1.3: Update the `.map()` to include owner and contact IDs**

Replace the `property` and `request` mapping in the `rows.map()` at the bottom:

```typescript
    property: {
      id: row.property.id,
      friendlyId: row.property.friendlyId,
      property_name: row.property.property_name,
      price: row.property.price != null ? Number(row.property.price) : null,
      bedrooms: row.property.bedrooms,
      area: row.property.area,
      address_city: row.property.address_city,
      owner: row.property.owner
        ? {
            id: row.property.owner.id,
            displayName: row.property.owner.displayName,
            firstName: row.property.owner.firstName,
            lastName: row.property.owner.lastName,
          }
        : null,
    },
    request: {
      id: row.request.id,
      friendlyId: row.request.friendlyId,
      title: row.request.title,
      requestContacts: row.request.requestContacts,
    },
```

- [ ] **Step 1.4: Check TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP
npx tsc --noEmit 2>&1 | grep -E "get-persisted-matches|PersistedMatchItem" | head -20
```

Expected: no errors related to these files.

- [ ] **Step 1.5: Commit**

```bash
git add actions/matchmaking/get-persisted-matches.ts
git commit -m "feat(matchmaking): expand getPersistedMatches — all contacts + property owner"
```

---

## Task 2: New `strikeDeal` server action

**Files:**
- Create: `actions/matchmaking/strike-deal.ts`

> This action MUST live in `actions/matchmaking/` so it is scoped to matchmaking permissions. It creates a deal and adds all deal parties atomically in a single `$transaction`.

- [ ] **Step 2.1: Write the action file**

Create `actions/matchmaking/strike-deal.ts`:

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, actionNotFound, actionValidationError, type ActionResponse } from "@/lib/action-response";
import { generateFriendlyId } from "@/lib/friendly-id";
import { z } from "zod";
import type { Deal } from "@prisma/client";

const strikeDealSchema = z
  .object({
    propertyId: z.string().min(1),
    requestId: z.string().min(1),
    parties: z
      .array(
        z.object({
          contactId: z.string().min(1),
          role: z.enum([
            "BUYER",
            "SELLER",
            "TENANT",
            "LANDLORD",
            "BUYER_AGENT",
            "LISTING_AGENT",
            "NOTARY",
            "LAWYER",
            "ACCOUNTANT",
            "GUARANTOR",
            "REPRESENTATIVE",
            "OTHER",
          ]),
        })
      )
      .min(1, "At least one party is required"),
  })
  .strict();

export type StrikeDealInput = z.infer<typeof strikeDealSchema>;

export async function strikeDeal(
  input: unknown
): Promise<ActionResponse<{ deal: Deal; friendlyId: string }>> {
  // 1. Permission guards — need both deal:create AND deal:manage_parties
  const guard1 = await requireAction("deal:create");
  if (guard1) return guard1;
  const guard2 = await requireAction("deal:manage_parties");
  if (guard2) return guard2;

  // 2. Org context
  const organizationId = await getCurrentOrgId();
  const currentUser = await getCurrentUser();

  // 3. Validate input
  const validation = strikeDealSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError("Validation failed", validation.error.flatten().fieldErrors);
  }

  const { propertyId, requestId, parties } = validation.data;

  // 4. Verify property belongs to org
  const property = await prismadb.properties.findFirst({
    where: { id: propertyId, organizationId },
    select: { id: true, property_name: true },
  });
  if (!property) return actionNotFound("Property");

  // 5. Verify request belongs to org
  const request = await prismadb.request.findFirst({
    where: { id: requestId, organizationId },
    select: { id: true },
  });
  if (!request) return actionNotFound("Request");

  // 6. Verify all contact IDs belong to org
  const contactIds = parties.map((p) => p.contactId);
  const contacts = await prismadb.contact.findMany({
    where: { id: { in: contactIds }, organizationId },
    select: { id: true },
  });
  if (contacts.length !== contactIds.length) {
    return actionError("One or more contacts not found", "NOT_FOUND");
  }

  try {
    const friendlyId = await generateFriendlyId("deal");

    const result = await prismadb.$transaction(async (tx) => {
      // Create the deal
      const deal = await tx.deal.create({
        data: {
          friendlyId,
          organizationId,
          propertyId,
          requestId,
          stage: "INTEREST",
          createdById: currentUser?.id ?? null,
          title: property.property_name
            ? `Deal: ${property.property_name}`
            : undefined,
        },
      });

      // Create initial stage log
      await tx.dealStageLog.create({
        data: {
          dealId: deal.id,
          organizationId,
          fromStage: null,
          toStage: "INTEREST",
          changedById: currentUser?.id ?? null,
        },
      });

      // Add all parties atomically
      await tx.dealParty.createMany({
        data: parties.map((p) => ({
          dealId: deal.id,
          organizationId,
          contactId: p.contactId,
          role: p.role,
        })),
        skipDuplicates: true,
      });

      return deal;
    });

    return actionSuccess({ deal: result, friendlyId: result.friendlyId ?? result.id });
  } catch (error) {
    console.error("[STRIKE_DEAL]", error);
    return actionError("Failed to create deal", error);
  }
}
```

- [ ] **Step 2.2: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP
npx tsc --noEmit 2>&1 | grep -E "strike-deal" | head -20
```

Expected: no errors.

- [ ] **Step 2.3: Commit**

```bash
git add actions/matchmaking/strike-deal.ts
git commit -m "feat(matchmaking): add strikeDeal server action — atomic deal + parties in \$transaction"
```

---

## Task 3: Add i18n keys for Strike a Deal dialog

**Files:**
- Modify: `locales/el/matchmaking.json`
- Modify: `locales/en/matchmaking.json`

- [ ] **Step 3.1: Add Greek keys to `locales/el/matchmaking.json`**

Add the following block **inside the top-level object**, after the `"hotProperties"` block (before the closing `}`):

```json
  "strikeDeal": {
    "button": "Σύναψη Συμφωνίας",
    "dialogTitle": "Σύναψη Συμφωνίας",
    "dialogDescription": "Επιλέξτε τα μέρη που θα συμμετέχουν στη συμφωνία. Το ακίνητο και το αίτημα θα συνδεθούν αυτόματα.",
    "partiesSection": "Μέρη Συμφωνίας",
    "requestContacts": "Επαφές Αιτήματος",
    "propertyOwner": "Ιδιοκτήτης Ακινήτου",
    "autoAdded": "Αυτόματη Προσθήκη",
    "roleLabel": "Ρόλος",
    "roles": {
      "BUYER": "Αγοραστής",
      "SELLER": "Πωλητής",
      "TENANT": "Ενοικιαστής",
      "LANDLORD": "Εκμισθωτής",
      "BUYER_AGENT": "Μεσίτης Αγοραστή",
      "LISTING_AGENT": "Μεσίτης Πωλητή",
      "NOTARY": "Συμβολαιογράφος",
      "LAWYER": "Δικηγόρος",
      "ACCOUNTANT": "Λογιστής",
      "GUARANTOR": "Εγγυητής",
      "REPRESENTATIVE": "Εκπρόσωπος",
      "OTHER": "Άλλο"
    },
    "submit": "Σύναψη Συμφωνίας",
    "submitting": "Δημιουργία...",
    "cancel": "Ακύρωση",
    "success": "Η συμφωνία δημιουργήθηκε επιτυχώς",
    "successHint": "Μπορείτε να προσθέσετε περισσότερα μέρη από τη σελίδα της συμφωνίας.",
    "viewDeal": "Προβολή Συμφωνίας",
    "noBuyers": "Δεν υπάρχουν επαφές αγοραστή"
  }
```

- [ ] **Step 3.2: Add English keys to `locales/en/matchmaking.json`**

Add the identical block with English values **inside the top-level object**, after the `"hotProperties"` block:

```json
  "strikeDeal": {
    "button": "Strike a Deal",
    "dialogTitle": "Strike a Deal",
    "dialogDescription": "Select the parties to include in this deal. The property and request will be linked automatically.",
    "partiesSection": "Deal Parties",
    "requestContacts": "Request Contacts",
    "propertyOwner": "Property Owner",
    "autoAdded": "Auto-added",
    "roleLabel": "Role",
    "roles": {
      "BUYER": "Buyer",
      "SELLER": "Seller",
      "TENANT": "Tenant",
      "LANDLORD": "Landlord",
      "BUYER_AGENT": "Buyer's Agent",
      "LISTING_AGENT": "Listing Agent",
      "NOTARY": "Notary",
      "LAWYER": "Lawyer",
      "ACCOUNTANT": "Accountant",
      "GUARANTOR": "Guarantor",
      "REPRESENTATIVE": "Representative",
      "OTHER": "Other"
    },
    "submit": "Strike a Deal",
    "submitting": "Creating...",
    "cancel": "Cancel",
    "success": "Deal created successfully",
    "successHint": "You can add more parties from the deal page.",
    "viewDeal": "View Deal",
    "noBuyers": "No buyer contacts on this request"
  }
```

- [ ] **Step 3.3: Commit**

```bash
git add locales/el/matchmaking.json locales/en/matchmaking.json
git commit -m "feat(matchmaking): add i18n keys for Strike a Deal dialog"
```

---

## Task 4: Create `StrikeDealDialog` component

**Files:**
- Create: `app/[locale]/app/(routes)/matchmaking/components/StrikeDealDialog.tsx`

This is a **client component** that:
1. Shows a dialog triggered by a "Strike a Deal" button
2. Lists request contacts with their default role pre-selected (BUYER for purchase requests, TENANT for rental)
3. Auto-adds the property owner as SELLER (visually distinct, not removable)
4. Allows changing each party's role via a Select
5. Submits to `strikeDeal` server action and navigates to the new deal on success

- [ ] **Step 4.1: Create the component**

Create `app/[locale]/app/(routes)/matchmaking/components/StrikeDealDialog.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Handshake, User, Star } from "lucide-react";
import { strikeDeal } from "@/actions/matchmaking/strike-deal";
import { useAppToast } from "@/hooks/use-app-toast";
import type { PersistedMatchItem } from "@/actions/matchmaking/get-persisted-matches";

type DealPartyRole =
  | "BUYER"
  | "SELLER"
  | "TENANT"
  | "LANDLORD"
  | "BUYER_AGENT"
  | "LISTING_AGENT"
  | "NOTARY"
  | "LAWYER"
  | "ACCOUNTANT"
  | "GUARANTOR"
  | "REPRESENTATIVE"
  | "OTHER";

interface PartyEntry {
  contactId: string;
  name: string;
  role: DealPartyRole;
  isOwner: boolean;
}

function getContactInitials(
  displayName: string | null,
  firstName: string | null,
  lastName: string | null
): string {
  if (displayName) return displayName.slice(0, 2).toUpperCase();
  const parts = [firstName, lastName].filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.map((p) => p![0]).join("").toUpperCase();
}

function getContactDisplayName(
  displayName: string | null,
  firstName: string | null,
  lastName: string | null
): string {
  if (displayName) return displayName;
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}

interface Props {
  match: PersistedMatchItem;
  locale: string;
}

const DEAL_PARTY_ROLES: DealPartyRole[] = [
  "BUYER",
  "SELLER",
  "TENANT",
  "LANDLORD",
  "BUYER_AGENT",
  "LISTING_AGENT",
  "NOTARY",
  "LAWYER",
  "ACCOUNTANT",
  "GUARANTOR",
  "REPRESENTATIVE",
  "OTHER",
];

export function StrikeDealDialog({ match, locale }: Props) {
  const t = useTranslations("matchmaking");
  const router = useRouter();
  const { toast } = useAppToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Build initial party list
  function buildInitialParties(): PartyEntry[] {
    const parties: PartyEntry[] = [];

    // Request contacts → default BUYER
    for (const rc of match.request.requestContacts) {
      parties.push({
        contactId: rc.contact.id,
        name: getContactDisplayName(rc.contact.displayName, rc.contact.firstName, rc.contact.lastName),
        role: "BUYER",
        isOwner: false,
      });
    }

    // Property owner → default SELLER, prepended (or appended if no contacts)
    if (match.property.owner) {
      // Avoid duplicate if owner is somehow also in requestContacts
      const ownerAlreadyAdded = parties.some((p) => p.contactId === match.property.owner!.id);
      if (!ownerAlreadyAdded) {
        parties.push({
          contactId: match.property.owner.id,
          name: getContactDisplayName(
            match.property.owner.displayName,
            match.property.owner.firstName,
            match.property.owner.lastName
          ),
          role: "SELLER",
          isOwner: true,
        });
      }
    }

    return parties;
  }

  const [parties, setParties] = useState<PartyEntry[]>(buildInitialParties);

  // Reset parties when dialog opens
  function handleOpenChange(value: boolean) {
    if (value) setParties(buildInitialParties());
    setOpen(value);
  }

  function updateRole(contactId: string, role: DealPartyRole) {
    setParties((prev) =>
      prev.map((p) => (p.contactId === contactId ? { ...p, role } : p))
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await strikeDeal({
        propertyId: match.propertyId,
        requestId: match.requestId,
        parties: parties.map((p) => ({ contactId: p.contactId, role: p.role })),
      });

      if (!result.success) {
        toast({
          title: result.error ?? "Error",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("strikeDeal.success"),
        description: t("strikeDeal.successHint"),
      });
      setOpen(false);
      router.push(`/${locale}/app/deals/${result.data!.friendlyId}`);
    });
  }

  const hasParties = parties.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Handshake className="h-4 w-4" />
          {t("strikeDeal.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            {t("strikeDeal.dialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("strikeDeal.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("strikeDeal.partiesSection")}
          </p>

          {!hasParties && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("strikeDeal.noBuyers")}
            </p>
          )}

          <div className="space-y-2">
            {parties.map((party) => (
              <div
                key={party.contactId}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={party.isOwner ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}>
                    {party.isOwner ? (
                      <Star className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{party.name}</p>
                  {party.isOwner && (
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {t("strikeDeal.autoAdded")}
                    </Badge>
                  )}
                </div>

                <Select
                  value={party.role}
                  onValueChange={(v) => updateRole(party.contactId, v as DealPartyRole)}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_PARTY_ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="text-xs">
                        {t(`strikeDeal.roles.${role}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {t("strikeDeal.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !hasParties}
            className="gap-1.5"
          >
            <Handshake className="h-4 w-4" />
            {isPending ? t("strikeDeal.submitting") : t("strikeDeal.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4.2: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP
npx tsc --noEmit 2>&1 | grep -E "StrikeDealDialog" | head -20
```

Expected: no errors.

- [ ] **Step 4.3: Commit**

```bash
git add app/[locale]/app/\(routes\)/matchmaking/components/StrikeDealDialog.tsx
git commit -m "feat(matchmaking): add StrikeDealDialog component with role assignment"
```

---

## Task 5: Upgrade match cards in `RequestMatchesTab` — contact avatar stack + Strike a Deal button

**Files:**
- Modify: `app/[locale]/app/(routes)/matchmaking/components/RequestMatchesTab.tsx`

This task updates `PersistedMatchesGrid` (private sub-component at bottom of file) to:
1. Display an avatar stack showing all linked contacts (up to 3 avatars + overflow count)
2. Replace the placeholder "View Request" primary action area with the `StrikeDealDialog`
3. Keep "View Request" and "View Property" as secondary links

- [ ] **Step 5.1: Add `StrikeDealDialog` import and `ContactAvatarStack` helper**

At the top of `RequestMatchesTab.tsx`, add to the existing imports:

```typescript
import { StrikeDealDialog } from "./StrikeDealDialog";
```

Add the `ContactAvatarStack` helper function **above** `PersistedMatchesGrid` (around line 201):

```typescript
function getContactName(contact: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  if (contact.displayName) return contact.displayName;
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "?";
}

function getContactInitials(contact: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  const name = getContactName(contact);
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function ContactAvatarStack({
  contacts,
  maxVisible = 3,
}: {
  contacts: { contact: { displayName: string | null; firstName: string | null; lastName: string | null } }[];
  maxVisible?: number;
}) {
  const visible = contacts.slice(0, maxVisible);
  const overflow = contacts.length - maxVisible;

  if (contacts.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {visible.map((rc, i) => (
          <Avatar key={i} className="h-6 w-6 border-2 border-background">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {getContactInitials(rc.contact)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {overflow > 0 && (
        <span className="text-xs text-muted-foreground">+{overflow}</span>
      )}
      <span className="text-xs text-muted-foreground ml-1">
        {visible.map((rc) => getContactName(rc.contact)).join(", ")}
        {overflow > 0 ? `, +${overflow}` : ""}
      </span>
    </div>
  );
}
```

- [ ] **Step 5.2: Update `PersistedMatchesGrid` match card JSX**

Inside `PersistedMatchesGrid`, in the `matches.map()` block, replace the **Request Info** section and **Actions** section.

Find the **Request Info** section (the `<div className="flex items-center gap-3 flex-1 min-w-0">` block that contains the Avatar with FileText icon). Replace it with:

```tsx
            {/* Request Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <Link
                  href={`/${locale}/app/requests/${match.request.friendlyId ?? match.requestId}`}
                  className="font-medium hover:text-primary truncate block"
                >
                  {requestName}
                </Link>
                <div className="mt-1">
                  <ContactAvatarStack contacts={match.request.requestContacts} />
                </div>
              </div>
            </div>
```

Find the **Actions** section (the `<div className="flex gap-2 shrink-0">` at the end of each match card). Replace it with:

```tsx
            {/* Actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <StrikeDealDialog match={match} locale={locale} />
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/app/requests/${match.request.friendlyId ?? match.requestId}`}>
                  {t("requestMatches.topMatches.viewRequest")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/app/mls/properties/${match.property.friendlyId ?? match.propertyId}`}>
                  {t("topMatches.viewProperty")}
                </Link>
              </Button>
            </div>
```

- [ ] **Step 5.3: Verify TypeScript compiles clean**

```bash
cd /Users/stapo/Desktop/Oikion/MVP
npx tsc --noEmit 2>&1 | grep -E "RequestMatchesTab|StrikeDealDialog|PersistedMatchesGrid" | head -20
```

Expected: no errors.

- [ ] **Step 5.4: Commit**

```bash
git add "app/[locale]/app/(routes)/matchmaking/components/RequestMatchesTab.tsx"
git commit -m "feat(matchmaking): show all request contacts as avatar stack + Strike a Deal button"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: All 4 stated goals addressed — multi-contact display, Strike a Deal action, deal pre-fill from match, property owner auto-added as SELLER
- [x] **Atomic transaction**: `strikeDeal` uses `$transaction` for deal + DealStageLog + DealParty in one round-trip
- [x] **Security**: `strikeDeal` verifies property, request, and all contacts belong to the org before the transaction
- [x] **Tenant isolation**: All writes include `organizationId`; all reads filter by it
- [x] **i18n**: Both `el` and `en` locale files updated with identical key structure
- [x] **Type safety**: `PersistedMatchItem` interface updated to include contact IDs and owner; `StrikeDealInput` is exported for potential reuse
- [x] **Property owner edge case**: Owner deduplication check in `buildInitialParties()` prevents double-add if owner is also in requestContacts
- [x] **No co-owner/lawyer on Properties model**: Correctly documented — only `ownerId` FK exists. Users can add these roles manually from the deal page.
- [x] **Placeholder scan**: No TBD/TODO entries — all steps contain complete code
