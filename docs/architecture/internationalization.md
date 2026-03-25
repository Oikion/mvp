# Internationalization

Oikion uses [next-intl](https://next-intl.dev) for i18n with Next.js App Router.

## Locales

| Locale | Language | URL prefix | Status |
|--------|---------|------------|--------|
| `el` | Greek | none (default) | Primary |
| `en` | English | `/en/...` | Secondary |

Greek is the default locale — Greek URLs have no prefix. English routes are prefixed with `/en`.

## Translation files

```
locales/
├── el/          # Greek (default)
│   ├── common.json
│   ├── crm.json
│   ├── mls.json
│   └── ...
└── en/          # English
    ├── common.json
    ├── crm.json
    ├── mls.json
    └── ...
```

Namespace names match the JSON file names (without extension).

## Usage in components

```typescript
import { useTranslations } from 'next-intl';

function PropertyCard() {
  const t = useTranslations('mls');
  return <h2>{t('propertyStatus.active')}</h2>;
}
```

In server components and actions, use `getTranslations`:

```typescript
import { getTranslations } from 'next-intl/server';

async function ServerComponent() {
  const t = await getTranslations('common');
  return <p>{t('loading')}</p>;
}
```

## Route structure

The App Router uses `app/[locale]/` as the root segment. The middleware in `proxy.ts` handles locale detection and redirects.

All user-facing routes are under `app/[locale]/`. API routes (`app/api/`) are locale-independent.

## Adding new translations

1. Add the key to the English file: `locales/en/{namespace}.json`
2. Add the key to the Greek file: `locales/el/{namespace}.json`
3. Both files must have the same keys — missing keys will fall back to the key string in development

**Never ship UI strings without translations in both locales.** The PR checklist enforces this.

## Dual locale requirement

All user-facing strings must be internationalized. Hard-coded strings in JSX will fail PR review. This applies to:
- Labels, headings, button text
- Error messages and toasts
- Placeholder text and ARIA labels
- Email subject lines and body text (in `actions/`)
