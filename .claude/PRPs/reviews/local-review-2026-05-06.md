# Local Code Review — 2026-05-06

**Reviewed**: 2026-05-06  
**Branch**: staging  
**Decision**: REQUEST CHANGES (2 HIGH, 3 MEDIUM, 4 LOW)

## Summary

38-file changeset covering: matchmaking decryption fixes, request edit form UX improvements, AI-assisted request generation, messaging attachment upload, network feed sidebar redesign, import engine enhancements, and calendar notification decryption. Core logic is sound and well-structured. Two issues require fixes before commit: a missing property-ownership check in a server action, and an eslint-disable directive that masks a real dependency issue.

---

## Findings

### CRITICAL
None.

---

### HIGH

**H-1 · `generate-from-contacts.ts:77-91` — propertyId not validated against org**  
File: `actions/requests/generate-from-contacts.ts`  
Contact IDs are verified to belong to the org, but `propertyId` values from the preview payload are stored in result items and passed through without any org membership check. While propertyId is used only as a reference (not queried or written to the DB in a way that crosses tenant boundaries today), accepting unvalidated external IDs creates a foothold for future IDOR if the field is ever used in a join. Per the project's multi-tenant isolation rules ("Always verify a resource belongs to the org before update/delete"), this must be validated.

```typescript
// After line 77, add:
const allPropertyIds = Array.from(new Set(previews.map((p) => p.propertyId)));
const validProperties = await prismadb.property.findMany({
  where: { id: { in: allPropertyIds }, organizationId },
  select: { id: true },
});
const validPropertyIdSet = new Set(validProperties.map((p) => p.id));
// Then add check: if (!validPropertyIdSet.has(preview.propertyId)) → skipped
```

---

**H-2 · `EditRequestForm.tsx:136` — Stale eslint-disable on react-hooks/exhaustive-deps**  
File: `app/[locale]/app/(routes)/requests/[requestId]/components/EditRequestForm.tsx:136`  
The comment `// eslint-disable-next-line react-hooks/exhaustive-deps` was added to suppress a deps warning for `onSubmit`. But `onSubmit` is defined **after** the `useEffect` that depends on it — a textbook closure staleness bug. The suppression hides the real lint warning rather than fixing it. The correct fix is to either move `onSubmit` before the effect or use `useCallback` so it can be included in the deps array without causing infinite re-registration.

```typescript
// Fix: wrap onSubmit in useCallback
const onSubmit = useCallback(async (values: RequestEditFormValues) => {
  // ... body unchanged
}, [form, router, t, toast, onSuccess]);

// Then remove the eslint-disable comment and add onSubmit to deps:
}, [form, onSubmit]);
```

---

### MEDIUM

**M-1 · `RequestMatchesTab.tsx:84,97` — Missing translation keys (TS error)**  
File: `app/[locale]/app/(routes)/matchmaking/components/RequestMatchesTab.tsx`  
`t("requestMatches.runNow.cooldown", ...)` and `t("requestMatches.runNow.cooldownLabel")` are called but neither key exists in `locales/en/matchmaking.json` or `locales/el/matchmaking.json`. The TypeScript compiler flags these as type errors. At runtime, next-intl returns the key string as fallback, producing visible garbage text in the UI if the cooldown feature is triggered.

**Fix**: Add to both locale files under `requestMatches.runNow`:
```json
"cooldown": "Next run available in {minutes} min",
"cooldownLabel": "Cooling down..."
```

---

**M-2 · `GenerateRequestSuggestion.tsx:7` — Absolute app path import**  
File: `app/[locale]/app/(routes)/crm/contacts/[contactId]/components/GenerateRequestSuggestion.tsx:7`  
The import uses a literal app path: `@/app/[locale]/app/(routes)/requests/components/AutoGenerateRequestsDialog`. This is fragile — if the locale-segment routing structure ever changes, this breaks silently (the file is in the same route tree). Use a relative import or create a barrel export in the requests components directory.

```typescript
// Better:
import { AutoGenerateRequestsDialog } from "../../../../../../requests/components/AutoGenerateRequestsDialog";
// Or add AutoGenerateRequestsDialog to requests/components/index.ts and import from @/components/requests
```

---

**M-3 · `actions/activities/index.ts:176-177` — Hardcoded English strings in body patch**  
File: `actions/activities/index.ts:176`  
`patchCalendarActivityBodies` builds the `body` string using hardcoded English: `"Added to event"` / `"Removed from event"`. The rest of the activity system uses locale-aware strings. Since body text is likely shown in UI and the project supports Greek (default locale), these strings will always appear in English regardless of the user's locale.

**Fix**: Either pass the org's locale and use a locale-aware string, or rely only on `metadata.eventTitle` (let the UI format the label), removing the hardcoded prefix from the server-side patch entirely.

---

### LOW

**L-1 · `RequestMatchesTab.tsx` — Unused import `Info`**  
The `Info` icon is imported from lucide-react but no longer used (it was removed when the tooltip trigger was refactored from `<Info />` to the circle div). Remove it.

**L-2 · `FeedDiscoverySidebar.tsx` — Always renders agent card even when empty**  
The agency card is conditionally rendered (`{hasAgencies && ...}`) but the agent card is always rendered (even with the empty state). This is intentional per the new design (shows an empty state CTA), but it creates asymmetry that may confuse future maintainers. A comment explaining the design intent would prevent accidental "fixes."

**L-3 · `UploadStep.tsx:349-357` — Template headers still use old mandate names**  
The `UNIFIED_TEMPLATE_HEADERS` array was updated for `request_transaction_type` and `request_municipality` but the comment still says `// Mandate`. Updated: ✅ (already fixed in diff). Good.

**L-4 · `get-persisted-matches.ts` — DEK fetched N+1 times per row**  
`decryptRequestForOrg` and `decryptContactForOrg` each call `getOrgDeksForDecryption(orgId)` internally. With 20 rows and ~2 contacts each, that's up to 60 DEK fetches (though likely cached). Consider fetching the DEKs once and applying decryption manually, or confirm that `getOrgDeksForDecryption` caches aggressively per request.

---

## Validation Results

| Check | Result |
|---|---|
| TypeScript (tsc --noEmit) | Partial FAIL — 2 new errors in changed files (M-1 above); remaining errors are pre-existing in legacy stubs |
| ESLint | FAIL — 1 warning treated as error: stale eslint-disable in EditRequestForm.tsx (H-2) |
| Tests | Skipped (no test runner invoked — test files not in changeset) |
| Build | Skipped |

---

## Files Reviewed

| File | Change |
|---|---|
| `actions/matchmaking/get-persisted-matches.ts` | Modified — decryption + filter fix |
| `actions/activities/index.ts` | Modified — calendar activity body patch |
| `actions/requests/index.ts` | Modified — export added |
| `actions/requests/generate-from-contacts.ts` | Added — AI request generation |
| `app/.../matchmaking/components/RequestMatchesTab.tsx` | Modified — tooltip + type-safe data |
| `app/.../matchmaking/components/MatchScoreBreakdown.tsx` | Modified — lowercase criterion fix |
| `app/.../matchmaking/components/MatchmakingDashboard.tsx` | Modified — tab value rename |
| `app/.../matchmaking/components/MandateMatchesTab.tsx` | Deleted — legacy cleanup |
| `app/.../requests/[requestId]/components/EditRequestForm.tsx` | Modified — UX improvements |
| `app/.../requests/[requestId]/components/RequestView.tsx` | Modified — dirty-state guard |
| `app/.../requests/components/RequestsPageView.tsx` | Modified — auto-generate button |
| `app/.../requests/components/AutoGenerateRequestsDialog.tsx` | Added |
| `app/.../crm/contacts/[contactId]/components/ContactView.tsx` | Modified — suggestion banner |
| `app/.../crm/contacts/[contactId]/components/GenerateRequestSuggestion.tsx` | Added |
| `app/.../network/feed/components/FeedDiscoveryCard.tsx` | Modified — i18n fix |
| `app/.../network/feed/components/FeedDiscoverySidebar.tsx` | Modified — i18n + empty state |
| `app/.../network/feed/components/FeedPage.tsx` | Modified — prop cleanup |
| `app/.../network/messages/components/MessageComposer.tsx` | Modified — file upload + group E2EE |
| `app/.../network/messages/components/MessagesPage.tsx` | Modified — isGroupConversation |
| `app/.../network/profile/components/tabs/ConnectionsTab.tsx` | Modified — minor copy |
| `app/api/calendar/events/route.ts` | Modified — decrypt before notify |
| `app/api/calendar/events/[eventId]/route.ts` | Modified — decrypt before notify |
| `app/api/messaging/messages/route.ts` | Modified — attachment validation |
| `components/import/ImportWizardSteps.tsx` | Modified — auto-detect request columns |
| `components/import/UploadStep.tsx` | Modified — conditional toggle |
| `components/linking/LinkedEntitiesPanel.tsx` | Modified — ScrollArea → div |
| `lib/import/contact-import-schema.ts` | Modified — enum alignment |
| `lib/import/enum-normalizer.ts` | Modified — PORTAL_LEAD/SOCIAL_MEDIA |
| `lib/import/unified-field-definitions.ts` | Modified — mandate alias backward compat |
| `locales/en/*`, `locales/el/*` | Modified — i18n strings |
| `dictionaries.ts` | Modified — network namespace |
| `next.config.mjs` | Modified — turbopack cache disabled |
| `.source/index.ts` | Modified — auto-generated, order swap |

---

## Positive Observations

- **Decryption correctness**: Calendar notification fix (decrypt before notify) is correct and consistent across POST and PUT/DELETE routes.
- **Import backward compatibility**: Adding `mandate_transaction_type` etc. as aliases to request fields is the right approach for data migration continuity.
- **State machine in AutoGenerateRequestsDialog**: Using a discriminated union reducer (`Step` type) for a multi-step wizard is clean and prevents impossible UI states.
- **Dirty-state guard in RequestView**: Using `useRef` (not `useState`) for the dirty flag avoids unnecessary re-renders — correct pattern.
- **Contact validation in generate-from-contacts**: The batch query `findMany({ where: { id: { in: allContactIds }, organizationId } })` correctly handles org isolation for contacts.
