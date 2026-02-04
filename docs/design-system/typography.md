# Typography - Oikion Design System

Semantic typography scale for consistent text styling.

## Typography Scale

| Class | Size | Line Height | Weight | Use Case |
|-------|------|-------------|--------|----------|
| `text-h1` | 48px (3rem) | 1.2 | 700 | Main page headings |
| `text-h2` | 36px (2.25rem) | 1.2 | 600 | Section headings |
| `text-h3` | 30px (1.875rem) | 1.3 | 600 | Subsection headings |
| `text-h4` | 24px (1.5rem) | 1.4 | 600 | Card/component headings |
| `text-body` | 16px (1rem) | 1.5 | 400 | Body text |
| `text-caption` | 14px (0.875rem) | 1.4 | 400 | Labels, small text |

## Usage

```tsx
// Semantic typography classes
<h1 className="text-h1">Page Title</h1>
<h2 className="text-h2">Section Title</h2>
<h3 className="text-h3">Subsection</h3>
<h4 className="text-h4">Card Title</h4>
<p className="text-body">Body text content...</p>
<span className="text-caption">Small label</span>
```

## Best Practices

### Do's

```tsx
// DO: Use semantic classes for headings
<h1 className="text-h1 text-foreground">Dashboard</h1>

// DO: Use text-body for main content
<p className="text-body text-muted-foreground">
  Description text here.
</p>

// DO: Use text-caption for labels
<label className="text-caption font-medium">Email</label>
```

### Don'ts

```tsx
// DON'T: Use arbitrary sizes for headings
<h1 className="text-5xl font-bold">Dashboard</h1>

// DON'T: Use inconsistent sizes
<h2 className="text-xl">One Section</h2>
<h2 className="text-2xl">Another Section</h2>
```

## Font Family

The design system uses Inter as the primary font:

```tsx
// Applied globally via Tailwind config
<body className="font-sans">
```

## Font Weights

| Weight | Class | Use Case |
|--------|-------|----------|
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Labels, emphasis |
| 600 | `font-semibold` | Headings, buttons |
| 700 | `font-bold` | H1, strong emphasis |

## Text Colors

Combine typography with semantic colors:

```tsx
// Primary text
<h1 className="text-h1 text-foreground">Title</h1>

// Secondary/muted text
<p className="text-body text-muted-foreground">Description</p>

// Link text
<a className="text-body text-primary hover:underline">Link</a>

// Error text
<span className="text-caption text-destructive">Error message</span>
```

## Responsive Typography

The typography scale is designed to work across breakpoints. For responsive adjustments:

```tsx
// Responsive heading
<h1 className="text-h2 md:text-h1">Responsive Title</h1>

// Responsive body
<p className="text-caption md:text-body">Content</p>
```

## Line Clamping

For truncated text:

```tsx
// Single line
<p className="text-body truncate">Long text...</p>

// Multiple lines
<p className="text-body line-clamp-2">
  Very long text that spans multiple lines...
</p>
```

## Typography Components

Optional typography components for consistent structure:

```tsx
import { H2, H4 } from "@/components/typography";

<H2>Section Title</H2>
<H4>Card Title</H4>
```

## ESLint Rule

An optional ESLint rule suggests semantic typography:

```json
{
  "@oikion/eslint-plugin-design-system/prefer-semantic-typography": "warn"
}
```

This warns when heading elements use non-semantic sizes.

## Prose Styles

For rich text content (markdown, CMS content):

```tsx
<div className="prose prose-sm dark:prose-invert max-w-none">
  {/* Rendered HTML content */}
</div>
```

## Migration

When updating existing code:

| Before | After |
|--------|-------|
| `text-5xl font-bold` | `text-h1` |
| `text-4xl font-semibold` | `text-h1` or `text-h2` |
| `text-3xl font-semibold` | `text-h2` or `text-h3` |
| `text-2xl font-semibold` | `text-h3` or `text-h4` |
| `text-xl font-semibold` | `text-h4` |
| `text-base` | `text-body` |
| `text-sm` | `text-caption` or `text-body` |
