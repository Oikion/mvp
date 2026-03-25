# System II Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the dead passphrase-based encryption system (System II) and unify to a single PIN-based E2EE unlock flow.

**Architecture:** Delete 15 files (lib/crypto/, actions/encryption/, provider, hook, component), modify 2 UI pages to replace passphrase sections with informational cards, drop 2 Prisma models, update security docs. Zero data migration — System II was never used in production.

**Tech Stack:** Prisma (migration), Next.js (UI pages), next-intl (translations), Vitest (verification)

**Spec:** `docs/superpowers/specs/2026-03-25-system-ii-retirement-design.md`

---

## File Map

### Files to Delete (15)
| File | Responsibility |
|------|---------------|
| `lib/crypto/index.ts` | Barrel exports for System II |
| `lib/crypto/constants.ts` | Crypto constants (`ENCRYPTED_PREFIX`, IV/salt lengths) |
| `lib/crypto/key-derivation.ts` | PBKDF2 KEK derivation from passphrase |
| `lib/crypto/key-wrapping.ts` | OMK generation, wrap/unwrap |
| `lib/crypto/encryption.ts` | AES-GCM field encrypt/decrypt with `e2ee:v1:` prefix |
| `lib/crypto/field-handlers.ts` | Model-specific field handlers |
| `actions/encryption/index.ts` | Barrel exports for encryption actions |
| `actions/encryption/setup-encryption.ts` | First-time passphrase setup action |
| `actions/encryption/get-status.ts` | `getUserWrappedKey`, `getOrganizationEncryptionStatus` |
| `actions/encryption/grant-access.ts` | Grant passphrase access to team member |
| `actions/encryption/revoke-access.ts` | Revoke passphrase access |
| `actions/encryption/update-passphrase.ts` | Change passphrase action |
| `components/providers/EncryptionProvider.tsx` | React context provider for System II |
| `hooks/use-encrypted-search.ts` | Orphaned search hook |
| `components/encryption/IdleTimeoutWarning.tsx` | Orphaned idle timeout component |

### Files to Modify (5)
| File | Change |
|------|--------|
| `app/[locale]/app/(routes)/profile/components/DataControlTab.tsx` | Remove `EncryptionSetupSection` (~lines 207-598), `EncryptionProvider` wrapper, crypto imports. Replace with informational card. |
| `app/[locale]/app/(routes)/admin/data-control/components/OrgDataControlContent.tsx` | Remove all passphrase UI sections and crypto imports. Replace with informational card. |
| `prisma/schema.prisma` | Remove `OrganizationEncryptionStatus`, `OrganizationEncryptionKey` models, and `Users` relation |
| `docs/security/application-security.md` | Update H-5 status to FIXED |
| `locales/en/profile.json` + `locales/el/profile.json` | Add translation keys for replacement card text |

---

## Task 1: Delete Library and Action Files

**Files:**
- Delete: `lib/crypto/` (entire directory — 6 files)
- Delete: `actions/encryption/` (entire directory — 6 files)
- Delete: `components/providers/EncryptionProvider.tsx`
- Delete: `hooks/use-encrypted-search.ts`
- Delete: `components/encryption/IdleTimeoutWarning.tsx`

- [ ] **Step 1: Delete all 15 files**

```bash
rm -rf lib/crypto/
rm -rf actions/encryption/
rm components/providers/EncryptionProvider.tsx
rm hooks/use-encrypted-search.ts
rm components/encryption/IdleTimeoutWarning.tsx
```

- [ ] **Step 2: Note about `components/encryption/` directory**

Do NOT delete the `components/encryption/` directory — it contains `E2EEAnnouncementBanner.tsx` which is actively used by the app layout. Only `IdleTimeoutWarning.tsx` was deleted from it.

- [ ] **Step 3: Commit deletions**

```bash
git add -u lib/crypto/ actions/encryption/ components/providers/EncryptionProvider.tsx hooks/use-encrypted-search.ts components/encryption/
git commit -m "refactor(e2ee): delete System II passphrase encryption (lib/crypto, actions/encryption, EncryptionProvider)"
```

---

## Task 2: Update DataControlTab — Remove Passphrase UI

**Files:**
- Modify: `app/[locale]/app/(routes)/profile/components/DataControlTab.tsx`
- Modify: `locales/en/profile.json`
- Modify: `locales/el/profile.json`

- [ ] **Step 1: Add translation keys**

In `locales/en/profile.json`, add under the appropriate namespace (check existing structure):
```json
"encryption_info_title": "End-to-End Encryption",
"encryption_info_description": "Your data is protected by PIN-based end-to-end encryption.",
"encryption_info_link": "Manage your encryption PIN and session backups in {link}.",
"encryption_info_link_text": "Security Settings"
```

In `locales/el/profile.json`, add the Greek translations:
```json
"encryption_info_title": "Κρυπτογράφηση End-to-End",
"encryption_info_description": "Τα δεδομένα σας προστατεύονται με κρυπτογράφηση end-to-end βασισμένη σε PIN.",
"encryption_info_link": "Διαχειριστείτε το PIN κρυπτογράφησης και τα αντίγραφα ασφαλείας συνεδριών στις {link}.",
"encryption_info_link_text": "Ρυθμίσεις Ασφαλείας"
```

- [ ] **Step 2: Remove System II imports and EncryptionSetupSection from DataControlTab**

In `DataControlTab.tsx`:

1. Remove import at line 76:
```typescript
// DELETE: import { useEncryption, EncryptionProvider } from "@/components/providers/EncryptionProvider";
```

2. Remove imports at lines 78-85:
```typescript
// DELETE: import { validatePassphrase, generateSalt, deriveKEK, saltToBase64, generateOMK, wrapKey } from "@/lib/crypto";
```

3. Remove import at line 86:
```typescript
// DELETE: import { setupOrganizationEncryption } from "@/actions/encryption";
```

4. Delete the entire `EncryptionSetupSection` function (~lines 207-598).

5. Replace the `<EncryptionProvider>` block in `DataControlTab` (lines 1406-1408) with an informational card:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Lock className="h-5 w-5" />
      {t("encryption_info_title")}
    </CardTitle>
    <CardDescription>
      {t("encryption_info_description")}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      {t.rich("encryption_info_link", {
        link: (chunks) => (
          <Link href="/app/settings/security" className="text-primary underline">
            {chunks}
          </Link>
        ),
      })}
    </p>
  </CardContent>
</Card>
```

Note: Check if `Link` is already imported from `@/navigation`. If not, add the import. Check if `useTranslations` is already called with the right namespace. Adjust `t()` calls to match the existing pattern in the file.

6. Clean up any now-unused imports from lucide-react or UI components that were only used by `EncryptionSetupSection`.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit` (or `pnpm build`)
Expected: No type errors related to the removed imports.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/app/(routes)/profile/components/DataControlTab.tsx locales/en/profile.json locales/el/profile.json
git commit -m "refactor(e2ee): replace passphrase UI with E2EE info card in DataControlTab"
```

---

## Task 3: Update OrgDataControlContent — Remove Passphrase Admin UI

**Files:**
- Modify: `app/[locale]/app/(routes)/admin/data-control/components/OrgDataControlContent.tsx`

- [ ] **Step 1: Remove System II imports and passphrase sections**

1. Remove import at line 35:
```typescript
// DELETE: import { useEncryption } from "@/components/providers/EncryptionProvider";
```

2. Remove imports at lines 37-46:
```typescript
// DELETE: import { validatePassphrase, generateSalt, ... } from "@/lib/crypto";
```

3. Remove imports at lines 47-53 (actions/encryption imports):
```typescript
// DELETE: import { setupOrganizationEncryption, getOrganizationEncryptionStatus, ... } from "@/actions/encryption";
```

4. Remove all passphrase-related state, handlers, and UI sections from the component. This includes:
   - Encryption setup form (passphrase input, confirm, submit)
   - Team member encryption access management (grant/revoke)
   - Encryption status display
   - Any `useEncryption()` hook calls

5. Replace with an informational card (same pattern as Task 2, but admin-focused):

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Lock className="h-5 w-5" />
      Data Encryption
    </CardTitle>
    <CardDescription>
      Organization data is protected by server-side encryption and PIN-based E2EE for messaging.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      Team members can manage their encryption PIN in Security Settings.
    </p>
  </CardContent>
</Card>
```

Note: This file may need similar i18n treatment. Check if it uses `useTranslations` and add keys accordingly. If the file doesn't use translations (some admin pages use hardcoded English), match the existing pattern.

6. Clean up unused imports.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/app/(routes)/admin/data-control/components/OrgDataControlContent.tsx
git commit -m "refactor(e2ee): replace passphrase admin UI with E2EE info card in OrgDataControlContent"
```

---

## Task 4: Drop Prisma Models + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDD_drop_system_ii_encryption_tables/migration.sql`

- [ ] **Step 1: Remove models from schema.prisma**

1. Remove the `OrganizationEncryptionKey[]` relation from the `Users` model (line ~1001):
```prisma
// DELETE this line:
OrganizationEncryptionKey                          OrganizationEncryptionKey[]
```

2. Remove the `OrganizationEncryptionStatus` model (starts at ~line 3267):
```prisma
// DELETE entire model block (~lines 3263-3279)
```

3. Remove the `OrganizationEncryptionKey` model (starts at ~line 3281):
```prisma
// DELETE entire model block (~lines 3281-3297)
```

- [ ] **Step 2: Generate and apply migration**

```bash
npx prisma migrate dev --name drop_system_ii_encryption_tables
```

Expected: Migration created that drops both tables. Applied successfully.

- [ ] **Step 3: Verify Prisma client**

```bash
pnpm prisma generate
```

Expected: No errors. `prismadb.organizationEncryptionKey` and `prismadb.organizationEncryptionStatus` no longer available.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "refactor(e2ee): drop System II Prisma models (OrganizationEncryptionStatus, OrganizationEncryptionKey)"
```

---

## Task 5: Update Documentation

**Files:**
- Modify: `docs/security/application-security.md`

- [ ] **Step 1: Update H-5 status**

Find the H-5 finding block and update:

```markdown
| **Status** | FIXED (2026-03-25) |
```

Add implementation notes:
```markdown
**Status**: FIXED (2026-03-25)
**Implementation**: Complete removal of System II (passphrase-based encryption).
- Deleted: `lib/crypto/` (6 files), `actions/encryption/` (6 files), `EncryptionProvider`, `use-encrypted-search`, `IdleTimeoutWarning`
- Dropped: `OrganizationEncryptionStatus` and `OrganizationEncryptionKey` Prisma models
- Replaced: Passphrase UI in DataControlTab and OrgDataControlContent with E2EE info cards pointing to Security Settings
- Result: Single unlock flow (PIN-based, System III) — no more dual-state confusion
- Spec: `docs/superpowers/specs/2026-03-25-system-ii-retirement-design.md`
```

Update Phase 4 tracking table row for H-5.

- [ ] **Step 2: Commit**

```bash
git add docs/security/application-security.md
git commit -m "docs(security): update H-5 status to FIXED — System II retired"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Grep for any remaining System II references**

```bash
grep -r "lib/crypto" --include="*.ts" --include="*.tsx" .
grep -r "useEncryption" --include="*.ts" --include="*.tsx" .
grep -r "EncryptionProvider" --include="*.ts" --include="*.tsx" .
grep -r "e2ee:v1:" --include="*.ts" --include="*.tsx" .
grep -r "actions/encryption" --include="*.ts" --include="*.tsx" .
```

Expected: Zero results for all five greps.

- [ ] **Step 2: Verify migration status**

```bash
pnpm db:status
```

Expected: All migrations applied, no pending migrations.

- [ ] **Step 3: Run full build**

```bash
pnpm build
```

Expected: Build succeeds with no broken imports.

- [ ] **Step 4: Run test suite**

```bash
pnpm vitest run
```

Expected: All tests pass (97+ E2EE tests unaffected since they test System III, not System II).

- [ ] **Step 5: Run lint**

```bash
pnpm lint
```

Expected: No new errors.

- [ ] **Step 6: Visual verification (manual)**

Start dev server (`pnpm dev`) and verify:
1. Profile → Data Control tab renders the E2EE info card (not the old passphrase setup)
2. Admin → Data Control page renders the E2EE info card (not the old passphrase management)
3. E2EE PIN unlock still works normally (System III unaffected)

---

## Dependency Order

```
Task 1 (Delete files) → Task 2 (DataControlTab) → Task 3 (OrgDataControlContent) → Task 4 (Prisma) → Task 5 (Docs) → Task 6 (Verify)
```

Tasks 2 and 3 depend on Task 1 (files must be deleted first so the build doesn't have conflicting imports).
Task 4 is independent of 2/3 but placed after for clean commit history.
Task 6 is the final verification gate.
