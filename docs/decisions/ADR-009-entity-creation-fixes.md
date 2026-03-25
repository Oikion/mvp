# ADR-009: Entity Creation Fixes

**Status:** Implemented
**Date:** 2026-03-15

---

# Entity Creation Fixes — Draft Spam, FK Violations, Mandate Bugs

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Client, Property, Mandate — Wizard + QuickAdd creation flows

## Problems

1. **Draft auto-save spam:** All 3 wizards use `form.watch()` + `useDebounce(500ms)` → POST on every field change. Creates excessive DB writes and orphan draft records.
2. **`assigned_to` FK violation:** `/api/org/users` falls back to Clerk membership ID (`orgmem_xxx`) when no DB user row exists. This isn't a valid `Users.id`, causing P2003 FK violations on any entity write.
3. **Mandate `draftId` never set:** `saveDraft` checks `response.data?.mandate?.id` but draft route returns `{ id }`. Every auto-save creates a NEW record.
4. **Mandate missing PUT handler:** Final submit calls `PUT /api/mandates/${draftId}` but `[mandateId]/route.ts` has no PUT. Draft mandates can never be finalized.
5. **QuickAddMandate navigation:** Reads `response.data.friendlyId` but draft returns `response.data.id`.

## Fixes

### Fix 1: `/api/org/users` — filter out unsynced members

Remove the `?? member.id` fallback. Members without a Prisma `Users` row are excluded from the response entirely. They can't be assigned to entities because they haven't completed onboarding.

### Fix 2: Draft save-on-exit (all 3 wizards)

**Remove:**
- `form.watch()` → `useDebounce` → `useEffect` auto-save pipeline
- Explicit `saveDraft()` calls from `handleNext`, `handlePrevious`, `handleStepClick`

**Add:**
- `useRef` to track whether submission succeeded (`hasSubmittedRef`)
- `useRef` to track the current `draftId` for the session
- `saveDraft` that creates OR updates (upserts via existing draft route) — called only on exit
- `useEffect` cleanup function that fires `saveDraft` on component unmount
- `beforeunload` listener that fires `navigator.sendBeacon` for browser close/navigation
- Guard: skip draft save if `hasSubmittedRef.current === true` (form was successfully submitted)
- Guard: skip draft save if form is pristine (`!form.formState.isDirty`)

**Invariant:** At most ONE draft record per wizard session. If a draft was created on close, reopening the wizard loads that draft (existing behavior). If the user submits successfully, no draft is created.

### Fix 3: Mandate `draftId` capture

Change `response.data?.mandate?.id` to `response.data?.id` to match the draft route's response shape.

### Fix 4: Mandate final submit path

Change wizard's final submit from `PUT /api/mandates/${draftId}` to `PUT /api/mandates` with `{ id: draftId, ...data, draft_status: false }` in the body. This uses the existing collection-level PUT handler.

### Fix 5: QuickAddMandate draft navigation

Have the mandate draft route return `{ id, friendlyId }` in its response. Update QuickAddMandate to read `response.data.friendlyId`.

### Fix 6: Draft route — return `friendlyId` (mandates)

Update `/api/mandates/draft/route.ts` to include `friendlyId` in the response alongside `id`.
