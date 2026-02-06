Review current changes for code quality, security, and convention compliance. Do not run build or lint yourself — recommend the user run them.

1. Use `git diff` (or recommend the user run it) to see all staged and unstaged changes
2. Recommend the user run `pnpm lint` to check for lint errors
3. For each changed file, check:

**Security:**
- [ ] Tenant isolation: All Prisma queries filter by `organizationId`
- [ ] Auth: Server actions have `requireAction()` guards
- [ ] Auth: API routes verify authentication first
- [ ] Input: User input validated with Zod
- [ ] Secrets: No hardcoded API keys, tokens, or passwords

**Conventions:**
- [ ] Imports follow ordering rules (React/Next > external > internal > relative)
- [ ] TypeScript: No `any` types, proper error handling
- [ ] i18n: No hardcoded strings, translations in both `el` and `en`
- [ ] Components: Using shadcn/ui, semantic color tokens, no hardcoded hex
- [ ] Response helpers: Using `actionSuccess/actionError` or `apiSuccess/apiError`

**Quality:**
- [ ] Files under 300 lines
- [ ] No debug code (`console.log`, `debugger`, `TODO: remove`)
- [ ] Error handling with early returns
- [ ] Self-explanatory code with minimal comments

4. Summarize findings with specific file/line references
5. Prioritize issues: Critical (must fix) > Warning (should fix) > Suggestion (consider)
