# ADR-010: Unified Documentation Architecture

**Status:** Accepted
**Date:** 2026-03-19

---

# Unified Documentation Architecture & Cursor-to-Claude Migration

**Status:** Accepted
**Date:** 2026-03-19
**Author:** Claude Code + stapo

## Context

Oikion MVP has accumulated 260+ documentation files across five separate locations (`docs/`, `.cursor/`, `docs/superpowers/`, `docs/plans/`, root markdown files) with no unified navigation, no enforced freshness, and no formal decision records. The project is also transitioning from Cursor to Claude Code as the primary AI development assistant, leaving 16 context-triggered `.mdc` rules, 8 slash commands, 5 specialized agents, and 50 React optimization rules orphaned in `.cursor/` where Claude Code cannot use them.

### Problems

1. **No single source of truth** — documentation is scattered across 5 locations with overlapping content and inconsistent structure.
2. **Docs go stale** — specs get written but never updated as features evolve. The changelog hasn't been updated since February 2026.
3. **Cursor knowledge is orphaned** — 16 glob-triggered rules, 8 commands, 5 agents, and 50 optimization rules exist only in `.cursor/` where Claude Code cannot read them.
4. **No formal ADR process** — architectural decisions live as spec+plan pairs in `docs/superpowers/` with no numbering, status tracking, or index.
5. **No onboarding path** — new developers or AI assistants must piece together context from multiple files.
6. **No external API docs** — the `/api/v1/*` external API has no formal endpoint documentation.

### Audiences

- **New developers** joining the team
- **AI assistants** (Claude Code) across sessions
- **External integrators** using the API
- **Future maintainers** understanding past decisions

## Decision

Perform a unified migration that simultaneously:

1. Reorganizes `docs/` into a hybrid structure (purpose-based top level, domain content nested)
2. Migrates `.cursor/` knowledge to Claude Code's native mechanisms (nested CLAUDE.md files, `.claude/commands/`)
3. Establishes doc-keeping standards to prevent future staleness

### Design

The design has four components: Claude Code integration, docs reorganization, root CLAUDE.md revision, and doc-keeping standards.

---

## 1. Claude Code Native Integration

### 1.1 Nested CLAUDE.md Files

Claude Code auto-loads `CLAUDE.md` files from subdirectories when working in that area. Each Cursor `.mdc` rule maps to a nested CLAUDE.md:

| Cursor `.mdc` rule | Glob trigger | Claude Code equivalent |
|---|---|---|
| `core.mdc` (alwaysApply) | all files | Root `CLAUDE.md` (already exists) |
| `api-routes.mdc` | `app/api/**/*.ts` | `app/api/CLAUDE.md` |
| `frontend.mdc` | `app/**/*.tsx, components/**/*.tsx` | Root `CLAUDE.md` (critical RSC/client rules) + `components/CLAUDE.md` (component-library patterns) — see §1.7 |
| `server-actions.mdc` | `actions/**/*.ts` | `actions/CLAUDE.md` |
| `swr-hooks.mdc` | `hooks/swr/**/*.ts` | `hooks/swr/CLAUDE.md` |
| `permissions.mdc` | `lib/permissions/**/*.ts` | `lib/permissions/CLAUDE.md` |
| `prisma-schema.mdc` | `prisma/**` | `prisma/CLAUDE.md` |
| `i18n.mdc` | `locales/**/*.json` | `locales/CLAUDE.md` |
| `tenant-isolation.mdc` | (broad) | Merged into root `CLAUDE.md` |
| `security.mdc` | (broad) | Merged into root `CLAUDE.md` |
| `testing.mdc` | `cypress/**`, `tests/**` | `tests/CLAUDE.md` + `cypress/CLAUDE.md` |
| `email-templates.mdc` | `emails/**` | `emails/CLAUDE.md` (if dir exists) |
| `middleware.mdc` | `proxy.ts` | Root `CLAUDE.md` (single file) |
| `navigation-links.mdc` | nav components | `components/CLAUDE.md` (merged) |
| `ui-components.mdc` | `components/ui/**` | `components/CLAUDE.md` (merged) |
| `agent-behavior.mdc` | (meta) | Not needed — Cursor-specific |

**Total: ~11 nested CLAUDE.md files created** (including separate `tests/` and `cypress/` files since Claude Code's path-based loading requires each directory to have its own CLAUDE.md).

### 1.2 Custom Commands (`.claude/commands/`)

Replace Cursor `/commands/` with Claude Code custom commands:

| Cursor command | Claude equivalent | Notes |
|---|---|---|
| `/verify` | `.claude/commands/verify.md` | 6-phase verification loop |
| `/review` | `.claude/commands/review.md` | Code quality/security audit |
| `/plan` | Superpowers `brainstorming` + `writing-plans` | Already covered — skip |
| `/pr` | Superpowers `commit-commands:commit-push-pr` | Already covered — skip |
| `/fix-issue` | `.claude/commands/fix-issue.md` | GitHub issue → fix → PR |
| `/new-action` | `.claude/commands/new-action.md` | Scaffold server action |
| `/new-api-route` | `.claude/commands/new-api-route.md` | Scaffold API route |
| `/db-migrate` | `.claude/commands/db-migrate.md` | Prisma migration workflow |

**Total: 6 custom commands created.**

### 1.3 Agent Knowledge Absorption

The 5 Cursor agents don't have a direct Claude Code equivalent (no `.claude/agents/` directory). Their knowledge is absorbed into the nested CLAUDE.md files and existing superpowers skills:

| Cursor agent | Claude Code approach |
|---|---|
| `security-auditor` | Superpowers `feature-dev:code-reviewer` + security checklist in root `CLAUDE.md` |
| `accessibility-auditor` | Checklist in `components/CLAUDE.md` (a11y section) |
| `api-expert` | Covered by `app/api/CLAUDE.md` conventions |
| `design-consistency` | Checklist in `components/CLAUDE.md` (design system section) |
| `db-agent` | Covered by `prisma/CLAUDE.md` conventions |

### 1.4 Cursor Skills Migration

The `.cursor/skills/` directory contains 8 workflow skills beyond the React optimization rules. Each maps to a Claude Code equivalent:

| Cursor skill | Claude Code equivalent | Notes |
|---|---|---|
| `verification-loop/SKILL.md` | Absorbed into `.claude/commands/verify.md` | The `/verify` command already implements this workflow |
| `prisma-migration/SKILL.md` | Absorbed into `.claude/commands/db-migrate.md` | The `/db-migrate` command already implements this workflow |
| `feature-scaffold/SKILL.md` | `docs/guides/feature-scaffold.md` | Reference guide for the 9-step feature development workflow |
| `tdd-workflow/SKILL.md` | Superpowers `test-driven-development` skill | Already covered by superpowers — skip |
| `security-audit/SKILL.md` | Absorbed into security checklist in root `CLAUDE.md` + `docs/security/` | 8-phase audit checklist |
| `import-export/SKILL.md` | Absorbed into `docs/guides/import-export/index.md` | CSV/XML/Excel import and portal publishing workflows |
| `web-design-guidelines/SKILL.md` | Absorbed into `components/CLAUDE.md` (design system section) | Design rules and patterns |
| `vercel-react-best-practices/SKILL.md` + `AGENTS.md` | Parent metadata only — the 50 rules are handled below in §1.5 | SKILL.md and AGENTS.md are Cursor-specific scaffolding |

### 1.5 Cursor Hooks Migration

The `.cursor/hooks/` directory contains automated quality gates:

| Cursor hook | Claude Code equivalent | Notes |
|---|---|---|
| `verify-on-stop.ts` (post-edit lint + tenant isolation scan) | Intentionally dropped | Claude Code's superpowers `verification-before-completion` skill provides equivalent behavior. The `/verify` command is the explicit trigger. |
| `after-file-edit.ts` | Intentionally dropped | Claude Code hooks in `.claude/settings.json` could replicate this, but the overhead is not justified — nested CLAUDE.md files provide the context-awareness that this hook was compensating for. |
| `hooks.json` | Not applicable | Cursor-specific configuration format |

**Decision:** Cursor hooks are intentionally not replicated in Claude Code. The combination of nested CLAUDE.md files (context-aware conventions) and the `/verify` command (explicit quality gate) provides equivalent coverage without the runtime overhead.

### 1.5b Remaining `.cursor/` Files

The following `.cursor/` files are **historical artifacts** with no migration needed — they are archived in place when `.cursor/` gets its `DEPRECATED.md` in Phase 3:

| File | Reason no migration needed |
|---|---|
| `.cursor/README.md`, `SETUP_COMPLETE.md` | Cursor-specific setup docs, replaced by Claude Code system |
| `.cursor/scratchpad.md` | Ephemeral notes, no lasting value |
| `.cursor/button-consolidation-summary.md`, `button-migration-complete.md` | Completed work summaries, context is in git history |
| `.cursor/fixes/*.md` (5 files) | Historical bug fix notes — fixes are in the codebase, commit messages have context |

### 1.6 Frontend Convention Split Strategy

**Problem:** Cursor's `frontend.mdc` triggers on `app/**/*.tsx` AND `components/**/*.tsx` — one rule covers both trees. Claude Code's nested CLAUDE.md is path-based: `components/CLAUDE.md` only loads when working under `components/`, NOT when editing page-level `.tsx` files under `app/[locale]/app/(routes)/...`. This would silently lose frontend conventions for ~60% of TSX files.

**Solution:** Split `frontend.mdc` content into two tiers:

**Root `CLAUDE.md`** gets the critical, always-needed frontend rules:
- Server Components by default, `"use client"` only when needed (hooks, event handlers, browser APIs)
- Push `"use client"` as far down the tree as possible
- All request APIs are async: `await cookies()`, `await headers()`, `await params`, `await searchParams`
- Internationalization: never hardcode user-facing strings, use `useTranslations()` / `getTranslations()`
- Accessibility: semantic HTML, visible focus indicators, 4.5:1 contrast, 44x44px touch targets
- Use `next/image` for images, `next/font` for fonts

**`components/CLAUDE.md`** gets component-library-specific patterns:
- shadcn/ui form patterns (`<Form>`, `<FormField>`, `<FormItem>`, etc.)
- Loading/Error/Empty state component usage (`<Loading />`, `<ErrorState />`, `<EmptyState />`)
- Modal/Dialog patterns (Radix-based, Zustand store via `useActionModal()`)
- Toast usage (`useAppToast()` hook, never raw `toast()`)
- Icon conventions (Lucide, sizing, aria-hidden)
- Design system rules and `navigation-links.mdc` content (sidebar, breadcrumbs, URL validation)
- Top 10 React optimization rules (inlined) with pointer to full doc

This ensures Claude always has the core React/Next.js conventions regardless of which directory it's working in, while component-specific patterns load on demand.

### 1.7 React Optimization Rules

The 50 rules in `.cursor/skills/vercel-react-best-practices/rules/` are consolidated into:

- `docs/guides/performance/react-optimization.md` — the full reference (all 50 rules organized by category and priority)
- `components/CLAUDE.md` — brief summary with the top 10 highest-impact rules inlined, pointer to the full doc

---

## 2. Documentation Reorganization

### 2.1 New Structure

```
docs/
├── index.md                              # Master navigation
│
├── getting-started/
│   ├── index.md                          # Quick start overview
│   ├── prerequisites.md                  # System requirements
│   ├── local-setup.md                    # Clone, install, pnpm, DB, env vars
│   ├── service-setup.md                  # Clerk, HTTPS certs, Vercel Blob, captcha, rate limiting
│   ├── project-structure.md              # File tree walkthrough
│   ├── first-contribution.md            # PR workflow, conventions
│   └── troubleshooting.md               # Common issues and solutions
│
├── architecture/
│   ├── index.md                          # System overview + diagram
│   ├── multi-tenancy.md                  # organizationId isolation
│   ├── authentication.md                 # Clerk, API keys, platform admin
│   ├── permissions.md                    # Role hierarchy, requireAction()
│   ├── data-model.md                     # Prisma schema overview
│   ├── encryption.md                     # Server-side + E2EE
│   ├── real-time.md                      # Ably, entity-as-channel
│   ├── internationalization.md           # next-intl, locale routing
│   ├── logging.md                        # Logging strategy
│   └── type-safety.md                    # TypeScript roadmap
│
├── guides/
│   ├── crm/
│   │   └── index.md
│   ├── mls/
│   │   └── index.md
│   ├── messaging/
│   │   └── index.md
│   ├── matchmaking/
│   │   └── index.md
│   ├── import-export/
│   │   └── index.md
│   ├── portal-publishing/
│   │   ├── index.md
│   │   └── xe-gr.md
│   ├── performance/
│   │   ├── index.md                      # Overview + quick wins
│   │   ├── connection-pooling.md         # Database connection pooling
│   │   ├── database-indexes.md           # Index strategy
│   │   ├── n-plus-1-queries.md           # N+1 prevention
│   │   ├── data-serialization.md         # Serialization optimization
│   │   └── react-optimization.md         # 50 rules consolidated
│   ├── financial-reports.md
│   ├── keyboard-shortcuts.md
│   ├── feature-scaffold.md               # 9-step feature development workflow
│   └── forms-and-validation.md
│
├── api-reference/
│   ├── index.md                          # Auth, rate limits, response format
│   ├── endpoints/
│   │   ├── properties.md
│   │   ├── clients.md
│   │   ├── mandates.md
│   │   └── calendar.md
│   └── integrations/
│       ├── make.md
│       └── n8n.md
│
├── decisions/
│   ├── index.md                          # ADR index with status tracking
│   ├── ADR-001-item-visibility.md
│   ├── ADR-002-cascade-safety.md
│   ├── ADR-003-data-ownership.md
│   ├── ADR-004-encryption-arch.md
│   ├── ADR-005-composite-import.md
│   ├── ADR-006-unified-import-engine.md
│   ├── ADR-007-test-seed-strategy.md
│   ├── ADR-008-zod-prisma-validation-sync.md
│   ├── ADR-009-entity-creation-fixes.md
│   ├── ADR-010-documentation-architecture.md   # This spec itself
│   └── TEMPLATE.md
│
├── design-system/                        # Stays largely as-is (all unlisted files preserved)
│   ├── index.md
│   ├── brand-guide.pdf
│   ├── colors.md
│   ├── typography.md
│   ├── buttons.md
│   ├── button-migration-guide.md
│   ├── forms.md
│   ├── feedback.md
│   ├── ai-mentions.md
│   └── nielsen-heuristics.md
│
├── security/
│   ├── index.md
│   ├── policies.md
│   ├── audit-log.md
│   └── threat-model.md
│
├── operations/
│   ├── deployment.md
│   ├── database-migrations.md
│   ├── credential-rotation.md
│   └── monitoring.md
│
├── ux-audit/                             # Stays as-is (historical)
├── legal/                                # Stays as-is
├── changelog/                            # Stays as-is (but updated)
└── plans/                                # Stays — ephemeral implementation plans
```

### 2.2 File Migration Map

#### Files that MOVE

| Current location | New location |
|---|---|
| `docs/setup/README.md` | `docs/getting-started/index.md` (merged) |
| `docs/setup/https-setup.md`, `clerk-setup.md`, `clerk-account-portal-setup.md`, `vercel-blob-setup.md`, `captcha-development.md`, `rate-limiting-setup.md` | `docs/getting-started/service-setup.md` (consolidated — one section per service) |
| `docs/clerk-roles-setup.md` | `docs/architecture/authentication.md` |
| `docs/encryption-reference.md` | `docs/architecture/encryption.md` |
| `docs/api/index.md` | `docs/api-reference/index.md` (expanded) |
| `docs/api/make-integration.md` | `docs/api-reference/integrations/make.md` |
| `docs/api/n8n-integration.md` | `docs/api-reference/integrations/n8n.md` |
| `docs/optimization/README.md`, `QUICK_START.md`, `IMPLEMENTATION_CHECKLIST.md` | `docs/guides/performance/index.md` (merged) |
| `docs/optimization/phase-1-critical/01-05*.md` (5 files) | `docs/guides/performance/` (kept as individual files: `connection-pooling.md`, `database-indexes.md`, `n-plus-1-queries.md`, `data-serialization.md`; `04-credential-rotation.md` → `docs/operations/credential-rotation.md`) |
| `docs/features/financial-report*.md` | `docs/guides/financial-reports.md` (consolidated) |
| `docs/portal-publishing/*` | `docs/guides/portal-publishing/` |
| `docs/security/*` | `docs/security/` (restructured) |
| `docs/migrations/2026-02-01-calcom-to-calendarevent-rename.md`, `add-ai-provider-settings.md` | `docs/operations/database-migrations.md` (consolidated) |
| `docs/migrations/account-portal-migration.md` | `docs/architecture/authentication.md` (merged — Clerk account portal setup) |
| `docs/k8s-database-silos.md` | `docs/operations/deployment.md` |
| `docs/superpowers/specs/*` | `docs/decisions/ADR-NNN-*.md` (reformatted — 9 pre-existing specs become ADR-001 through ADR-009; this document is authored as ADR-010) |
| `docs/superpowers/plans/*` | `docs/plans/` (merged) |
| `docs/plans/*-design.md` (existing, 16 files) | Left as-is in `docs/plans/`. **Triage rule:** These predate the ADR system. Design files whose matching implementation plan has been fully executed are historical artifacts — leave them. Design files for features NOT yet implemented (no matching `-plan.md` or `-implementation.md` was executed) should be evaluated during Phase 2 step 7: if the decision is still active and non-obvious, create an ADR; otherwise leave as-is. When in doubt, leave as-is — over-converting creates ADR clutter. |
| `docs/development/logging-strategy.md` | `docs/architecture/logging.md` |
| `docs/development/optimization-notes.md` | `docs/guides/performance/index.md` (merged) |
| `docs/development/type-safety-roadmap.md` | `docs/architecture/type-safety.md` |
| `docs/database/setup.md` | `docs/getting-started/local-setup.md` (merged — database portion) |
| `docs/troubleshooting/*` | `docs/getting-started/troubleshooting.md` (consolidated) |
| `docs/keyboard-shortcuts/index.md` | `docs/guides/keyboard-shortcuts.md` |
| `docs/release/*` | `docs/changelog/` (merged) |
| Root `MESSAGING_SECURITY_AUDIT.md` | `docs/security/threat-model.md` |
| `docs/plans/Oikion_Unified_Import_Engine_Spec_v1.0.docx.pdf` | `docs/plans/` (stays — already in final location) |
| `docs/roi-analysis-cursor-ai-vs-fullstack-developer.pdf` | Archive alongside `docs/roi-analysis-*.md` |
| Root `V1.0.0-PREPARATION-SUMMARY.md` | `docs/changelog/` |

#### Files that STAY

| Location | Reason |
|---|---|
| `docs/design-system/*` | Already well-organized |
| `docs/ux-audit/*` | Historical reference, not actively maintained |
| `docs/legal/*` | Already well-organized |
| `docs/changelog/*` | Already well-organized (needs updating) |
| Root `README.md` | GitHub convention |
| Root `CLAUDE.md` | Claude Code convention (gets revised) |
| Root `CHANGELOG.md` | GitHub convention |
| Root `CONTRIBUTING.md` | GitHub convention |
| Root `SECURITY.md` | GitHub convention |

#### Files that get ARCHIVED or DELETED

| File | Action | Reason |
|---|---|---|
| `docs/claude-integration.md` | Delete | Replaced by CLAUDE.md + nested system |
| `docs/cursor-agent-system-guide.md` | Delete | Replaced by Claude Code commands |
| `docs/button-layout-fix.md` | Archive | Historical fix, no ongoing value |
| `docs/select-with-other/*` | Archive | UI component docs → design-system if relevant |
| `docs/roi-analysis-*.md` | Archive | Business analysis, not dev docs |
| `docs/design-system.md` (flat file) | Delete | Stale predecessor of `docs/design-system/index.md` |
| `docs/features/` | Delete (after migration) | Content consolidated into `docs/guides/financial-reports.md` |
| `docs/superpowers/specs/` | Delete (after ADR conversion) | Content moved to `docs/decisions/` |
| `docs/superpowers/plans/` | Delete (after merge) | Content moved to `docs/plans/` |
| `docs/development/` | Delete (after migration) | Content moved to `docs/architecture/` and `docs/guides/performance/` |
| `docs/database/` | Delete (after migration) | Content moved to `docs/getting-started/local-setup.md` |
| `docs/troubleshooting/` | Delete (after migration) | Content consolidated into `docs/getting-started/troubleshooting.md` |
| `docs/keyboard-shortcuts/` | Delete (after migration) | Content moved to `docs/guides/keyboard-shortcuts.md` |
| `docs/release/` | Delete (after migration) | Content moved to `docs/changelog/` |
| `docs/api/` | Delete (after migration) | Content moved to `docs/api-reference/` |
| `docs/setup/` | Delete (after migration) | Content moved to `docs/getting-started/` |
| `docs/optimization/` | Delete (after migration) | Content moved to `docs/guides/performance/` |
| `docs/migrations/` | Delete (after migration) | Content moved to `docs/operations/` and `docs/architecture/` |
| `docs/superpowers/` | Delete (after migration) | specs/ → `docs/decisions/`, plans/ → `docs/plans/`, PDF → `docs/plans/` |

### 2.3 ADR Format

Each ADR follows this template:

```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Implemented | Superseded by ADR-XXX
**Date:** YYYY-MM-DD
**Supersedes:** ADR-XXX (if applicable)

## Context
What problem or decision prompted this?

## Decision
What was decided and why?

## Consequences
What are the trade-offs? What changes as a result?

## Implementation
Link to the implementation plan in docs/plans/ (if applicable).
```

---

## 3. Root CLAUDE.md Revision

### 3.1 What Stays in Root CLAUDE.md

- Project overview (what Oikion is)
- Development commands (`pnpm dev`, `pnpm build`, etc.)
- Multi-tenant data isolation principle (the single most critical convention)
- Key file locations (quick reference)
- Environment variables (essential for setup)
- Git conventions (applies everywhere)
- File storage note (Vercel Blob + S3)
- Testing note (Cypress)
- Pointer section: "See `app/api/CLAUDE.md` for API conventions, `components/CLAUDE.md` for frontend patterns, etc."
- Doc-keeping standards summary

### 3.2 What Moves Out of Root CLAUDE.md

| Section | Moves to |
|---|---|
| Detailed API architecture (internal vs external) | `app/api/CLAUDE.md` |
| Server action organization | `actions/CLAUDE.md` |
| SWR data fetching patterns | `hooks/swr/CLAUDE.md` |
| Permission system details | `lib/permissions/CLAUDE.md` |
| i18n namespace details | `locales/CLAUDE.md` |
| Entire "Cursor Workflows & Commands" section | `.claude/commands/` + deleted |

### 3.3 Target Size

Root CLAUDE.md: **~120 lines** (down from ~215).

---

## 4. Doc-Keeping Standards

### 4.1 "Touch Code, Touch Docs"

When a PR changes behavior that is documented, the PR must update the relevant doc. Enforced by:

- Adding a step to the `/verify` command: "Check if `docs/`, `architecture/`, or any nested CLAUDE.md references the changed behavior."
- A note in root `CLAUDE.md`: _"When modifying a feature, check if docs reference the changed behavior. Update them in the same PR."_

### 4.2 ADR Discipline

Any architectural decision that meets these criteria gets an ADR:

- Changes the data model in a non-trivial way
- Introduces a new integration or dependency
- Changes how authentication, encryption, or permissions work
- Would surprise a future developer reading the code

Status transitions: `Proposed → Accepted → Implemented → (optionally) Superseded`

### 4.3 Changelog Maintenance

Every user-facing change gets a changelog entry following existing `CHANGELOG.md` conventions.

### 4.4 Content Guidelines

All documentation follows these conventions:

- **Language:** English only. The application is bilingual (Greek/English) but developer documentation is English.
- **Style:** Terse reference over verbose tutorial. Lead with the pattern or rule, then explain why. Code examples over prose.
- **Code examples:** Must be copy-paste ready with correct imports. Use actual project paths (`@/lib/prisma`, `@/components/ui/button`), not generic placeholders.
- **File length:** Target under 500 lines per file. If a doc grows beyond this, split by subtopic.
- **Frontmatter:** Not required for now (added later when a doc platform is chosen). Use a level-1 heading as the title.
- **Internal links:** Use relative paths from the file's location. No absolute URLs for internal docs.
- **"Last Updated" footers:** Not required — staleness is managed by the "touch code, touch docs" rule and quarterly reviews, not manual timestamps that go stale themselves.

### 4.5 Quarterly Doc Review

A checklist stored in `docs/MAINTENANCE.md`:

- [ ] Are all nested CLAUDE.md files accurate?
- [ ] Are ADR statuses current?
- [ ] Are API endpoint docs matching actual routes?
- [ ] Is the getting-started guide still accurate?
- [ ] Has the changelog been updated since last review?
- [ ] Are all internal doc links resolving?

---

## 5. Migration Sequencing

### Phase 1: Claude Code Setup (additive, nothing breaks)

1. Create `.claude/commands/` — port 6 Cursor commands
2. Create nested CLAUDE.md files — translate each `.mdc` rule
3. Slim root CLAUDE.md — remove content moved to nested files, add pointers
4. Update Claude memory (`MEMORY.md`)

### Phase 2: `docs/` Reorganization (file moves)

5. Create new directory skeleton
6. Move and consolidate files (following migration map)
7. Convert specs to numbered ADRs
8. Merge `docs/superpowers/plans/` into `docs/plans/`
9. Write new content (getting-started, architecture overview, API endpoint docs)
10. Update `docs/index.md` master navigation
11. Update all internal cross-references

### Phase 3: Cleanup

12. Archive `.cursor/` with `DEPRECATED.md`
13. Remove root orphan files (content already migrated)
14. Bring changelog current (E2EE, visibility, cascade safety, etc.)
15. Final verification — all links resolve, all nested CLAUDE.md files accurate, all commands work

### Phase Dependencies

```
Phase 1 (Claude Code)  ──→  Phase 2 (Docs Reorg)  ──→  Phase 3 (Cleanup)
    │                            │
    │ Independent of docs        │ Requires Phase 1 so CLAUDE.md
    │ Can start immediately      │ pointers go to final locations
    │                            │
    └── ~15 files created        └── ~80 files moved/consolidated
```

### Risk Mitigation

- Phase 1 is fully reversible (additive files only)
- Phase 2 uses `git mv` to preserve history
- No application code changes — zero runtime risk
- Each phase is independently committable

### Prerequisites

Before starting Phase 2, ensure all untracked doc files are committed. As of 2026-03-19, the following are untracked in git:
- `docs/plans/Oikion_Unified_Import_Engine_Spec_v1.0.docx.pdf`
- `docs/superpowers/plans/2026-03-18-composite-import-system.md`
- `docs/superpowers/plans/2026-03-18-unified-import-engine.md`
- `docs/superpowers/specs/2026-03-18-unified-import-engine.md`

These must be committed first so that `git mv` can track their history.

---

## Consequences

### Positive

- **Single source of truth** — one `docs/` tree with clear navigation
- **Claude Code parity** — all Cursor knowledge is active in Claude sessions
- **Onboarding path** — `docs/getting-started/` provides a clear entry point
- **Decision history** — numbered ADRs with status tracking
- **Freshness enforcement** — doc-keeping standards prevent staleness
- **Platform-ready** — the markdown structure can be picked up by Nextra, Docusaurus, or Geistdocs later

### Negative

- **Large initial effort** — ~100 files touched across 3 phases
- **Temporary dual state** — during migration, some docs exist in both old and new locations
- **Cursor workflows break** — teams still using Cursor will lose their `.mdc` rule triggers (mitigated: `.cursor/` is archived, not deleted)

### Neutral

- **No code changes** — this project is documentation-only
- **Existing git history preserved** — `git mv` maintains file history

---

## Deliverable Summary

| Deliverable | Count |
|---|---|
| Nested CLAUDE.md files | ~11 |
| Claude commands (`.claude/commands/`) | 6 |
| New docs pages | ~20 |
| Files moved/consolidated | ~95 |
| Specs converted to ADRs | 10 (9 pre-existing + this document as ADR-010) |
| Cursor skills migrated | 8 (4 absorbed into commands, 2 into docs, 1 into CLAUDE.md, 1 already covered by superpowers) |
| Cursor hooks | Intentionally dropped (equivalent coverage via nested CLAUDE.md + /verify) |
| Cursor misc files | Archived in place (fixes, summaries, scratchpad — no migration value) |
| React optimization rules consolidated | 50 → 1 |
| Root CLAUDE.md lines | 215 → ~130 (slightly larger due to frontend convention split) |
| Source directories to delete | 11 (after content migrated) |
| PDF files | 2 handled (1 stays in plans/, 1 archived with ROI analysis) |
