Fix GitHub issue $ARGUMENTS.

1. Fetch issue details with `gh issue view $ARGUMENTS`
2. Analyze the issue description, labels, and any linked context
3. Search the codebase for relevant files using semantic search and grep
4. Create a plan for the fix — list files to modify and approach
5. Implement the fix following Oikion project conventions:
   - Tenant isolation with `organizationId`
   - Permission guards on server actions
   - i18n for user-facing strings (both `el` and `en`)
   - shadcn/ui design system compliance
6. Recommend the user run `pnpm lint` and `pnpm build` to verify no regressions (do not run these yourself)
7. Create a commit with `fix: resolve issue description (#$ARGUMENTS)`
8. Push and create a PR referencing the issue
9. Return the PR URL when done
