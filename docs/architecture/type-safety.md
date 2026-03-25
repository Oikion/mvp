# Type Safety

## Current status

50 files use `@ts-nocheck` for the v1.0.0-pre-release. All are functional — type safety improvements are planned for v1.1–v1.4.

## Common issues

### 1. Prisma return types

Use `Prisma.PropertyGetPayload` utility types instead of loose types:

```typescript
import { Prisma } from "@prisma/client";

type PropertyWithMandates = Prisma.PropertyGetPayload<{
  include: { mandates: true }
}>;
```

### 2. Next.js route handler types

```typescript
export async function POST(
  req: Request,
  context: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  const body: CreatePropertyRequest = await req.json();
}
```

### 3. React component props

Always define explicit interfaces:

```typescript
interface PropertyCardProps {
  property: PropertyWithMandates;
  onUpdate: (id: string, data: Partial<PropertyData>) => Promise<void>;
}
```

### 4. AI SDK generics

```typescript
const result: GenerateTextResult<typeof tools> = await generateText({
  model: openai('gpt-4'),
  tools
});
```

## Files requiring fixes

### API Routes (16 files)

- `app/api/mls/properties/route.ts`
- `app/api/mls/properties/[propertyId]/name/route.ts`
- `app/api/crm/clients/[clientId]/name/route.ts`
- `app/api/ai/search-clients/route.ts`
- `app/api/ai/connections/draft-birthday/route.ts`
- `app/api/ai/connections/draft-recommendation/route.ts`
- `app/api/ai/matchmaking/client-matches/route.ts`
- `app/api/ai/matchmaking/property-matches/route.ts`
- `app/api/deals/route.ts`
- `app/api/export/quick/[entityType]/[entityId]/route.ts`
- `app/api/export/portal/route.ts`
- `app/api/market-intel/scrape/[jobId]/route.ts`
- `app/api/user/preferences/route.ts`
- `app/api/voice/conversation/route.ts`
- `app/api/webhooks/clerk/route.ts`
- `app/api/agent/[slug]/contact/route.ts`

### Components (13 files)

`components/ui/aria-live.tsx`, `components/ui/dialog.tsx`, `components/ui/toaster.tsx`, `components/ai/AiSuggestionCard.tsx`, `components/dashboard/WidgetSettingsPanel.tsx`, `components/linking/LinkEntityDialog.tsx`, `components/modals/PublishToPortalsModal.tsx`, `components/nav-user.tsx`, `components/tags/TagManager.tsx`, `components/FloatingQuickAddButtons.tsx`, `components/export/ExportButton.tsx`, `components/form/AddressFieldGroup.tsx`, `components/workspace/AgencyOrganizationSwitcher.tsx`

### Hooks (3 files)

`hooks/swr/index.ts`, `hooks/swr/useMessaging.ts`, `hooks/swr/useTags.ts`

### Library files (23 files)

AI: `lib/ai-agents/base-agent.ts`, `lib/ai-prompts.ts`, `lib/ai-sdk/providers.ts`, `lib/ai-sdk/schema-validator.ts`, `lib/ai-tools/executor.ts`, `lib/ai-tools/registry.ts`

Core: `lib/dashboard/dashboard-config-provider.tsx`, `lib/dashboard/widget-registry.ts`, `lib/documents/text-extractor.ts`, `lib/export/history.ts`, `lib/export/portals/home-greek-home.ts`, `lib/export/portals/spitogatos.ts`, `lib/external-api-middleware.ts`, `lib/market-intel/scraper.ts`

Matchmaking: `lib/matchmaking/normalizers.ts`, `lib/matchmaking/preference-extractor.ts`, `lib/matchmaking/calculator.ts`

## Fix workflow

For each file:

1. Remove `@ts-nocheck` — observe errors
2. Fix each error (prefer `unknown` over `any`)
3. Run `pnpm lint` — no new warnings
4. Test functionality manually
5. Remove the `// TODO: Fix type errors` comment
6. Update this list

## Milestones

| Version | Target |
|---------|--------|
| v1.1.0 | Phase 1: Critical API routes (16 files) |
| v1.2.0 | Phase 2: Core components (13 files) |
| v1.3.0 | Phase 3: Library functions (17 files) |
| v1.4.0 | Phase 4: Hooks and remaining (4 files) |
