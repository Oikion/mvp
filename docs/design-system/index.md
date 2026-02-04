# Oikion Design System

Welcome to the Oikion Design System documentation. This guide provides comprehensive patterns, components, and guidelines for building consistent, accessible, and beautiful user interfaces.

## Quick Links

- [Forms](./forms.md) - Form patterns, error handling, validation
- [Buttons](./buttons.md) - Button variants, loading states, icons
- [Feedback](./feedback.md) - Toast notifications, loading, progress
- [Colors](./colors.md) - Semantic color tokens, theming
- [Typography](./typography.md) - Typography scale, fonts
- [Nielsen Heuristics](./nielsen-heuristics.md) - UX guidelines coverage

## Core Principles

### 1. Consistency
Use standardized components and patterns across all features. When in doubt, check this documentation first.

### 2. Accessibility (WCAG AA)
All components meet WCAG AA standards:
- 4.5:1 color contrast for text
- 3:1 for UI components
- Keyboard navigation support
- Screen reader compatibility

### 3. Theme Awareness
Components use CSS variables for colors, enabling seamless theme switching:
- Light theme
- Dark theme
- Pearl Sand
- Twilight Lavender

### 4. Performance
- Prefer semantic HTML
- Use proper loading states
- Optimize bundle size with tree-shaking

## Component Import Patterns

```tsx
// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";

// Form Components
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Utilities
import { cn } from "@/lib/utils";
import { useAppToast } from "@/hooks/use-app-toast";

// Theme Utilities
import { getStatusColorClasses } from "@/lib/theme";

// Form Utilities
import { validationConfig, handleServerError } from "@/lib/form";
```

## Design Tokens

### Semantic Colors
```
primary       - Main brand actions
secondary     - Supporting actions
destructive   - Delete, errors, dangerous actions
success       - Completion, valid states
warning       - Caution, pending states
info          - Information, links
muted         - Disabled, secondary text
accent        - Highlights, active states
```

### Typography Scale
```
text-h1       - 48px - Main page headings
text-h2       - 36px - Section headings
text-h3       - 30px - Subsection headings
text-h4       - 24px - Card headings
text-body     - 16px - Body text
text-caption  - 14px - Labels, small text
```

### Spacing
Based on 4px unit: 1 (4px), 2 (8px), 3 (12px), 4 (16px), 6 (24px), 8 (32px)

## Automated Enforcement

The design system includes ESLint rules:

```bash
# Check for design system violations
pnpm lint
```

Rules:
- `no-hardcoded-colors` - Use semantic tokens instead of `text-red-500`
- `no-deprecated-toast` - Use `useAppToast` instead of deprecated `useToast`
- `prefer-semantic-typography` - Use `text-h1` instead of `text-5xl`

## Migration Scripts

```bash
# Migrate toast usage
npx tsx scripts/design-system/migrate-toast.ts --dry-run

# Migrate button imports
npx tsx scripts/design-system/migrate-buttons.ts --dry-run
```

## TypeScript Support

Strict types available in `types/design-system.d.ts`:

```tsx
import type { 
  ButtonVariant, 
  SemanticColor, 
  TypographySize 
} from "@/types/design-system";
```
