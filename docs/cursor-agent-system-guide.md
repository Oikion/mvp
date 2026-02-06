# Comprehensive Cursor Agent & Tool System Guide

*Compiled from official Cursor documentation, changelog, and practitioner best practices (Jan 2026)*

---

## 1. Architecture Overview

Cursor's agent system is built on three foundational components:

1. **Instructions** — System prompts and rules that guide agent behavior
2. **Tools** — File editing, codebase search, terminal execution, browser, MCP
3. **User Messages** — Your prompts and follow-ups that direct the work

Cursor's agent harness tunes instructions and tools for every frontier model it supports. Different models respond differently to the same prompts — the harness handles this so you can focus on building software.

**The Critical Quartet** (set up at project start):
- `.cursor/rules/*.mdc` — Static rules
- `SKILL.md` files — Dynamic skills
- `.cursor/hooks.json` — Lifecycle hooks
- MCP servers — External tool integrations

---

## 2. Rules System

Rules are persistent instructions included at the start of every model context. They don't retain memory between completions — rules solve this by providing reusable context at the prompt level.

### 2.1 Four Types of Rules

| Type | Location | Scope | When Applied |
|------|----------|-------|-------------|
| **Project Rules** | `.cursor/rules/*.mdc` | Per-repo, version-controlled | Based on type setting |
| **User Rules** | Cursor Settings → Rules | Global, all projects | Always |
| **Team Rules** | Team dashboard | Organization-wide | Always for team members |
| **AGENTS.md** | Project root | Per-repo, simple markdown | Always (alternative to `.cursor/rules`) |

### 2.2 Project Rule Types (`.mdc` metadata)

Each `.mdc` file supports a `type` dropdown that controls application:

| Type | Behavior | Use Case |
|------|----------|----------|
| **Always** | Included in every conversation | Core conventions, build commands |
| **Auto Attached** | Included when files matching `globs` are referenced | Framework-specific patterns |
| **Agent Requested** | Agent reads the `description` and decides relevance | Domain-specific knowledge |
| **Manual** | Only included when explicitly referenced with `@ruleName` | Rarely-needed specialized guidance |

### 2.3 `.mdc` File Format

```markdown
---
description: RPC Service boilerplate
globs: src/services/**/*.ts
alwaysApply: false
---

- Use our internal RPC pattern when defining services
- Always use snake_case for service names
- See @service-template.ts for canonical structure
```

Key points:
- `description` — Required for **Agent Requested** type (agent reads this to decide relevance)
- `globs` — File patterns for **Auto Attached** type
- `alwaysApply` — Set to `true` for **Always** type
- Use `@filename.ts` to reference files within rules (keeps rules short, prevents staleness)

### 2.4 Rule Best Practices

**What to include in rules:**
```markdown
# Commands
- `npm run build`: Build the project
- `npm run typecheck`: Run the typechecker
- `npm run test`: Run tests (prefer single test files for speed)

# Code Style
- Use ES modules (import/export), not CommonJS (require)
- Destructure imports when possible: `import { foo } from 'bar'`
- See `components/Button.tsx` for canonical component structure

# Workflow
- Always typecheck after making a series of code changes
- API routes go in `app/api/` following existing patterns
```

**What to avoid in rules:**
- Copying entire style guides (use a linter instead)
- Documenting every possible command (the agent knows common tools)
- Adding instructions for edge cases that rarely apply
- Bloating a single file — split into composable `.mdc` files by concern

**Practitioner-proven additions:**
```markdown
# Agent Behavior
- Don't apologize for errors — fix them
- If code is incomplete, add TODO comments
- Challenge ideas — if you see flaws/risks/better approaches, say so
- Plan before coding, explain reasoning for complex suggestions
- Re-check this rules file every few messages to stay compliant

# Code Standards
- Handle errors at the beginning of functions with early returns
- Keep files under 300 lines — split when it improves clarity
- Write self-explanatory code (minimal comments)
- Keep imports alphabetically sorted

# Git
- Use Conventional Commits (feat:, fix:, docs:, chore:)
- Keep messages under 60 characters
```

**Golden rule:** Start simple. Add rules only when you notice the agent making the same mistake repeatedly. Don't over-optimize before you understand your patterns. Check rules into git so your team benefits.

### 2.5 AGENTS.md (Simple Alternative)

For straightforward projects, `AGENTS.md` at project root replaces `.cursor/rules`:

```markdown
# Project Instructions

## Code Style
- Use TypeScript for all new files
- Prefer functional components in React
- Use snake_case for database columns

## Architecture
- Follow the repository pattern
- Keep business logic in service layers
```

No metadata or complex configuration — just plain markdown. Perfect for simple, readable instructions.

### 2.6 Rule Hierarchy & Priority

Rules are evaluated in this order:
1. **Manual** — Explicitly included with `@ruleName`
2. **Auto Attached** — Files matching glob patterns are referenced
3. **Agent Requested** — Agent decides based on description
4. **Always / User / Team** — Applied to every conversation

---

## 3. Skills System

Skills are the **dynamic** counterpart to rules. While rules are always-on static context, skills are loaded dynamically when the agent decides they're relevant. They package domain-specific knowledge, workflows, and scripts.

### 3.1 Skills vs Rules

| Aspect | Rules | Skills |
|--------|-------|--------|
| Loading | Always included (or glob-matched) | Dynamically loaded when relevant |
| Format | `.mdc` files in `.cursor/rules/` | `SKILL.md` files in `.cursor/skills/` |
| Purpose | Persistent conventions & style | Procedural "how-to" workflows |
| Context impact | Always consumes tokens | Only loaded when needed |
| Best for | Declarative guidelines | Dynamic context discovery, step-by-step procedures |

### 3.2 SKILL.md Structure

```
.cursor/
├── skills/
│   ├── deployment/
│   │   └── SKILL.md
│   ├── tdd-workflow/
│   │   └── SKILL.md
│   ├── verification-loop/
│   │   └── SKILL.md
│   └── learned/
│       └── pattern-*.md
└── skill-packs/
    ├── full.json
    └── minimal.json
```

Each skill resides in its own subdirectory with `SKILL.md` as the primary file.

### 3.3 What Skills Can Include

- **Custom Commands** — Reusable workflows triggered with `/` in agent input
- **Hooks** — Scripts that run before or after agent actions
- **Domain Knowledge** — Instructions for specific tasks the agent pulls in on demand
- **Scripts** — Executable automation referenced by hooks or commands

### 3.4 Practical Skill Examples

**Verification Loop Skill** (`.cursor/skills/verification-loop/SKILL.md`):
```markdown
# Verification Loop

Run a 6-phase validation before marking work as complete:

1. **Build** — Run `npm run build`, fix all errors
2. **Types** — Run `npm run typecheck`, resolve type errors
3. **Lint** — Run `npm run lint`, fix warnings
4. **Tests** — Run `npm run test`, ensure all pass
5. **Security** — Check for known vulnerabilities
6. **Diff** — Review changed files for unintended modifications

Output a verification report:
\```
VERIFICATION REPORT
==================
Build: [PASS/FAIL]
Types: [PASS/FAIL]
Lint:  [PASS/FAIL]
Tests: [PASS/FAIL]
Overall: [READY/NOT READY] for PR
\```
```

**TDD Workflow Skill** (`.cursor/skills/tdd-workflow/SKILL.md`):
```markdown
# TDD Workflow (Red-Green-Refactor)

1. RED: Write failing tests first based on requirements
2. GREEN: Write minimal code to make tests pass
3. REFACTOR: Clean up while keeping tests green

Rules:
- Never modify tests during GREEN phase
- Run tests after every change
- Commit at each phase boundary
```

### 3.5 Skill Packs

Switch between skill configurations without modifying individual files:

```json
// .cursor/skill-packs/python-minimal.json
{
  "name": "python-minimal",
  "skills": ["verification-loop", "tdd-workflow"]
}
```

Skills not in the active pack are moved to `.cursor/skills-optional/`.

---

## 4. Commands

Commands are reusable workflows triggered with `/` in the agent input. Store them as markdown files in `.cursor/commands/`.

### 4.1 Example Commands

**`/pr` — Create a Pull Request:**
```markdown
Create a pull request for the current changes.

1. Look at the staged and unstaged changes with `git diff`
2. Write a clear commit message based on what changed
3. Commit and push to the current branch
4. Use `gh pr create` to open a pull request with title/description
5. Return the PR URL when done
```

**`/fix-issue [number]`:**
```markdown
Fix GitHub issue $ARGUMENTS.

1. Fetch issue details with `gh issue view $ARGUMENTS`
2. Find relevant code using codebase search
3. Implement the fix following project conventions
4. Run tests to verify
5. Open a PR referencing the issue
```

**`/review`:**
```markdown
Review current changes for quality.

1. Run linters and type checkers
2. Check for common issues and anti-patterns
3. Summarize what might need attention
4. Suggest improvements with specific file/line references
```

**`/plan`:**
```markdown
Create a comprehensive implementation plan.

1. Restate the requirements in your own words
2. Break down into implementation phases
3. List dependencies and risks (HIGH/MEDIUM/LOW)
4. Estimate complexity
5. WAIT FOR CONFIRMATION before proceeding
```

---

## 5. Hooks

Hooks are scripts that run before or after agent actions, providing lifecycle control.

### 5.1 Hook Configuration

```json
// .cursor/hooks.json
{
  "version": 1,
  "hooks": {
    "stop": [{ "command": "bun run .cursor/hooks/grind.ts" }]
  }
}
```

### 5.2 Long-Running Agent Loop (Grind Pattern)

The most powerful hook pattern — keeps the agent working until a goal is achieved:

```typescript
// .cursor/hooks/grind.ts
import { readFileSync, existsSync } from "fs";

interface StopHookInput {
  conversation_id: string;
  status: "completed" | "aborted" | "error";
  loop_count: number;
}

const input: StopHookInput = await Bun.stdin.json();
const MAX_ITERATIONS = 5;

if (input.status !== "completed" || input.loop_count >= MAX_ITERATIONS) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

const scratchpad = existsSync(".cursor/scratchpad.md")
  ? readFileSync(".cursor/scratchpad.md", "utf-8")
  : "";

if (scratchpad.includes("DONE")) {
  console.log(JSON.stringify({}));
} else {
  console.log(JSON.stringify({
    followup_message: `[Iteration ${input.loop_count + 1}/${MAX_ITERATIONS}] Continue working. Update .cursor/scratchpad.md with DONE when complete.`
  }));
}
```

**Use cases for this pattern:**
- Run and fix until all tests pass
- Iterate on UI until it matches a design mockup
- Any goal-oriented task where success is verifiable

### 5.3 Hook Safety Best Practices

- Sandbox hooks to test projects first — avoid production repos initially
- Maintain audit trails — log agent actions and store logs with PRs
- Use blocklists/allowlists for dangerous commands
- Gate hook-driven behaviors behind feature flags
- Redact environment variables and sensitive tokens

---

## 6. Subagents

Subagents are independent agents that handle discrete parts of a parent agent's task. They run in parallel with their own context.

### 6.1 Built-in Subagents

Cursor includes default subagents for:
- **Codebase research** — Read-only exploration
- **Terminal commands** — Command execution
- **Parallel work streams** — Multiple tasks simultaneously

### 6.2 Custom Subagent Patterns

Define specialized agents in `.cursor/rules/agents.mdc`:

```markdown
# Agent Definitions

## Planner Agent
- Purpose: Create implementation plans with approval gates
- Trigger: /plan command or complex feature detection
- Output: Phased plan with risks and dependencies

## TDD Agent
- Purpose: Generate and execute tests using RED-GREEN-REFACTOR
- Trigger: /tdd command
- Tools: Test runner, coverage reporter

## Security Agent
- Purpose: Vulnerability analysis and attack vector assessment
- Trigger: /security command or security-related file changes

## Code Reviewer
- Purpose: Quality review with severity-based recommendations
- Trigger: /review command

## Build Fixer
- Purpose: Diagnose and fix build errors with root cause analysis
- Trigger: Build failure detection
```

### 6.3 Parallel Agent Execution

Run multiple agents simultaneously using git worktrees:
- Each agent runs in its own worktree with isolated files
- Agents can edit, build, and test without interference
- Click "Apply" to merge changes back to your working branch

You can also run the same prompt across multiple models simultaneously and compare results side-by-side.

---

## 7. MCP (Model Context Protocol) Integration

MCP connects the agent to external tools beyond coding.

### 7.1 Common MCP Servers

| Category | Tools |
|----------|-------|
| **Project Management** | Slack, Linear, Jira, Notion |
| **Monitoring** | Datadog, Sentry, PagerDuty |
| **Design** | Figma |
| **Database** | Direct database queries |
| **Version Control** | GitHub (issues, PRs, reviews) |

### 7.2 Context Sources

| Reference | Purpose |
|-----------|---------|
| `@Web` | Search the web for documentation |
| `@docs` | Reference documentation sites |
| `@Git` | Git history and branch context |
| `@Branch` | Current branch changes |
| `@Past Chats` | Reference previous agent conversations |
| `@filename` | Specific file context |

---

## 8. Agent Modes & Workflows

### 8.1 Modes

| Mode | Use Case |
|------|----------|
| **Agent Mode** | Autonomous multi-file editing, terminal execution, full tool access |
| **Plan Mode** (`Shift+Tab`) | Research → clarify → plan → wait for approval before coding |
| **Ask Mode** | Inquiry and exploration without making changes |
| **Debug Mode** | Hypothesis generation → instrumentation → evidence-based fixing |

### 8.2 Plan Mode Workflow

1. Agent researches your codebase to find relevant files
2. Asks clarifying questions about requirements
3. Creates a detailed implementation plan with file paths and code references
4. Waits for your approval before building

Plans open as Markdown files you can edit directly. Save to `.cursor/plans/` for team documentation and resumability.

**When plans fail:** Revert changes, refine the plan, and run again. This is faster than fixing an in-progress agent.

### 8.3 Test-Driven Development Workflow

1. Ask agent to **write tests** (be explicit about TDD — no mock implementations)
2. Agent **runs tests and confirms they fail** (no implementation code yet)
3. **Commit the tests**
4. Ask agent to **write code that passes tests** (don't modify tests, iterate until all pass)
5. **Commit the implementation**

### 8.4 Debug Mode

For tricky bugs, Debug Mode:
1. Generates multiple hypotheses about what could be wrong
2. Instruments code with logging statements
3. Asks you to reproduce the bug while collecting runtime data
4. Analyzes actual behavior to pinpoint root cause
5. Makes targeted fixes based on evidence

Best for: reproducible bugs, race conditions, timing issues, performance problems, regressions.

---

## 9. Context Management Best Practices

### 9.1 Let the Agent Find Context

Don't manually tag every file. The agent has powerful semantic search and grep tools. If you know the exact file, tag it. If not, the agent will find it. Including irrelevant files confuses the agent about what's important.

### 9.2 When to Start a New Conversation

**Start fresh when:**
- Moving to a different task or feature
- Agent seems confused or keeps making same mistakes
- You've finished one logical unit of work

**Continue when:**
- Iterating on the same feature
- Agent needs context from earlier in the discussion
- Debugging something it just built

Long conversations accumulate noise through summarization. If effectiveness decreases, start fresh and use `@Past Chats` to reference previous work.

### 9.3 Token Optimization

- Split bloated rule files into context-aware `.mdc` files — only activate relevant rules
- Reference files with `@filename` instead of copying contents into rules
- Use Skills (dynamic) instead of Rules (static) for specialized knowledge
- Keep rules concise: under 500 lines per file

---

## 10. Reviewing Agent Output

### 10.1 During Generation
Watch the diff view as changes happen. Press **Escape** to interrupt and redirect if the agent goes off-track.

### 10.2 Agent Review
Click **Review → Find Issues** for a dedicated review pass. The agent analyzes proposed edits line-by-line and flags potential problems.

### 10.3 Architecture Diagrams
For significant changes, prompt: "Create a Mermaid diagram showing the data flow for [system], including [components]." These reveal architectural issues before code review.

### 10.4 Bugbot for PRs
Push to source control for automated PR reviews with advanced analysis.

---

## 11. Recommended Project Structure

```
your-project/
├── .cursor/
│   ├── rules/                    # Static rules (always-on context)
│   │   ├── core.mdc              # Always: build commands, code style
│   │   ├── frontend.mdc          # Auto Attached: globs for frontend files
│   │   ├── backend.mdc           # Auto Attached: globs for backend files
│   │   ├── database.mdc          # Agent Requested: DB patterns
│   │   └── agents.mdc            # Agent definitions and orchestration
│   │
│   ├── skills/                   # Dynamic skills (loaded on demand)
│   │   ├── verification-loop/
│   │   │   └── SKILL.md
│   │   ├── tdd-workflow/
│   │   │   └── SKILL.md
│   │   ├── deployment/
│   │   │   └── SKILL.md
│   │   └── learned/              # Auto-generated from patterns
│   │       └── pattern-*.md
│   │
│   ├── commands/                 # Slash commands
│   │   ├── pr.md                 # /pr — create pull request
│   │   ├── fix-issue.md          # /fix-issue [number]
│   │   ├── review.md             # /review — code quality check
│   │   └── plan.md               # /plan — implementation planning
│   │
│   ├── hooks.json                # Lifecycle hooks configuration
│   ├── hooks/
│   │   └── grind.ts              # Long-running iteration hook
│   │
│   ├── plans/                    # Saved implementation plans
│   │   └── feature-x.md
│   │
│   └── scratchpad.md             # Agent working memory
│
├── AGENTS.md                     # Simple alternative to .cursor/rules/
└── .cursorignore                 # Exclude files from indexing
```

---

## 12. Traits of Effective Agent Users

Based on Cursor's official guidance and community experience:

1. **Write specific prompts** — "Write a test case for `auth.ts` covering the logout edge case, using the patterns in `__tests__/` and avoiding mocks" beats "add tests for auth.ts"
2. **Iterate on setup** — Start simple, add rules only when the agent repeats mistakes
3. **Review carefully** — AI code can look right while being subtly wrong. Read diffs.
4. **Provide verifiable goals** — Use typed languages, configure linters, write tests. Give the agent clear success signals.
5. **Treat agents as collaborators** — Ask for plans, request explanations, push back on approaches you don't like
6. **Use staged autonomy** — Ask for a plan → approve steps → gate external commands
7. **Keep git as your safety net** — Feature branches, frequent commits, small PRs keep things reversible

---

## 13. Key Resources

- **Official Best Practices:** [cursor.com/blog/agent-best-practices](https://cursor.com/blog/agent-best-practices)
- **Rules Documentation:** [docs.cursor.com/en/context/rules](https://docs.cursor.com/en/context/rules)
- **Skills Documentation:** [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills)
- **Hooks Documentation:** [cursor.com/docs/agent/hooks](https://cursor.com/docs/agent/hooks)
- **Changelog (latest features):** [cursor.com/changelog](https://cursor.com/changelog)
- **Community Rules:** [cursor.directory](https://cursor.directory), [dotcursorrules.com](https://dotcursorrules.com)
- **Agent Skills Marketplace:** [github.com/VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
