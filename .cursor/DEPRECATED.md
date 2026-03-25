# DEPRECATED — Cursor Configuration

This directory contains legacy Cursor IDE configuration. All knowledge has been migrated to Claude Code equivalents as of 2026-03-20.

## Migration Map

| Cursor asset | Claude Code equivalent |
|---|---|
| `rules/*.mdc` (16 files) | Nested CLAUDE.md files in source directories |
| `commands/*.md` (8 files) | `.claude/commands/` (6 ported, 2 covered by superpowers) |
| `skills/` (8 workflows) | `.claude/commands/`, `docs/guides/`, superpowers skills |
| `agents/` (5 agents) | Absorbed into nested CLAUDE.md files |
| `hooks/` (2 hooks) | Intentionally dropped — nested CLAUDE.md + `/verify` provides coverage |
| `fixes/` (5 files) | Historical — fixes are in codebase, context in git history |

## Do Not Delete

This directory is preserved for reference. It is no longer actively maintained.
