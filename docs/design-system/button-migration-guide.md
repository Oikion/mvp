# Button Component Migration Guide

## Overview

This guide helps you migrate button instances across the Oikion web app to use the unified Button component from `@/components/ui/button` with proper icon handling.

## Current State

**Analysis Results:**
- 316 instances across 113 files with manual icon spacing (`mr-`/`ml-` classes)
- Multiple patterns causing horizontal → vertical flex issues
- Inconsistent button usage throughout the app

## Core Issues

### 1. Icons as Children (Most Common)
Icons are passed as children with manual spacing instead of using `leftIcon`/`rightIcon` props.

**Problem:**
```tsx
<Button>
  <Save className="h-4 w-4 mr-2" />
  Save Changes
</Button>
```

**Solution:**
```tsx
<Button leftIcon={<Save className="h-4 w-4" />}>
  Save Changes
</Button>
```

### 2. Link Wrapping Patterns
Links wrapping buttons instead of using the `asChild` pattern.

**Problem:**
```tsx
<Link href="/settings">
  <Button>Settings</Button>
</Link>
```

**Solution:**
```tsx
<Button asChild>
  <Link href="/settings">Settings</Link>
</Button>
```

### 3. Incorrect Button with asChild + Icons in Link
When using `asChild`, icons should be in Button props, not inside Link.

**Problem:**
```tsx
<Button variant="outline" asChild>
  <Link href="/edit">
    <Edit className="h-4 w-4 mr-2" />
    Edit
  </Link>
</Button>
```

**Solution:**
```tsx
<Button variant="outline" leftIcon={<Edit className="h-4 w-4" />} asChild>
  <Link href="/edit">Edit</Link>
</Button>
```

### 4. Flex Direction Override (Rare but Critical)
Overriding button's default `inline-flex` with `flex-col` breaks horizontal icon alignment.

**Problem:**
```tsx
<Button className="flex flex-col">
  <Icon />
  Text
</Button>
```

**Note:** Only use `flex-col` if you intentionally want a vertical button layout (e.g., card-style quick actions). For standard buttons with icons, use `leftIcon`/`rightIcon` props.

## Migration Steps

### Manual Migration (Recommended for Complex Files)

1. **Identify the pattern:**
   ```bash
   # Find buttons with icon children
   grep -r "className=.*h-4.*w-4.*(mr-|ml-)" app/ components/
   ```

2. **Update the button:**
   - Move icon JSX to `leftIcon` or `rightIcon` prop
   - Remove manual spacing classes (`mr-`, `ml-`)
   - Keep only size classes on the icon

3. **Test the component:**
   - Verify icon alignment (should be horizontal by default)
   - Check spacing (button uses `gap-2` internally)
   - Ensure accessibility (icon-only buttons need `aria-label`)

### Automated Migration (Use with Caution)

A migration script is available but should be used carefully:

```bash
# Dry run first (preview changes)
pnpm tsx scripts/design-system/migrate-buttons.ts --dry-run

# Review the output, then run actual migration
pnpm tsx scripts/design-system/migrate-buttons.ts

# Migrate a single file
pnpm tsx scripts/design-system/migrate-buttons.ts --file=path/to/file.tsx
```

**Warning:** The automated script may introduce errors in complex cases. Always:
1. Run in dry-run mode first
2. Review changes carefully
3. Test TypeScript compilation: `pnpm tsc --noEmit`
4. Test in the browser

## Fixed Examples

### DocumentCard.tsx
```tsx
// Before
<Button variant="outline" size="sm" onClick={handleView}>
  <Eye className="h-4 w-4 mr-1" />
  View
</Button>

// After
<Button
  variant="outline"
  size="sm"
  leftIcon={<Eye className="h-4 w-4" />}
  onClick={handleView}
>
  View
</Button>
```

### TemplateCard.tsx
```tsx
// Before
<Link href={`/app/documents/create/${type}`}>
  <Button>
    <Sparkles className="h-4 w-4 mr-1.5" />
    Create
    <ArrowRight className="h-4 w-4 ml-1.5" />
  </Button>
</Link>

// After
<Button
  leftIcon={<Sparkles className="h-4 w-4" />}
  rightIcon={<ArrowRight className="h-4 w-4" />}
  asChild
>
  <Link href={`/app/documents/create/${type}`}>Create</Link>
</Button>
```

### DocumentDetail.tsx
```tsx
// Before
<Button variant="outline" asChild>
  <Link href="/edit">
    <Edit className="h-4 w-4 mr-2" />
    Edit
  </Link>
</Button>

// After
<Button
  variant="outline"
  leftIcon={<Edit className="h-4 w-4" />}
  asChild
>
  <Link href="/edit">Edit</Link>
</Button>
```

## Files Requiring Migration

Based on the analysis, the following areas have the most button instances to migrate:

### High Priority (Most Instances)
- `app/[locale]/app/(routes)/admin/` - Admin pages
- `app/[locale]/app/(platform_admin)/` - Platform admin pages
- `components/export/ExportButton.tsx` - 5+ instances
- `app/[locale]/app/(routes)/documents/` - Document management
- `app/[locale]/app/(routes)/mls/` - Property listings
- `app/[locale]/app/(routes)/crm/` - CRM views

### Medium Priority
- `components/voice/` - Voice command components
- `components/social/` - Social features
- `components/calendar/` - Calendar components
- `app/[locale]/app/(routes)/deals/` - Deal management

### Low Priority (Fewer Instances)
- `components/conversion/` - Conversion wizards
- `components/import/` - Import workflows
- `components/n8n/` - Automation components

## Testing Checklist

After migrating buttons:

- [ ] TypeScript compiles without errors: `pnpm tsc --noEmit`
- [ ] ESLint passes: `pnpm lint`
- [ ] Buttons render with icons horizontally aligned
- [ ] Icon spacing is consistent (no extra gaps)
- [ ] Loading states work correctly with `isLoading` prop
- [ ] Link buttons navigate properly with `asChild`
- [ ] Icon-only buttons have `aria-label`
- [ ] Mobile/responsive layout looks correct

## Resources

- [Button Component Documentation](./buttons.md)
- [Button Component Source](/components/ui/button.tsx)
- [Design System Index](./index.md)

## Support

If you encounter issues during migration:
1. Check the [Anti-Patterns section](./buttons.md#anti-patterns-dont-do-this) in button docs
2. Review fixed examples above
3. Test in isolation before integrating
4. Consult with the team for complex cases
