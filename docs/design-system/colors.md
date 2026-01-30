# Colors - Oikion Design System

Semantic color tokens for consistent, theme-aware styling.

## Semantic Colors

Use semantic tokens instead of hardcoded Tailwind colors:

| Token | Use Case | Example Classes |
|-------|----------|-----------------|
| `primary` | Brand, main actions | `text-primary`, `bg-primary` |
| `secondary` | Supporting elements | `text-secondary-foreground`, `bg-secondary` |
| `destructive` | Errors, delete | `text-destructive`, `bg-destructive` |
| `success` | Success, valid | `text-success`, `bg-success` |
| `warning` | Caution, pending | `text-warning`, `bg-warning` |
| `info` | Information | `text-info`, `bg-info` |
| `muted` | Disabled, subtle | `text-muted-foreground`, `bg-muted` |
| `accent` | Highlights, hover | `text-accent-foreground`, `bg-accent` |

## Do's and Don'ts

```tsx
// DO: Use semantic tokens
className="text-destructive bg-destructive/10 border-destructive"
className="text-success bg-success/10"
className="text-warning"
className="text-primary"

// DON'T: Use hardcoded colors
className="text-red-500 bg-red-50 border-red-500"
className="text-green-500 bg-green-100"
className="text-yellow-600"
className="text-blue-600"
```

## Color Utilities

### Import

```tsx
import { 
  getStatusColorClasses, 
  getSemanticColorClasses,
  getBadgeClasses 
} from "@/lib/theme";
```

### Status Colors

```tsx
const colors = getStatusColorClasses("error");
// { text: "text-destructive", bg: "bg-destructive", bgSubtle: "bg-destructive/10", border: "border-destructive" }

<span className={`${colors.text} ${colors.bgSubtle} ${colors.border}`}>
  Error Message
</span>
```

### Badge Colors

```tsx
const badgeClass = getBadgeClasses("success");
// "bg-success/10 text-success border-success/20"

<Badge className={badgeClass}>Active</Badge>
```

## Color Mapping Reference

When migrating from hardcoded colors:

| Hardcoded | Semantic |
|-----------|----------|
| `text-red-500` | `text-destructive` |
| `bg-red-50` | `bg-destructive/10` |
| `border-red-500` | `border-destructive` |
| `text-green-500` | `text-success` |
| `bg-green-50` | `bg-success/10` |
| `text-blue-500` | `text-primary` |
| `bg-blue-50` | `bg-primary/10` |
| `text-yellow-500` | `text-warning` |
| `bg-yellow-50` | `bg-warning/10` |
| `text-gray-500` | `text-muted-foreground` |
| `bg-gray-100` | `bg-muted` |

## Opacity Modifiers

Use Tailwind opacity modifiers for subtle backgrounds:

```tsx
// Subtle backgrounds (10-20% opacity)
className="bg-destructive/10"
className="bg-success/10"
className="bg-warning/10"

// Medium emphasis (50% opacity)
className="bg-primary/50"

// Border emphasis (20-30% opacity)
className="border-destructive/20"
className="border-success/30"
```

## Dark Mode

Semantic tokens automatically adapt to dark mode through CSS variables. No additional `dark:` classes needed:

```tsx
// This works in both light and dark mode
className="text-destructive bg-destructive/10"

// DON'T manually specify dark variants for semantic colors
className="text-red-600 dark:text-red-400" // ❌
```

## Themes

Four themes available, all using the same semantic tokens:

1. **Light** - Default, professional
2. **Dark** - Power user mode
3. **Pearl Sand** - Warm, approachable
4. **Twilight Lavender** - Refined, elegant

## CSS Variables

Colors are defined as HSL values in `globals.css`:

```css
:root {
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --success: 142.1 76.2% 36.3%;
  --success-foreground: 0 0% 98%;
  /* ... */
}
```

## ESLint Enforcement

The design system includes ESLint rules to catch hardcoded colors:

```bash
# Check for violations
pnpm lint
```

Warnings like:
```
Avoid hardcoded color "text-red-500". Use semantic tokens like destructive instead.
```

## Exceptions

Some cases where hardcoded colors are acceptable:

1. **Email templates** - No CSS variable support
2. **PDF exports** - Fixed styling required
3. **Changelog tags** - User-customizable colors

These are excluded via `.eslintrc.json` overrides.
