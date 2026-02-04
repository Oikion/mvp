# Design System Migration Scripts

Scripts for migrating to the unified Oikion Design System patterns.

## Quick Start

```bash
# 1. Preview color changes (most impactful)
pnpm migrate:colors:dry

# 2. Apply color changes
pnpm migrate:colors

# 3. Run lint to verify
pnpm lint
```

## Available Scripts

### migrate-colors.ts ⭐ Most Important

Migrates hardcoded Tailwind colors to semantic design tokens. This is the biggest migration task with ~1,200 replacements across ~155 files.

```bash
# Dry run - see what would change
pnpm migrate:colors:dry

# Apply changes
pnpm migrate:colors

# Target specific directory
tsx scripts/design-system/migrate-colors.ts --path ./app/[locale]/app

# Verbose output (shows every change)
tsx scripts/design-system/migrate-colors.ts --dry-run --verbose
```

**Safe automatic replacements:**

| Hardcoded | Semantic | Usage |
|-----------|----------|-------|
| `text-red-500/600` | `text-destructive` | Errors |
| `bg-red-500/600` | `bg-destructive` | Error backgrounds |
| `bg-red-50/100` | `bg-destructive/10` | Light error backgrounds |
| `text-green-500/600` | `text-success` | Success states |
| `text-emerald-500/600` | `text-success` | Success states |
| `bg-green-500/600` | `bg-success` | Success backgrounds |
| `text-amber-500/600` | `text-warning` | Warnings |
| `text-yellow-500/600` | `text-warning` | Warnings |
| `text-orange-500/600` | `text-warning` | Warnings |
| `bg-amber-500` | `bg-warning` | Warning backgrounds |
| `text-blue-500/600` | `text-primary` | Primary actions, links |
| `bg-blue-500/600` | `bg-primary` | Primary backgrounds |
| `text-gray-400/500/600` | `text-muted-foreground` | Secondary text |
| `text-gray-800/900` | `text-foreground` | Primary text |
| `text-slate-400/500/600` | `text-muted-foreground` | Secondary text |
| `text-slate-800/900` | `text-foreground` | Primary text |
| `bg-gray-50/100` | `bg-muted` | Muted backgrounds |
| `bg-slate-50/100` | `bg-muted` | Muted backgrounds |
| `border-gray-200/300` | `border-border` | Standard borders |

**Flagged for manual review:**
- Purple colors (could be accent or decorative)
- Pink colors (could be accent)
- Indigo colors (could be primary or accent)
- Teal/cyan colors (could be info or success)

### migrate-toast.ts

Migrates from the deprecated `useToast` hook to `useAppToast`:

```bash
# Dry run - see what would change
tsx scripts/design-system/migrate-toast.ts --dry-run

# Apply changes
tsx scripts/design-system/migrate-toast.ts

# Limit to specific path
tsx scripts/design-system/migrate-toast.ts --path ./app
```

**What it does:**
- Replaces `import { useToast } from "@/components/ui/use-toast"`
- With `import { useAppToast } from "@/hooks/use-app-toast"`
- Updates toast call patterns where possible

### migrate-buttons.ts

Migrates from `website/button.tsx` to the enhanced `ui/button.tsx`:

```bash
# Dry run
tsx scripts/design-system/migrate-buttons.ts --dry-run

# Apply changes
tsx scripts/design-system/migrate-buttons.ts
```

**What it does:**
- Replaces `import { Button } from "@/components/website/button"`
- With `import { Button } from "@/components/ui/button"`
- The enhanced `ui/button` now supports all props from website/button

## Recommended Migration Order

1. **Colors first** (biggest impact)
   ```bash
   pnpm migrate:colors:dry  # Review
   pnpm migrate:colors      # Apply
   git add -A && git commit -m "chore: migrate colors to semantic tokens"
   ```

2. **Handle flagged files** - Review and manually fix ~36 files with context-dependent colors

3. **Toasts** (smaller scope)
   ```bash
   tsx scripts/design-system/migrate-toast.ts
   ```

4. **Buttons** (if using old website buttons)
   ```bash
   tsx scripts/design-system/migrate-buttons.ts
   ```

5. **Verify**
   ```bash
   pnpm lint        # Check for remaining issues
   pnpm build       # Ensure it builds
   ```

## Manual Steps After Migration

After running the automated migration:

1. **Review changes** - Check git diff for unexpected modifications
2. **Handle edge cases** - Some colors may need manual adjustment
3. **Run tests** - Ensure nothing is broken
4. **Check TypeScript** - Run `pnpm tsc --noEmit` for type errors
5. **Test visually** - Verify components render correctly

## Troubleshooting

### Some colors weren't replaced

The script intentionally skips:
- `emails/` directory (email templates need inline colors)
- `lib/export/` directory (PDF exports need specific colors)
- Purple, pink, indigo, teal, cyan (need manual review)

### Unexpected visual changes

Some semantic tokens may look slightly different than the original hardcoded colors. This is expected - they're designed to work with the theme system. Check `globals.css` for exact HSL values.

See `docs/design-system/colors.md` for the full mapping reference.
