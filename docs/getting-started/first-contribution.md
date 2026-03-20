# First Contribution

## Branching strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation |
| `refactor/*` | Code refactoring |

```bash
git checkout main && git pull upstream main
git checkout -b feature/your-feature-name
```

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Scopes:** `crm`, `mls`, `feed`, `auth`, `api`, `ui`, `db`, `i18n`

Examples:

```
feat(crm): add client tagging functionality
fix(mls): resolve property image upload issue
docs(readme): update installation instructions
```

## Coding standards

- TypeScript for all new code; avoid `any` (use `unknown` if type is truly unknown)
- Functional components with hooks; React Server Components where appropriate
- File names: kebab-case for utilities (`user-profile.tsx`), PascalCase for components (`UserProfile.tsx`)
- All user-facing strings must be internationalized — add to both `locales/en/` and `locales/el/`
- All database changes require Prisma migrations (never `prisma db push` in production)
- All tenant-scoped queries must filter by `organizationId`

### Internationalization

```typescript
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('myNamespace');
  return <h1>{t('title')}</h1>;
}
```

## Pull request process

### Before submitting

- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] Translations added for any new UI strings (`locales/en/` and `locales/el/`)
- [ ] Tests updated if modifying existing behavior
- [ ] Rebased on latest `main`

### PR title

Same format as commit messages: `feat(crm): add client tagging functionality`

### PR description template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- ...

## Testing
Describe how you tested

## Checklist
- [ ] Follows coding standards
- [ ] No new lint warnings
- [ ] Translations added for new UI strings
- [ ] Tenant isolation maintained (all queries filter by organizationId)

## Related Issues
Closes #issue_number
```

### Review process

1. Submit PR → automated checks run (lint, build)
2. Address reviewer feedback in new commits (do not force-push)
3. A maintainer merges once approved

## Testing

```bash
pnpm test           # Unit tests
pnpm cypress:open   # E2E tests (interactive)
```

E2E tests live in `cypress/`. Write tests for new features; update tests when modifying existing behavior.

## Cursor slash commands

When working in Cursor, these commands automate common workflows:

| Command | When to use |
|---------|-------------|
| `/verify` | Before marking work complete — runs build, lint, tenant check, i18n, permissions |
| `/review` | Before committing significant changes |
| `/plan` | Before starting multi-file features |
| `/pr` | When creating a pull request |
| `/new-action [feature/name]` | When adding a server action |
| `/new-api-route [path]` | When adding an API endpoint |
| `/db-migrate` | When modifying the database schema |
