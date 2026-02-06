# Cursor Agent System for Oikion

This directory contains the complete Cursor agent configuration for the Oikion MVP project.

## Quick Reference

### 🎯 Slash Commands (Type in Chat)

| Command | Purpose |
|---------|---------|
| `/verify` | Run 6-phase verification (build, lint, tenant, i18n, permissions, diff) |
| `/review` | Code quality & security audit |
| `/plan` | Create implementation plan with approval gate |
| `/pr` | Create pull request with conventional commit |
| `/fix-issue [num]` | Fetch GitHub issue, fix, and create PR |
| `/new-action [path]` | Scaffold server action with boilerplate |
| `/new-api-route [path]` | Scaffold API route with auth |
| `/db-migrate` | Guided Prisma schema migration |

### 📚 Skills (Invoke Naturally or Via Commands)

- **verification-loop** — Pre-commit quality gate (used by `/verify`)
- **tdd-workflow** — Red-Green-Refactor for TDD
- **prisma-migration** — Safe DB schema changes (used by `/db-migrate`)
- **feature-scaffold** — End-to-end feature development (DB → UI)
- **security-audit** — Comprehensive security audit
- **import-export** — Data import/export workflows

### 📋 Rules (Auto-Applied)

**Always-on:**
- `core.mdc` — Build commands, code style, git conventions
- `agent-behavior.mdc` — Agent personality, workflows, safety guardrails

**Auto-attached (by file pattern):**
- `frontend.mdc` — React/Next.js component patterns
- `server-actions.mdc` — Server action conventions
- `api-routes.mdc` — API route patterns
- `prisma-schema.mdc` — Database schema conventions
- `tenant-isolation.mdc` — Multi-tenant data isolation
- `i18n.mdc` — Internationalization patterns
- `swr-hooks.mdc` — SWR data fetching patterns
- `ui-components.mdc` — shadcn/ui design system
- `email-templates.mdc` — Email template conventions
- `permissions.mdc` — Permission system patterns
- `navigation-links.mdc` — Navigation link validation
- `middleware.mdc` — Next.js 16 proxy.ts patterns

**Agent-requested:**
- `security.mdc` — Security hardening checklist
- `testing.mdc` — Cypress testing patterns

### 🤖 Specialized Agents

Invoke by asking naturally (e.g., "Run accessibility audit on this component"):

- **accessibility-auditor** — WCAG 2.2/2.3 compliance
- **security-auditor** — Security vulnerability analysis
- **api-expert** — API endpoint validation
- **design-consistency** — Design system enforcement
- **db-agent** — Prisma 6 + PostgreSQL (Prisma Postgres); schema, migrations, connection pooling, tenant isolation

### 🔄 Automatic Checks

- **Stop hook** — Runs lint + tenant isolation check when agent marks work "done"
- **Rules** — Context-aware guidance loads based on files being edited

## Directory Structure

```
.cursor/
├── rules/              # 16 .mdc rule files
├── skills/             # 6 project-specific + 2 external skill workflows
├── commands/           # 8 slash command definitions
├── hooks/              # Lifecycle hooks (verify-on-stop.ts)
├── hooks.json          # Hook configuration
├── agents/             # 5 specialized agent definitions
├── scratchpad.md       # Agent working memory
└── README.md           # This file
```

## When to Use What

**Starting work:**
- Complex feature → `/plan`
- GitHub issue → `/fix-issue [number]`
- New server action → `/new-action [feature/name]`
- New API route → `/new-api-route [path]`
- DB schema change → `/db-migrate`

**During development:**
- Test-driven → Ask for "TDD workflow"
- Full feature → Ask for "feature-scaffold workflow"
- Import/export → Ask for "import-export workflow"

**Before completing:**
- Always → User runs `/verify`; agent only recommends it (agent does not run build/lint)
- Significant changes → Agent recommends `/review`
- Security-sensitive → Ask for "security audit"

**Creating PR:**
- Use → `/pr`

## Best Practices

1. **Let the agent suggest workflows** — The agent is instructed to proactively suggest commands/skills when appropriate
2. **Use `/verify` before every PR** — Catches build, lint, tenant isolation, i18n, and permission issues
3. **Use `/plan` for multi-file changes** — Creates a clear plan before implementation
4. **Invoke specialized agents** — For accessibility, security, API, or design audits

## Maintenance

- Rules are version-controlled and project-specific
- Skills can be updated as workflows evolve
- Commands can be added/modified in `.cursor/commands/`
- Stop hook can be adjusted in `.cursor/hooks/verify-on-stop.ts`

For more details, see the main project documentation in `CLAUDE.md` and `docs/cursor-agent-system-guide.md`.
