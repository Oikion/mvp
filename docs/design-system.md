# Oikion Design System Documentation

## Overview

The Oikion Design System provides a comprehensive, fully-themed UI framework for Oikion's Estates and Software products. It includes design tokens, component library, and templates that ensure consistent, accessible, and beautiful user experiences across all themes.

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Component Library](#component-library)
3. [Themes](#themes)
4. [Usage Guidelines](#usage-guidelines)
5. [Accessibility](#accessibility)
6. [Brand Coherence](#brand-coherence)

---

## Design Tokens

### Colors

All colors use HSL format via CSS custom properties for easy theme switching.

#### Surface Hierarchy

- **surface-1**: Page background (lowest elevation)
- **surface-2**: Card background (medium elevation)
- **surface-3**: Elevated card background (highest elevation)

#### Color Palette

Each theme defines:
- **Primary**: Main brand color
- **Secondary**: Supporting color
- **Accent**: Highlight color
- **Text Primary**: Main text color
- **Text Secondary**: Secondary text color
- **Error**: Error state color
- **Warning**: Warning state color
- **Success**: Success state color

#### Usage

```tsx
// Tailwind classes
<div className="bg-surface-1 text-text-primary">
<div className="bg-surface-2 border border-border">
<div className="bg-error text-error-foreground">
```

### Typography

#### Font Families

- **Body**: Inter (sans-serif) - `font-sans`

#### Typography Scale

- **h1**: 3rem (48px), line-height 1.2, weight 700
- **h2**: 2.25rem (36px), line-height 1.2, weight 600
- **h3**: 1.875rem (30px), line-height 1.3, weight 600
- **h4**: 1.5rem (24px), line-height 1.4, weight 600
- **body**: 1rem (16px), line-height 1.5, weight 400
- **caption**: 0.875rem (14px), line-height 1.4, weight 400

#### Usage

```tsx
<h1 className="text-h1 font-bold">Heading</h1>
<p className="text-body">Body text</p>
<small className="caption">Caption text</small>
```

### Spacing

Based on 4px base unit:
- 4px (1), 8px (2), 12px (3), 16px (4), 20px (5), 24px (6), 32px (8), 40px (10), 48px (12), 64px (16)

### Border Radius

- **Small**: 4px (`rounded-sm`)
- **Medium**: 8px (`rounded-md`)
- **Large**: 12px (`rounded-lg`)
- **XL**: 16px (`rounded-xl`)
- **2XL**: 24px (`rounded-2xl`)

### Elevation/Shadows

5 levels of elevation for visual hierarchy:

- **elevation-0**: `none`
- **elevation-1**: Subtle card shadow
- **elevation-2**: Card shadow
- **elevation-3**: Modal/popover shadow
- **elevation-4**: Top layer shadow

#### Usage

```tsx
<div className="shadow-elevation-1">Card</div>
<div className="shadow-elevation-3">Modal</div>
```

### Animations

Standard transitions:
- **Fast**: 150ms (`duration-fast`)
- **Default**: 200ms (`duration-default`)
- **Slow**: 300ms (`duration-slow`)

Easing functions:
- **ease-in-out**: Default (`ease-in-out`)
- **ease-out**: Hover (`ease-out`)
- **ease-in**: Active (`ease-in`)

---

## Component Library

### Button

Clean, flat button following standard shadcn design with all states, variants, and accessibility features.

#### Variants

- **default**: Primary action (`variant="default"`)
- **secondary**: Secondary action (`variant="secondary"`)
- **destructive**: Destructive action (`variant="destructive"`)
- **success**: Success/confirm action (`variant="success"`)
- **outline**: Outlined button (`variant="outline"`)
- **ghost**: Ghost button (`variant="ghost"`)
- **link**: Link-style button (`variant="link"`)

#### Sizes

- **sm**: Small (`size="sm"`)
- **default**: Default (`size="default"`)
- **lg**: Large (`size="lg"`)
- **icon**: Icon-only (`size="icon"`)

#### Usage

```tsx
import { Button } from "@/components/ui/button"

<Button variant="default" size="default">Click me</Button>
<Button variant="success">Confirm</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
```

### Form Components

#### Input

Enhanced input with validation states.

```tsx
import { Input } from "@/components/ui/input"

<Input error="This field is required" />
<Input success validationMessage="Looks good!" />
<Input warning="Warning message" />
```

#### Textarea

Enhanced textarea with validation states.

```tsx
import { Textarea } from "@/components/ui/textarea"

<Textarea error="This field is required" />
```

#### Select

Enhanced select dropdown.

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

#### Checkbox & Switch

```tsx
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"

<Checkbox id="terms" />
<Switch id="notifications" />
```

### Table

Enhanced table with header styles, row states, and accessibility.

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow data-state="selected">
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Chip/Badge

Filter/tag component with variants.

```tsx
import { Chip } from "@/components/ui/chip"

<Chip variant="default">Default</Chip>
<Chip variant="selected">Selected</Chip>
<Chip variant="filter" onRemove={() => {}}>Filter</Chip>
```

### Card

Enhanced card with elevation variants.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

<Card variant="default">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Layout Components

#### Hero

```tsx
import { Hero, HeroTitle, HeroDescription } from "@/components/ui/hero"

<Hero variant="centered">
  <HeroTitle>Welcome</HeroTitle>
  <HeroDescription>Description</HeroDescription>
</Hero>
```

#### Container

```tsx
import { Container } from "@/components/ui/container"

<Container size="lg">
  Content
</Container>
```

#### CardGrid

```tsx
import { CardGrid } from "@/components/ui/card-grid"

<CardGrid columns={3}>
  <Card>Card 1</Card>
  <Card>Card 2</Card>
</CardGrid>
```

#### SidebarLayout

```tsx
import { SidebarLayout, Sidebar, SidebarContent } from "@/components/ui/sidebar-layout"

<SidebarLayout>
  <Sidebar>Navigation</Sidebar>
  <SidebarContent>Main content</SidebarContent>
</SidebarLayout>
```

### Dialog/Modal

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

### Tooltip & Popover

```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>Tooltip</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## Themes

### Light Theme

Clean, bright, crisp with cream → soft white → bright white hierarchy.

**Use for**: Main app UI (Estates)

### Dark Theme

Darker surfaces (not pure black), maintain readability.

**Use for**: Power-user mode (Software)

### Midnight Emerald

Deep green/teal accent palette with light and dark variants.

**Use for**: Marketing/sub-brands

### Pearl Sand

Warm pastel beige/taupe accent, soft backgrounds.

**Use for**: Warm, approachable feel

### Twilight Lavender

Muted violet/lavender accents, cool greys.

**Use for**: Refined, professional mood

### Theme Switching

```tsx
import { ThemeToggle } from "@/components/ThemeToggle"

<ThemeToggle />
```

---

## Usage Guidelines

### Do's and Don'ts

#### Do's

✅ **DO** maintain consistent spacing using the spacing scale
✅ **DO** use proper focus states for keyboard navigation
✅ **DO** maintain WCAG AA color contrast ratios (4.5:1 for text, 3:1 for UI)
✅ **DO** use semantic HTML elements
✅ **DO** provide proper aria attributes for accessibility
✅ **DO** use theme-aware colors via CSS variables
✅ **DO** apply consistent transitions (150-200ms ease-in-out)

#### Don'ts

❌ **DON'T** use low contrast accent colors on text
❌ **DON'T** stack too many high-elevation shadows
❌ **DON'T** mix different spacing units arbitrarily
❌ **DON'T** use hardcoded colors instead of theme variables
❌ **DON'T** skip focus states on interactive elements
❌ **DON'T** use non-semantic HTML for UI components

### When to Use Each Variant

#### Button Variants

- **Primary (default)**: Main call-to-action, primary actions
- **Secondary**: Secondary actions, less prominent actions
- **Success**: Confirm, submit, success actions
- **Destructive**: Delete, remove, destructive actions
- **Outline**: Tertiary actions, cancel actions
- **Ghost**: Subtle actions, icon buttons
- **Link**: Navigation, inline actions

#### Card Variants

- **default**: Standard cards with subtle elevation
- **elevated**: Important cards, modals, popovers
- **outlined**: Minimal cards, borders without shadows

### Theme Selection Guidelines

- **Light theme**: Main app UI (Estates) - traditional, professional feel
- **Dark theme**: Power-user mode (Software) - modern SaaS dashboard feel
- **Midnight Emerald**: Marketing sites, sub-brands
- **Pearl Sand**: Warm, approachable interfaces
- **Twilight Lavender**: Refined, professional interfaces

---

## Accessibility

### WCAG Compliance

All components meet WCAG AA standards:
- **Color Contrast**: 4.5:1 for text, 3:1 for UI components
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus States**: Visible focus rings on all focusable elements
- **Screen Readers**: Proper aria attributes and semantic HTML

### Best Practices

1. **Always provide labels** for form inputs
2. **Use semantic HTML** (button, nav, main, etc.)
3. **Include aria-labels** for icon-only buttons
4. **Test with keyboard navigation** (Tab, Enter, Space, Arrow keys)
5. **Test with screen readers** (NVDA, JAWS, VoiceOver)

### Keyboard Navigation

- **Tab**: Move forward through focusable elements
- **Shift+Tab**: Move backward
- **Enter/Space**: Activate buttons and links
- **Arrow keys**: Navigate menus and lists
- **Escape**: Close modals and dialogs

---

## Brand Coherence

### Estates vs Software

#### Estates (Traditional Real Estate)

- Use **Light theme** as default
- Prefer **warm tones** (Pearl Sand for special pages)
- **Professional typography** (Inter for all text)
- **Subtle animations** and transitions
- **Traditional layouts** with clear hierarchy

#### Software (SaaS Dashboard)

- Use **Dark theme** for power users
- Prefer **cool tones** (Twilight Lavender, Midnight Emerald)
- **Modern typography** (Inter throughout)
- **Dynamic animations** and interactions
- **Modern layouts** with responsive grids

### Visual Cues

- **Real Estate Professionalism**: Clean, trustworthy, approachable
- **Software Productivity**: Efficient, modern, powerful
- **Consistent Branding**: Use Oikion logo and colors consistently
- **Responsive Design**: Mobile-first approach

---

## Responsive Guidelines

### Breakpoints

- **Mobile**: 320px+
- **Tablet**: 768px+
- **Desktop**: 1024px+
- **Large**: 1280px+

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```tsx
<div className="text-sm md:text-base lg:text-lg">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

---

## Getting Started

### Installation

The design system is already integrated into the project. Components are available at:

```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// etc.
```

### Theme Setup

Themes are configured via `ThemeProvider` in `app/[locale]/layout.tsx`:

```tsx
<ThemeProvider defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

### Customization

All design tokens are defined in:
- `app/[locale]/globals.css` - CSS custom properties
- `tailwind.config.js` - Tailwind theme extensions

To customize, edit these files directly.

---

## Examples

### Form with Validation

```tsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

<div className="space-y-4">
  <div>
    <Label htmlFor="email">Email</Label>
    <Input 
      id="email" 
      type="email" 
      error={errors.email}
    />
  </div>
  <Button type="submit">Submit</Button>
</div>
```

### Table with Filters

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Chip } from "@/components/ui/chip"

<div>
  <div className="flex gap-2 mb-4">
    <Chip variant="filter" onRemove={() => {}}>Filter 1</Chip>
  </div>
  <Table>
    {/* Table content */}
  </Table>
</div>
```

---

## Support

For questions or issues with the design system, please contact the design team or refer to the component source code for detailed implementation examples.

