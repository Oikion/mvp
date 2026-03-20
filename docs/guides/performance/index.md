# Performance Guide

## Quick Wins (< 1 hour total)

Apply these before anything else:

1. **Add pagination limits** — add `take: 100` to all `findMany` without explicit limits
2. **Fix serialization** — replace `JSON.parse(JSON.stringify(x))` with `serializePrisma(x)` from `lib/prisma-serialize.ts`
3. **Enable ISR on dashboard** — add `export const revalidate = 60` to `app/[locale]/app/(routes)/page.tsx`
4. **Enable compression** — ensure `compress: true` in `next.config.js`
5. **Add observability** — `@vercel/analytics` + `@vercel/speed-insights` in root layout

Expected: 10–15% immediate improvement with no risk.

## Performance Targets

| Metric | Target |
|--------|--------|
| Dashboard load | < 1.5s |
| Client/property list (100 rows) | < 200ms |
| DB query (indexed) | < 50ms |
| Client JS bundle | < 500KB |
| Error rate | < 0.1% |

## Phased Approach

### Phase 1 — Critical (Week 1, 2–3 days)

Impact: 50–70% query improvement. Requires DB migrations.

| Task | File(s) | Time | Impact |
|------|---------|------|--------|
| [Connection pooling](./connection-pooling.md) | `lib/prisma.ts` | 2–3h | High |
| [Database indexes](./database-indexes.md) | `prisma/schema.prisma` | 3–4h | Very High |
| [N+1 queries](./n-plus-1-queries.md) | `actions/crm/`, `actions/mls/` | 4–6h | Very High |
| [Data serialization](./data-serialization.md) | `actions/**/*.ts` | 2–3h | Medium |

Security: see [Credential Rotation](../../operations/credential-rotation.md) — do this first.

### Phase 2 — High Priority (Week 2–3)

- Structured logging (`pino`)
- Dashboard caching (Redis/Vercel KV)
- Rate limiting tuning
- Slow query monitoring
- Bundle optimization

### Phase 3 — Medium Term (Month 1)

- Redis caching layer
- Incremental Static Regeneration
- Vercel Analytics / Speed Insights dashboards
- Image optimization (`next/image`)
- Error tracking (Sentry)

## React & Frontend Optimization

See [React Optimization Reference](./react-optimization.md) for 50 rules covering:
- Eliminating waterfalls (CRITICAL)
- Bundle size (CRITICAL)
- Server-side performance (HIGH)
- Client-side data fetching
- Re-render optimization
- Rendering performance
- JavaScript performance
- Advanced patterns

## Development Server Optimization

Active optimizations in this project:

- **Turbopack** — default bundler (`pnpm dev`), 2–10x faster HMR than webpack
- **File system cache** — `turbopackFileSystemCacheForDev: true` in `next.config.js`; cache at `.next/dev/cache/turbopack/`
- **`optimizePackageImports`** — all Radix UI, `lucide-react`, `date-fns`, `recharts` (production builds only)
- **pnpm store** — `~/.pnpm-store` (outside repo) to keep watchers fast

Fallback if Turbopack has issues: `pnpm dev:webpack`

Clear cache if dev server behaves unexpectedly: `pnpm clean:next`

## Testing Strategy

Before starting: baseline with Lighthouse, Prisma Studio, Chrome DevTools, bundle analyzer.
After each phase: re-run and compare. Never deploy optimizations directly to production.
