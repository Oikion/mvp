# Type Safety Roadmap

## Overview

This document tracks the TypeScript type safety improvements needed across the codebase. Currently, 50 files use `@ts-nocheck` to bypass TypeScript errors. These files are marked with `// TODO: Fix type errors` comments.

## Status: v1.0.0-pre-release

For the 1.0.0-pre-release, we have prioritized functionality and stability over strict type checking. The `@ts-nocheck` directives allow the application to function correctly while we continue to improve type safety incrementally in future versions.

## Files Requiring Type Fixes

### API Routes (11 files)

#### MLS
- `app/api/mls/properties/route.ts`
- `app/api/mls/properties/[propertyId]/name/route.ts`

#### CRM
- `app/api/crm/clients/[clientId]/name/route.ts`

#### AI
- `app/api/ai/search-clients/route.ts`
- `app/api/ai/connections/draft-birthday/route.ts`
- `app/api/ai/connections/draft-recommendation/route.ts`
- `app/api/ai/matchmaking/client-matches/route.ts`
- `app/api/ai/matchmaking/property-matches/route.ts`

#### Other
- `app/api/deals/route.ts`
- `app/api/export/quick/[entityType]/[entityId]/route.ts`
- `app/api/export/portal/route.ts`
- `app/api/market-intel/scrape/[jobId]/route.ts`
- `app/api/user/preferences/route.ts`
- `app/api/voice/conversation/route.ts`
- `app/api/webhooks/clerk/route.ts`
- `app/api/agent/[slug]/contact/route.ts`

### Components (13 files)

#### UI Components
- `components/ui/aria-live.tsx`
- `components/ui/dialog.tsx`
- `components/ui/toaster.tsx`

#### Feature Components
- `components/ai/AiSuggestionCard.tsx`
- `components/dashboard/WidgetSettingsPanel.tsx`
- `components/linking/LinkEntityDialog.tsx`
- `components/modals/PublishToPortalsModal.tsx`
- `components/nav-user.tsx`
- `components/tags/TagManager.tsx`
- `components/FloatingQuickAddButtons.tsx`
- `components/export/ExportButton.tsx`
- `components/form/AddressFieldGroup.tsx`
- `components/workspace/AgencyOrganizationSwitcher.tsx`
- `components/workspace/ResetWorkspaceDialog.tsx`

### Hooks (3 files)

- `hooks/swr/index.ts`
- `hooks/swr/useMessaging.ts`
- `hooks/swr/useTags.ts`

### Library Files (23 files)

#### AI
- `lib/ai-agents/base-agent.ts`
- `lib/ai-prompts.ts`
- `lib/ai-sdk/providers.ts`
- `lib/ai-sdk/schema-validator.ts`
- `lib/ai-tools/executor.ts`
- `lib/ai-tools/registry.ts`

#### Core
- `lib/dashboard/dashboard-config-provider.tsx`
- `lib/dashboard/widget-registry.ts`
- `lib/documents/text-extractor.ts`
- `lib/export/history.ts`
- `lib/export/portals/home-greek-home.ts`
- `lib/export/portals/spitogatos.ts`
- `lib/external-api-middleware.ts`

#### Market Intelligence
- `lib/market-intel/scraper.ts`

#### Matchmaking
- `lib/matchmaking/normalizers.ts`
- `lib/matchmaking/preference-extractor.ts`
- `lib/matchmaking/calculator.ts`

## Common Type Issues

### 1. Prisma Client Types

**Issue**: Prisma-generated types sometimes conflict with custom type definitions.

**Example**:
```typescript
// Current (with @ts-nocheck)
const property = await prismadb.property.findUnique({
  where: { id },
  include: { /* complex includes */ }
});

// Needs proper typing
const property: PropertyWithRelations = await prismadb.property.findUnique({
  where: { id },
  include: { /* complex includes */ }
});
```

**Solution**: Define proper return types using Prisma's `Prisma.PropertyGetPayload` utility types.

### 2. Next.js Route Handler Types

**Issue**: Request/Response types in API routes need proper typing.

**Example**:
```typescript
// Current (with @ts-nocheck)
export async function POST(req: Request) {
  const body = await req.json();
  // ...
}

// Needs proper typing
export async function POST(
  req: Request,
  context: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  const body: CreatePropertyRequest = await req.json();
  // ...
}
```

**Solution**: Define request/response interfaces and use proper Next.js types.

### 3. React Component Props

**Issue**: Component props lack proper TypeScript interfaces.

**Example**:
```typescript
// Current (with @ts-nocheck)
export function MyComponent({ data, onUpdate }) {
  // ...
}

// Needs proper typing
interface MyComponentProps {
  data: PropertyData;
  onUpdate: (id: string, data: Partial<PropertyData>) => Promise<void>;
}

export function MyComponent({ data, onUpdate }: MyComponentProps) {
  // ...
}
```

**Solution**: Define explicit prop interfaces for all components.

### 4. AI SDK Types

**Issue**: AI SDK streaming and tool execution types need refinement.

**Example**:
```typescript
// Current (with @ts-nocheck)
const result = await generateText({
  model: openai('gpt-4'),
  tools: { /* tools */ }
});

// Needs proper typing
const result: GenerateTextResult<typeof tools> = await generateText({
  model: openai('gpt-4'),
  tools: tools
});
```

**Solution**: Use proper generic types from AI SDK.

### 5. External Library Types

**Issue**: Some external libraries lack proper TypeScript definitions.

**Solution**: 
- Add `@types/*` packages where available
- Create custom type definitions in `types/` directory
- Use module augmentation for missing types

## Improvement Strategy

### Phase 1: Critical API Routes (Priority: High)

Focus on API routes that handle sensitive operations:

1. Authentication routes (`/api/webhooks/clerk/route.ts`)
2. Payment/billing routes (if any)
3. User data routes (`/api/user/preferences/route.ts`)

**Estimated Effort**: 2-3 days

### Phase 2: Core Components (Priority: High)

Fix types in frequently used components:

1. UI components (`components/ui/*`)
2. Navigation components (`components/nav-user.tsx`)
3. Form components (`components/form/*`)

**Estimated Effort**: 3-4 days

### Phase 3: Library Functions (Priority: Medium)

Improve types in shared library code:

1. AI tools and agents (`lib/ai-*`)
2. Export functionality (`lib/export/*`)
3. Matchmaking logic (`lib/matchmaking/*`)

**Estimated Effort**: 4-5 days

### Phase 4: Remaining Files (Priority: Low)

Address remaining type issues:

1. Hooks (`hooks/swr/*`)
2. Specialized components
3. Edge case handlers

**Estimated Effort**: 2-3 days

## Testing Strategy

For each file that gets type fixes:

1. **Remove `@ts-nocheck`**: Remove the directive and see what errors appear
2. **Fix Errors**: Address each TypeScript error systematically
3. **Test Functionality**: Ensure the code still works correctly
4. **Add Tests**: Add unit tests if missing
5. **Document Changes**: Update inline comments if needed

## Guidelines for Contributors

### Before Fixing Types

1. Read the existing code and understand its purpose
2. Check for related type definitions in `types/` directory
3. Review Prisma schema for database types
4. Check if external library types are available

### When Fixing Types

1. Start with the most specific types possible
2. Avoid using `any` - use `unknown` if type is truly unknown
3. Use utility types (`Partial`, `Pick`, `Omit`) when appropriate
4. Document complex types with JSDoc comments
5. Test the changes thoroughly

### After Fixing Types

1. Remove the `// TODO: Fix type errors` comment
2. Remove the `@ts-nocheck` directive
3. Run `pnpm lint` to ensure no new errors
4. Test the functionality manually
5. Update this document to remove the file from the list

## Progress Tracking

### Completed: 0/50 files (0%)

- [ ] Phase 1: 0/16 files
- [ ] Phase 2: 0/13 files
- [ ] Phase 3: 0/17 files
- [ ] Phase 4: 0/4 files

### Target Milestones

- **v1.1.0**: Phase 1 complete (Critical API routes)
- **v1.2.0**: Phase 2 complete (Core components)
- **v1.3.0**: Phase 3 complete (Library functions)
- **v1.4.0**: Phase 4 complete (All files type-safe)

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Next.js TypeScript](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

## Notes

- The `@ts-nocheck` directives are intentional for v1.0.0-pre-release
- These files are fully functional despite type checking being disabled
- Type safety improvements are planned for future releases
- Contributors are welcome to help with type fixes (see CONTRIBUTING.md)

---

**Last Updated**: 2026-02-03 (v1.0.0-pre-release)
