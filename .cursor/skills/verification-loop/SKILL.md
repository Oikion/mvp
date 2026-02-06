# Verification Loop

A 6-phase validation the **user** should run before marking any work as complete. This ensures code quality, security, and consistency across the Oikion codebase.

**Agent behavior:** Do not run these checks yourself. Recommend the user run `/verify` or run the phases below themselves. Only suggest and describe; do not execute build, lint, or verification commands.

## When to Recommend

Suggest the user run verification before:
- Declaring a task "done"
- Creating a pull request
- Committing significant changes
- After implementing a new feature

## The 6 Phases (user runs these)

### Phase 1: Build

```bash
pnpm build
```

User should fix ALL build errors before proceeding. Build runs `prisma generate --no-engine` first, then `next build --webpack`.

### Phase 2: Lint

```bash
pnpm lint
```

User should fix lint errors. The linter includes:
- ESLint standard rules
- `@oikion/eslint-plugin-design-system` (no hardcoded colors, semantic typography, no deprecated toast)
- TypeScript type checking

### Phase 3: Tenant Isolation Check

User (or tooling) searches for any new Prisma queries that might be missing `organizationId` filtering:

```bash
# Check for queries without organizationId in changed files
git diff --name-only | xargs grep -l "prismadb\." | xargs grep -L "organizationId"
```

For each flagged file:
- Verify the query is tenant-scoped and includes `organizationId` in the `where` clause
- If using `prismaForOrg()`, verify it's called with a valid org ID
- If the query is intentionally unscoped (e.g., platform admin), document why

### Phase 4: i18n Check

For any new user-facing strings:
- Verify translation keys exist in BOTH `locales/el/` and `locales/en/`
- Verify no hardcoded Greek or English strings in `.tsx` files
- Check that `useTranslations()` or `getTranslations()` is used

### Phase 5: Permission Check

For any new server actions or API routes:
- Verify server actions start with `requireAction()` guard
- Verify API routes check authentication first
- Verify mutations check appropriate permission level

### Phase 6: Diff Review

```bash
git diff --stat
git diff
```

Review all changed files for:
- Unintended modifications
- Debug code left behind (`console.log`, `debugger`, `TODO: remove`)
- Sensitive data exposure (API keys, tokens, passwords)
- Files that shouldn't have been modified

## Verification Report

The user can use this checklist after running the phases:

```
VERIFICATION REPORT
===================
Build:       [PASS/FAIL]
Lint:        [PASS/FAIL]
Tenant:      [PASS/FAIL] (X queries checked)
i18n:        [PASS/FAIL] (X new strings verified)
Permissions: [PASS/FAIL]
Diff:        [PASS/FAIL] (X files changed)
Overall:     [READY/NOT READY] for commit/PR
```

If any phase fails, the user should fix the issues and re-run that phase before proceeding.
