# Component Conventions

UI component patterns for the `components/` directory. RSC/client component rules (Server Components by default, "use client" directive, async request APIs) apply app-wide and live in the root CLAUDE.md.

---

## 1. Component Structure

**Naming**: files in `kebab-case.tsx`, exports in `PascalCase`. Named exports preferred over default exports. Use `forwardRef` when wrapping DOM elements. Include `className` prop via `cn()` for composability.

**First principle**: Always extend shadcn/ui primitives — check `components/ui/` before creating anything new.

### Forms (react-hook-form + Zod)

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: {} });
```

- `<Form>` + `<FormField>` + `<FormItem>` + `<FormLabel>` + `<FormControl>` + `<FormMessage>` — always use this stack
- `<FormSection>` groups related fields; `<FormRow>` lays them out horizontally; `<FormActions>` for submit/cancel (supports sticky footer)
- Error handling decision tree: `docs/design-system/forms.md`

### Loading / Error / Empty States

| State | Component | Import | Variants / Presets |
|-------|-----------|--------|--------------------|
| Loading | `<Loading />` | `@/components/ui/loading` | `spinner`, `dots`, `pulse`, `orbit`, `wave`, `bars` |
| Error | `<ErrorState />` | `@/components/ui/error-state` | `default`, `network`, `server`, `permission`, `notFound` |
| Empty | `<EmptyState />` | `@/components/ui/empty-state` | `clients`, `properties`, `tasks`, `documents`, `events`, `notifications`, `comments`, `search` |
| Placeholder | `<Skeleton />` / `<ShimmerSkeleton />` | `@/components/ui/skeleton` | — |

Do NOT use the deprecated `<LoadingState />` component.

### Modals / Dialogs

```typescript
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// Size prop: sm | default | lg | xl | 2xl | full
```

For shared entity actions (delete, share, schedule): use `useActionModal()` hook (Zustand-backed store) — do not open a one-off Dialog for actions that already have a shared modal.

### Toasts

```typescript
import { useAppToast } from "@/hooks/use-app-toast";
// const { success, error, info } = useAppToast();
```

Never call raw `toast()` directly (ESLint rule `@oikion/no-deprecated-toast` enforces this).

### Buttons

```typescript
import { Button } from "@/components/ui/button";
// Variants: default | destructive | outline | secondary | ghost | link
// Sizes:    default | sm | lg | icon
```

### Cards

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
```

### Data Tables

```typescript
import { DataTable } from "@/components/ui/data-table";
// Supports: filtering, sorting, pagination, row selection
```

### Icons

- Lucide React only — no other icon libraries
- Sizes: 16px inline with text, 20px standalone in buttons, 24px for feature icons
- Decorative icons: `aria-hidden="true"` required
- Icon-only buttons: `aria-label` required

### Images

- `next/image` for all images (optimization, lazy loading, responsive sizing)
- Meaningful `alt` text always; empty `alt=""` for decorative-only images

---

## 2. Design System

Design system docs: `docs/design-system/` (`index.md`, `forms.md`, `buttons.md`, `feedback.md`, `colors.md`, `typography.md`, `nielsen-heuristics.md`)

### Color Tokens — Never Hardcode Hex

Use CSS variable-based semantic tokens:

| Token | Use |
|-------|-----|
| `primary` / `primary-foreground` | Main brand actions |
| `destructive` / `destructive-foreground` | Delete / danger actions |
| `success` / `warning` / `info` | Feedback states |
| `muted` / `muted-foreground` | De-emphasized content |
| `accent` / `accent-foreground` | Highlighted elements |
| `background` / `foreground` | Base content |
| `card` / `card-foreground` | Card surfaces |
| `border` | Borders |
| `ring` | Focus rings |

ESLint rule `@oikion/no-hardcoded-colors` enforces this. Flag: `#FF0000`, `text-[#333]`.

### Class Merging

```typescript
import { cn } from "@/lib/utils";
<div className={cn("base-classes", isActive && "active-classes")} />
```

### Consistency Red Flags

- Hardcoded hex colors or inline `style=` instead of Tailwind
- New primitive that duplicates existing shadcn/ui functionality
- Missing hover/focus states on interactive elements
- Inconsistent spacing (use Tailwind scale: `p-2`, `p-4`, `gap-3`, `space-y-4`)
- Different loading states for similar operations
- Inconsistent button variants across pages
- Mixed icon sets or sizing

---

## 3. Navigation

Use locale-aware wrappers from `@/navigation` — not `next/link` or `next/navigation` directly.

```typescript
import { Link, useRouter } from "@/navigation";
// Link auto-injects locale prefix. router.push() also locale-aware.
```

### Route Registry Quick Reference

| Route | Notes |
|-------|-------|
| `/app/crm/clients/[clientId]` | CRM client detail |
| `/app/mls/properties/[propertyId]` | MLS property detail |
| `/app/deals/[dealId]` | Deal detail |
| `/app/calendar/events/[id]` | Calendar event |
| `/app/admin` | Org admin (not `/app/settings`) |

Full registry in `.cursor/rules/navigation-links.mdc`.

### Common Mistakes

| Wrong | Correct |
|-------|---------|
| `href="/crm"` | `href="/app/crm"` |
| `href="/el/app/crm"` | Use `<Link>` from `@/navigation` |
| `href="/app/settings"` | `href="/app/admin"` |
| `/app/properties/${id}` | `/app/mls/properties/${id}` |
| `import Link from "next/link"` (in app routes) | `import { Link } from "@/navigation"` |

### Navigation Files — Keep in Sync

When adding/renaming/removing a route, update ALL of:
1. `config/navigation.tsx`
2. `components/GlobalSearch.tsx`
3. `components/ai/CommandPalette.tsx`
4. `components/providers/KeyboardShortcutsProvider.tsx`
5. `components/notifications/NotificationPopover.tsx`
6. `app/[locale]/app/(routes)/components/DynamicBreadcrumb.tsx`

---

## 4. Accessibility Checklist (WCAG AA)

**Semantic HTML first** — `<button>` not `<div role="button">`, `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`.

### Keyboard Navigation
- All interactive elements reachable via Tab / Shift+Tab
- Visible focus indicators with 3:1 contrast against background
- Logical tab order matching visual layout
- No keyboard traps outside modals

### Modals
- Trap focus inside dialog while open
- Close on Escape
- Return focus to trigger element on close
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to title

### ARIA
- Dynamic states: `aria-expanded`, `aria-selected`, `aria-checked`
- Loading: `aria-busy="true"` + `aria-live` region
- Error fields: `aria-invalid="true"` + `aria-describedby` pointing to error message
- Required fields: `required` or `aria-required="true"` (not color-only)
- Decorative: `aria-hidden="true"`

### Color & Contrast
- Normal text: 4.5:1 minimum
- Large text (18pt+ / 14pt+ bold): 3:1 minimum
- UI components and focus rings: 3:1 minimum
- Never convey information by color alone

### Touch & Motion
- Touch targets: minimum 44×44px
- Respect `prefers-reduced-motion` for all animations
- Page zoomable to 200% without loss of function

### Forms
- Every input has an associated `<label>` (via `for` or wrapping)
- Related controls grouped with `<fieldset>` + `<legend>`
- `autocomplete` attributes on common fields (name, email, address)

### Run Accessibility Auditor Agent

For a full WCAG 2.2 audit, ask: "Run the accessibility audit on [component]"

---

## 5. Top 10 React Performance Rules

Full 50-rule reference: `docs/guides/performance/react-optimization.md`

| Rule | Category | What to do |
|------|----------|------------|
| `async-parallel` | Waterfalls (CRITICAL) | Use `Promise.all()` for independent async operations |
| `async-defer-await` | Waterfalls (CRITICAL) | Move `await` into branches where the value is actually used |
| `bundle-dynamic-imports` | Bundle (CRITICAL) | Use `next/dynamic` for heavy components (editors, charts) |
| `bundle-barrel-imports` | Bundle (CRITICAL) | Import directly from source file, not from barrel `index.ts` |
| `server-cache-react` | Server (HIGH) | Use `React.cache()` for per-request data deduplication in RSC |
| `server-parallel-fetching` | Server (HIGH) | Restructure components so sibling fetches run in parallel |
| `rerender-memo` | Re-renders (MEDIUM) | Wrap expensive pure components in `React.memo` |
| `rerender-derived-state` | Re-renders (MEDIUM) | Derive boolean state from props instead of syncing via effect |
| `bundle-defer-third-party` | Bundle (CRITICAL) | Load analytics / logging scripts after hydration |
| `server-serialization` | Server (HIGH) | Minimize data serialized and passed from RSC to client components |
