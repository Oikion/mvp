# Internationalization (next-intl)

This file applies whenever you are working in `locales/` or any `app/[locale]/` route.

## Locale Configuration

- **Default locale**: Greek (`el`)
- **Available locales**: `el` (Greek), `en` (English)
- **Config file**: `i18n.ts` (loads all translation files statically)
- **Translation files**: `locales/el/*.json` and `locales/en/*.json`

## CRITICAL: Dual Locale Requirement

When adding or modifying any user-facing string, you MUST update both locale files:

1. Add the key to `locales/el/{namespace}.json` (Greek — primary)
2. Add the key to `locales/en/{namespace}.json` (English — secondary)

Both files MUST have identical key structures. Missing keys cause runtime errors in production.

## Usage in Server Components (preferred — zero client-side bundle cost)

```typescript
import { useTranslations } from "next-intl";

export default function PropertyList() {
  const t = useTranslations("mls");
  return <h1>{t("properties.title")}</h1>;
}
```

Messages stay on the server — no JavaScript bundle cost. Use Server Components for i18n whenever possible.

## Usage in Client Components

```typescript
"use client";
import { useTranslations } from "next-intl";

export function SearchBar() {
  const t = useTranslations("common");
  return <input placeholder={t("search.placeholder")} />;
}
```

## Usage in Server Actions and Route Handlers

```typescript
import { getTranslations } from "next-intl/server";

export async function createClient(data: ClientData) {
  const t = await getTranslations("crm");
  // Use t("client.created") for success messages, t("client.error") for errors
}
```

## Namespace Convention

Namespace names match JSON filenames exactly:

| useTranslations call | File loaded |
|----------------------|-------------|
| `useTranslations("common")` | `locales/el/common.json` |
| `useTranslations("crm")` | `locales/el/crm.json` |
| `useTranslations("mls")` | `locales/el/mls.json` |
| `useTranslations("admin")` | `locales/el/admin.json` |
| `useTranslations("validation")` | `locales/el/validation.json` |

The `el` or `en` directory is selected automatically based on the active locale.

## Translation Key Naming

Use dot-separated, descriptive keys structured as `{feature}.{entity}.{context}.{field}`:

```json
{
  "client": {
    "form": {
      "firstName": "Όνομα",
      "lastName": "Επίθετο"
    },
    "status": {
      "active": "Ενεργός",
      "archived": "Αρχειοθετημένος"
    }
  }
}
```

- Keep keys readable: `mls.property.status.forSale` not `mls.p.s.fs`
- Group by feature first, then entity, then context, then field

## Formatting Dates, Numbers, and Currency

Use `useFormatter()` from next-intl — never native JS formatting methods:

```typescript
import { useFormatter } from "next-intl";

function PriceDisplay({ price, date }: { price: number; date: Date }) {
  const format = useFormatter();
  return (
    <>
      <p>{format.number(price, { style: "currency", currency: "EUR" })}</p>
      <p>{format.dateTime(date, { dateStyle: "medium" })}</p>
    </>
  );
}
```

## Pluralization

Use ICU message format for pluralization — never string concatenation:

```json
{
  "results": "{count, plural, one {# αποτέλεσμα} other {# αποτελέσματα}}"
}
```

```typescript
t("results", { count: properties.length })
```

## Route Structure

Routes are locale-prefixed: `/el/app/dashboard`, `/en/app/dashboard`

- The locale segment is extracted from the URL by `proxy.ts` middleware (NOT `middleware.ts`)
- next-intl provides the active locale to all components via its provider in the layout
- When writing test URLs or links, always include the locale prefix

## Adding a New Namespace — Checklist

When creating a new translation namespace (e.g. `contacts`), **all five steps** are required or the namespace will silently fail at runtime or drift between server/client:

1. **Create both JSON files** — `locales/en/{name}.json` and `locales/el/{name}.json` with identical key structure
2. **Register in `i18n.ts`** — add static imports for both locales (`import {name}En from "./locales/en/{name}.json"` and `…El`), then assign `messages.{name} = {name}El` / `{name}En` in both branches of `loadMessages()`
3. **Register in `app/[locale]/layout.tsx`** — add static imports for both locales, then assign `messages.{name} = …` in both branches of `getLocales()`
4. **Add to `messages.d.ts`** — import the English JSON as a type, add `{name}: typeof {name}En` to the `AppMessages` type so `useTranslations("{name}")` is type-checked
5. **Verify** — run `pnpm build` (or `npx tsc --noEmit`) to confirm no missing-key type errors

> **Why two registration files?** `i18n.ts` feeds server-side rendering (`getTranslations`, RSC). `layout.tsx` feeds the `NextIntlClientProvider` for client components (`useTranslations`). If a namespace is in one but not the other, translations work on the server but fail on the client (or vice versa).

### Current Known Namespace Drift

The following JSON files exist on disk but are **not yet registered** in both `i18n.ts` and `layout.tsx`:
`achievements`, `ai`, `assignments`, `trust-score`, `wizard`

These should be registered when first used, or removed if unused.

## Anti-Patterns

- NEVER hardcode Greek or English strings directly in components — always use `t()`
- NEVER use `date.toLocaleDateString()` or `Intl.NumberFormat` — use next-intl `useFormatter()`
- NEVER create a new namespace JSON file in `el/` without creating the matching file in `en/` (and vice versa)
- NEVER use string concatenation to build translated sentences — use ICU message format with named variables
- NEVER call `useTranslations` in a Server Action — use `getTranslations` from `next-intl/server` instead
