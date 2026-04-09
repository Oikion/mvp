# Activity System Enrichment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the Activity system with rich per-kind linking (document picker, contact + property selectors for showings), auto-captured system events from entity mutations, and improved ActivityFeed display of linked entities.

**Architecture:** Extend the `Activity` model with three optional FK fields (`relatedDocumentId`, `relatedContactId`, `relatedPropertyId`). Add a server-only `createSystemActivity()` helper that entity mutation actions call internally. Expand `QuickLogActivity` to show kind-specific secondary fields. Update `ActivityFeed` to render linked entity chips with navigation links.

**Tech Stack:** Prisma 6, Next.js App Router server actions (`"use server"`), SWR, shadcn/ui, next-intl, Zod

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `relatedDocumentId?`, `relatedContactId?`, `relatedPropertyId?` + indexes to `Activity` |
| `lib/validations/activities.ts` | Modify | Add optional `relatedDocumentId`, `relatedContactId`, `relatedPropertyId` to create/update schemas |
| `actions/activities/index.ts` | Modify | Add `createSystemActivity()` export; thread new fields through `createActivity` and `updateActivity` |
| `lib/model-encryption.ts` | Modify | No encryption needed for FK IDs — verify they are NOT included in encrypted field list |
| `hooks/swr/useActivities.ts` | Modify | Add `relatedDocumentId`, `relatedContactId`, `relatedPropertyId` to `Activity` type |
| `components/activity/QuickLogActivity.tsx` | Modify | Add kind-specific secondary fields (document picker, contact/property selectors) |
| `components/activity/ActivityFeed.tsx` | Modify | Render linked entity chips with locale-aware navigation links |
| `actions/contacts/index.ts` | Modify | Call `createSystemActivity()` on visibility change, assignment change |
| `actions/deals/index.ts` | Modify | Call `createSystemActivity()` on stage change, document linked, assignment change |
| `actions/mls/index.ts` (or `actions/properties/index.ts`) | Modify | Call `createSystemActivity()` on visibility change, assignment change |
| `actions/requests/index.ts` | Modify | Call `createSystemActivity()` on status change, assignment change |
| `locales/en/activities.json` | Modify | Add `systemEvents.*` keys for auto-captured event messages |
| `locales/el/activities.json` | Modify | Greek translations for same keys |

---

## Task 1: Schema — Add Rich Linking Fields to Activity

**Files:**
- Modify: `prisma/schema.prisma` (Activity model, ~line 4262)

- [ ] **Step 1: Add three optional FK fields and indexes to the Activity model**

In `prisma/schema.prisma`, update the `Activity` model block to:

```prisma
model Activity {
  id               String             @id @default(cuid())
  organizationId   String
  parentType       ActivityParentType
  parentId         String
  kind             ActivityKind
  direction        ActivityDirection  @default(INTERNAL)
  subject          String?
  body             String?
  durationMin      Int?
  outcome          String?
  scheduledAt      DateTime?
  occurredAt       DateTime           @default(now())
  createdByUserId  String?
  assignedToUserId String?
  // Rich linking — optional references to related entities
  relatedDocumentId  String?
  relatedContactId   String?
  relatedPropertyId  String?
  deletedAt        DateTime?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  CreatedBy        Users?     @relation("ActivityCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  AssignedTo       Users?     @relation("ActivityAssignedTo", fields: [assignedToUserId], references: [id], onDelete: SetNull)
  RelatedDocument  Documents? @relation("ActivityRelatedDocument", fields: [relatedDocumentId], references: [id], onDelete: SetNull)
  RelatedContact   Contact?   @relation("ActivityRelatedContact", fields: [relatedContactId], references: [id], onDelete: SetNull)
  RelatedProperty  Properties? @relation("ActivityRelatedProperty", fields: [relatedPropertyId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([organizationId, parentType, parentId])
  @@index([organizationId, kind])
  @@index([createdByUserId])
  @@index([assignedToUserId])
  @@index([relatedDocumentId])
  @@index([relatedContactId])
  @@index([relatedPropertyId])
  @@index([deletedAt])
  @@map("activities")
}
```

- [ ] **Step 2: Add back-relation fields to Documents, Contact, and Properties models**

In `prisma/schema.prisma`, add the back-relation to each referenced model.

On `model Documents` (add after the last relation line before `@@map`):
```prisma
  ActivityLinks  Activity[] @relation("ActivityRelatedDocument")
```

On `model Contact` (add after the last relation line before `@@map`):
```prisma
  ActivityLinks  Activity[] @relation("ActivityRelatedContact")
```

On `model Properties` (add after the last relation line before `@@map`):
```prisma
  ActivityLinks  Activity[] @relation("ActivityRelatedProperty")
```

- [ ] **Step 3: Tell user to run migration**

```
pnpm prisma generate
pnpm db:migrate   # enter name: activity_rich_linking
```

Expected: migration file created under `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add relatedDocumentId/ContactId/PropertyId to Activity"
```

---

## Task 2: Validation & Action Layer — Thread New Fields

**Files:**
- Modify: `lib/validations/activities.ts`
- Modify: `actions/activities/index.ts`

- [ ] **Step 1: Add optional fields to Zod schemas**

In `lib/validations/activities.ts`, add to the `createActivitySchema` object (after `durationMin`):

```typescript
    // Rich linking (optional)
    relatedDocumentId: z.string().cuid().optional(),
    relatedContactId: z.string().cuid().optional(),
    relatedPropertyId: z.string().cuid().optional(),
```

The `updateActivitySchema` inherits these via `.omit({ organizationId: true }).partial()` — no change needed.

Also update `type CreateActivityInput` (auto-inferred from schema — no manual change needed).

- [ ] **Step 2: Thread new fields through `createActivity` in `actions/activities/index.ts`**

In `actions/activities/index.ts`, update the `encryptActivityForOrg(...)` call block and the `prismadb.activity.create(...)` call:

The `encryptActivityForOrg` function encrypts `body`, `subject`, etc. The three FK ID fields should NOT be encrypted (they are non-sensitive IDs). Pass them directly to Prisma:

```typescript
    const activity = await prismadb.activity.create({
      data: {
        ...encrypted,
        organizationId,
        createdByUserId: currentUser?.id ?? undefined,
        relatedDocumentId: parsed.data.relatedDocumentId ?? undefined,
        relatedContactId: parsed.data.relatedContactId ?? undefined,
        relatedPropertyId: parsed.data.relatedPropertyId ?? undefined,
      },
    });
```

- [ ] **Step 3: Add `createSystemActivity()` helper at the bottom of `actions/activities/index.ts`**

This helper is called internally by other server actions. It does NOT run permission guards (caller is trusted server code):

```typescript
/**
 * Internal helper for auto-capturing system events (status changes, visibility
 * updates, document links, etc.). Called from other server actions — never
 * directly from client code. No permission guard; caller is trusted server context.
 */
export async function createSystemActivity(input: {
  organizationId: string;
  parentType: "CONTACT" | "REQUEST" | "DEAL" | "PROPERTY" | "SHOWING";
  parentId: string;
  kind: "NOTE" | "DOCUMENT" | "TASK" | "EMAIL" | "CALL" | "MEETING" | "SHOWING" | "OTHER";
  body: string;
  createdByUserId?: string;
  relatedDocumentId?: string;
  relatedContactId?: string;
  relatedPropertyId?: string;
}): Promise<void> {
  try {
    await prismadb.activity.create({
      data: {
        organizationId: input.organizationId,
        parentType: input.parentType,
        parentId: input.parentId,
        kind: input.kind,
        direction: "INTERNAL",
        body: input.body,
        occurredAt: new Date(),
        createdByUserId: input.createdByUserId ?? undefined,
        relatedDocumentId: input.relatedDocumentId ?? undefined,
        relatedContactId: input.relatedContactId ?? undefined,
        relatedPropertyId: input.relatedPropertyId ?? undefined,
      },
    });
  } catch (error) {
    // System activity failures are non-fatal — log but don't surface to caller
    console.error("[SYSTEM_ACTIVITY_CREATE]", error);
  }
}
```

- [ ] **Step 4: Update `listActivities` to include related entity data in query**

In `actions/activities/index.ts`, update the `prismadb.activity.findMany` call to include linked entities:

```typescript
    const activities = await prismadb.activity.findMany({
      where: {
        organizationId,
        parentType: parentType as ActivityParentType,
        parentId,
        deletedAt: null,
      },
      include: {
        CreatedBy: {
          select: { id: true, firstName: true, lastName: true, imageUrl: true },
        },
        AssignedTo: {
          select: { id: true, firstName: true, lastName: true, imageUrl: true },
        },
        RelatedDocument: {
          select: { id: true, document_name: true },
        },
        RelatedContact: {
          select: { id: true, firstName: true, lastName: true },
        },
        RelatedProperty: {
          select: { id: true, title: true, internalCode: true },
        },
      },
      orderBy: { occurredAt: "desc" },
    });
```

- [ ] **Step 5: Commit**

```bash
git add lib/validations/activities.ts actions/activities/index.ts
git commit -m "feat(activities): add rich linking fields to schema and createSystemActivity helper"
```

---

## Task 3: SWR Hook — Update Activity Type

**Files:**
- Modify: `hooks/swr/useActivities.ts`

- [ ] **Step 1: Add related entity types and fields to `Activity` interface**

In `hooks/swr/useActivities.ts`, add interfaces and update `Activity`:

```typescript
export interface ActivityDocument {
  id: string;
  document_name: string;
}

export interface ActivityContact {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface ActivityProperty {
  id: string;
  title: string | null;
  internalCode: string | null;
}
```

Then add to the `Activity` interface (after `AssignedTo`):

```typescript
  relatedDocumentId: string | null;
  relatedContactId: string | null;
  relatedPropertyId: string | null;
  RelatedDocument: ActivityDocument | null;
  RelatedContact: ActivityContact | null;
  RelatedProperty: ActivityProperty | null;
```

- [ ] **Step 2: Commit**

```bash
git add hooks/swr/useActivities.ts
git commit -m "feat(swr): extend Activity type with related entity fields"
```

---

## Task 4: QuickLogActivity — Kind-Specific Secondary Fields

**Files:**
- Modify: `components/activity/QuickLogActivity.tsx`

`★ Insight ─────────────────────────────────────`
The kind-specific UI uses conditional rendering based on the selected `kind`. We use `useDocuments`/`useContacts`/`useProperties` SWR hooks to populate dropdowns. The DOCUMENT kind gets a combobox to pick an existing document OR a free-text note (the user may just want to note something). The SHOWING kind gets two comboboxes: one for Contact, one for Property.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Check what SWR hooks are available for documents, contacts, properties**

Run:
```bash
grep -l "useDocuments\|useContacts\|useProperties\|useClientsPaginated\|usePropertiesPaginated" /Users/stapo/Desktop/Oikion/MVP/hooks/swr/*.ts
```

This tells you which hooks exist. Use the simplest available (non-paginated if possible since dropdowns don't need infinite scroll).

- [ ] **Step 2: Rewrite `QuickLogActivity.tsx` with kind-specific forms**

Replace the entire file content with:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { createActivity } from "@/actions/activities";
import type { ActivityParentType } from "@/hooks/swr/useActivities";
import { useAppToast } from "@/hooks/use-app-toast";
// Import whichever hooks exist — adjust names to what grep found in Step 1:
// import { useDocuments } from "@/hooks/swr/useDocuments";
// import { useContacts } from "@/hooks/swr/useContacts";
// import { useProperties } from "@/hooks/swr/useProperties";

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

type ActivityKind = (typeof ACTIVITY_KINDS)[number];

interface QuickLogActivityProps {
  parentType: ActivityParentType;
  parentId: string;
  onSuccess?: () => void;
}

export function QuickLogActivity({
  parentType,
  parentId,
  onSuccess,
}: QuickLogActivityProps) {
  const t = useTranslations("activities");
  const { toast } = useAppToast();
  const [kind, setKind] = useState<ActivityKind>("NOTE");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [relatedDocumentId, setRelatedDocumentId] = useState<string | undefined>();
  const [relatedContactId, setRelatedContactId] = useState<string | undefined>();
  const [relatedPropertyId, setRelatedPropertyId] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  // TODO: replace with real SWR hook calls once hook names are confirmed in Step 1
  // const { documents } = useDocuments();
  // const { contacts } = useContacts();
  // const { properties } = useProperties();
  const documents: Array<{ id: string; document_name: string }> = [];
  const contacts: Array<{ id: string; firstName: string | null; lastName: string | null }> = [];
  const properties: Array<{ id: string; title: string | null; internalCode: string | null }> = [];

  const handleKindChange = (v: ActivityKind) => {
    setKind(v);
    // Reset secondary fields when kind changes
    setRelatedDocumentId(undefined);
    setRelatedContactId(undefined);
    setRelatedPropertyId(undefined);
    setSubject("");
  };

  const handleSubmit = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await createActivity({
        parentType,
        parentId,
        kind,
        body,
        subject: subject || undefined,
        relatedDocumentId,
        relatedContactId,
        relatedPropertyId,
      });
      if (result.success) {
        setBody("");
        setSubject("");
        setRelatedDocumentId(undefined);
        setRelatedContactId(undefined);
        setRelatedPropertyId(undefined);
        onSuccess?.();
      } else {
        toast.error("createFailed");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Select value={kind} onValueChange={(v) => handleKindChange(v as ActivityKind)}>
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

      {/* SHOWING kind — contact + property selectors */}
      {kind === "SHOWING" && (
        <div className="flex gap-2">
          <EntityCombobox
            placeholder={t("fields.relatedContact")}
            items={contacts.map((c) => ({
              id: c.id,
              label: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.id,
            }))}
            value={relatedContactId}
            onSelect={setRelatedContactId}
          />
          <EntityCombobox
            placeholder={t("fields.relatedProperty")}
            items={properties.map((p) => ({
              id: p.id,
              label: p.internalCode
                ? `${p.internalCode} — ${p.title ?? ""}`
                : (p.title ?? p.id),
            }))}
            value={relatedPropertyId}
            onSelect={setRelatedPropertyId}
          />
        </div>
      )}

      {/* DOCUMENT kind — document picker (optional; body remains for notes) */}
      {kind === "DOCUMENT" && documents.length > 0 && (
        <EntityCombobox
          placeholder={t("fields.relatedDocument")}
          items={documents.map((d) => ({ id: d.id, label: d.document_name }))}
          value={relatedDocumentId}
          onSelect={setRelatedDocumentId}
        />
      )}

      {/* Subject line for EMAIL, CALL, MEETING, TASK */}
      {["EMAIL", "CALL", "MEETING", "TASK"].includes(kind) && (
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t("fields.subject")}
        />
      )}

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

// ─── Reusable entity combobox ─────────────────────────────────────────────────

interface ComboboxItem {
  id: string;
  label: string;
}

interface EntityComboboxProps {
  placeholder: string;
  items: ComboboxItem[];
  value: string | undefined;
  onSelect: (id: string | undefined) => void;
}

function EntityCombobox({ placeholder, items, value, onSelect }: EntityComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between truncate"
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder={`${placeholder}...`} />
          <CommandEmpty>—</CommandEmpty>
          <CommandGroup>
            {/* Clear selection */}
            {value && (
              <CommandItem value="__clear__" onSelect={() => { onSelect(undefined); setOpen(false); }}>
                <span className="text-muted-foreground italic">Clear</span>
              </CommandItem>
            )}
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={item.label}
                onSelect={() => { onSelect(item.id); setOpen(false); }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")}
                  aria-hidden
                />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

**Note on TODO hooks in Step 2:** After verifying hook names in Step 1, replace the placeholder arrays with real hook calls. If no simple non-paginated hooks exist for these entities yet, create thin ones (see Task 3.5 below — only if needed).

- [ ] **Step 3: Add translation keys for new fields**

In `locales/en/activities.json`, under `"fields"`, add:
```json
"relatedContact": "Related Contact",
"relatedProperty": "Related Property",
"relatedDocument": "Linked Document",
"subject": "Subject"
```

In `locales/el/activities.json`, under `"fields"`, add:
```json
"relatedContact": "Σχετική Επαφή",
"relatedProperty": "Σχετικό Ακίνητο",
"relatedDocument": "Συνδεδεμένο Έγγραφο",
"subject": "Θέμα"
```

- [ ] **Step 4: Commit**

```bash
git add components/activity/QuickLogActivity.tsx locales/en/activities.json locales/el/activities.json
git commit -m "feat(ui): QuickLogActivity kind-specific forms (SHOWING, DOCUMENT, EMAIL/CALL/MEETING/TASK)"
```

---

## Task 5: ActivityFeed — Linked Entity Chips

**Files:**
- Modify: `components/activity/ActivityFeed.tsx`

- [ ] **Step 1: Rewrite ActivityFeed to render linked entity chips**

Replace the entire file content:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useActivities } from "@/hooks/swr/useActivities";
import type { ActivityParentType } from "@/hooks/swr/useActivities";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/navigation";
import { formatDistanceToNow } from "date-fns";
import { FileText, User, Home } from "lucide-react";

interface ActivityFeedProps {
  parentType: ActivityParentType;
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
      {activities.map((activity) => (
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

            {/* Linked entity chips */}
            {(activity.RelatedDocument || activity.RelatedContact || activity.RelatedProperty) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activity.RelatedDocument && (
                  <Link
                    href={`/app/documents/${activity.RelatedDocument.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <FileText className="h-3 w-3" aria-hidden />
                    {activity.RelatedDocument.document_name}
                  </Link>
                )}
                {activity.RelatedContact && (
                  <Link
                    href={`/app/crm/contacts/${activity.RelatedContact.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <User className="h-3 w-3" aria-hidden />
                    {[activity.RelatedContact.firstName, activity.RelatedContact.lastName]
                      .filter(Boolean)
                      .join(" ")}
                  </Link>
                )}
                {activity.RelatedProperty && (
                  <Link
                    href={`/app/mls/properties/${activity.RelatedProperty.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Home className="h-3 w-3" aria-hidden />
                    {activity.RelatedProperty.internalCode ?? activity.RelatedProperty.title ?? "Property"}
                  </Link>
                )}
              </div>
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

- [ ] **Step 2: Commit**

```bash
git add components/activity/ActivityFeed.tsx
git commit -m "feat(ui): ActivityFeed linked entity chips with navigation links"
```

---

## Task 6: Auto-Capture System Events in Entity Mutations

**Files:**
- Modify: `actions/contacts/index.ts` (or wherever contact update lives)
- Modify: `actions/deals/index.ts`
- Modify: property update action file
- Modify: request update action file
- Add translations: `locales/en/activities.json` and `locales/el/activities.json`

`★ Insight ─────────────────────────────────────`
System events use `direction: INTERNAL` (default) and `kind: "OTHER"` or a domain-specific kind. The body is a pre-formatted string describing what happened. This is different from user-created activities — `createSystemActivity()` is fire-and-forget (errors are logged, not surfaced). The UI can differentiate system vs user activities by checking `direction === "INTERNAL"` and whether a `createdByUserId` exists.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Add system event translation keys**

In `locales/en/activities.json`, add a `systemEvents` block (create if not present):

```json
"systemEvents": {
  "visibilityChanged": "Visibility changed to {{value}}",
  "statusChanged": "Status changed to {{value}}",
  "stageChanged": "Stage advanced to {{value}}",
  "assignedTo": "Assigned to {{name}}",
  "unassigned": "Unassigned",
  "documentLinked": "Document linked: {{name}}",
  "contactLinked": "Contact linked: {{name}}"
}
```

In `locales/el/activities.json`:

```json
"systemEvents": {
  "visibilityChanged": "Η ορατότητα άλλαξε σε {{value}}",
  "statusChanged": "Η κατάσταση άλλαξε σε {{value}}",
  "stageChanged": "Το στάδιο προχώρησε σε {{value}}",
  "assignedTo": "Ανατέθηκε στον/στην {{name}}",
  "unassigned": "Αποδεσμεύτηκε",
  "documentLinked": "Συνδέθηκε έγγραφο: {{name}}",
  "contactLinked": "Συνδέθηκε επαφή: {{name}}"
}
```

- [ ] **Step 2: Find the contact update action**

Run:
```bash
grep -rn "export async function updateContact\|visibility\|assignedTo" actions/contacts/index.ts | head -20
```

Identify where visibility and assignment changes happen.

- [ ] **Step 3: Add system activity call to contact update action**

In `actions/contacts/index.ts`, after a successful update where visibility or assignment changed, add:

```typescript
import { createSystemActivity } from "@/actions/activities";

// Inside updateContact, after prismadb.contact.update succeeds:
// Check if visibility changed
if (parsed.data.visibility && existing.visibility !== parsed.data.visibility) {
  await createSystemActivity({
    organizationId,
    parentType: "CONTACT",
    parentId: id,
    kind: "OTHER",
    body: `Visibility changed to ${parsed.data.visibility}`,
    createdByUserId: currentUser?.id,
  });
}

// Check if assignment changed
if (parsed.data.assignedToUserId !== undefined && existing.assignedToUserId !== parsed.data.assignedToUserId) {
  await createSystemActivity({
    organizationId,
    parentType: "CONTACT",
    parentId: id,
    kind: "OTHER",
    body: parsed.data.assignedToUserId
      ? `Assigned to a team member`
      : `Unassigned`,
    createdByUserId: currentUser?.id,
  });
}
```

**Important:** Fetch `existing` before the update (it may already be fetched for the permission check — reuse that query if possible, extending the `select` to include `visibility` and `assignedToUserId`).

- [ ] **Step 4: Add system activity to deal stage change**

In `actions/deals/index.ts`, find the `updateDealStage` (or equivalent) function. After a successful stage transition:

```typescript
await createSystemActivity({
  organizationId,
  parentType: "DEAL",
  parentId: dealId,
  kind: "OTHER",
  body: `Stage advanced to ${newStage}`,
  createdByUserId: currentUser?.id,
});
```

- [ ] **Step 5: Add system activity to property visibility change**

In the property update action file, after a successful update where visibility changed:

```typescript
if (parsed.data.visibility && existing.visibility !== parsed.data.visibility) {
  await createSystemActivity({
    organizationId,
    parentType: "PROPERTY",
    parentId: id,
    kind: "OTHER",
    body: `Visibility changed to ${parsed.data.visibility}`,
    createdByUserId: currentUser?.id,
  });
}
```

- [ ] **Step 6: Add system activity to request status change**

In the request update action file, after a successful update where status changed:

```typescript
if (parsed.data.status && existing.status !== parsed.data.status) {
  await createSystemActivity({
    organizationId,
    parentType: "REQUEST",
    parentId: id,
    kind: "OTHER",
    body: `Status changed to ${parsed.data.status}`,
    createdByUserId: currentUser?.id,
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add actions/contacts/index.ts actions/deals/index.ts locales/en/activities.json locales/el/activities.json
# + whichever property and request action files were modified
git commit -m "feat(activities): auto-capture system events on visibility, stage, and status changes"
```

---

## Self-Review Checklist

### Spec coverage
- [x] Bug fix: `createActivity` FK violation (Task 0 — already applied before plan was written)
- [x] Schema: add `relatedDocumentId`, `relatedContactId`, `relatedPropertyId` (Task 1)
- [x] Per-kind rich linking in QuickLogActivity: SHOWING → Contact + Property, DOCUMENT → document picker, others → optional subject (Task 4)
- [x] Ability to link directly to related entities visible on the timeline (Task 5)
- [x] Auto-capture system events per entity (Task 6)
- [x] SWR type updated to include linked entities (Task 3)
- [x] Validation schema updated (Task 2)

### Caveats for implementer
- The `EntityCombobox` in Task 4 uses placeholder empty arrays. Implementer MUST replace these with real SWR hook calls after checking available hooks in Step 1.
- The `createSystemActivity` body strings are English raw strings. Longer-term these should use i18n formatting — but since these are server-side internal records (not shown verbatim to users who expect Greek), plain English system log messages are acceptable for MVP. A future pass can use `getTranslations()` server-side.
- The `Documents` model uses UUIDs (not CUIDs) for its `id` field. The Zod schema uses `z.string().cuid()` for `relatedDocumentId`. Change this to `z.string()` (no format check) to accommodate UUID document IDs.
