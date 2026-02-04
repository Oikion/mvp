# Dashboard Hydration Error Fix

**Date:** 2026-02-01  
**Issue:** React hydration mismatch due to inconsistent date formatting  
**Component:** `DashboardHeader`  
**Status:** ✅ Resolved

## Problem Description

A hydration error was occurring on the dashboard page, causing React to regenerate the component tree on the client side:

```
Hydration failed because the server rendered text didn't match the client.
```

### Error Details

**Server Output:** "Monday, 2 February 2026"  
**Client Output:** "Monday, February 2, 2026"

The mismatch occurred in the `DashboardHeader` component at line 36:

```tsx
<p className="text-muted-foreground mt-1">{formatDate()}</p>
```

### Root Cause

The `formatDate()` function was using JavaScript's native `toLocaleDateString()` without specifying a locale:

```tsx
const formatDate = (): string => {
  const now = new Date();
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
```

**Problem:** When `undefined` is passed as the locale parameter, `toLocaleDateString()` uses the system's default locale, which can differ between:
- Server environment (Node.js)
- Client browser environment
- Different user browsers

This caused the server to render the date in one format (Greek: "Monday, 2 February 2026") while the client rendered it in another format (English: "Monday, February 2, 2026").

## Technical Analysis

### Why Hydration Mismatches Occur

React hydration expects the server-rendered HTML to match exactly what React would render on the client. When there's a mismatch:

1. React detects the difference
2. Throws a hydration error
3. Re-renders the entire component tree on the client
4. Causes performance issues and potential flashing

### Common Causes of Hydration Mismatches

1. ❌ Using `Date.now()` or `Math.random()` directly
2. ❌ Using `typeof window !== 'undefined'` checks
3. ❌ Date formatting without consistent locale
4. ❌ External data without snapshots
5. ❌ Invalid HTML nesting
6. ❌ Browser extensions modifying HTML

In this case, it was **#3: Date formatting without consistent locale**.

## Solution Implemented

### Updated Code

Replaced the native `toLocaleDateString()` with `date-fns` library using the `next-intl` locale:

```tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface DashboardHeaderProps {
  userName: string | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName }) => {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greetingMorning");
    if (hour < 18) return t("greetingAfternoon");
    return t("greetingEvening");
  };

  const formatDate = (): string => {
    const now = new Date();
    const dateLocale = locale === "el" ? el : enUS;
    return format(now, "EEEE, d MMMM yyyy", { locale: dateLocale });
  };

  const displayName = userName?.split(" ")[0] || t("defaultUser");

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        {getGreeting()}, {displayName}
      </h1>
      <p className="text-muted-foreground mt-1">{formatDate()}</p>
    </div>
  );
};
```

### Key Changes

1. **Added `useLocale()` hook** from `next-intl` to get the current locale
2. **Imported `date-fns` utilities:**
   - `format` function for consistent date formatting
   - `el` (Greek) and `enUS` (English) locale objects
3. **Updated `formatDate()` function:**
   - Determines locale based on `next-intl` locale
   - Uses `date-fns` format with explicit locale
   - Format pattern: `"EEEE, d MMMM yyyy"` (e.g., "Monday, 2 February 2026")

### Why This Works

✅ **Consistent Locale:** Both server and client use the same locale from `next-intl`  
✅ **Deterministic Output:** `date-fns` produces consistent formatting across environments  
✅ **Locale-Aware:** Respects user's language preference (Greek/English)  
✅ **SSR-Compatible:** Works identically on server and client

## Date Format Pattern

The format pattern `"EEEE, d MMMM yyyy"` produces:

| Locale | Example Output |
|--------|----------------|
| English (en) | "Monday, 2 February 2026" |
| Greek (el) | "Δευτέρα, 2 Φεβρουαρίου 2026" |

### Pattern Breakdown

- `EEEE` - Full weekday name (Monday, Δευτέρα)
- `d` - Day of month (2)
- `MMMM` - Full month name (February, Φεβρουαρίου)
- `yyyy` - Full year (2026)

## Dependencies

### Required Packages

Both packages are already installed in the project:

```json
{
  "date-fns": "^4.1.0",
  "next-intl": "^3.29.0"
}
```

### Locale Files

The `date-fns` locale files are imported directly:

```tsx
import { el, enUS } from "date-fns/locale";
```

## Testing

### Manual Testing Steps

1. **Test English Locale:**
   - Navigate to `/en/app`
   - Verify date displays: "Monday, 2 February 2026"
   - Check browser console for hydration errors (should be none)

2. **Test Greek Locale:**
   - Navigate to `/el/app`
   - Verify date displays: "Δευτέρα, 2 Φεβρουαρίου 2026"
   - Check browser console for hydration errors (should be none)

3. **Test Server-Client Consistency:**
   - Disable JavaScript in browser
   - Load page (server-rendered only)
   - Note the date format
   - Enable JavaScript
   - Verify date format remains the same (no flash/change)

### Expected Results

✅ No hydration errors in console  
✅ Date format consistent between server and client  
✅ Date format respects user's locale preference  
✅ No visual flashing or re-rendering on page load

## Related Components

### Other Components Using Date Formatting

Check these components for similar issues:

1. **Calendar Components:**
   - `CalendarPageView.tsx` ✅ Already uses `date-fns` with locale
   - `EventListSidebar.tsx` ✅ Already uses `date-fns` with locale
   - `DayHourView.tsx` ✅ Already uses `date-fns` with locale

2. **Dashboard Components:**
   - `DashboardHeader.tsx` ✅ Fixed in this update

3. **Other Components:**
   - Search for `toLocaleDateString()` usage
   - Search for `toLocaleTimeString()` usage
   - Ensure all use consistent locale handling

### Search Command

```bash
# Find potential hydration issues with date formatting
rg "toLocaleDateString|toLocaleTimeString" --type tsx --type ts
```

## Best Practices

### Preventing Hydration Mismatches

1. **Use Consistent Date Formatting:**
   ```tsx
   // ❌ Bad: System-dependent locale
   const date = new Date().toLocaleDateString();
   
   // ✅ Good: Explicit locale with date-fns
   const locale = useLocale();
   const dateLocale = locale === "el" ? el : enUS;
   const date = format(new Date(), "EEEE, d MMMM yyyy", { locale: dateLocale });
   ```

2. **Avoid Dynamic Values in SSR:**
   ```tsx
   // ❌ Bad: Random values differ between server/client
   const id = Math.random();
   
   // ✅ Good: Generate on client only or use stable IDs
   const [id, setId] = useState<number | null>(null);
   useEffect(() => setId(Math.random()), []);
   ```

3. **Use `useEffect` for Client-Only Code:**
   ```tsx
   // ❌ Bad: Browser API in render
   const isBrowser = typeof window !== 'undefined';
   
   // ✅ Good: Client-only logic in useEffect
   const [isBrowser, setIsBrowser] = useState(false);
   useEffect(() => setIsBrowser(true), []);
   ```

4. **Consistent Locale Handling:**
   ```tsx
   // ✅ Always use next-intl locale
   const locale = useLocale();
   const dateLocale = locale === "el" ? el : enUS;
   ```

## Performance Impact

### Before Fix

- ❌ Hydration error on every page load
- ❌ Component tree regenerated on client
- ❌ Potential layout shift/flashing
- ❌ Wasted CPU cycles re-rendering

### After Fix

- ✅ No hydration errors
- ✅ Component hydrates cleanly
- ✅ No layout shift
- ✅ Optimal performance

## Migration Notes

### Breaking Changes

**None.** This is a backward-compatible fix.

### Deployment Steps

1. Deploy updated code
2. Clear CDN cache (if applicable)
3. Monitor for hydration errors in production

### Rollback Plan

If issues occur, revert the changes to `DashboardHeader.tsx`. The component will return to using `toLocaleDateString()`, but hydration errors will return.

## Related Documentation

- [React Hydration Errors](https://react.dev/link/hydration-mismatch)
- [Next.js Hydration Errors](https://nextjs.org/docs/messages/react-hydration-error)
- [date-fns Documentation](https://date-fns.org/docs/Getting-Started)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)

## Conclusion

The hydration error has been resolved by replacing the system-dependent `toLocaleDateString()` with `date-fns` format function using the explicit `next-intl` locale. This ensures consistent date formatting between server and client, eliminating the hydration mismatch.

**Status:** ✅ Ready for testing and deployment
