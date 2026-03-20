# Unified Documentation Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize 260+ scattered documentation files into a structured `docs/` tree, migrate 16 Cursor `.mdc` rules to Claude Code's native mechanisms, and establish doc-keeping standards.

**Architecture:** Three-phase migration: (1) Create Claude Code commands + nested CLAUDE.md files (additive, nothing breaks), (2) Reorganize `docs/` tree with file moves + new content, (3) Cleanup orphans and archive `.cursor/`. All work is documentation-only — zero application code changes.

**Tech Stack:** Markdown, git mv, Claude Code custom commands

**Spec:** `docs/superpowers/specs/2026-03-19-unified-documentation-architecture-design.md`

---

## Phase 1: Claude Code Setup

Phase 1 tasks are **mostly independent** and can be parallelized by subagents. **Exception:** Task 6 (Revise Root CLAUDE.md) should execute after Tasks 2-5 complete, since it needs to list all created nested CLAUDE.md paths. Task 7 (Update Memory) should execute after Task 6.

---

### Task 1: Create Claude Code Custom Commands

**Files:**
- Create: `.claude/commands/verify.md`
- Create: `.claude/commands/review.md`
- Create: `.claude/commands/fix-issue.md`
- Create: `.claude/commands/new-action.md`
- Create: `.claude/commands/new-api-route.md`
- Create: `.claude/commands/db-migrate.md`
- Read: `.cursor/commands/verify.md` (source)
- Read: `.cursor/commands/review.md` (source)
- Read: `.cursor/commands/fix-issue.md` (source)
- Read: `.cursor/commands/new-action.md` (source)
- Read: `.cursor/commands/new-api-route.md` (source)
- Read: `.cursor/commands/db-migrate.md` (source)
- Read: `.cursor/skills/verification-loop/SKILL.md` (source — absorbed into verify)
- Read: `.cursor/skills/prisma-migration/SKILL.md` (source — absorbed into db-migrate)

- [ ] **Step 1: Read all 6 Cursor command sources + 2 skill sources**

Read `.cursor/commands/verify.md`, `.cursor/commands/review.md`, `.cursor/commands/fix-issue.md`, `.cursor/commands/new-action.md`, `.cursor/commands/new-api-route.md`, `.cursor/commands/db-migrate.md`, `.cursor/skills/verification-loop/SKILL.md`, `.cursor/skills/prisma-migration/SKILL.md`.

- [ ] **Step 2: Create `.claude/commands/` directory**

```bash
mkdir -p .claude/commands
```

- [ ] **Step 3: Write `.claude/commands/verify.md`**

Translate `.cursor/commands/verify.md` + `.cursor/skills/verification-loop/SKILL.md` into Claude Code command format. The command should describe the 6-phase verification loop:

1. Build: `pnpm build`
2. Lint: `pnpm lint`
3. Tenant Isolation: check new Prisma queries include `organizationId`
4. i18n: verify new strings exist in both `locales/el/` and `locales/en/`
5. Permissions: verify new server actions have `requireAction()` guards
6. Docs: check if `docs/`, `architecture/`, or any nested CLAUDE.md references the changed behavior (NEW — from spec §4.1)
7. Diff Review: review `git diff` for unintended changes, debug code, secret exposure

Claude Code command format: plain markdown instructions that Claude follows when the user types `/verify`.

- [ ] **Step 4: Write `.claude/commands/review.md`**

Translate `.cursor/commands/review.md`. Include security, conventions, and quality checklists. Claude Code format.

- [ ] **Step 5: Write `.claude/commands/fix-issue.md`**

Translate `.cursor/commands/fix-issue.md`. Takes a GitHub issue number as argument. Claude Code format.

- [ ] **Step 6: Write `.claude/commands/new-action.md`**

Translate `.cursor/commands/new-action.md`. Scaffolds a server action with the pattern from `.cursor/rules/server-actions.mdc`. Takes `feature/name` as argument.

- [ ] **Step 7: Write `.claude/commands/new-api-route.md`**

Translate `.cursor/commands/new-api-route.md`. Scaffolds an API route with patterns from `.cursor/rules/api-routes.mdc`. Takes a path as argument.

- [ ] **Step 8: Write `.claude/commands/db-migrate.md`**

Translate `.cursor/commands/db-migrate.md` + `.cursor/skills/prisma-migration/SKILL.md`. Guided Prisma schema migration workflow. Claude Code format.

- [ ] **Step 9: Commit**

```bash
git add .claude/commands/
git commit -m "feat: add 6 Claude Code custom commands (migrated from Cursor)"
```

---

### Task 2: Create Nested CLAUDE.md — API Routes

**Files:**
- Create: `app/api/CLAUDE.md`
- Read: `.cursor/rules/api-routes.mdc` (source)
- Read: `.cursor/agents/api-expert.md` (source — knowledge absorbed)

- [ ] **Step 1: Read sources**

Read `.cursor/rules/api-routes.mdc` and `.cursor/agents/api-expert.md`.

- [ ] **Step 2: Write `app/api/CLAUDE.md`**

Translate the full content of `api-routes.mdc` into `app/api/CLAUDE.md`. Include:
- Two API types (internal Clerk vs external API key)
- Code templates for both patterns
- Response helpers table
- Input validation rules
- Security checklist
- Rate limiting tiers
- Platform admin route patterns
- Knowledge from `api-expert.md` agent (security checks, validation patterns)

- [ ] **Step 3: Commit**

```bash
git add app/api/CLAUDE.md
git commit -m "docs: add app/api/CLAUDE.md (API route conventions from Cursor)"
```

---

### Task 3: Create Nested CLAUDE.md — Components

**Files:**
- Create: `components/CLAUDE.md`
- Read: `.cursor/rules/frontend.mdc` (source — component-library patterns only)
- Read: `.cursor/rules/ui-components.mdc` (source)
- Read: `.cursor/rules/navigation-links.mdc` (source)
- Read: `.cursor/agents/accessibility-auditor.md` (source — a11y checklist)
- Read: `.cursor/agents/design-consistency.md` (source — design system checklist)
- Read: `.cursor/skills/web-design-guidelines/SKILL.md` (source)
- Read: `.cursor/skills/vercel-react-best-practices/SKILL.md` (source — top 10 rules)

- [ ] **Step 1: Read all sources**

Read all 7 source files listed above.

- [ ] **Step 2: Write `components/CLAUDE.md`**

Combine into a single CLAUDE.md covering:

**Section 1: Component Structure** (from frontend.mdc — component-library patterns only, NOT RSC/client rules which go to root):
- shadcn/ui form patterns (`<Form>`, `<FormField>`, `<FormItem>`)
- Loading/Error/Empty state components
- Modal/Dialog patterns (Radix, Zustand `useActionModal()`)
- Toast usage (`useAppToast()`)
- Icon conventions (Lucide, sizing)

**Section 2: Design System** (from ui-components.mdc + design-consistency agent + web-design-guidelines):
- Color tokens, spacing, typography
- Component consistency rules

**Section 3: Navigation** (from navigation-links.mdc):
- Sidebar link patterns, breadcrumbs, URL validation

**Section 4: Accessibility** (from accessibility-auditor agent):
- Condensed WCAG AA checklist for component development

**Section 5: Top 10 React Optimization Rules** (from vercel-react-best-practices):
- Inline the 10 highest-impact rules (async-parallel, bundle-dynamic-imports, server-cache-react, etc.)
- Add pointer: "Full 50-rule reference: `docs/guides/performance/react-optimization.md`"

- [ ] **Step 3: Commit**

```bash
git add components/CLAUDE.md
git commit -m "docs: add components/CLAUDE.md (frontend conventions from Cursor)"
```

---

### Task 4: Create Nested CLAUDE.md — Server Actions, SWR, Permissions

**Files:**
- Create: `actions/CLAUDE.md`
- Create: `hooks/swr/CLAUDE.md`
- Create: `lib/permissions/CLAUDE.md`
- Read: `.cursor/rules/server-actions.mdc` (source)
- Read: `.cursor/rules/swr-hooks.mdc` (source)
- Read: `.cursor/rules/permissions.mdc` (source)

- [ ] **Step 1: Read all 3 source .mdc files**

- [ ] **Step 2: Write `actions/CLAUDE.md`**

Translate `server-actions.mdc` directly. Include the full required structure template, permission guards table, tenant isolation rules, response helpers, error handling, file organization, and input validation.

- [ ] **Step 3: Write `hooks/swr/CLAUDE.md`**

Translate `swr-hooks.mdc` directly. Include both hook patterns (single entity + paginated), naming conventions table, key rules, pagination response format, SWR configuration.

- [ ] **Step 4: Write `lib/permissions/CLAUDE.md`**

Translate `permissions.mdc` directly. Include role hierarchy, permission levels, key files table, server action guards, API route guards, client-side checks, adding new permissions workflow, platform admin section.

- [ ] **Step 5: Commit**

```bash
git add actions/CLAUDE.md hooks/swr/CLAUDE.md lib/permissions/CLAUDE.md
git commit -m "docs: add nested CLAUDE.md for actions, SWR hooks, permissions"
```

---

### Task 5: Create Nested CLAUDE.md — Prisma, i18n, Testing, Email

**Files:**
- Create: `prisma/CLAUDE.md`
- Create: `locales/CLAUDE.md`
- Create: `tests/CLAUDE.md`
- Create: `cypress/CLAUDE.md`
- Read: `.cursor/rules/prisma-schema.mdc` (source)
- Read: `.cursor/rules/i18n.mdc` (source)
- Read: `.cursor/rules/testing.mdc` (source)
- Read: `.cursor/rules/email-templates.mdc` (source — check if emails/ dir exists)

- [ ] **Step 1: Read all 4 source .mdc files**

- [ ] **Step 2: Check if `emails/` directory exists**

```bash
ls -la emails/ 2>/dev/null || echo "No emails/ directory"
```

If it exists, also create `emails/CLAUDE.md` from `email-templates.mdc`.

- [ ] **Step 3: Write `prisma/CLAUDE.md`**

Translate `prisma-schema.mdc` directly. Include database stack, model structure template, required fields, naming conventions, relations, indexes, enums, schema change workflow, Prisma 6 specifics, anti-patterns.

Also absorb knowledge from `.cursor/agents/db-agent.md` (read it first).

- [ ] **Step 4: Write `locales/CLAUDE.md`**

Translate `i18n.mdc` directly. Include locale config, dual locale requirement (CRITICAL), usage in server/client components and server actions, namespace convention, translation key naming, formatting patterns, route structure, anti-patterns.

- [ ] **Step 5: Write `tests/CLAUDE.md`**

Translate `testing.mdc` — focus on Vitest unit tests (the `tests/` directory content). Include test framework, directory structure for unit tests, conventions, multi-tenant considerations.

- [ ] **Step 6: Write `cypress/CLAUDE.md`**

Translate `testing.mdc` — focus on Cypress E2E content. Include E2E test pattern, directory structure, `data-testid` conventions, CI integration, what to test.

- [ ] **Step 7: Conditionally write `emails/CLAUDE.md`**

Only if `emails/` directory exists. Translate `email-templates.mdc`.

- [ ] **Step 8: Commit**

```bash
git add prisma/CLAUDE.md locales/CLAUDE.md tests/CLAUDE.md cypress/CLAUDE.md
# Also add emails/CLAUDE.md if created
git commit -m "docs: add nested CLAUDE.md for prisma, i18n, testing, email"
```

---

### Task 6: Revise Root CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`
- Read: `.cursor/rules/core.mdc` (source — keep in root)
- Read: `.cursor/rules/frontend.mdc` (source — critical RSC/a11y rules move to root per §1.6)
- Read: `.cursor/rules/tenant-isolation.mdc` (source — merge into root)
- Read: `.cursor/rules/security.mdc` (source — merge into root)
- Read: `.cursor/skills/security-audit/SKILL.md` (source — 8-phase checklist)

- [ ] **Step 1: Read current CLAUDE.md and all source files**

- [ ] **Step 2: Revise CLAUDE.md**

The revised CLAUDE.md should contain ONLY:

**Keep (already present):**
- Project Overview section
- Development Commands section
- Multi-Tenant Data Isolation section (merge `tenant-isolation.mdc` content here)
- Key File Locations section (updated to include nested CLAUDE.md paths)
- Key Dependencies section
- Environment Variables section
- File Storage section
- Testing section (brief — pointer to `tests/CLAUDE.md` and `cypress/CLAUDE.md`)

**Add (from frontend.mdc — per §1.6 Frontend Convention Split):**
- Frontend Conventions section (critical rules only):
  - Server Components by default, `"use client"` only when needed
  - Push `"use client"` as far down the tree as possible
  - All request APIs are async: `await cookies()`, `await headers()`, `await params`, `await searchParams`
  - Never hardcode user-facing strings — use `useTranslations()` / `getTranslations()`
  - Accessibility: semantic HTML, visible focus, 4.5:1 contrast, 44x44px touch targets
  - Use `next/image` for images, `next/font` for fonts

**Add (from security.mdc + security-audit skill):**
- Security Conventions section (merged)

**Add new:**
- Nested CLAUDE.md Pointers section:
  ```
  ## Domain-Specific Conventions

  See nested CLAUDE.md files for domain-specific conventions:
  - `app/api/CLAUDE.md` — API route patterns (internal + external)
  - `components/CLAUDE.md` — UI components, design system, accessibility
  - `actions/CLAUDE.md` — Server action patterns, permission guards
  - `hooks/swr/CLAUDE.md` — SWR data fetching hooks
  - `lib/permissions/CLAUDE.md` — Permission system, role hierarchy
  - `prisma/CLAUDE.md` — Database schema conventions
  - `locales/CLAUDE.md` — Internationalization (next-intl)
  - `tests/CLAUDE.md` — Vitest unit testing
  - `cypress/CLAUDE.md` — Cypress E2E testing
  ```

- Doc-Keeping Standards section:
  - "When modifying a feature, check if `docs/`, `docs/architecture/`, or any nested CLAUDE.md references the changed behavior. Update them in the same PR."
  - ADR criteria
  - Pointer to `docs/MAINTENANCE.md` for quarterly review checklist

**Remove:**
- Detailed API Architecture section (→ `app/api/CLAUDE.md`)
- Server Actions section (→ `actions/CLAUDE.md`)
- Data Fetching Patterns section (→ `hooks/swr/CLAUDE.md`)
- Permissions System details (→ `lib/permissions/CLAUDE.md`)
- Internationalization details (→ `locales/CLAUDE.md`)
- Entire "Cursor Workflows & Commands" section (replaced by `.claude/commands/`)

**Target: ~130 lines.**

- [ ] **Step 3: Verify the revised CLAUDE.md**

Check: no domain-specific content that should be in a nested file. Check: all nested CLAUDE.md paths listed. Check: no Cursor references remain.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: revise root CLAUDE.md — slim to ~130 lines, add nested pointers"
```

---

### Task 7: Update Claude Memory

**Files:**
- Modify: `~/.claude/projects/-Users-stapo-Desktop-Oikion-MVP/memory/MEMORY.md`
- Create or Update: relevant memory files

- [ ] **Step 1: Read current MEMORY.md**

- [ ] **Step 2: Update MEMORY.md**

Add entries reflecting:
- The new documentation structure (`docs/` reorganization)
- That `.cursor/` is legacy and `.claude/commands/` is the active system
- That nested CLAUDE.md files exist and where they are
- That the ADR system is now in `docs/decisions/`

- [ ] **Step 3: Commit** (memory files are outside the repo — no git commit needed)

---

### Task 8: Phase 1 Verification

- [ ] **Step 1: Verify all nested CLAUDE.md files exist**

```bash
ls -la app/api/CLAUDE.md components/CLAUDE.md actions/CLAUDE.md hooks/swr/CLAUDE.md lib/permissions/CLAUDE.md prisma/CLAUDE.md locales/CLAUDE.md tests/CLAUDE.md cypress/CLAUDE.md
```

- [ ] **Step 2: Verify all commands exist**

```bash
ls -la .claude/commands/
```

Should show: `verify.md`, `review.md`, `fix-issue.md`, `new-action.md`, `new-api-route.md`, `db-migrate.md`

- [ ] **Step 3: Verify root CLAUDE.md is under 150 lines**

```bash
wc -l CLAUDE.md
```

- [ ] **Step 4: Verify no Cursor references in CLAUDE.md**

```bash
grep -i cursor CLAUDE.md
```

Should return nothing (or only a note that Cursor config is archived).

---

## Phase 2: Documentation Reorganization

Phase 2 tasks have ordering constraints. Execute sequentially.

---

### Task 9: Prerequisites — Commit Untracked Files

**Files:**
- Stage: `docs/plans/Oikion_Unified_Import_Engine_Spec_v1.0.docx.pdf`
- Stage: `docs/superpowers/plans/2026-03-18-composite-import-system.md`
- Stage: `docs/superpowers/plans/2026-03-18-unified-import-engine.md`
- Stage: `docs/superpowers/specs/2026-03-18-unified-import-engine.md`

- [ ] **Step 1: Stage and commit untracked doc files**

```bash
git add docs/plans/Oikion_Unified_Import_Engine_Spec_v1.0.docx.pdf docs/superpowers/plans/2026-03-18-composite-import-system.md docs/superpowers/plans/2026-03-18-unified-import-engine.md docs/superpowers/specs/2026-03-18-unified-import-engine.md
git commit -m "docs: commit untracked doc files (prerequisite for migration)"
```

---

### Task 10: Create Directory Skeleton

- [ ] **Step 1: Create all new directories**

```bash
mkdir -p docs/getting-started docs/architecture docs/guides/crm docs/guides/mls docs/guides/messaging docs/guides/matchmaking docs/guides/import-export docs/guides/portal-publishing docs/guides/performance docs/api-reference/endpoints docs/api-reference/integrations docs/decisions docs/operations
```

- [ ] **Step 2: Commit skeleton**

```bash
# Create .gitkeep in empty dirs so git tracks them
for dir in docs/getting-started docs/architecture docs/guides/crm docs/guides/mls docs/guides/messaging docs/guides/matchmaking docs/guides/import-export docs/guides/portal-publishing docs/guides/performance docs/api-reference/endpoints docs/api-reference/integrations docs/decisions docs/operations; do touch "$dir/.gitkeep"; done
git add docs/
git commit -m "docs: create directory skeleton for reorganized docs tree"
```

---

### Task 11: Move Files — Getting Started + Architecture

**Files (moves):**
- `docs/setup/README.md` → content merged into `docs/getting-started/index.md`
- `docs/setup/https-setup.md`, `clerk-setup.md`, `clerk-account-portal-setup.md`, `vercel-blob-setup.md`, `captcha-development.md`, `rate-limiting-setup.md` → consolidated into `docs/getting-started/service-setup.md`
- `docs/database/setup.md` → merged into `docs/getting-started/local-setup.md`
- `docs/troubleshooting/*` → consolidated into `docs/getting-started/troubleshooting.md`
- `docs/clerk-roles-setup.md` → `docs/architecture/authentication.md`
- `docs/encryption-reference.md` → `docs/architecture/encryption.md`
- `docs/migrations/account-portal-migration.md` → merged into `docs/architecture/authentication.md`
- `docs/development/logging-strategy.md` → `docs/architecture/logging.md`
- `docs/development/type-safety-roadmap.md` → `docs/architecture/type-safety.md`

- [ ] **Step 1: Read all source files to understand content**

- [ ] **Step 2: Create `docs/getting-started/index.md`**

Write a quick start overview page. Source content from `docs/setup/README.md`. Link to `local-setup.md`, `service-setup.md`, `project-structure.md`, `first-contribution.md`, `troubleshooting.md`.

- [ ] **Step 3: Create `docs/getting-started/local-setup.md`**

Consolidate core setup from `docs/setup/README.md` + `docs/database/setup.md`. Cover: clone, pnpm install, database setup, env vars, running dev server.

- [ ] **Step 4: Create `docs/getting-started/service-setup.md`**

Consolidate 6 service setup files into one with sections: Clerk, HTTPS Certs, Vercel Blob, Captcha, Rate Limiting.

- [ ] **Step 5: Create `docs/getting-started/troubleshooting.md`**

Consolidate `docs/troubleshooting/README.md`, `clerk-cors-fix.md`, `dashboard-errors.md`.

- [ ] **Step 6: Create `docs/getting-started/prerequisites.md`**

New file. System requirements: Node.js 20+, pnpm 9+, PostgreSQL 15+, Git.

- [ ] **Step 7: Create `docs/getting-started/project-structure.md`**

New file. File tree walkthrough of the project. Key directories and what they contain.

- [ ] **Step 8: Create `docs/getting-started/first-contribution.md`**

Adapt content from `CONTRIBUTING.md` for the getting-started context. PR workflow, commit conventions, review process.

- [ ] **Step 9: Read `docs/development/README.md` and absorb relevant content**

Read `docs/development/README.md`. If it contains a useful overview or index, merge relevant content into `docs/getting-started/index.md` or `docs/architecture/index.md`. If it's just a pointer file to the other 3 files (which have already been moved), it can be safely deleted by the `git rm -r docs/development/` in Task 16.

- [ ] **Step 10: Move architecture files using git mv where possible**

```bash
git mv docs/clerk-roles-setup.md docs/architecture/authentication.md
git mv docs/encryption-reference.md docs/architecture/encryption.md
git mv docs/development/logging-strategy.md docs/architecture/logging.md
git mv docs/development/type-safety-roadmap.md docs/architecture/type-safety.md
```

Then merge `docs/migrations/account-portal-migration.md` content into `docs/architecture/authentication.md`.

- [ ] **Step 11: Create remaining architecture files**

Write: `docs/architecture/index.md` (system overview), `docs/architecture/multi-tenancy.md`, `docs/architecture/permissions.md`, `docs/architecture/data-model.md`, `docs/architecture/real-time.md`, `docs/architecture/internationalization.md`.

Source content from CLAUDE.md sections, Cursor rules, and existing code.

- [ ] **Step 12: Commit**

```bash
git add docs/getting-started/ docs/architecture/
git commit -m "docs: create getting-started and architecture sections"
```

---

### Task 12: Move Files — Guides

**Files (moves):**
- `docs/optimization/` → `docs/guides/performance/`
- `docs/features/financial-report*.md` → `docs/guides/financial-reports.md`
- `docs/portal-publishing/*` → `docs/guides/portal-publishing/`
- `docs/keyboard-shortcuts/index.md` → `docs/guides/keyboard-shortcuts.md`
- `docs/development/optimization-notes.md` → merged into `docs/guides/performance/index.md`
- 50 React optimization rules → `docs/guides/performance/react-optimization.md`
- `.cursor/skills/feature-scaffold/SKILL.md` → `docs/guides/feature-scaffold.md`
- `.cursor/skills/import-export/SKILL.md` → absorbed into `docs/guides/import-export/index.md`

- [ ] **Step 1: Move performance files**

```bash
git mv docs/optimization/phase-1-critical/01-database-connection-pooling.md docs/guides/performance/connection-pooling.md
git mv docs/optimization/phase-1-critical/02-database-indexes.md docs/guides/performance/database-indexes.md
git mv docs/optimization/phase-1-critical/03-n-plus-1-queries.md docs/guides/performance/n-plus-1-queries.md
git mv docs/optimization/phase-1-critical/05-data-serialization.md docs/guides/performance/data-serialization.md
git mv docs/optimization/phase-1-critical/04-credential-rotation.md docs/operations/credential-rotation.md
```

- [ ] **Step 2: Create `docs/guides/performance/index.md`**

Consolidate `docs/optimization/README.md`, `QUICK_START.md`, `IMPLEMENTATION_CHECKLIST.md`, and `docs/development/optimization-notes.md`.

- [ ] **Step 3: Create `docs/guides/performance/react-optimization.md`**

Read ALL 50 files in `.cursor/skills/vercel-react-best-practices/rules/`. Consolidate into a single reference document organized by the 8 categories from the SKILL.md (Eliminating Waterfalls, Bundle Size, Server-Side, Client-Side, Re-render, Rendering, JavaScript, Advanced). Include priority ratings.

- [ ] **Step 4: Move portal publishing**

```bash
git mv docs/portal-publishing/index.md docs/guides/portal-publishing/index.md
git mv docs/portal-publishing/xe-gr.md docs/guides/portal-publishing/xe-gr.md
```

- [ ] **Step 5: Consolidate financial reports**

Read `docs/features/financial-report.md`, `financial-report-architecture.md`, `financial-report-implementation-summary.md`. Write consolidated `docs/guides/financial-reports.md`.

- [ ] **Step 6: Move keyboard shortcuts**

```bash
git mv docs/keyboard-shortcuts/index.md docs/guides/keyboard-shortcuts.md
```

- [ ] **Step 7: Create domain guide stubs**

Write placeholder index files for: `docs/guides/crm/index.md`, `docs/guides/mls/index.md`, `docs/guides/messaging/index.md`, `docs/guides/matchmaking/index.md`. Each should have a title, brief description, and "Content to be developed" note with pointers to relevant code directories.

- [ ] **Step 8: Create `docs/guides/import-export/index.md`**

Read `.cursor/skills/import-export/SKILL.md`. Write the import-export guide.

- [ ] **Step 9: Create `docs/guides/feature-scaffold.md`**

Read `.cursor/skills/feature-scaffold/SKILL.md`. Translate the 9-step workflow into a reference guide.

- [ ] **Step 10: Create `docs/guides/forms-and-validation.md`**

Extract patterns from `docs/design-system/forms.md` (the patterns portion, not the design system portion).

- [ ] **Step 11: Commit**

```bash
git add docs/guides/ docs/operations/credential-rotation.md
git commit -m "docs: create guides section with performance, domain guides, and workflows"
```

---

### Task 13: Move Files — API Reference, Security, Operations

**Files (moves):**
- `docs/api/*` → `docs/api-reference/`
- `docs/security/*` → `docs/security/` (restructured)
- `docs/migrations/*` → `docs/operations/database-migrations.md`
- `docs/k8s-database-silos.md` → `docs/operations/deployment.md`
- Root `MESSAGING_SECURITY_AUDIT.md` → `docs/security/threat-model.md`

- [ ] **Step 1: Move API reference**

```bash
git mv docs/api/index.md docs/api-reference/index.md
git mv docs/api/make-integration.md docs/api-reference/integrations/make.md
git mv docs/api/n8n-integration.md docs/api-reference/integrations/n8n.md
```

- [ ] **Step 2: Create API endpoint docs**

Write: `docs/api-reference/endpoints/properties.md`, `clients.md`, `mandates.md`, `calendar.md`. Source content from the actual route handlers in `app/api/v1/`. Include: endpoint URL, HTTP method, auth required, request/response format, example.

- [ ] **Step 3: Restructure security docs**

Read existing `docs/security/*` files. Write:
- `docs/security/index.md` — overview and navigation
- `docs/security/policies.md` — from `credential-rotation-policy.md`
- `docs/security/audit-log.md` — from `2026-03-13-comprehensive-security-audit.md` + `rotation-log.md`
- `docs/security/threat-model.md` — from root `MESSAGING_SECURITY_AUDIT.md` + security-auditor agent knowledge

- [ ] **Step 4: Create operations docs**

- `docs/operations/database-migrations.md` — consolidate `docs/migrations/2026-02-01-calcom-to-calendarevent-rename.md` + `add-ai-provider-settings.md`
- `docs/operations/deployment.md` — from `docs/k8s-database-silos.md`
- `docs/operations/monitoring.md` — from `k8s/monitoring/README.md`
- `docs/operations/credential-rotation.md` — already moved in Task 12

- [ ] **Step 5: Remove old security source files (content now in restructured files)**

```bash
git rm docs/security/README.md
git rm docs/security/credential-rotation-policy.md
git rm docs/security/rotation-log.md
git rm docs/security/2026-03-13-comprehensive-security-audit.md
# docs/security/index.md — overwritten in place by the new index.md
```

- [ ] **Step 6: Commit**

```bash
git add docs/api-reference/ docs/security/ docs/operations/
git rm MESSAGING_SECURITY_AUDIT.md  # Content migrated
git commit -m "docs: create api-reference, security, and operations sections"
```

---

### Task 14: Convert Specs to ADRs

**Files:**
- Read: all 9 files in `docs/superpowers/specs/` (excluding the current design spec)
- Create: `docs/decisions/ADR-001-item-visibility.md` through `ADR-009-entity-creation-fixes.md`
- Create: `docs/decisions/ADR-010-documentation-architecture.md` (this spec)
- Create: `docs/decisions/TEMPLATE.md`
- Create: `docs/decisions/index.md`

- [ ] **Step 1: Read all 9 source specs**

- [ ] **Step 2: Create `docs/decisions/TEMPLATE.md`**

Write the ADR template from spec §2.3.

- [ ] **Step 3: Move specs to ADR destinations using `git mv` (preserves history)**

```bash
git mv docs/superpowers/specs/2026-03-13-item-visibility-redesign-design.md docs/decisions/ADR-001-item-visibility.md
git mv docs/superpowers/specs/2026-03-10-phase-a-cascade-safety-deletion-unification-design.md docs/decisions/ADR-002-cascade-safety.md
git mv docs/superpowers/specs/2026-03-10-phase-b-data-ownership-agent-departure-design.md docs/decisions/ADR-003-data-ownership.md
git mv docs/superpowers/specs/2026-03-15-unified-encryption-architecture-design.md docs/decisions/ADR-004-encryption-arch.md
git mv docs/superpowers/specs/2026-03-16-composite-import-design.md docs/decisions/ADR-005-composite-import.md
git mv docs/superpowers/specs/2026-03-18-unified-import-engine.md docs/decisions/ADR-006-unified-import-engine.md
git mv docs/superpowers/specs/2026-03-11-comprehensive-test-seed-design.md docs/decisions/ADR-007-test-seed-strategy.md
git mv docs/superpowers/specs/2026-03-15-zod-prisma-validation-sync-design.md docs/decisions/ADR-008-zod-prisma-validation-sync.md
git mv docs/superpowers/specs/2026-03-15-entity-creation-fixes-design.md docs/decisions/ADR-009-entity-creation-fixes.md
git mv docs/superpowers/specs/2026-03-19-unified-documentation-architecture-design.md docs/decisions/ADR-010-documentation-architecture.md
```

- [ ] **Step 4: Edit each ADR in-place to add ADR header**

For each of the 10 ADR files, prepend/update the header to match the ADR template format (add `# ADR-NNN: Title`, `**Status:**`, `**Date:**` fields). Restructure existing content under Context/Decision/Consequences/Implementation sections. Set status: check if corresponding implementation plan was executed — if yes: `Implemented`, if no: `Accepted`.

- [ ] **Step 5: Create `docs/decisions/index.md`**

Write the ADR index with a table: ADR number, title, status, date.

- [ ] **Step 6: Commit**

```bash
git add docs/decisions/
git commit -m "docs: convert 10 design specs to numbered ADRs"
```

---

### Task 15: Merge Superpowers Plans + Write New Content

**Files (moves):**
- `docs/superpowers/plans/*` → `docs/plans/`
- Create: `docs/MAINTENANCE.md`
- Move: Root `V1.0.0-PREPARATION-SUMMARY.md` → `docs/changelog/`
- Move: `docs/release/*` → `docs/changelog/`

- [ ] **Step 1: Merge superpowers plans into docs/plans/ (including this plan file)**

```bash
git mv docs/superpowers/plans/2026-03-19-unified-documentation-architecture.md docs/plans/
git mv docs/superpowers/plans/2026-03-10-phase-a-cascade-safety-deletion-unification.md docs/plans/
git mv docs/superpowers/plans/2026-03-10-phase-b-data-ownership-agent-departure.md docs/plans/
git mv docs/superpowers/plans/2026-03-11-comprehensive-test-seed.md docs/plans/
git mv docs/superpowers/plans/2026-03-13-item-visibility-redesign.md docs/plans/
git mv docs/superpowers/plans/2026-03-15-entity-as-channel.md docs/plans/
git mv docs/superpowers/plans/2026-03-15-foundation-schema.md docs/plans/
git mv docs/superpowers/plans/2026-03-16-composite-import.md docs/plans/
git mv docs/superpowers/plans/2026-03-18-composite-import-system.md docs/plans/
git mv docs/superpowers/plans/2026-03-18-unified-import-engine.md docs/plans/
```

- [ ] **Step 2: Move release and changelog files**

```bash
git mv docs/release/v1.0.0-checklist.md docs/changelog/
git mv docs/release/v1.0.0-release-notes.md docs/changelog/
git mv V1.0.0-PREPARATION-SUMMARY.md docs/changelog/
```

- [ ] **Step 3: Create `docs/MAINTENANCE.md`**

Write the quarterly review checklist from spec §4.5.

- [ ] **Step 4: Replace `docs/README.md` with new master navigation**

Overwrite `docs/README.md` in place with the new master navigation content reflecting the complete reorganized tree. Keep the file as `docs/README.md` (not `index.md`) so GitHub renders it as the directory index.

- [ ] **Step 5: Commit**

```bash
git add docs/plans/ docs/changelog/ docs/MAINTENANCE.md docs/README.md
git commit -m "docs: merge plans, move changelog files, create maintenance checklist"
```

---

### Task 16: Update Internal Cross-References

- [ ] **Step 1: Find all broken internal links**

```bash
grep -rn "docs/setup/\|docs/optimization/\|docs/api/\|docs/migrations/\|docs/features/\|docs/development/\|docs/database/\|docs/troubleshooting/\|docs/keyboard-shortcuts/\|docs/release/\|docs/superpowers/" docs/ --include="*.md" | grep -v "_archive"
```

Also check:
```bash
grep -rn "docs/setup/\|docs/optimization/\|docs/api/\|docs/migrations/\|docs/features/\|docs/development/" CLAUDE.md CONTRIBUTING.md README.md SECURITY.md
```

- [ ] **Step 2: Update each broken reference to its new path**

Use the migration map from the spec (§2.2) to map old paths to new paths. Update every found reference.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: update internal cross-references to new doc paths"
```

---

## Phase 3: Cleanup

---

### Task 17: Delete Migrated Source Directories

- [ ] **Step 1: Remove empty/migrated directories**

```bash
git rm -r docs/setup/
git rm -r docs/optimization/
git rm -r docs/features/
git rm -r docs/database/
git rm -r docs/troubleshooting/
git rm -r docs/keyboard-shortcuts/
git rm -r docs/release/
git rm -r docs/api/
git rm -r docs/migrations/
git rm -r docs/development/
git rm -r docs/superpowers/
```

- [ ] **Step 2: Remove individual orphan files**

```bash
git rm docs/claude-integration.md
git rm docs/cursor-agent-system-guide.md
git rm docs/button-layout-fix.md
git rm docs/design-system.md  # Flat file, stale predecessor of design-system/
git rm docs/k8s-database-silos.md  # Content moved to operations/
git rm docs/clerk-roles-setup.md  # Content moved to architecture/
git rm docs/encryption-reference.md  # Content moved to architecture/
```

- [ ] **Step 3: Archive business docs**

```bash
mkdir -p docs/_archive
git mv docs/roi-analysis-cursor-ai-vs-fullstack-developer.md docs/_archive/
git mv docs/roi-analysis-cursor-ai-vs-fullstack-developer.pdf docs/_archive/
git mv docs/select-with-other/index.md docs/_archive/
```

- [ ] **Step 4: Commit**

```bash
git add -A docs/
git commit -m "docs: remove migrated source directories and archive orphans"
```

---

### Task 18: Archive `.cursor/`

- [ ] **Step 1: Create `.cursor/DEPRECATED.md`**

Write a note explaining:
- This directory contains legacy Cursor IDE configuration
- All knowledge has been migrated to Claude Code equivalents:
  - Rules → nested CLAUDE.md files
  - Commands → `.claude/commands/`
  - Skills → `docs/guides/` and `.claude/commands/`
  - Agents → absorbed into nested CLAUDE.md files
  - Hooks → intentionally dropped (nested CLAUDE.md + /verify provides coverage)
- The directory is preserved for reference but is no longer actively maintained

- [ ] **Step 2: Commit**

```bash
git add .cursor/DEPRECATED.md
git commit -m "docs: archive .cursor/ with DEPRECATED.md — migrated to Claude Code"
```

---

### Task 19: Update Changelog

- [ ] **Step 1: Read current `CHANGELOG.md`**

- [ ] **Step 2: Add entries for all work since last update (Feb 2026)**

Add entries for:
- E2EE messaging implementation
- Item visibility redesign (HIDDEN/PRIVATE/SECURE/PUBLIC)
- Cascade safety (Phase A)
- Client model cleanup
- E2EE announcement banner
- This documentation architecture migration

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: bring changelog current through March 2026"
```

---

### Task 20: Final Verification

- [ ] **Step 1: Verify no broken internal links**

```bash
# Find all markdown links and check targets exist
grep -roh '\[.*\](\.\.*/[^)]*\.md)' docs/ | grep -oP '\(\.\.*/[^)]*\.md\)' | sort -u
```

Spot-check that the targets resolve.

- [ ] **Step 2: Verify all source directories are gone**

```bash
# These should all fail (directory not found)
ls docs/setup/ docs/optimization/ docs/features/ docs/database/ docs/troubleshooting/ docs/keyboard-shortcuts/ docs/release/ docs/api/ docs/migrations/ docs/development/ docs/superpowers/ 2>&1 | grep "No such file"
```

- [ ] **Step 3: Verify new structure**

```bash
find docs/ -name "*.md" -type f | sort | head -80
```

Should show the new tree structure from the spec.

- [ ] **Step 4: Verify nested CLAUDE.md files**

```bash
find . -name "CLAUDE.md" -not -path "./node_modules/*" | sort
```

Should show root + ~11 nested files.

- [ ] **Step 5: Verify Claude commands**

```bash
ls .claude/commands/
```

Should show 6 commands.

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git status
# Fix any remaining issues, then:
git add -A
git commit -m "docs: final verification fixes for documentation migration"
```
