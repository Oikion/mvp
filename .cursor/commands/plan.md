Create a comprehensive implementation plan for the requested feature or change.

1. **Restate** the requirements in your own words to confirm understanding
2. **Research** the codebase to find:
   - Existing patterns that apply (similar features, components, actions)
   - Files that will need modification
   - Shared utilities and components that can be reused
3. **Break down** the implementation into phases:
   - Phase 1: Database changes (if any) — Prisma schema, migrations
   - Phase 2: Backend — Server actions, API routes, validation schemas
   - Phase 3: Frontend — Components, hooks, pages
   - Phase 4: Integration — i18n, permissions, testing
4. **List dependencies** and risks:
   - HIGH: Could break existing functionality
   - MEDIUM: Requires careful implementation
   - LOW: Straightforward change
5. **Estimate complexity**: Small (1-3 files), Medium (4-10 files), Large (10+ files)
6. **WAIT FOR CONFIRMATION** before proceeding with implementation

Output the plan in a clear markdown format with file paths and code snippets where helpful.
