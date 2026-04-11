# Event Detail & Calendar UX Redesign

**Date:** 2026-04-07
**Author:** brainstormed with Claude
**Status:** Draft — pending review
**Scope:** Frontend only. Zero backend changes.

---

## Problem Statement

The Calendar feature in Oikion has four UX issues that are visible on the staging branch today:

1. **Event detail page layout diverges from every other entity detail page.** The event at `[id]/page.tsx` wraps content in a `max-w-5xl` container, producing a single off-center column on wide screens. Entity linking is read-only (server-rendered cards with no link/unlink affordance). Property, Client, and Mandate detail pages use a 2/3 + 1/3 grid with the shared `LinkedEntitiesPanel` component. Users who have learned the Property page structure cannot apply that knowledge on Event pages (violates Nielsen Consistency & Standards).

2. **There is no at-a-glance visibility into what's coming next.** When a user lands on an old event page, there's no way to orient themselves against their schedule without navigating back to the calendar view.

3. **Placeholder drag-to-create blocks are lost when the user misclicks.** After dragging a placeholder in Day/Week view and closing the form (or clicking outside), the next click on an empty slot starts a new drag and silently replaces the previous placeholder. Users lose their in-progress event setup without warning (violates Nielsen Error Recovery / User Control).

4. **Event creation UI eats day-view layout space.** `EventCreateSidePanel` renders *inside* the day view Card, narrowing the timeline when open, and only exists in day view. Week/month/semester/year views use a different form (Sheet modal). The inconsistency forces users to re-learn the form in each view, and the day view's in-Card placement fights with the calendar content for attention.

## Goals

- Event detail page visually and structurally indistinguishable from Property detail page, with full link/unlink capability for all entity types.
- A "Next Up" surface on the Event detail page showing the user's next 3 upcoming events.
- Placeholder blocks persist across misclicks and form dismissals, with explicit discard affordance.
- A single event creation drawer at page level that pushes the Calendar content, works in every view mode, and scrolls independently.

## Non-Goals

- One new backend endpoint: `app/api/calendar/events/[eventId]/linked/route.ts` (POST + DELETE) mirroring the existing `app/api/mls/properties/[propertyId]/linked/route.ts` convention. No schema changes; reuses existing many-to-many tables.
- No new entity types, no schema changes, no migrations.
- No changes to the calendar matching/fetching logic or the data returned by `getEvent()`.
- Existing `EventCreateForm` (Sheet modal) usage from `PropertyView`, `ClientView`, etc. is preserved — only the Calendar page itself switches to the drawer pattern.

---

## Section 1 — Event Detail Page Redesign

### Current state

- `app/[locale]/app/(routes)/calendar/events/[id]/page.tsx` wraps content in `<Container title="…" description="…">` + `<div className="max-w-5xl">`.
- `EventDetailView.tsx` (556 lines) is a single-card, single-column view with read-only inline grids for linked clients/properties/documents/mandates/tasks.
- No link/unlink, no edit dialogs for relationships.
- The edit flow toggles `showEditForm` which swaps the whole view for `EventEditForm`.

### Target state

The Event detail page structurally matches `PropertyView.tsx`:

```
<div className="space-y-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    {/* Header: back icon, title + badges, ID, right-aligned actions */}
  </div>
  <Separator />
  <div className="grid gap-6 lg:grid-cols-3">
    <div className="lg:col-span-2 space-y-6">
      {/* Main column cards */}
    </div>
    <div className="space-y-6">
      {/* Sidebar cards */}
    </div>
  </div>
  {/* Dialogs */}
</div>
```

#### Header

Mirrors PropertyView.tsx:291-354 exactly:

- Left: ghost icon `<ArrowLeft>` back button → `/${locale}/app/calendar`, followed by a block containing:
  - `<h1 className="text-2xl font-bold tracking-tight">` with the event title
  - Inline badges next to the title: status badge (colored) and event type badge (outline)
  - `<p className="text-sm text-muted-foreground mt-0.5">ID: {friendlyId}</p>`
- Right: action buttons in order
  - `<Button onClick={setEditOpen(true)}>` with Edit icon
  - `<EntityQuickActions entityType="event" …>` dropdown (create linked mandate, link client, link property, etc.)
  - **No Share button in this spec.** `ShareModal` currently supports `entityType="PROPERTY"`; event sharing is out of scope. The right action group is: Edit, `EntityQuickActions` dropdown, Delete.

#### Main column (lg:col-span-2 space-y-6)

All cards use the shadcn `<Card>` shell with `<CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base">` + Lucide icon pattern.

| Card | Icon | Content | Conditional |
|---|---|---|---|
| When & Where | `Clock` | 2-column DetailField grid: Start, End, Duration, Location | always |
| Description & Notes | `FileText` | Two sub-sections within one card: Description (`whitespace-pre-wrap`) and Notes (`whitespace-pre-wrap`), each with a muted label. Same card shell as PropertyView's "Notes" card (PropertyView.tsx:434-475). | at least one of `event.description`, `event.notes` truthy |
| Next Up | `Clock` | See Section 2 | always (shows empty state if no upcoming events) |
| Reminders & Invitees | `Bell` | Summary line + list of invitees with status badges + list of reminder offsets | `event.reminders?.length > 0` OR `event.invitees?.length > 0` |

Reuse the `DetailField` sub-component copied from PropertyView.tsx:796-819 (or lift it into a shared helper).

#### Sidebar (space-y-6)

| Card | Purpose |
|---|---|
| Status & Assignment | `User` icon. Uses PropertyView's pattern: status badge, event type, assigned user, created/updated timestamps in muted text |
| `<LinkedEntitiesPanel type="clients">` | count badge, "+ Link" button, scrollable list |
| `<LinkedEntitiesPanel type="properties">` | same |
| `<LinkedEntitiesPanel type="documents">` | same |
| `<LinkedEntitiesPanel type="mandates">` | same |

`LinkedEntitiesPanel` is used unchanged. Its type prop already supports all these entity types (`components/linking/LinkedEntitiesPanel.tsx`).

The `linkedTasks` section currently in EventDetailView is dropped — tasks are surfaced via the task sync system and the existing `TaskEventCard`; tasks on an event page would duplicate what's on the task page. This matches PropertyView which does not list tasks either.

#### Dialogs (rendered as siblings, state on EventDetailView)

- `<LinkEntityDialog entityType="client" sourceId={event.id} sourceType="event" …>`
- `<LinkEntityDialog entityType="property" sourceId={event.id} sourceType="event" …>`
- `<LinkEntityDialog entityType="document" sourceId={event.id} sourceType="event" …>`
- `<LinkEntityDialog entityType="mandate" sourceId={event.id} sourceType="event" …>`
- `<EventEditForm open={editOpen} onOpenChange={setEditOpen} …>` (existing component, used in Dialog mode)
- Delete confirmation `<Dialog>` (existing)

### Data layer (revised after codebase verification)

**Existing hook is sufficient — no new linked-data hook needed.** `hooks/swr/useCalendarEvent.ts` already exists and returns the exact shape required, including `linkedClients`, `linkedProperties`, `linkedDocuments`, `linkedTasks`, `reminders`, etc. EventDetailView will consume `useCalendarEvent(friendlyId)` directly.

**New API endpoint** `app/api/calendar/events/[eventId]/linked/route.ts` exposing POST and DELETE handlers, mirroring the convention from `app/api/mls/properties/[propertyId]/linked/route.ts`. Rationale: every other entity in the codebase uses dedicated `*/linked/route.ts` endpoints for link/unlink operations. Reusing the existing PUT `/api/calendar/events/[eventId]` with set-replace semantics would introduce a one-off pattern that future maintainers would need to learn separately.

The new endpoint accepts a `relationType` field in the body to multiplex between client/property/document/mandate links:

```ts
// POST body
{ relationType: "client" | "property" | "document" | "mandate", ids: string[] }

// DELETE query
?relationType=client&id=<id>
```

**Extend `hooks/swr/useLinkMutations.ts`** with 8 new hooks following the existing `useLinkClientsToProperty` / `useUnlinkClientFromProperty` pattern. Each uses `useSWRMutation` and invalidates the calendar event cache key (`getCalendarEventKey(eventId)`) on success:

- `useLinkClientsToEvent(eventId)` / `useUnlinkClientFromEvent(eventId)`
- `useLinkPropertiesToEvent(eventId)` / `useUnlinkPropertyFromEvent(eventId)`
- `useLinkDocumentsToEvent(eventId)` / `useUnlinkDocumentFromEvent(eventId)`
- `useLinkMandatesToEvent(eventId)` / `useUnlinkMandateFromEvent(eventId)`

**Export** the new hooks from `hooks/swr/index.ts`.

### Page wrapper change

`app/[locale]/app/(routes)/calendar/events/[id]/page.tsx`:

```tsx
// before
return (
  <Container title={…} description={…}>
    <div className="max-w-5xl">
      <EventDetailView …/>
    </div>
  </Container>
);

// after
return (
  <div className="space-y-4">
    <EventDetailView event={event} defaultEditOpen={defaultEditOpen} locale={locale} currentUserId={currentUser.id} />
  </div>
);
```

The `Container` wrapper is intentionally dropped — PropertyView does not use it either. The ambient route layout provides page-level padding.

---

## Section 2 — Next Up Card

### Scope

Show the next 3 upcoming events assigned to the current user, excluding the current event being viewed.

### Data source

Reuse the existing `useCalendarEvents` SWR hook with:

```ts
useCalendarEvents({
  startTime: now.toISOString(),
  endTime: addDays(now, 14).toISOString(),
  includeTasks: false,
});
```

Client-side filter:

```ts
const upcoming = events
  .filter(e => e.eventId !== currentEventId)
  .filter(e => new Date(e.startTime) >= now)
  .filter(e => !assignedUserId || e.assignedUserId === assignedUserId)
  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  .slice(0, 3);
```

If the current user's assignment filter returns zero results, fall back to all events visible to the user (the hook's default scope).

### Component

New file: `components/calendar/NextUpCard.tsx`.

```tsx
interface NextUpCardProps {
  currentEventId: string;
  currentUserId?: string;
}

export function NextUpCard({ currentEventId, currentUserId }: NextUpCardProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const locale = useLocale();

  const now = useMemo(() => new Date(), []);
  const { events, isLoading } = useCalendarEvents({
    startTime: now.toISOString(),
    endTime: addDays(now, 14).toISOString(),
    includeTasks: false,
  });

  const upcoming = useMemo(() => {
    // filter + sort + slice as above
  }, [events, currentEventId, currentUserId, now]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          {t("eventPage.nextUp.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {isLoading && <NextUpSkeleton />}
        {!isLoading && upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            {t("eventPage.nextUp.empty")}
          </p>
        )}
        {!isLoading && upcoming.map(event => (
          <NextUpRow key={event.id} event={event} locale={locale} onClick={() => router.push(`/app/calendar/events/${event.friendlyId}`)} />
        ))}
      </CardContent>
    </Card>
  );
}
```

### Row sub-component

```tsx
function NextUpRow({ event, locale, onClick }: { event: CalendarEvent; locale: string; onClick: () => void }) {
  const t = useTranslations("calendar");
  const start = new Date(event.startTime);
  const dateLocale = locale === "el" ? el : enUS;

  const whenLabel = isToday(start)
    ? t("eventPage.nextUp.today")
    : isTomorrow(start)
    ? t("eventPage.nextUp.tomorrow")
    : format(start, "EEE", { locale: dateLocale });

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-left transition-colors"
    >
      <div className="w-14 shrink-0 text-xs">
        <div className="font-semibold text-foreground">{whenLabel}</div>
        <div className="text-muted-foreground">{format(start, "HH:mm")}</div>
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
}
```

### Empty state

- Skeleton shown while loading (3 rows)
- Muted "No upcoming events in the next 2 weeks" copy when the filtered list is empty
- No CTA button — the user is already inside the calendar system

### i18n keys

Add to `locales/en/calendar.json` and `locales/el/calendar.json` under `eventPage.nextUp`:

```json
"eventPage": {
  "nextUp": {
    "title": "Next Up" / "Τι ακολουθεί",
    "empty": "No upcoming events in the next 2 weeks" / "Δεν υπάρχουν επερχόμενα γεγονότα τις επόμενες 2 εβδομάδες",
    "today": "Today" / "Σήμερα",
    "tomorrow": "Tomorrow" / "Αύριο"
  }
}
```

### Placement

Renders as the **third card** in the main column of EventDetailView, after When & Where and Description, before Reminders & Invitees. Uses the same `<Card>` shell as every other card — no color differentiation.

---

## Section 3 — Placeholder Persistence (Nielsen Error Recovery)

### Bug diagnosis

Three interacting behaviors today:

1. `CalendarPageView.handleEventCreated` (line 396) clears placeholder state on successful creation. **Correct; keep.**
2. `handleCreateEventOpenChange(false)` (line 122) only toggles `createEventOpen`. It does NOT clear placeholder state. **Correct; keep.**
3. `WeekView.handleDayColumnPointerDown` and `DayHourView`'s equivalent set `createDrag` immediately on `pointerdown`. On `pointerup` they call `onCreateEvent(startTime, endTime)` which lands in `CalendarPageView.handleCreateEventFromDrag` (line 468), which **unconditionally** sets `createEventStartTime/EndTime`, replacing the previous placeholder. A tap on empty space with tiny pointer movement produces a 15-minute default placeholder, which silently overwrites the user's real placeholder.

### Fix

**3.1 — Drag-distance threshold in WeekView and DayHourView.**

Track `hasMovedBeyondThreshold` in both files. `handleDayColumnPointerDown` stores initial `clientX/clientY`. `handlePointerMove` sets `hasMovedBeyondThreshold = true` only once the pointer has moved ≥6 pixels from the start. `handlePointerUp` calls `onCreateEvent(startTime, endTime)` **only if `hasMovedBeyondThreshold`** — otherwise treats the gesture as a click and does nothing.

Rationale: a click on an empty slot with no drag intent should be a no-op. It should not overwrite the existing placeholder.

**3.2 — Cleanup on page unmount.**

Add to `CalendarPageView`:

```tsx
useEffect(() => {
  return () => {
    setCreateEventStartTime(null);
    setCreateEventEndTime(null);
    setCreateEventOpen(false);
  };
}, []);
```

Placeholder state is session-scoped to the Calendar page. No localStorage persistence.

**3.3 — Explicit discard affordance on the draft block.**

In `DayHourView.DraftEventBlock` and the week-view draft Card, add a small `<X>` button next to the grip handle. onClick clears `draftStartTime`/`draftEndTime` via a new prop `onDraftDiscard?: () => void`. CalendarPageView wires this to a local handler that sets both times to null.

User mental model: the draft block is a first-class object. It has a reopen affordance (click → open form) and a dismiss affordance (× button). New drags overwrite it as an explicit action.

**3.4 — Click-to-reopen already works.**

`onDraftSelectionClick` is already wired in both views. Confirm behavior after threshold fix: clicking the draft block reopens the form pre-filled with the placeholder's times.

### Behavioral rules

**Drag auto-opens the drawer.** After a successful drag (≥6px movement), `onCreateEvent(startTime, endTime)` is called, which in `CalendarPageView` sets the placeholder and opens the drawer. This existing behavior is preserved — it's the fast path for users who know what they want.

**Click does nothing.** A `pointerdown` → `pointerup` gesture without movement does NOT open the drawer and does NOT overwrite the placeholder. This is the new behavior enabled by the threshold.

### Acceptance criteria

- User drags a 2-hour placeholder in Day view. Drawer opens automatically with pre-filled times.
- User clicks the close × on the drawer. Drawer closes, placeholder remains visible.
- User clicks an empty slot elsewhere (no drag, <6px movement). Nothing happens. Placeholder remains visible. Drawer remains closed.
- User clicks the placeholder. Form reopens pre-filled with the placeholder's times.
- User drags a new placeholder. Old placeholder is replaced (explicit overwrite), new one is shown.
- User clicks the × on the placeholder. Placeholder is discarded.
- User navigates away from `/app/calendar`. On return, no placeholder is present.
- User creates the event successfully. Placeholder is cleared (existing behavior).

---

## Section 4 — Page-Level Event Creation Drawer

### Current architecture

- `EventCreateForm` (`components/calendar/EventCreateForm.tsx:558-674`) — Sheet modal variant, used in month/week/semester/year views.
- `EventCreateSidePanel` (same file, lines 676-800) — right-column variant rendered **inside** the day view's `<Card>` at `CalendarPageView.tsx:561-569`.
- Two forms, two code paths, inconsistent between view modes.

### Target architecture

Single drawer at page level. Renders conditionally as the right column of a 2-column flex layout. Works identically across all view modes.

### Layout change in CalendarPageView

Restructure the root return:

```tsx
return (
  <div className="flex gap-6">
    {/* LEFT — existing content, made scrollable independently */}
    <div className="flex-1 min-w-0 space-y-6 overflow-y-auto">
      {/* Stats cards, tabs, filters, view content — unchanged */}
    </div>

    {/* RIGHT — persistent drawer, only when open */}
    {createEventOpen && (
      <aside
        className={cn(
          "border-l bg-background flex flex-col h-full sticky top-0 self-start max-h-screen",
          "w-full sm:w-[420px] lg:w-[480px] xl:w-[520px]"
        )}
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

The `overflow-y-auto` on the left column and the drawer's internal `<ScrollArea>` give them independent scroll. The drawer uses `sticky top-0 max-h-screen` so it fills the viewport height without being affected by the left column's scroll position.

### Component changes in EventCreateForm.tsx

- **Rename** `EventCreateSidePanel` → `EventCreateDrawer`.
- **Drop** the `open` prop. The parent controls rendering via the conditional `{createEventOpen && <aside>…</aside>}` guard. This simplifies the component and removes the dead `if (!open) return null` check.
- **Keep** the internal `<ScrollArea>` — it's what gives the form its own scroll region.
- **Keep** the close `<X>` button in the drawer header.
- **Keep** `EventCreateForm` (Sheet modal) unchanged. It continues to be used from PropertyView, ClientView, MandateView for "create event linked to this entity" flows launched from non-calendar contexts.

### CalendarPageView changes

- Remove `EventCreateSidePanel` usage from `renderDayViewContent` (lines 561-569).
- Remove the view-mode-gated `<EventCreateForm>` rendering (lines 658-666).
- Add the single `EventCreateDrawer` at root as described above.
- `EventCreateTrigger` button behavior unchanged — toggles `createEventOpen = true` and pre-fills start/end times from the visible date (existing logic at lines 640-655).

### Mobile behavior

Below `sm:` (640px) the drawer takes `w-full`, which causes the left column to shrink to 0 (via `flex-1 min-w-0`). This effectively becomes a modal-style full-screen form on mobile. The left column's `overflow-y-auto` ensures the drawer's content can scroll independently even on small screens. Users can close the drawer to see the calendar again.

### Accessibility

- Drawer `<aside>` gets `aria-label` pointing to the localized "Create Event" title.
- Focus trap is NOT used (drawer is persistent, not modal). Tab order flows naturally from left column into drawer.
- Escape key on focused form field: bind a keyup listener inside `EventCreateDrawer` that calls `onOpenChange(false)` on Escape. Preserve current behavior.

---

## File Inventory

### New files

- `app/api/calendar/events/[eventId]/linked/route.ts`
- `components/calendar/NextUpCard.tsx`

### Modified files

- `app/[locale]/app/(routes)/calendar/events/[id]/page.tsx` — drop Container/max-w-5xl, pass locale and currentUserId
- `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx` — full rewrite following PropertyView pattern
- `components/calendar/CalendarPageView.tsx` — lift drawer to root, add unmount cleanup effect, remove inline panel from renderDayViewContent
- `components/calendar/EventCreateForm.tsx` — rename SidePanel → Drawer, drop `open` prop
- `components/calendar/WeekView.tsx` — drag distance threshold (≥6px)
- `components/calendar/DayHourView.tsx` — drag distance threshold, X discard button on DraftEventBlock
- `hooks/swr/useLinkMutations.ts` — 8 new event link/unlink hooks
- `hooks/swr/index.ts` — new exports
- `locales/en/calendar.json` — `eventPage.nextUp` keys
- `locales/el/calendar.json` — `eventPage.nextUp` keys

### Unchanged

- Existing backend routes (`app/api/calendar/events/route.ts`, `[eventId]/route.ts`, `[eventId]/invitees/route.ts`)
- `hooks/swr/useCalendarEvent.ts` — already returns the linked-entities shape we need; consumed by EventDetailView
- All server actions (`actions/calendar/**`)
- `components/linking/LinkedEntitiesPanel.tsx` (used as-is)
- `components/linking/LinkEntityDialog.tsx` (used as-is — already supports `sourceType="event"` via its generic signature)
- `EventEditForm`, `ShareModal`, `EntityQuickActions` (used as-is)

---

## Testing Strategy

### Unit tests (Vitest, `tests/`)

- `useCalendarEvent` — returns expected shape from mocked fetcher (existing hook; verify it still includes linked entities after EventDetailView refactor)
- Event link/unlink hooks — compute correct final array from existing + new IDs
- `NextUpCard` filter logic — next 3 excluding current event, sorted ascending, respects user filter

### E2E tests (Cypress, `cypress/`)

- Navigate to event detail page → verify 2/3 + 1/3 grid, sidebar cards, Edit button in header
- Click "+ Link" on Linked Clients → select client → verify client appears in panel
- Click × on a linked entity → verify removed
- Day view: drag placeholder → close form → click empty slot → placeholder still visible
- Day view: drag placeholder → click × on placeholder → placeholder removed
- Day view: open event creation → verify left column still scrollable independently
- Month view: click New Event → verify drawer opens on right, calendar pushes left

### Manual verification

- Visual parity check with PropertyView on identical viewport sizes
- Greek locale: verify all new i18n keys render
- Dark mode: verify all cards respect theme tokens

---

## Rollout

Single PR. No feature flag, no migration, no phased rollout — this is a UI refactor with no data model changes. Merge to staging, verify manually, merge to main.

## Risks

- **LinkEntityDialog for events may reveal missing `sourceType="event"` handling.** The dialog uses `alreadyLinkedIds` to filter search results; this already works. But the server-side `onLink` callback path for events needs the PUT endpoint to handle set-replace semantics, which it already does. Low risk.
- **`useCalendarEvents` with 14-day window on every event detail page** adds one extra SWR fetch per page view. Cache-keyed on the date range string; identical pages share the cache. Low cost.
- **Drag threshold may feel sluggish to power users who drag very quickly and release before moving 6px.** Mitigation: 6px is small enough to be invisible at normal speeds; confirm with the user during manual testing and tune if needed.
- **Drawer persistence** means users who open the drawer and navigate between view modes see the same drawer. This is the intended behavior but may surprise users on first encounter. Acceptable; the × close button is always visible.

## Open Questions

None. All ambiguity was resolved during brainstorming (Q1-Q4 answered A across the board).
