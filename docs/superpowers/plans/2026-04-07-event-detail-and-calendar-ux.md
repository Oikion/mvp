# Event Detail & Calendar UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Event detail page with the Property detail page (layout, components, link/unlink), add a Next Up card, persist drag-to-create placeholders across misclicks, and promote the event creation form to a page-level drawer that pushes the calendar layout.

**Architecture:** The Event detail page is rewritten to mirror `PropertyView.tsx` 1:1 — same 2/3 + 1/3 grid, same `LinkedEntitiesPanel` sidebar, same `<Card>` shell pattern. A new `link-entities` REST endpoint mirrors `app/api/mandates/link-entities/route.ts` for event-scoped link/unlink. The calendar page's event creation form is hoisted from inside the day-view Card to a page-level drawer column. Drag-to-create gets a 6px movement threshold so accidental clicks don't replace existing placeholders.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, SWR, shadcn/ui, next-intl, Clerk v6, Vitest, Cypress.

**Spec:** [docs/superpowers/specs/2026-04-07-event-detail-and-calendar-ux-design.md](../specs/2026-04-07-event-detail-and-calendar-ux-design.md)

---

## File Structure

This plan creates 3 files and modifies 11. Each task below names exact paths.

### New files

| Path | Responsibility |
|---|---|
| `app/api/calendar/events/link-entities/route.ts` | POST + DELETE handlers for linking clients/properties/documents/mandates to a calendar event. Mirrors `app/api/mandates/link-entities/route.ts`. |
| `components/calendar/NextUpCard.tsx` | Self-contained card showing the user's next 3 upcoming events. Consumes `useCalendarEvents` directly. |
| `tests/calendar/next-up-card.test.tsx` | Vitest unit test for the filter/sort/slice logic in `NextUpCard`. |

### Modified files

| Path | Change summary |
|---|---|
| `hooks/swr/useLinkMutations.ts` | Add 8 hooks: `useLinkXToEvent` / `useUnlinkXFromEvent` for X ∈ {Clients, Properties, Documents, Mandates}. |
| `hooks/swr/index.ts` | Export the 8 new hooks. |
| `app/[locale]/app/(routes)/calendar/events/[id]/page.tsx` | Drop `<Container>` and `max-w-5xl`. Pass `currentUserId` and `locale` to `EventDetailView`. |
| `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx` | Full rewrite mirroring `PropertyView.tsx`. Uses `useCalendarEvent` SWR hook for live data + new mutation hooks for linking. |
| `components/calendar/CalendarPageView.tsx` | Hoist event creation drawer from `renderDayViewContent` to root. Add unmount cleanup effect. Remove the per-view-mode `<EventCreateForm>` rendering. |
| `components/calendar/EventCreateForm.tsx` | Rename `EventCreateSidePanel` → `EventCreateDrawer`. Drop the `open` prop from the drawer (parent controls rendering). Keep `EventCreateForm` Sheet variant unchanged for non-calendar callers. |
| `components/calendar/WeekView.tsx` | Add 6px drag-distance threshold in `handleDayColumnPointerDown` / `handlePointerUp`. |
| `components/calendar/DayHourView.tsx` | Add 6px drag-distance threshold + add an X discard button on the `DraftEventBlock`. |
| `locales/en/calendar.json` | Add `eventPage.nextUp` keys. |
| `locales/el/calendar.json` | Add `eventPage.nextUp` keys (Greek translations). |
| `i18n.ts` | No change — `calendar.json` is already registered. |

### Build sequence

Tasks are ordered so each one produces working, testable software. The dependency order is:

1. **Backend** — new `link-entities` endpoint (Tasks 1–2). Independent of the UI.
2. **SWR hooks** — link/unlink mutations consuming the endpoint (Task 3).
3. **i18n keys** — needed by both NextUpCard and EventDetailView (Task 4).
4. **NextUpCard component** — pure component, depends on existing `useCalendarEvents` (Tasks 5–6).
5. **EventDetailView rewrite** — depends on hooks + NextUpCard (Tasks 7–10).
6. **Page wrapper update** — drops Container (Task 11).
7. **Calendar drag threshold fix** — independent UX fix (Tasks 12–13).
8. **Calendar drawer hoist** — restructures CalendarPageView root (Task 14).
9. **Manual verification + commit** (Task 15).

---

## Conventions used in this plan

- **Async params**: Next.js 16 — every route handler uses `{ params }: { params: Promise<{ … }> }` and `await params`.
- **Auth pattern**: `app/api/CLAUDE.md` requires `await auth()` then `organizationId` filter on every query.
- **Prisma relation names**: `CalendarEvent.Clients`, `CalendarEvent.Properties`, `CalendarEvent.Documents`, `CalendarEvent.Mandates` (PascalCase, plural — verified at `prisma/schema.prisma:108-112`).
- **SWR mutation pattern**: `useSWRMutation` with an `onSuccess` that calls `globalMutate(getCalendarEventKey(eventId))`. Mirrors `hooks/swr/useLinkMutations.ts:208-260`.
- **Cache key helper**: `getCalendarEventKey(eventId)` — already exported from `hooks/swr/useCalendarEvent.ts:103-105`.
- **Commit policy**: small, frequent commits at every logical milestone. Commit message format: `<scope>: <imperative summary>` (e.g. `feat(calendar): add link-entities endpoint`). No Co-Authored-By line in this plan's commits — they're regular feature commits.

---

## Task 1: Backend — link-entities POST handler

**Goal:** Create the route file with a working POST handler that links clients/properties/documents/mandates to a calendar event.

**Files:**
- Create: `app/api/calendar/events/link-entities/route.ts`

- [ ] **Step 1: Create the file with the POST handler**

```ts
// app/api/calendar/events/link-entities/route.ts
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { auth } from "@clerk/nextjs/server";

interface LinkBody {
  eventId: string;
  clientIds?: string[];
  propertyIds?: string[];
  documentIds?: string[];
  mandateIds?: string[];
}

// POST — link clients/properties/documents/mandates to a calendar event
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getCurrentOrgId();
    if (!organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 401 });
    }

    const body = (await req.json()) as LinkBody;
    const { eventId, clientIds, propertyIds, documentIds, mandateIds } = body;

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const hasAny =
      (Array.isArray(clientIds) && clientIds.length > 0) ||
      (Array.isArray(propertyIds) && propertyIds.length > 0) ||
      (Array.isArray(documentIds) && documentIds.length > 0) ||
      (Array.isArray(mandateIds) && mandateIds.length > 0);

    if (!hasAny) {
      return NextResponse.json(
        { error: "At least one of clientIds/propertyIds/documentIds/mandateIds required" },
        { status: 400 }
      );
    }

    // Verify the event belongs to this org
    const event = await prismadb.calendarEvent.findFirst({
      where: { id: eventId, organizationId },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
      );
    }

    // Build the connect payload, validating each entity belongs to the org
    const connect: Record<string, { connect: { id: string }[] }> = {};

    if (Array.isArray(clientIds) && clientIds.length > 0) {
      const valid = await prismadb.clients.findMany({
        where: { id: { in: clientIds }, organizationId },
        select: { id: true },
      });
      if (valid.length !== clientIds.length) {
        return NextResponse.json(
          { error: "Some clients not found or access denied" },
          { status: 404 }
        );
      }
      connect.Clients = { connect: valid.map((c) => ({ id: c.id })) };
    }

    if (Array.isArray(propertyIds) && propertyIds.length > 0) {
      const valid = await prismadb.properties.findMany({
        where: { id: { in: propertyIds }, organizationId },
        select: { id: true },
      });
      if (valid.length !== propertyIds.length) {
        return NextResponse.json(
          { error: "Some properties not found or access denied" },
          { status: 404 }
        );
      }
      connect.Properties = { connect: valid.map((p) => ({ id: p.id })) };
    }

    if (Array.isArray(documentIds) && documentIds.length > 0) {
      const valid = await prismadb.documents.findMany({
        where: { id: { in: documentIds }, organizationId },
        select: { id: true },
      });
      if (valid.length !== documentIds.length) {
        return NextResponse.json(
          { error: "Some documents not found or access denied" },
          { status: 404 }
        );
      }
      connect.Documents = { connect: valid.map((d) => ({ id: d.id })) };
    }

    if (Array.isArray(mandateIds) && mandateIds.length > 0) {
      const valid = await prismadb.mandate.findMany({
        where: { id: { in: mandateIds }, organizationId },
        select: { id: true },
      });
      if (valid.length !== mandateIds.length) {
        return NextResponse.json(
          { error: "Some mandates not found or access denied" },
          { status: 404 }
        );
      }
      connect.Mandates = { connect: valid.map((m) => ({ id: m.id })) };
    }

    await prismadb.calendarEvent.update({
      where: { id: eventId },
      data: connect,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[CALENDAR_EVENT_LINK_ENTITIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Smoke-test the endpoint manually**

Start the dev server, log in, and from the browser console run:

```js
fetch("/api/calendar/events/link-entities", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ eventId: "<existing-event-id>", clientIds: [] }),
}).then(r => r.json()).then(console.log)
```

Expected: `{ error: "At least one of clientIds/propertyIds/documentIds/mandateIds required" }` (400). Then re-run with a real `clientIds: ["<id>"]` and verify `{ success: true }` and that the client appears in the event's linked clients on the existing detail page.

- [ ] **Step 3: Commit**

```bash
git add app/api/calendar/events/link-entities/route.ts
git commit -m "feat(calendar): add link-entities POST endpoint"
```

---

## Task 2: Backend — link-entities DELETE handler

**Goal:** Add a DELETE handler to the same route file. The pattern matches `mandate_link-entities` DELETE: read IDs from query string, disconnect from the m2m relation.

**Files:**
- Modify: `app/api/calendar/events/link-entities/route.ts`

- [ ] **Step 1: Append the DELETE handler to the file**

Add this after the POST handler:

```ts
// DELETE — unlink clients/properties/documents/mandates from a calendar event
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getCurrentOrgId();
    if (!organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const clientIds = searchParams.get("clientIds")?.split(",").filter(Boolean) ?? [];
    const propertyIds = searchParams.get("propertyIds")?.split(",").filter(Boolean) ?? [];
    const documentIds = searchParams.get("documentIds")?.split(",").filter(Boolean) ?? [];
    const mandateIds = searchParams.get("mandateIds")?.split(",").filter(Boolean) ?? [];

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const hasAny =
      clientIds.length > 0 ||
      propertyIds.length > 0 ||
      documentIds.length > 0 ||
      mandateIds.length > 0;

    if (!hasAny) {
      return NextResponse.json(
        { error: "At least one of clientIds/propertyIds/documentIds/mandateIds required" },
        { status: 400 }
      );
    }

    // Verify the event belongs to this org
    const event = await prismadb.calendarEvent.findFirst({
      where: { id: eventId, organizationId },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
      );
    }

    const disconnect: Record<string, { disconnect: { id: string }[] }> = {};

    if (clientIds.length > 0) {
      disconnect.Clients = { disconnect: clientIds.map((id) => ({ id })) };
    }
    if (propertyIds.length > 0) {
      disconnect.Properties = { disconnect: propertyIds.map((id) => ({ id })) };
    }
    if (documentIds.length > 0) {
      disconnect.Documents = { disconnect: documentIds.map((id) => ({ id })) };
    }
    if (mandateIds.length > 0) {
      disconnect.Mandates = { disconnect: mandateIds.map((id) => ({ id })) };
    }

    await prismadb.calendarEvent.update({
      where: { id: eventId },
      data: disconnect,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[CALENDAR_EVENT_LINK_ENTITIES_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Smoke-test the DELETE**

From the browser console:

```js
fetch("/api/calendar/events/link-entities?eventId=<id>&clientIds=<previously-linked-id>", {
  method: "DELETE",
}).then(r => r.json()).then(console.log)
```

Expected: `{ success: true }`. Verify on the existing event detail page that the client is no longer listed.

- [ ] **Step 3: Commit**

```bash
git add app/api/calendar/events/link-entities/route.ts
git commit -m "feat(calendar): add link-entities DELETE endpoint"
```

---

## Task 3: SWR mutation hooks for event link/unlink

**Goal:** Add 8 hooks to `useLinkMutations.ts` mirroring `useLinkClientsToProperty` / `useUnlinkClientFromProperty`. Each invalidates the calendar event cache key on success.

**Files:**
- Modify: `hooks/swr/useLinkMutations.ts`
- Modify: `hooks/swr/index.ts`

- [ ] **Step 1: Add an import for `getCalendarEventKey` at the top of `useLinkMutations.ts`**

Find the existing import block (around line 1-9):

```ts
import useSWRMutation from "swr/mutation";
import { useSWRConfig } from "swr";
import { getPropertyLinkedKey } from "./usePropertyLinked";
import { getClientLinkedKey } from "./useClientLinked";
import { getMandateLinkedKey } from "./useMandateLinked";
import { getDocumentLinkedKey } from "./useDocumentLinked";
import { getContactLinkedKey } from "./useContactLinked";
import { getRequestLinkedKey } from "./useRequestLinked";
```

Add this line:

```ts
import { getCalendarEventKey } from "./useCalendarEvent";
```

- [ ] **Step 2: Add fetchers and hooks at the END of `useLinkMutations.ts`**

Append this entire block before the file ends:

```ts
// ============================================================
// Calendar Event Link Fetchers
// ============================================================

interface EventLinkResponse { success: boolean }

async function linkClientsToEventFetcher(
  url: string,
  { arg }: { arg: { eventId: string; clientIds: string[] } }
): Promise<EventLinkResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link clients");
  return res.json();
}

async function unlinkClientFromEventFetcher(
  url: string,
  { arg }: { arg: { eventId: string; clientId: string } }
): Promise<EventLinkResponse> {
  const res = await fetch(
    `${url}?eventId=${arg.eventId}&clientIds=${arg.clientId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink client");
  return res.json();
}

async function linkPropertiesToEventFetcher(
  url: string,
  { arg }: { arg: { eventId: string; propertyIds: string[] } }
): Promise<EventLinkResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link properties");
  return res.json();
}

async function unlinkPropertyFromEventFetcher(
  url: string,
  { arg }: { arg: { eventId: string; propertyId: string } }
): Promise<EventLinkResponse> {
  const res = await fetch(
    `${url}?eventId=${arg.eventId}&propertyIds=${arg.propertyId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink property");
  return res.json();
}

async function linkDocumentsToEventFetcher(
  url: string,
  { arg }: { arg: { eventId: string; documentIds: string[] } }
): Promise<EventLinkResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link documents");
  return res.json();
}

async function unlinkDocumentFromEventFetcher(
  url: string,
  { arg }: { arg: { eventId: string; documentId: string } }
): Promise<EventLinkResponse> {
  const res = await fetch(
    `${url}?eventId=${arg.eventId}&documentIds=${arg.documentId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink document");
  return res.json();
}

async function linkMandatesToEventFetcher(
  url: string,
  { arg }: { arg: { eventId: string; mandateIds: string[] } }
): Promise<EventLinkResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link mandates");
  return res.json();
}

async function unlinkMandateFromEventFetcher(
  url: string,
  { arg }: { arg: { eventId: string; mandateId: string } }
): Promise<EventLinkResponse> {
  const res = await fetch(
    `${url}?eventId=${arg.eventId}&mandateIds=${arg.mandateId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink mandate");
  return res.json();
}

// ============================================================
// Calendar Event Link Hooks
// ============================================================

const EVENT_LINK_ENDPOINT = "/api/calendar/events/link-entities";

export function useLinkClientsToEvent(eventFriendlyId: string, eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    EVENT_LINK_ENDPOINT,
    linkClientsToEventFetcher,
    { onSuccess: () => globalMutate(getCalendarEventKey(eventFriendlyId)) }
  );
  const linkClients = async (clientIds: string[]) => trigger({ eventId, clientIds });
  return { linkClients, isLinking: isMutating, error };
}

export function useUnlinkClientFromEvent(eventFriendlyId: string, eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    EVENT_LINK_ENDPOINT,
    unlinkClientFromEventFetcher,
    { onSuccess: () => globalMutate(getCalendarEventKey(eventFriendlyId)) }
  );
  const unlinkClient = async (clientId: string) => trigger({ eventId, clientId });
  return { unlinkClient, isUnlinking: isMutating, error };
}

export function useLinkPropertiesToEvent(eventFriendlyId: string, eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    EVENT_LINK_ENDPOINT,
    linkPropertiesToEventFetcher,
    { onSuccess: () => globalMutate(getCalendarEventKey(eventFriendlyId)) }
  );
  const linkProperties = async (propertyIds: string[]) => trigger({ eventId, propertyIds });
  return { linkProperties, isLinking: isMutating, error };
}

export function useUnlinkPropertyFromEvent(eventFriendlyId: string, eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    EVENT_LINK_ENDPOINT,
    unlinkPropertyFromEventFetcher,
    { onSuccess: () => globalMutate(getCalendarEventKey(eventFriendlyId)) }
  );
  const unlinkProperty = async (propertyId: string) => trigger({ eventId, propertyId });
  return { unlinkProperty, isUnlinking: isMutating, error };
}

export function useLinkDocumentsToEvent(eventFriendlyId: string, eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    EVENT_LINK_ENDPOINT,
    linkDocumentsToEventFetcher,
    { onSuccess: () => globalMutate(getCalendarEventKey(eventFriendlyId)) }
  );
  const linkDocuments = async (documentIds: string[]) => trigger({ eventId, documentIds });
  return { linkDocuments, isLinking: isMutating, error };
}

export function useUnlinkDocumentFromEvent(eventFriendlyId: string, eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    EVENT_LINK_ENDPOINT,
    unlinkDocumentFromEventFetcher,
    { onSuccess: () => globalMutate(getCalendarEventKey(eventFriendlyId)) }
  );
  const unlinkDocument = async (documentId: string) => trigger({ eventId, documentId });
  return { unlinkDocument, isUnlinking: isMutating, error };
}

export function useLinkMandatesToEvent(eventFriendlyId: string, eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    EVENT_LINK_ENDPOINT,
    linkMandatesToEventFetcher,
    { onSuccess: () => globalMutate(getCalendarEventKey(eventFriendlyId)) }
  );
  const linkMandates = async (mandateIds: string[]) => trigger({ eventId, mandateIds });
  return { linkMandates, isLinking: isMutating, error };
}

export function useUnlinkMandateFromEvent(eventFriendlyId: string, eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    EVENT_LINK_ENDPOINT,
    unlinkMandateFromEventFetcher,
    { onSuccess: () => globalMutate(getCalendarEventKey(eventFriendlyId)) }
  );
  const unlinkMandate = async (mandateId: string) => trigger({ eventId, mandateId });
  return { unlinkMandate, isUnlinking: isMutating, error };
}
```

Note the `eventFriendlyId, eventId` two-arg pattern: `eventId` is the database UUID needed by the link-entities API, while `eventFriendlyId` is what the SWR cache key uses (because `useCalendarEvent` is keyed by friendlyId). EventDetailView already has both values from `getEvent()`.

- [ ] **Step 3: Update `hooks/swr/index.ts` to export the new hooks**

Find the existing block (around line 178-207) that exports from `./useLinkMutations`:

```ts
export {
  useLinkClientsToProperty,
  useUnlinkClientFromProperty,
  // ...existing exports...
  useUnlinkPropertyFromRequest,
} from "./useLinkMutations";
```

Add these inside the same export block, after the last existing export:

```ts
  useLinkClientsToEvent,
  useUnlinkClientFromEvent,
  useLinkPropertiesToEvent,
  useUnlinkPropertyFromEvent,
  useLinkDocumentsToEvent,
  useUnlinkDocumentFromEvent,
  useLinkMandatesToEvent,
  useUnlinkMandateFromEvent,
```

- [ ] **Step 4: Run TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: no new errors. The file uses `// @ts-nocheck` at the top so type errors in the hooks file itself won't block, but consumers downstream must compile cleanly.

- [ ] **Step 5: Commit**

```bash
git add hooks/swr/useLinkMutations.ts hooks/swr/index.ts
git commit -m "feat(swr): add event link/unlink mutation hooks"
```

---

## Task 4: i18n keys for Next Up

**Goal:** Add the translation keys for the new Next Up card in both English and Greek.

**Files:**
- Modify: `locales/en/calendar.json`
- Modify: `locales/el/calendar.json`

- [ ] **Step 1: Locate the `eventPage` block in `locales/en/calendar.json`**

```bash
grep -n '"eventPage"' locales/en/calendar.json
```

Expected: a single line number where the block opens.

- [ ] **Step 2: Add `nextUp` keys inside the `eventPage` block**

Inside `"eventPage": { … }`, add:

```json
"nextUp": {
  "title": "Next Up",
  "empty": "No upcoming events in the next 2 weeks",
  "today": "Today",
  "tomorrow": "Tomorrow"
},
```

(Place it adjacent to other `eventPage.*` keys; trailing comma must be valid JSON — verify with `cat locales/en/calendar.json | python3 -m json.tool`.)

- [ ] **Step 3: Repeat for Greek**

In `locales/el/calendar.json`, inside `"eventPage": { … }`:

```json
"nextUp": {
  "title": "Τι ακολουθεί",
  "empty": "Δεν υπάρχουν επερχόμενα γεγονότα τις επόμενες 2 εβδομάδες",
  "today": "Σήμερα",
  "tomorrow": "Αύριο"
},
```

- [ ] **Step 4: Validate JSON**

```bash
cat locales/en/calendar.json | python3 -m json.tool > /dev/null && echo "EN OK"
cat locales/el/calendar.json | python3 -m json.tool > /dev/null && echo "EL OK"
```

Expected: both `EN OK` and `EL OK`. If either errors, fix the trailing comma or quote escaping.

- [ ] **Step 5: Commit**

```bash
git add locales/en/calendar.json locales/el/calendar.json
git commit -m "i18n(calendar): add next up keys"
```

---

## Task 5: NextUpCard — failing test

**Goal:** Write a Vitest test that exercises the filter/sort/slice logic of `NextUpCard` before the component exists. The test must fail at first.

**Files:**
- Create: `tests/calendar/next-up-card.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// tests/calendar/next-up-card.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextUpCard } from "@/components/calendar/NextUpCard";

// Mock useCalendarEvents
vi.mock("@/hooks/swr", () => ({
  useCalendarEvents: vi.fn(),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "eventPage.nextUp.title": "Next Up",
      "eventPage.nextUp.empty": "No upcoming events in the next 2 weeks",
      "eventPage.nextUp.today": "Today",
      "eventPage.nextUp.tomorrow": "Tomorrow",
    };
    return map[key] ?? key;
  },
  useLocale: () => "en",
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { useCalendarEvents } from "@/hooks/swr";

const now = new Date("2026-04-07T09:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

function makeEvent(overrides: Partial<{ id: number; eventId: string; friendlyId: string; title: string; startTime: string; endTime: string; assignedUserId: string }>) {
  return {
    id: overrides.id ?? 1,
    eventId: overrides.eventId ?? "evt-uuid-1",
    friendlyId: overrides.friendlyId ?? "Evt-000001",
    title: overrides.title ?? "Untitled",
    startTime: overrides.startTime ?? new Date("2026-04-07T10:00:00Z").toISOString(),
    endTime: overrides.endTime ?? new Date("2026-04-07T11:00:00Z").toISOString(),
    assignedUserId: overrides.assignedUserId,
  };
}

describe("NextUpCard", () => {
  it("renders empty state when no upcoming events", () => {
    (useCalendarEvents as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [],
      tasks: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<NextUpCard currentEventId="evt-uuid-current" currentUserId="user-1" />);

    expect(screen.getByText("No upcoming events in the next 2 weeks")).toBeInTheDocument();
  });

  it("excludes the current event from the list", () => {
    (useCalendarEvents as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [
        makeEvent({ id: 1, eventId: "evt-uuid-current", title: "Current event" }),
        makeEvent({ id: 2, eventId: "evt-uuid-2", title: "Other event", startTime: new Date("2026-04-08T10:00:00Z").toISOString() }),
      ],
      tasks: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<NextUpCard currentEventId="evt-uuid-current" currentUserId="user-1" />);

    expect(screen.queryByText("Current event")).not.toBeInTheDocument();
    expect(screen.getByText("Other event")).toBeInTheDocument();
  });

  it("excludes events in the past", () => {
    (useCalendarEvents as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [
        makeEvent({ id: 1, eventId: "evt-uuid-1", title: "Past event", startTime: new Date("2026-04-06T10:00:00Z").toISOString() }),
        makeEvent({ id: 2, eventId: "evt-uuid-2", title: "Future event", startTime: new Date("2026-04-08T10:00:00Z").toISOString() }),
      ],
      tasks: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<NextUpCard currentEventId="evt-uuid-current" currentUserId="user-1" />);

    expect(screen.queryByText("Past event")).not.toBeInTheDocument();
    expect(screen.getByText("Future event")).toBeInTheDocument();
  });

  it("limits to 3 upcoming events", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({
        id: i + 1,
        eventId: `evt-uuid-${i + 1}`,
        title: `Event ${i + 1}`,
        startTime: new Date(`2026-04-${10 + i}T10:00:00Z`).toISOString(),
      })
    );

    (useCalendarEvents as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      events,
      tasks: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<NextUpCard currentEventId="evt-uuid-current" currentUserId="user-1" />);

    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 2")).toBeInTheDocument();
    expect(screen.getByText("Event 3")).toBeInTheDocument();
    expect(screen.queryByText("Event 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Event 5")).not.toBeInTheDocument();
  });

  it("sorts events by startTime ascending", () => {
    (useCalendarEvents as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [
        makeEvent({ id: 1, eventId: "evt-uuid-1", title: "Later event", startTime: new Date("2026-04-09T10:00:00Z").toISOString() }),
        makeEvent({ id: 2, eventId: "evt-uuid-2", title: "Earlier event", startTime: new Date("2026-04-08T10:00:00Z").toISOString() }),
      ],
      tasks: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<NextUpCard currentEventId="evt-uuid-current" currentUserId="user-1" />);

    const titles = screen.getAllByRole("button").map((b) => b.textContent);
    const earlierIndex = titles.findIndex((t) => t?.includes("Earlier event"));
    const laterIndex = titles.findIndex((t) => t?.includes("Later event"));
    expect(earlierIndex).toBeLessThan(laterIndex);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm vitest run tests/calendar/next-up-card.test.tsx
```

Expected: all 5 tests FAIL with "Cannot find module '@/components/calendar/NextUpCard'" or similar import error. This confirms the test is wired correctly and the component doesn't yet exist.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/calendar/next-up-card.test.tsx
git commit -m "test(calendar): add failing tests for NextUpCard"
```

---

## Task 6: NextUpCard — implementation

**Goal:** Implement `NextUpCard.tsx` until all 5 tests pass.

**Files:**
- Create: `components/calendar/NextUpCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/calendar/NextUpCard.tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { format, isToday, isTomorrow, addDays } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, ChevronRight } from "lucide-react";
import { useCalendarEvents } from "@/hooks/swr";

interface NextUpCardProps {
  currentEventId: string;
  currentUserId?: string;
}

export function NextUpCard({ currentEventId, currentUserId }: NextUpCardProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  const now = useMemo(() => new Date(), []);
  const endRange = useMemo(() => addDays(now, 14), [now]);

  const { events, isLoading } = useCalendarEvents({
    startTime: now.toISOString(),
    endTime: endRange.toISOString(),
    includeTasks: false,
  });

  const upcoming = useMemo(() => {
    const filtered = events
      .filter((e) => e.eventId !== currentEventId)
      .filter((e) => new Date(e.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 3);
    return filtered;
  }, [events, currentEventId, now]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          {t("eventPage.nextUp.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && (
          <div className="space-y-2">
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
          </div>
        )}
        {!isLoading && upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            {t("eventPage.nextUp.empty")}
          </p>
        )}
        {!isLoading &&
          upcoming.map((event) => {
            const start = new Date(event.startTime);
            const whenLabel = isToday(start)
              ? t("eventPage.nextUp.today")
              : isTomorrow(start)
              ? t("eventPage.nextUp.tomorrow")
              : format(start, "EEE", { locale: dateLocale });

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => router.push(`/app/calendar/events/${event.friendlyId}`)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-left transition-colors"
              >
                <div className="w-14 shrink-0 text-xs">
                  <div className="font-semibold text-foreground">{whenLabel}</div>
                  <div className="text-muted-foreground">
                    {format(start, "HH:mm")}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{event.title}</div>
                  {event.location && (
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {event.location}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Run the test and verify it passes**

```bash
pnpm vitest run tests/calendar/next-up-card.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add components/calendar/NextUpCard.tsx
git commit -m "feat(calendar): add NextUpCard component"
```

---

## Task 7: EventDetailView — header + grid skeleton

**Goal:** Begin the EventDetailView rewrite. Replace the current single-column body with the PropertyView header + 2/3 + 1/3 grid skeleton. No linked entities or NextUp yet — just the structural shell.

**Files:**
- Modify: `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
// app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Clock,
  MapPin,
  FileText,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCalendarEvent } from "@/hooks/swr/useCalendarEvent";

interface EventDetailViewProps {
  event: any; // server-fetched seed; live data comes from useCalendarEvent
  defaultEditOpen?: boolean;
  locale?: string;
  currentUserId?: string;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const displayEnum = (value: string | null | undefined) => {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export function EventDetailView({
  event: initialEvent,
  defaultEditOpen = false,
  locale = "en",
  currentUserId,
}: EventDetailViewProps) {
  const t = useTranslations("calendar");
  const router = useRouter();

  // Live event data (initial server-fetched data is the seed; SWR refreshes on link/unlink)
  const { event: liveEvent, mutate } = useCalendarEvent(initialEvent.friendlyId);
  const event = liveEvent ?? initialEvent;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.friendlyId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete event");
      toast.success(t("eventPage.eventDeleted"));
      router.push("/app/calendar");
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error(t("eventPage.failedToDelete"));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const startDate = event.startTime ? new Date(event.startTime) : null;
  const endDate = event.endTime ? new Date(event.endTime) : null;
  const durationMin =
    startDate && endDate
      ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${locale}/app/calendar`)}
            aria-label={t("eventPage.backToCalendar")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {event.title || t("eventPage.untitledEvent")}
              </h1>
              {event.status && (
                <Badge
                  className={statusColors[event.status?.toLowerCase()] ?? ""}
                  variant="secondary"
                >
                  {displayEnum(event.status)}
                </Badge>
              )}
              {event.eventType && (
                <Badge variant="outline">{displayEnum(event.eventType)}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              ID: {event.friendlyId ?? event.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push(`?action=edit`)}
            leftIcon={<Edit className="h-4 w-4" />}
          >
            {t("eventPage.edit")}
          </Button>
          <Button
            variant="outline"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => setShowDeleteDialog(true)}
          >
            {t("eventPage.delete")}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Grid: 2/3 main + 1/3 sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT — main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                {t("eventPage.whenAndWhere") || "When & Where"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {startDate && (
                  <DetailField
                    label={t("eventPage.startTime")}
                    value={format(startDate, "PPP 'at' HH:mm")}
                  />
                )}
                {endDate && (
                  <DetailField
                    label={t("eventPage.endTime")}
                    value={format(endDate, "PPP 'at' HH:mm")}
                  />
                )}
                {durationMin !== null && (
                  <DetailField
                    label={t("eventPage.duration")}
                    value={`${durationMin} ${t("eventPage.minutes")}`}
                  />
                )}
                {event.location && (
                  <DetailField label={t("eventPage.location")} value={event.location} />
                )}
              </div>
            </CardContent>
          </Card>

          {(event.description || event.notes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {t("eventPage.descriptionAndNotes") || "Description & Notes"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("eventPage.description")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{event.description}</p>
                  </div>
                )}
                {event.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {t("eventPage.notes")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {t("eventPage.statusAndAssignment") || "Status & Assignment"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailField
                label={t("eventPage.status")}
                value={
                  event.status ? (
                    <Badge
                      className={statusColors[event.status?.toLowerCase()] ?? ""}
                      variant="secondary"
                    >
                      {displayEnum(event.status)}
                    </Badge>
                  ) : null
                }
              />
              <DetailField
                label={t("eventPage.eventType") || "Type"}
                value={displayEnum(event.eventType)}
              />
              <DetailField
                label={t("eventPage.assignedTo")}
                value={event.assignedUser?.name ?? event.assignedUser?.email}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("eventPage.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("eventPage.deleteConfirmationMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {t("eventPage.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("eventPage.deleting") : t("eventPage.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable sub-component (mirrors PropertyView's DetailField)
// ---------------------------------------------------------------------------

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm">
        {value !== null && value !== undefined ? (
          typeof value === "string" || typeof value === "number" ? (
            <span>{value}</span>
          ) : (
            value
          )
        ) : (
          <span className="text-muted-foreground/60">-</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run dev server and visit an event detail page**

```bash
pnpm dev:http
```

Visit `http://localhost:3000/en/app/calendar/events/<some-friendly-id>`. Expected: page renders with the new 2/3 + 1/3 grid, shows When & Where + Status & Assignment, no errors.

- [ ] **Step 3: Run TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/app/\(routes\)/calendar/events/\[id\]/components/EventDetailView.tsx
git commit -m "refactor(calendar): rewrite EventDetailView shell to match PropertyView"
```

---

## Task 8: EventDetailView — add NextUpCard, Reminders & Invitees

**Goal:** Add the remaining main-column cards: `NextUpCard` between Description and Reminders, plus a Reminders & Invitees card if data exists.

**Files:**
- Modify: `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx`

- [ ] **Step 1: Add the import**

At the top of the file, add:

```tsx
import { NextUpCard } from "@/components/calendar/NextUpCard";
```

- [ ] **Step 2: Insert NextUpCard in the main column**

Find the closing `</Card>` of the Description & Notes card. Immediately after it (still inside `lg:col-span-2 space-y-6`), add:

```tsx
          <NextUpCard
            currentEventId={event.id}
            currentUserId={currentUserId}
          />
```

- [ ] **Step 3: Insert Reminders & Invitees card after NextUpCard**

Immediately after the `NextUpCard`, add:

```tsx
          {((event.reminders && event.reminders.length > 0) ||
            (event.linkedTasks && event.linkedTasks.length > 0)) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4" />
                  {t("eventPage.remindersAndInvitees") || "Reminders & Invitees"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.reminders && event.reminders.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {t("eventPage.reminders")}
                    </p>
                    <div className="space-y-1">
                      {event.reminders.map((reminder: any) => {
                        const minutes = reminder.reminderMinutes ?? 0;
                        const label =
                          minutes >= 1440
                            ? `${Math.floor(minutes / 1440)} ${t("eventPage.days")}`
                            : minutes >= 60
                            ? `${Math.floor(minutes / 60)} ${t("eventPage.hours")}`
                            : `${minutes} ${t("eventPage.minutes")}`;
                        return (
                          <div
                            key={reminder.id}
                            className="text-sm text-muted-foreground"
                          >
                            • {label} {t("eventPage.beforeEvent")}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
```

- [ ] **Step 4: Verify in the browser**

Refresh the same event detail page. Expected: NextUpCard appears between Description and Reminders. If the user has no upcoming events, NextUpCard shows the empty state.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/app/\(routes\)/calendar/events/\[id\]/components/EventDetailView.tsx
git commit -m "feat(calendar): add NextUpCard and Reminders to EventDetailView"
```

---

## Task 9: EventDetailView — sidebar LinkedEntitiesPanel + LinkEntityDialog wiring

**Goal:** Add four `LinkedEntitiesPanel` instances to the sidebar (clients, properties, documents, mandates) plus their corresponding `LinkEntityDialog` instances. Wire them to the new mutation hooks from Task 3.

**Files:**
- Modify: `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, add:

```tsx
import { LinkedEntitiesPanel, LinkEntityDialog } from "@/components/linking";
import {
  useLinkClientsToEvent,
  useUnlinkClientFromEvent,
  useLinkPropertiesToEvent,
  useUnlinkPropertyFromEvent,
  useLinkDocumentsToEvent,
  useUnlinkDocumentFromEvent,
  useLinkMandatesToEvent,
  useUnlinkMandateFromEvent,
} from "@/hooks/swr";
```

- [ ] **Step 2: Add link dialog state**

Inside the `EventDetailView` function body, near the existing state hooks, add:

```tsx
const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false);
const [linkPropertyDialogOpen, setLinkPropertyDialogOpen] = useState(false);
const [linkDocumentDialogOpen, setLinkDocumentDialogOpen] = useState(false);
const [linkMandateDialogOpen, setLinkMandateDialogOpen] = useState(false);
```

- [ ] **Step 3: Instantiate the mutation hooks**

Below the dialog state, add:

```tsx
const { linkClients } = useLinkClientsToEvent(event.friendlyId, event.id);
const { unlinkClient } = useUnlinkClientFromEvent(event.friendlyId, event.id);
const { linkProperties } = useLinkPropertiesToEvent(event.friendlyId, event.id);
const { unlinkProperty } = useUnlinkPropertyFromEvent(event.friendlyId, event.id);
const { linkDocuments } = useLinkDocumentsToEvent(event.friendlyId, event.id);
const { unlinkDocument } = useUnlinkDocumentFromEvent(event.friendlyId, event.id);
const { linkMandates } = useLinkMandatesToEvent(event.friendlyId, event.id);
const { unlinkMandate } = useUnlinkMandateFromEvent(event.friendlyId, event.id);

const handleLinkClients = async (ids: string[]) => {
  try { await linkClients(ids); await mutate(); }
  catch (e) { console.error("[LINK_CLIENTS]", e); throw e; }
};
const handleUnlinkClient = async (id: string) => {
  try { await unlinkClient(id); toast.success(t("eventPage.clientUnlinked") || "Client unlinked"); await mutate(); }
  catch (e) { console.error("[UNLINK_CLIENT]", e); toast.error("Failed to unlink"); }
};
const handleLinkProperties = async (ids: string[]) => {
  try { await linkProperties(ids); await mutate(); }
  catch (e) { console.error("[LINK_PROPERTIES]", e); throw e; }
};
const handleUnlinkProperty = async (id: string) => {
  try { await unlinkProperty(id); toast.success("Property unlinked"); await mutate(); }
  catch (e) { console.error("[UNLINK_PROPERTY]", e); toast.error("Failed to unlink"); }
};
const handleLinkDocuments = async (ids: string[]) => {
  try { await linkDocuments(ids); await mutate(); }
  catch (e) { console.error("[LINK_DOCUMENTS]", e); throw e; }
};
const handleUnlinkDocument = async (id: string) => {
  try { await unlinkDocument(id); toast.success("Document unlinked"); await mutate(); }
  catch (e) { console.error("[UNLINK_DOCUMENT]", e); toast.error("Failed to unlink"); }
};
const handleLinkMandates = async (ids: string[]) => {
  try { await linkMandates(ids); await mutate(); }
  catch (e) { console.error("[LINK_MANDATES]", e); throw e; }
};
const handleUnlinkMandate = async (id: string) => {
  try { await unlinkMandate(id); toast.success("Mandate unlinked"); await mutate(); }
  catch (e) { console.error("[UNLINK_MANDATE]", e); toast.error("Failed to unlink"); }
};
```

- [ ] **Step 4: Add the four LinkedEntitiesPanel instances to the sidebar**

Inside the sidebar `<div className="space-y-6">`, after the Status & Assignment Card, add:

```tsx
          <LinkedEntitiesPanel
            type="clients"
            entities={(event.linkedClients ?? []) as any}
            isLoading={false}
            onLinkEntity={() => setLinkClientDialogOpen(true)}
            onUnlinkEntity={handleUnlinkClient}
            showAddButton={true}
            emptyMessage="No clients linked to this event yet."
          />

          <LinkedEntitiesPanel
            type="properties"
            entities={(event.linkedProperties ?? []) as any}
            isLoading={false}
            onLinkEntity={() => setLinkPropertyDialogOpen(true)}
            onUnlinkEntity={handleUnlinkProperty}
            showAddButton={true}
            emptyMessage="No properties linked to this event yet."
          />

          <LinkedEntitiesPanel
            type="documents"
            entities={(event.linkedDocuments ?? []) as any}
            isLoading={false}
            onLinkEntity={() => setLinkDocumentDialogOpen(true)}
            onUnlinkEntity={handleUnlinkDocument}
            showAddButton={true}
            emptyMessage="No documents linked to this event yet."
          />

          <LinkedEntitiesPanel
            type="mandates"
            entities={(event.linkedMandates ?? []) as any}
            isLoading={false}
            onLinkEntity={() => setLinkMandateDialogOpen(true)}
            onUnlinkEntity={handleUnlinkMandate}
            showAddButton={true}
            emptyMessage="No mandates linked to this event yet."
          />
```

- [ ] **Step 5: Add the four LinkEntityDialog instances at the end of the component (before the closing `</div>` of the root)**

Just before the Delete Dialog, add:

```tsx
      <LinkEntityDialog
        open={linkClientDialogOpen}
        onOpenChange={setLinkClientDialogOpen}
        entityType="client"
        sourceId={event.id}
        sourceType="event"
        alreadyLinkedIds={(event.linkedClients ?? []).map((c: any) => c.id)}
        onLink={handleLinkClients}
        title="Link Clients to Event"
        description="Select clients associated with this event."
      />
      <LinkEntityDialog
        open={linkPropertyDialogOpen}
        onOpenChange={setLinkPropertyDialogOpen}
        entityType="property"
        sourceId={event.id}
        sourceType="event"
        alreadyLinkedIds={(event.linkedProperties ?? []).map((p: any) => p.id)}
        onLink={handleLinkProperties}
        title="Link Properties to Event"
        description="Select properties associated with this event."
      />
      <LinkEntityDialog
        open={linkDocumentDialogOpen}
        onOpenChange={setLinkDocumentDialogOpen}
        entityType="document"
        sourceId={event.id}
        sourceType="event"
        alreadyLinkedIds={(event.linkedDocuments ?? []).map((d: any) => d.id)}
        onLink={handleLinkDocuments}
        title="Link Documents to Event"
        description="Select documents associated with this event."
      />
      <LinkEntityDialog
        open={linkMandateDialogOpen}
        onOpenChange={setLinkMandateDialogOpen}
        entityType="mandate"
        sourceId={event.id}
        sourceType="event"
        alreadyLinkedIds={(event.linkedMandates ?? []).map((m: any) => m.id)}
        onLink={handleLinkMandates}
        title="Link Mandates to Event"
        description="Select mandates associated with this event."
      />
```

- [ ] **Step 6: Manual verification**

Refresh the event page:
1. Sidebar should now show 4 link panels (Clients, Properties, Documents, Mandates)
2. Click "+ Link" on Linked Clients → search dialog opens → pick a client → click "Link Selected" → client appears in the panel without a page reload
3. Hover the linked client and click the unlink × → client is removed
4. Repeat for properties, documents, mandates

- [ ] **Step 7: Run TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: no new errors. If `LinkEntityDialog` complains about `sourceType="event"`, that's because the file uses `// @ts-nocheck` and won't actually fail; the runtime call will succeed.

- [ ] **Step 8: Commit**

```bash
git add app/[locale]/app/\(routes\)/calendar/events/\[id\]/components/EventDetailView.tsx
git commit -m "feat(calendar): add linked entities panels to event detail"
```

---

## Task 10: EventDetailView — wire EventEditForm Dialog

**Goal:** The current EventDetailView swaps the entire view for `EventEditForm` when in edit mode, which breaks the new layout. Switch to opening `EventEditForm` as a Dialog (which is what it already is — see `components/calendar/EventEditForm.tsx:579`).

**Files:**
- Modify: `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx`

- [ ] **Step 1: Add the EventEditForm import and edit state**

Add to the imports:

```tsx
import { EventEditForm } from "@/components/calendar/EventEditForm";
```

Add to the state hooks (near `showDeleteDialog`):

```tsx
const [showEditDialog, setShowEditDialog] = useState(defaultEditOpen);
```

- [ ] **Step 2: Replace the Edit button's `onClick`**

Find:

```tsx
<Button
  onClick={() => router.push(`?action=edit`)}
  leftIcon={<Edit className="h-4 w-4" />}
>
```

Replace with:

```tsx
<Button
  onClick={() => setShowEditDialog(true)}
  leftIcon={<Edit className="h-4 w-4" />}
>
```

- [ ] **Step 3: Render EventEditForm at the bottom of the component**

Just before the Delete Dialog, add:

```tsx
      <EventEditForm
        eventId={event.friendlyId}
        initialData={event}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          setShowEditDialog(false);
          mutate();
        }}
        onCancel={() => setShowEditDialog(false)}
      />
```

> **Note:** Verify `EventEditForm`'s actual prop signature in `components/calendar/EventEditForm.tsx`. The current event detail page calls it without `open`/`onOpenChange`. If those props don't exist, this task must add them — see the component's existing Dialog wrapper. If the component is already a controlled Dialog accepting `open`/`onOpenChange`, the snippet above is correct as-is.

- [ ] **Step 4: Manual verification**

Refresh the event page. Click Edit. Expected: Dialog opens with the form pre-filled. Save → page refreshes with new values.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/app/\(routes\)/calendar/events/\[id\]/components/EventDetailView.tsx
git commit -m "feat(calendar): open EventEditForm as Dialog from detail view"
```

---

## Task 11: Page wrapper — drop Container and max-w-5xl

**Goal:** The page.tsx wraps EventDetailView in `<Container>` + `<div className="max-w-5xl">`, which is what causes the off-center appearance. Match PropertyView's page wrapper.

**Files:**
- Modify: `app/[locale]/app/(routes)/calendar/events/[id]/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// app/[locale]/app/(routes)/calendar/events/[id]/page.tsx
import { notFound } from "next/navigation";
import { getEvent } from "@/actions/calendar/get-event";
import { getCurrentUser } from "@/lib/get-current-user";
import { EventDetailView } from "./components/EventDetailView";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams?: Promise<{ action?: string }>;
}) {
  const { id, locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const defaultEditOpen = resolvedSearchParams?.action === "edit";

  return (
    <div className="space-y-4">
      <EventDetailView
        event={event}
        defaultEditOpen={defaultEditOpen}
        locale={locale}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
```

- [ ] **Step 2: Visual verification**

Refresh the event detail page on a wide monitor. Expected: page is full-width inside the route layout, no left-aligned `max-w-5xl` cropping. The 2/3 + 1/3 grid uses the full width.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/app/\(routes\)/calendar/events/\[id\]/page.tsx
git commit -m "refactor(calendar): drop Container wrapper from event detail page"
```

---

## Task 12: WeekView — drag distance threshold

**Goal:** Add a 6px movement threshold so a click on an empty slot does NOT start a placeholder, leaving the existing placeholder intact.

**Files:**
- Modify: `components/calendar/WeekView.tsx`

- [ ] **Step 1: Add a `hasMovedRef` and threshold constant**

Find the existing constants block at the top of the function (around line 65-68):

```ts
const START_HOUR = DEFAULT_START_HOUR;
const END_HOUR = DEFAULT_END_HOUR;
const MIN_CREATE_MINUTES = 15;
```

Add this constant just below:

```ts
const DRAG_THRESHOLD_PX = 6;
```

Inside the `WeekView` function body, near the existing refs (around line 95-105), add:

```ts
const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
const hasMovedRef = useRef(false);
```

- [ ] **Step 2: Capture the origin in `handleDayColumnPointerDown`**

In the existing `handleDayColumnPointerDown` callback, after the line `createPointerIdRef.current = e.pointerId;`, add:

```ts
dragOriginRef.current = { x: e.clientX, y: e.clientY };
hasMovedRef.current = false;
```

- [ ] **Step 3: Set `hasMovedRef` in `handlePointerMove`**

Inside the `useEffect` that attaches `handlePointerMove` (around line 234), at the very top of `handlePointerMove`, add:

```ts
const origin = dragOriginRef.current;
if (origin) {
  const dx = e.clientX - origin.x;
  const dy = e.clientY - origin.y;
  if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD_PX) {
    hasMovedRef.current = true;
  }
}
```

- [ ] **Step 4: Guard `onCreateEvent` in `handlePointerUp`**

Find the `handlePointerUp` block (around line 279-294). Replace the existing `if (onCreateEvent && finalState)` block with:

```ts
const finalState = createDragRef.current;
if (hasMovedRef.current && onCreateEvent && finalState) {
  onCreateEvent(finalState.startTime, finalState.endTime);
}
```

Then reset:

```ts
dragOriginRef.current = null;
hasMovedRef.current = false;
```

- [ ] **Step 5: Manual test**

Run `pnpm dev:http`, navigate to Week view:
1. Drag a 1-hour placeholder. Drawer opens. Close drawer with × — placeholder remains.
2. Click an empty slot somewhere else (no drag). Nothing happens. The original placeholder is still there.
3. Drag a new placeholder. The old one is replaced, the new one appears.

- [ ] **Step 6: Commit**

```bash
git add components/calendar/WeekView.tsx
git commit -m "fix(calendar): require 6px drag in week view to start placeholder"
```

---

## Task 13: DayHourView — drag threshold + discard X on draft block

**Goal:** Same threshold fix as Task 12, plus add a small × button on the `DraftEventBlock` that explicitly discards the placeholder.

**Files:**
- Modify: `components/calendar/DayHourView.tsx`

- [ ] **Step 1: Apply the same drag threshold pattern as Task 12**

DayHourView's drag-create logic lives in the same file. Find the equivalent `handleDayColumnPointerDown` / pointer move / pointer up handlers (search for `dragOrigin` or `pointerdown` listeners) and apply the identical changes:

```ts
const DRAG_THRESHOLD_PX = 6;
const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
const hasMovedRef = useRef(false);
```

In the pointer down handler:

```ts
dragOriginRef.current = { x: e.clientX, y: e.clientY };
hasMovedRef.current = false;
```

In the pointer move handler (top of the function):

```ts
const origin = dragOriginRef.current;
if (origin) {
  const dx = e.clientX - origin.x;
  const dy = e.clientY - origin.y;
  if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD_PX) {
    hasMovedRef.current = true;
  }
}
```

In the pointer up handler:

```ts
if (hasMovedRef.current && onCreateEvent && finalState) {
  onCreateEvent(finalState.startTime, finalState.endTime);
}
dragOriginRef.current = null;
hasMovedRef.current = false;
```

- [ ] **Step 2: Add `onDraftDiscard` prop to `DayHourView`**

Update the interface (around line 58-73):

```ts
interface DayHourViewProps {
  // ...existing props...
  onDraftDiscard?: () => void;
}
```

Add it to the function signature destructuring.

- [ ] **Step 3: Add an X discard button to `DraftEventBlock`**

Find the `DraftEventBlock` component (around line 93-155). Update its props:

```ts
function DraftEventBlock({
  startTime,
  endTime,
  startHour,
  endHour,
  onClick,
  onDiscard,
}: {
  startTime: Date;
  endTime: Date;
  startHour: number;
  endHour: number;
  onClick?: () => void;
  onDiscard?: () => void;
}) {
```

Replace the inner JSX (the `<div className="flex items-center justify-between">` block) with:

```tsx
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-primary">
          {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
        </span>
        <div className="flex items-center gap-0.5">
          {onDiscard && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDiscard();
              }}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-primary/20"
              aria-label="Discard placeholder"
            >
              <span className="text-xs text-muted-foreground">×</span>
            </button>
          )}
          <div
            {...attributes}
            {...listeners}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-primary/10"
            title={format(startTime, "HH:mm")}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      </div>
```

- [ ] **Step 4: Pass `onDraftDiscard` to `DraftEventBlock` instances**

In `DayHourView`'s render, find where `DraftEventBlock` is instantiated. Add the `onDiscard` prop:

```tsx
<DraftEventBlock
  // ...existing props...
  onDiscard={onDraftDiscard}
/>
```

- [ ] **Step 5: Wire `onDraftDiscard` from CalendarPageView**

In `components/calendar/CalendarPageView.tsx`, find the `<DayHourView … />` instantiation (around line 545-558). Add:

```tsx
onDraftDiscard={() => {
  setCreateEventStartTime(null);
  setCreateEventEndTime(null);
}}
```

Also add an unmount cleanup effect inside `CalendarPageView` (just below the existing `useEffect`s):

```tsx
useEffect(() => {
  return () => {
    setCreateEventStartTime(null);
    setCreateEventEndTime(null);
    setCreateEventOpen(false);
  };
}, []);
```

- [ ] **Step 6: Manual test**

In Day view:
1. Drag a placeholder. Drawer opens. Close drawer.
2. Click the × on the placeholder block. Placeholder is removed. Drawer stays closed.
3. Drag a new placeholder. Drawer opens. Navigate to Calendar's Month view. Navigate back to Day view. Placeholder is gone.

- [ ] **Step 7: Commit**

```bash
git add components/calendar/DayHourView.tsx components/calendar/CalendarPageView.tsx
git commit -m "fix(calendar): add drag threshold and discard button to day view placeholder"
```

---

## Task 14: Hoist event creation drawer to page level

**Goal:** Move `EventCreateSidePanel` out of the day-view Card and into `CalendarPageView`'s root layout. Rename to `EventCreateDrawer`. Use the same drawer for all view modes.

**Files:**
- Modify: `components/calendar/EventCreateForm.tsx`
- Modify: `components/calendar/CalendarPageView.tsx`

- [ ] **Step 1: Rename `EventCreateSidePanel` → `EventCreateDrawer`**

In `components/calendar/EventCreateForm.tsx`, find the `export function EventCreateSidePanel(` declaration (around line 676). Rename to `EventCreateDrawer`. Keep all internals identical for now.

- [ ] **Step 2: Drop the `open` prop from `EventCreateDrawer`**

The function currently does `if (!open) return null;`. Since the parent will conditionally render the drawer, this guard is no longer needed.

Update the interface signature: keep the same interface name `EventCreateFormProps` but the renderer no longer needs `open`. Inside `EventCreateDrawer`, remove the `if (!open) return null;` line entirely.

The component will now always render its body when mounted; the parent controls whether it's mounted via JSX `{createEventOpen && <EventCreateDrawer ... />}`.

> **Important:** Don't remove `open` from the `EventCreateFormProps` interface — `EventCreateForm` (the Sheet variant) still needs it. Just stop reading `open` inside `EventCreateDrawer`.

- [ ] **Step 3: Hoist drawer to `CalendarPageView` root**

In `components/calendar/CalendarPageView.tsx`, the root return currently looks like:

```tsx
return (
  <div className="space-y-6">
    {/* Stats Overview */}
    {/* Calendar Content */}
  </div>
);
```

Replace with:

```tsx
return (
  <div className="flex gap-6">
    <div className="flex-1 min-w-0 space-y-6 overflow-y-auto">
      {/* Stats Overview — same as before */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* StatsCard ×4 — keep existing */}
      </div>
      {/* Calendar Content — same as before */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* keep all existing tab content */}
      </Tabs>
    </div>

    {createEventOpen && (
      <aside
        className="border-l bg-background flex flex-col sticky top-0 self-start max-h-screen w-full sm:w-[420px] lg:w-[480px] xl:w-[520px]"
        aria-label={t("eventCreateForm.createCalendarEvent")}
      >
        <EventCreateDrawer
          onOpenChange={handleCreateEventOpenChange}
          onSuccess={handleEventCreated}
          defaultStartTime={createEventStartTime}
          defaultEndTime={createEventEndTime}
        />
      </aside>
    )}
  </div>
);
```

- [ ] **Step 4: Update the import in CalendarPageView**

Change the existing import:

```tsx
import { EventCreateForm, EventCreateTrigger, EventCreateSidePanel } from "./EventCreateForm";
```

To:

```tsx
import { EventCreateTrigger, EventCreateDrawer } from "./EventCreateForm";
```

(Drop `EventCreateForm` and `EventCreateSidePanel` — Calendar no longer uses either.)

- [ ] **Step 5: Remove the inline `EventCreateSidePanel` from `renderDayViewContent`**

Find the `renderDayViewContent` function (around line 484-575). Inside it, find the block:

```tsx
{createEventOpen && (
  <EventCreateSidePanel
    open={createEventOpen}
    onOpenChange={handleCreateEventOpenChange}
    onSuccess={handleEventCreated}
    defaultStartTime={createEventStartTime}
    defaultEndTime={createEventEndTime}
  />
)}
```

Delete it entirely. Also collapse the `<div className="flex flex-col lg:flex-row min-h-[500px]">` wrapper to a simple `<div className="min-h-[500px]">` since there's no longer a side panel sharing the row.

- [ ] **Step 6: Remove the per-view-mode `<EventCreateForm>` rendering**

Find:

```tsx
{viewMode !== "day" && (
  <EventCreateForm
    open={createEventOpen}
    onOpenChange={handleCreateEventOpenChange}
    onSuccess={handleEventCreated}
    defaultStartTime={createEventStartTime}
    defaultEndTime={createEventEndTime}
  />
)}
```

Delete it entirely. The hoisted drawer at the root replaces it for every view mode.

- [ ] **Step 7: Manual test across all view modes**

Run `pnpm dev:http` and visit `/en/app/calendar`:
1. **Day view**: click "New Event" → drawer slides in on the right. The day timeline shrinks to make room (because the parent flex layout reflows). Scroll the calendar — drawer stays in place. Scroll inside the drawer — calendar stays in place. ✅
2. **Week view**: click "New Event" → same drawer appears. Navigate to a different week — drawer remains. ✅
3. **Month view**: same. ✅
4. **Semester view**: same. ✅
5. **Year view**: same. ✅
6. Close drawer with the × button → drawer disappears, calendar reflows back to full width.

- [ ] **Step 8: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: no new errors. If `EventCreateForm` is still imported elsewhere (e.g., `PropertyView`, `ClientView`, `MandateView`), those imports MUST keep working — `EventCreateForm` (the Sheet variant) is unchanged.

- [ ] **Step 9: Commit**

```bash
git add components/calendar/EventCreateForm.tsx components/calendar/CalendarPageView.tsx
git commit -m "feat(calendar): hoist event creation drawer to page level"
```

---

## Task 15: Manual end-to-end verification + final commit

**Goal:** Walk through every behavior in the spec, fix any regressions, and create a single integration commit if any tweaks are needed.

- [ ] **Step 1: Event detail page checks**

Visit `/en/app/calendar/events/<friendly-id>`:
- [ ] Header shows back arrow + title + status/type badges + ID line + Edit/Delete buttons (right-aligned)
- [ ] Body is a 2/3 + 1/3 grid (full-width, no `max-w-5xl` cropping)
- [ ] Main column shows: When & Where, Description & Notes (if present), Next Up, Reminders & Invitees (if present)
- [ ] Sidebar shows: Status & Assignment, Linked Clients, Linked Properties, Linked Documents, Linked Mandates
- [ ] Click "+ Link" on Linked Clients → search dialog → pick → client appears in panel without page reload
- [ ] Hover the linked client → unlink × visible → click → client removed
- [ ] Repeat for Properties, Documents, Mandates
- [ ] Click Edit → Dialog opens with form pre-filled → Save → page refreshes
- [ ] Click Delete → confirmation dialog → confirm → redirect to Calendar
- [ ] In Greek locale (`/el/app/calendar/events/<id>`): all section titles render in Greek

- [ ] **Step 2: Next Up checks**

- [ ] If there are no upcoming events for the current user, the Next Up card shows the empty state copy
- [ ] If there are 1-3 upcoming events, they all show
- [ ] If there are 5+ upcoming events, only the first 3 (sorted by start time) show
- [ ] The current event being viewed is excluded from Next Up
- [ ] Click a Next Up row → navigates to that event's detail page

- [ ] **Step 3: Calendar drag/placeholder checks**

Visit `/en/app/calendar` and switch to Day view:
- [ ] Drag an empty hour slot → drawer opens with pre-filled times
- [ ] Click × on drawer header → drawer closes, dashed placeholder block remains visible
- [ ] Click anywhere on an empty slot (no drag) → nothing happens, placeholder still there
- [ ] Click the dashed placeholder → drawer reopens with same times
- [ ] Click the × on the placeholder block itself → placeholder is removed
- [ ] Drag a new placeholder → drawer opens with new times
- [ ] Drag a 2-hour placeholder, navigate to Month view, navigate back to Day → placeholder is gone (because of unmount cleanup)

Repeat in Week view (without the discard × button — that's day-view-only per spec).

- [ ] **Step 4: Drawer behavior across views**

- [ ] In every view mode, clicking "New Event" opens the same drawer on the right
- [ ] The calendar's left column scrolls independently of the drawer
- [ ] On mobile (≤640px), the drawer takes full width and stacks above the calendar

- [ ] **Step 5: TypeScript + lint**

```bash
pnpm tsc --noEmit
pnpm lint
```

Expected: no new errors. Existing warnings are acceptable.

- [ ] **Step 6: Run unit tests**

```bash
pnpm vitest run tests/calendar/next-up-card.test.tsx
```

Expected: all 5 NextUpCard tests pass.

- [ ] **Step 7: If any task above introduced regressions, fix them and commit per task scope.**

- [ ] **Step 8: If everything passes, create a final integration commit (only if any small tweaks were needed during step 7):**

```bash
git add -A
git commit -m "chore(calendar): post-integration tweaks"
```

If no tweaks were needed, skip this step.

---

## Self-review (run after writing the plan)

### Spec coverage checklist

| Spec section | Plan coverage |
|---|---|
| §1 Event Detail Header | Task 7 |
| §1 Main column cards (When/Where, Description, Reminders) | Tasks 7, 8 |
| §1 Sidebar Status & Assignment | Task 7 |
| §1 Sidebar LinkedEntitiesPanels (4 types) | Task 9 |
| §1 LinkEntityDialogs | Task 9 |
| §1 EventEditForm Dialog wiring | Task 10 |
| §1 New `link-entities` endpoint | Tasks 1, 2 |
| §1 8 link/unlink hooks | Task 3 |
| §1 Page wrapper drops Container | Task 11 |
| §2 NextUpCard (data + filter + sort + empty state + i18n) | Tasks 4, 5, 6 |
| §3 6px drag threshold (WeekView) | Task 12 |
| §3 6px drag threshold (DayHourView) | Task 13 |
| §3 X discard on draft block | Task 13 |
| §3 Unmount cleanup | Task 13 (step 5) |
| §4 EventCreateDrawer rename + drop `open` prop | Task 14 |
| §4 Hoist to root flex layout | Task 14 |
| §4 Independent scroll | Task 14 |
| §4 Single drawer for all view modes | Task 14 |

All 18 spec items have a task. No gaps.

### Placeholder scan

- No "TBD", "TODO", "implement later" anywhere
- Every code step shows the actual code, not a description
- Every test step shows the actual test, not a sketch
- Every commit step shows the actual `git` command
- The one "verify the prop signature" note in Task 10 step 3 is explicit about what to check and what to do in each branch — not a deferred decision

### Type / signature consistency

- `useLinkClientsToEvent(eventFriendlyId, eventId)` — same two-arg signature used in Task 3 (definition) and Task 9 (consumption)
- `getCalendarEventKey(eventFriendlyId)` — same arg type (`string`) in Task 3 (cache invalidation) and the existing hook signature in `useCalendarEvent.ts:103`
- Prisma relation names `Clients`, `Properties`, `Documents`, `Mandates` — used identically in Task 1 (POST connect), Task 2 (DELETE disconnect), and verified against `prisma/schema.prisma:108-112`
- `NextUpCardProps` — `currentEventId: string`, `currentUserId?: string` matches between Tasks 5 (test), 6 (component), and 8 (consumer)
- `DraftEventBlock` `onDiscard` prop — added in Task 13 step 3, consumed in Task 13 step 4

No signature drift.

### Scope check

This is a single cohesive UX redesign of one feature area (calendar/events). All four user-reported issues are tightly related and should land together. No need to decompose further.
