# Working With Claude Code — Personal Reference

This is a personal field guide for developing Oikion with Claude Code.
Keep it open in a split pane while working.

---

## The 3-Part Prompt Formula

Most weak results come from vague prompts. Use this structure:

```
CONTEXT  → what already exists / what you just looked at
TASK     → exactly what should change
GUARD    → constraints or what NOT to do
```

**Example (weak):**
> "Add a filter to the properties page"

**Example (strong):**
> "In `app/[locale]/app/(routes)/mls/properties/` there's a `PropertiesPageView.tsx` that already has a search bar. Add a status filter dropdown (AVAILABLE / UNDER_OFFER / SOLD) next to the search bar. Use the existing `Select` component from shadcn, and filter client-side via the SWR data already loaded — don't add a new API call."

The key upgrade: name the file, name what already exists, and say what to avoid.

---

## Workflow by Task Type

### A. New Feature (> 2 files)
```
1. Explore   → "Use feature-dev:code-explorer to map how [X] currently works"
2. Architect → "Use feature-dev:code-architect to design [feature] implementation"
3. Implement → Give Claude the blueprint, implement file by file
4. Review    → Claude auto-runs ecc:code-reviewer after significant changes
5. UI check  → Claude auto-runs impeccable:critique after .tsx edits
6. Commit    → "Commit this to staging"
```

### B. Bug Fix (known file)
```
1. Check Sentry first: "Search Sentry for errors matching [description]"
2. Fix: give Claude the file path + exact symptom
3. Auto-review fires from hooks
4. Commit when fixed
```

### C. Schema Change
```
1. Edit prisma/schema.prisma directly
2. "Run pnpm prisma migrate dev --name [descriptive_name]"
   → Hook will warn you with a safety checklist
3. Verify with "pnpm prisma migrate status"
4. Commit BOTH the schema change AND the migration file
```

### D. UI/Component Work
```
1. Describe the desired outcome (not implementation)
2. Claude runs impeccable:critique automatically
3. If starting a full page: "Start with impeccable:impeccable for this page"
```

### E. "Is this working?" / Analytics Questions
```
→ "Query PostHog for [feature/event] usage in the last 30 days"
→ Never guess adoption — always check first
```

---

## Slash Commands — What Each Does

Run with `/command-name` in the Claude prompt.

| Command | When to use |
|---|---|
| `/feature-dev` | Starting a feature that spans 3+ files — triggers Explorer → Architect flow |
| `/impeccable` | Full UI audit for a new page (runs before you write code) |
| `/impeccable:critique` | Quick critique of a component you just wrote |
| `/ecc:security-reviewer` | After touching any auth, API route, or input handling |
| `/ecc:typescript-reviewer` | After a TypeScript refactor or type changes |
| `/ecc:code-reviewer` | General code quality pass |
| `/ecc:performance-optimizer` | When something feels slow |
| `/pr-review-toolkit` | Before creating a PR — runs full review suite |
| `/commit-commands` | For structured git commit workflows |

---

## Hooks — What Fires Automatically

You don't need to do anything for these — they run in the background.

| When | What fires | What it tells you |
|---|---|---|
| Before any `prisma migrate` Bash command | `prisma-migration-guard.sh` | Branch, environment checklist, safety reminders |
| After editing any `app/api/` or `actions/` file | `api-security-reminder.sh` | 6-point security checklist |
| Session start | OpenSpace autostart | Loads procedural memory |
| Session end | Memory capture | Saves session context |

When the security checklist fires, actually read it. It's a 10-second review that catches 80% of auth bugs before they hit Sentry.

---

## Prompting for Database Work

Always tell Claude:
- What environment you're targeting (dev / staging / prod)
- Whether you want `--create-only` first (review SQL before applying)
- What the migration does in plain English

```
"Add a nullable `archived_at DateTime?` field to the Property model.
Use --create-only first so I can review the SQL before applying.
Environment: dev only for now."
```

Never let Claude run `prisma db push` or `migrate reset --force` in production.
The hook will warn — heed it.

---

## Git Workflow

| Situation | What to say |
|---|---|
| Save work in progress | "Commit this to staging" |
| Ready to ship to production | "Commit to main so we prepare for production" |
| Create a PR | "Create a PR for this branch against main" |
| Never | Let Claude `git push --force` or amend published commits |

Branch convention:
- `staging` — all development work goes here
- `main` — production-ready only; only when explicitly told

---

## The Plugins We Use (and Why)

| Plugin | What it provides |
|---|---|
| `ecc` | 20+ review/build agents (security, TypeScript, performance, etc.) + Context7 + Playwright MCP |
| `impeccable` | UI critique, design system enforcement, WCAG checks |
| `feature-dev` | Explorer, Architect, Reviewer agents for complex features |
| `superpowers` | Skills system (brainstorming, planning, debugging workflows) |
| `frontend-design` | Frontend-specific patterns and component guidance |
| `github` | GitHub MCP — create/review PRs, issues, branches without leaving Claude |
| `vercel` | Deployment management, logs, environment variables |
| `posthog` | Analytics queries — usage funnels, event counts |
| `stripe` | Subscription/payment data when needed |
| `typescript-lsp` | Live TypeScript type information in Claude's context |
| `pr-review-toolkit` | Multi-agent PR review suite (code, tests, types, silent failures) |
| `commit-commands` | Structured git commit helpers |
| `skill-creator` | Build new reusable skills |

---

## When to Use PostHog vs Sentry

**PostHog** = understanding user behavior (before building or fixing):
- "How many users actually use the filter on the properties page?"
- "Is the new wizard being completed or abandoned at step 2?"

**Sentry** = understanding errors (before diagnosing):
- "There's a crash when someone clicks X" → check Sentry before guessing the cause
- "We deployed a fix for Y" → verify in Sentry that the error rate dropped

Both need a one-time MCP authentication per session. If Claude can't reach them, it will ask.

---

## Context Shortcuts — Things Claude Forgets Across Sessions

When starting a session, drop one of these in if relevant:

```
"We're in the middle of Phase 4 of the entity architecture migration (see MEMORY.md)"
"The current focus is matchmaking improvements in lib/matchmaking/"
"We're in a merge freeze — don't create PRs or push to main"
```

Claude reads MEMORY.md automatically, but a one-liner reminder at session start
anchors the conversation faster than waiting for it to re-derive context.

---

## Red Flags — Signs a Prompt Will Give Bad Results

- You haven't named a specific file or component
- You said "the list page" without specifying which one (there are 8)
- You're asking for a feature without mentioning what already exists nearby
- You asked Claude to "fix the bug" without pointing it to Sentry or a file
- You're starting a 5+ file feature without running `/feature-dev` first

---

## Quick Reference — Key File Paths

```
proxy.ts                    — Middleware (NOT middleware.ts)
lib/prisma.ts               — Prisma client (named export { prismadb })
lib/get-current-user.ts     — Auth helpers, organizationId
lib/model-encryption.ts     — Server-side encryption source of truth
lib/permissions/CLAUDE.md   — Role hierarchy details
locales/en/ + locales/el/   — Translation files
prisma/schema.prisma        — Database schema
```

---

*Last updated: 2026-04-26. Update this when workflows change significantly.*
