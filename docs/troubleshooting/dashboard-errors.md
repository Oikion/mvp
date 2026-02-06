## Dashboard Error Investigation Guide

### Scope
- Goal: Stabilize dashboard rendering and avoid build/runtime regressions.
- Target areas: dashboard config provider, widget registry, dashboard widgets, build pipeline.

### Findings (Current Session)
- Build failure traced to MapIterator usage in dashboard config code:
  - `lib/dashboard/widget-registry.ts` used a spread on `Map.values()` which requires ES2015 iteration support.
  - `lib/dashboard/dashboard-config-provider.tsx` had a `for...of` directly over `Map.values()`, same issue.
- Build failure traced to activity feed typing:
  - `DashboardContent` passed `recentActivities` with a loose type; `ActivityFeed` expects `ActivityItem[]`.
- Build failure traced to upcoming events typing:
  - `DashboardContent` passed `upcomingEvents` with a loose type; `UpcomingEvents` expects `UpcomingEvent[]`.
- Build warning surfaced in non-dashboard path:
  - `svgo` dynamic dependency warning from `lib/image-compression.ts` → `actions/upload` → `app/api/attachments/upload/route.ts`.
  - This does not block build but indicates a webpack warning that can appear in production builds.
- ESLint configuration missing rule definitions:
  - `@next/next/no-img-element`, `react-hooks/exhaustive-deps` were referenced but not available.

### Env Review (No Secrets)
- `.env` is not present. The build uses `.env.local` as expected.
- `.env.local` includes many sensitive keys. Confirm this file is never committed and secrets are rotated if exposed.
- Required keys for baseline app behavior are present in `.env.local` (Clerk, database URL, Resend).

### Fixes Applied
- Dashboard config iteration now uses `Array.from(map.values())` to avoid ES2015 iteration requirements.
- ESLint flat config updated to include Next.js and React Hooks plugins.
- Typo directory `components/dasboard` removed (unused, no references).
- Dashboard widgets updated to use semantic color tokens (Market Intel + Matchmaking).
- Dashboard activity feed data now typed as `ActivityItem[]` to align with `ActivityFeed`.
- Dashboard upcoming events data now typed as `UpcomingEvent[]` to align with `UpcomingEvents`.

### Remaining Risks / Follow-Ups
- Address the `svgo` dynamic dependency warning if production builds must be warning-free.
- Consider a lint clean-up pass (unused eslint-disable directives and hardcoded colors are warnings).
- If the dashboard still fails at runtime, collect browser console logs and API response failures for dashboard data.

### How to Validate
- Run `pnpm lint` to ensure ESLint config loads and dashboard files are clean.
- Run `pnpm build` after 8–10 file changes to confirm production build stability.
- Smoke test dashboard:
  - Load main dashboard page, ensure widgets render.
  - Open widget settings panel, toggle visibility.
  - Reorder widgets and verify persistence.
