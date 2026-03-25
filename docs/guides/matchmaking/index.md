# Matchmaking Guide

Cross-organization property and mandate matching via Polis.

> Content to be developed. This stub covers key code paths and conventions.

## Overview

The matchmaking system connects:
- **Intra-org matching** — mandates against properties within the same organization
- **Cross-org matching (Polis)** — bilateral matching between two organizations that have connected via Polis
- **Match results** — stored as `CrossOrgMatch` records, surfaced in the Sharing Hub

## Key Code Paths

| Area | Path |
|------|------|
| Matching logic | `lib/matchmaking/` |
| Match actions | `actions/matchmaking/` |
| Page routes | `app/[locale]/app/(routes)/matchmaking/` |
| Cross-org model | `CrossOrgMatch` in `prisma/schema.prisma` |

## Matching Rules

Only items with `visibility !== 'HIDDEN'` participate in matching. The visibility filter is applied in `lib/matchmaking/` fetch helpers:

```typescript
// fetchActiveMandates() and fetchActiveProperties() both use:
where: { organizationId, visibility: { not: 'HIDDEN' } }
```

Cross-org Polis matching additionally requires `visibility === 'SECURE'` or `'PUBLIC'`.

## Visibility Impact on Matching

| Visibility | Intra-org matching | Polis cross-org |
|------------|-------------------|-----------------|
| HIDDEN | No | No |
| PRIVATE | Yes | No |
| SECURE | Yes | Yes |
| PUBLIC | Yes | Yes |

## CrossOrgMatch Lifecycle

When a property or mandate is downgraded to `HIDDEN` or `PRIVATE`, existing `CrossOrgMatch` rows are deleted atomically in a `$transaction`:

```typescript
// lib/import/ — update-property-visibility.ts / update-mandate-visibility.ts
await prismadb.$transaction([
  prismadb.property.update({ where: { id }, data: { visibility } }),
  prismadb.crossOrgMatch.deleteMany({
    where: { OR: [{ propertyId: id }, { mandateId: id }] }
  })
])
```

## Match Score

Match score is computed in `lib/matchmaking/` based on: location, price range, property type, size, and mandate requirements. See source for exact weights.

## Related

- [MLS Guide](../mls/index.md) — property visibility settings
- [CRM Guide](../crm/index.md) — mandate management
- Polis settings: `app/[locale]/app/(routes)/settings/polis/`
