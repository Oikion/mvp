Run the 7-phase verification loop to validate current changes are ready for commit/PR.

## Phases

### 1. Build
Recommend the user run `pnpm build`. Do not run it yourself. If the user reports errors, help fix them.

### 2. Lint
Recommend the user run `pnpm lint`. Do not run it yourself. If the user reports errors, help fix them.

### 3. Tenant Isolation
Check all new or modified Prisma queries include `organizationId` filtering:
- Every `findMany`, `findFirst`, `findUnique` on tenant-scoped models must have `where: { organizationId }`
- Every `create` must include `organizationId` in `data`
- Use `git diff` to find changed files, then grep for Prisma calls without organizationId

### 4. i18n
Verify new user-facing strings exist in both locale files:
- Check `locales/el/` and `locales/en/` have matching keys for any new translation keys
- No hardcoded Greek or English strings in components

### 5. Permissions
Verify new server actions have permission guards:
- Every new function in `actions/` should have `requireAction()` or equivalent as the first operation
- Check that API routes verify authentication

### 6. Docs
Check if `docs/`, `docs/architecture/`, or any nested CLAUDE.md references the changed behavior:
- If a feature was modified that has documentation, the docs should be updated in the same PR
- Check ADRs in `docs/decisions/` for relevant architectural decisions

### 7. Diff Review
Review `git diff` for:
- Unintended changes (files that shouldn't have been modified)
- Debug code (`console.log`, `debugger`, `TODO: remove`)
- Secret exposure (API keys, tokens, passwords)
- Missing error handling

## Output
Summarize findings with specific file/line references. Prioritize: Critical (must fix) > Warning (should fix) > Suggestion (consider).
