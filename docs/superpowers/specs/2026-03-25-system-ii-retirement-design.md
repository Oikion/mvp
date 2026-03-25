# H-5: System II (Passphrase E2EE) Retirement — Design Spec

> **Date**: 2026-03-25
> **Finding**: H-5 (Two Separate Unlock Flows With No UX Coordination)
> **Status**: Approved — ready for implementation planning
> **Related**: [application-security.md](../../security/application-security.md), [e2ee-architecture.md](../../security/e2ee-architecture.md)

## Problem

The application has three parallel encryption systems:

| System | Credential | Purpose | Status |
|--------|-----------|---------|--------|
| **I** (Server DEK) | None (transparent) | Field encryption at rest | Active — ~13 models |
| **II** (Passphrase) | Passphrase | Client-side field display encryption | **Dead — never used in production** |
| **III** (PIN / Signal) | PIN | E2EE for messaging + entity comments | Active — 15+ consumers |

System II and System III operate independently. A user could theoretically unlock one while the other remains locked, with no UI indication of the split state. This is the H-5 finding.

However, the root cause is simpler than the finding suggests: **System II was never adopted.** It is mounted in exactly 1 location (`DataControlTab` on the profile page), consumed by only 3 files, and its search hook and idle timeout component are orphaned. No production data carries the `e2ee:v1:` prefix that System II produces.

**The fix is not UX coordination — it's retirement.**

## Solution: Complete Removal of System II

Delete all System II code, server actions, UI components, and database models. Replace the passphrase UI sections with an informational card pointing users to PIN-based E2EE in Security Settings.

After this change, the application has exactly two encryption systems:
- **System I** (server-side DEK) — transparent, always on
- **System III** (PIN-based E2EE) — user-controlled, single unlock flow

### Success Criteria

1. Zero references to `lib/crypto/`, `EncryptionProvider`, `useEncryption`, or `use-encrypted-search` remain in the codebase
2. `pnpm build` succeeds with no broken imports
3. `pnpm vitest run` passes with no regressions
4. DataControlTab and OrgDataControlContent render correctly with replacement cards
5. H-5 status updated to FIXED in `application-security.md`

---

## Files to Delete (15 files)

### Library — `lib/crypto/` (6 files)

| File | Purpose (now dead) |
|------|--------------------|
| `lib/crypto/index.ts` | Barrel exports |
| `lib/crypto/constants.ts` | `ENCRYPTED_PREFIX = "e2ee:v1:"`, IV/salt lengths |
| `lib/crypto/key-derivation.ts` | PBKDF2 KEK derivation from passphrase |
| `lib/crypto/key-wrapping.ts` | OMK generation, wrap/unwrap with KEK |
| `lib/crypto/encryption.ts` | AES-GCM field encrypt/decrypt with `e2ee:v1:` prefix |
| `lib/crypto/field-handlers.ts` | Model-specific field handlers (Clients, Properties, etc.) |

### Server Actions — `actions/encryption/` (6 files)

| File | Purpose (now dead) |
|------|--------------------|
| `actions/encryption/index.ts` | Barrel exports |
| `actions/encryption/setup-encryption.ts` | First-time passphrase setup |
| `actions/encryption/get-status.ts` | `getUserWrappedKey`, `getOrganizationEncryptionStatus` |
| `actions/encryption/grant-access.ts` | Grant passphrase access to team member |
| `actions/encryption/revoke-access.ts` | Revoke passphrase access |
| `actions/encryption/update-passphrase.ts` | Change passphrase |

### Components + Hooks (3 files)

| File | Purpose (now dead) |
|------|--------------------|
| `components/providers/EncryptionProvider.tsx` | React context provider for System II |
| `hooks/use-encrypted-search.ts` | Client-side search over encrypted fields (orphaned — never imported) |
| `components/encryption/IdleTimeoutWarning.tsx` | Idle auto-lock countdown (orphaned — never imported) |

---

## Files to Modify (5 files)

### UI Pages (2 files)

**`app/[locale]/app/(routes)/profile/components/DataControlTab.tsx`**
- Remove `<EncryptionProvider>` wrapper and `<EncryptionSetupSection>` component
- Remove all imports from `@/lib/crypto` and `@/actions/encryption`
- Replace with an informational card:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Shield className="h-5 w-5" />
      End-to-End Encryption
    </CardTitle>
    <CardDescription>
      Your data is protected by PIN-based end-to-end encryption.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      Manage your encryption PIN and session backups in{" "}
      <Link href="/app/settings/security" className="text-primary underline">
        Security Settings
      </Link>.
    </p>
  </CardContent>
</Card>
```

**`app/[locale]/app/(routes)/admin/data-control/components/OrgDataControlContent.tsx`**
- Remove passphrase encryption management sections (setup, team access grant/revoke)
- Remove all imports from `@/lib/crypto` and `@/actions/encryption`
- Replace with the same informational card pattern, adjusted for admin context:
  - "Organization data is protected by server-side encryption and PIN-based E2EE for messaging."

### Prisma Schema (1 file)

**`prisma/schema.prisma`**
- Remove `OrganizationEncryptionStatus` model (~line 3267)
- Remove `OrganizationEncryptionKey` model (~line 3281)
- Remove `OrganizationEncryptionKey[]` relation from the `Users` model (~line 1001)
- Create migration: `drop_system_ii_encryption_tables`

### Documentation (2 files)

**`docs/security/application-security.md`**
- Update H-5 status from `OPEN` to `FIXED (2026-03-25)`
- Add implementation notes referencing this spec
- Update the Phase 4 tracking table

**Memory/CLAUDE.md references**
- Remove any references to `lib/crypto/field-handlers.ts` being "TO BE RETIRED" — it's now retired
- Update encryption architecture description if it references three systems

---

## Database Migration

The migration drops two tables:

```sql
-- Drop foreign key constraint first (OrganizationEncryptionKey → OrganizationEncryptionStatus)
-- Then drop tables
DROP TABLE IF EXISTS "OrganizationEncryptionKey";
DROP TABLE IF EXISTS "OrganizationEncryptionStatus";
```

**Risk**: Zero — tables are empty (System II was never used in production). The migration is purely structural cleanup.

**Rollback**: Standard Prisma migration rollback. Tables can be recreated from git history if ever needed (they won't be).

---

## What's NOT Touched

| System | Files | Reason |
|--------|-------|--------|
| System I (Server DEK) | `lib/encryption.ts`, `lib/key-management.ts`, `lib/model-encryption.ts` | Active production system — unrelated to System II |
| System III (PIN E2EE) | `lib/e2ee/*`, `hooks/useE2EE.ts` | Active production system — the surviving E2EE |
| E2EE identity infrastructure | `app/api/e2ee/*` | Unrelated to passphrase system |
| `OrgEncryptionKey` model | `prisma/schema.prisma` | This is System I's per-org DEK — NOT System II. Different model name (`OrgEncryptionKey` vs `OrganizationEncryptionKey`) |

**Important disambiguation**: `OrgEncryptionKey` (System I, active) is NOT the same as `OrganizationEncryptionKey` (System II, being deleted). The naming is confusingly similar but they serve completely different purposes.

---

## Testing Strategy

1. **Build verification**: `pnpm build` — catches any broken imports
2. **Test suite**: `pnpm vitest run` — ensures no regressions in existing 97+ E2EE tests
3. **Grep verification**: `grep -r "lib/crypto" --include="*.ts" --include="*.tsx"` should return zero results
4. **UI verification**: DataControlTab and OrgDataControlContent pages render the replacement cards
5. **Migration verification**: `pnpm db:status` shows migration applied cleanly

---

## Security Invariants

After this change:
- No code path exists that can produce `e2ee:v1:` prefixed ciphertext
- No code path exists that derives a KEK from a passphrase (PIN-based KEK in System III uses a completely separate derivation)
- The `ENCRYPTED_PREFIX` constant no longer exists in the codebase
- The idle auto-lock timer (5-minute, passphrase-based) is removed; System III's auto-lock is managed by the E2EE hook
