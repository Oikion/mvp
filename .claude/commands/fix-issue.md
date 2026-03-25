Fix GitHub issue $ARGUMENTS.

## Workflow

1. Fetch issue details: `gh issue view $ARGUMENTS`
2. Analyze the issue description, labels, and any linked context
3. Search the codebase for relevant files using grep and file search
4. Create a plan for the fix — list files to modify and approach
5. Implement the fix following Oikion project conventions:
   - Tenant isolation with `organizationId`
   - Permission guards on server actions (`requireAction()`)
   - i18n for user-facing strings (both `el` and `en` locales)
   - shadcn/ui design system compliance
   - See nested CLAUDE.md files for domain-specific conventions
6. Recommend the user run `pnpm lint` and `pnpm build` to verify (do not run these yourself)
7. Create a commit: `fix: resolve issue description (#$ARGUMENTS)`
8. Push and create a PR referencing the issue
9. Return the PR URL when done
