# Unit Testing Conventions

This file applies whenever you are working in `tests/`.

## Test Framework

- **Unit tests**: Vitest (see `vitest.config.ts` or `package.json` for configuration)
- **E2E tests**: Cypress — see `cypress/CLAUDE.md` for E2E conventions
- **CI**: GitHub Actions (`.github/workflows/`)

## Test File Conventions

- Test files live alongside the code they test, or in `tests/` for shared utilities
- File naming: `{name}.test.ts` or `{name}.spec.ts`
- Test behavior, not implementation details — if the implementation changes but behavior stays the same, tests should still pass

## What to Test

**Critical paths (always test):**
- Business logic in server actions (`actions/`)
- Permission enforcement — verify that lower roles cannot perform higher-privilege operations
- Tenant isolation — verify that `organizationId` filtering prevents cross-org data access
- Zod validation schemas in `lib/validations/`
- Encryption/decryption in `lib/model-encryption.ts` and `lib/encryption.ts`
- Error states and edge cases

**Permission boundary tests:**
- VIEWERs cannot create or edit
- AGENTs cannot delete entities owned by other agents
- Only ORG_OWNERs and ADMINs can manage members

**Tenant isolation tests:**
- A query scoped to `orgA` must never return data belonging to `orgB`
- Verify that all Prisma queries include `organizationId` in the `where` clause

## Test Conventions

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("createClient", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it("should return an error when the user lacks permission", async () => {
    // Arrange
    const mockAuth = vi.fn().mockResolvedValue({ userId: "user_1", orgRole: "viewer" });

    // Act
    const result = await createClient({ name: "Test" });

    // Assert
    expect(result.error).toBeDefined();
    expect(result.error).toContain("permission");
  });

  it("should isolate data by organizationId", async () => {
    // Verify that the Prisma call includes organizationId in where clause
  });
});
```

## Multi-Tenant Test Considerations

- Use distinct mock `organizationId` values for each tenant in a test (e.g. `"org_a"`, `"org_b"`)
- Mock `auth()` from Clerk to return a specific `orgId` — do not call real Clerk APIs in unit tests
- Verify that data created under `org_a` cannot be retrieved with `org_b`'s context
- Test that `organizationId` is always passed through to Prisma `where` clauses

## Mocking Prisma

```typescript
import { vi } from "vitest";

// Mock the prismadb singleton
vi.mock("@/lib/prisma", () => ({
  prismadb: {
    client: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));
```

## Mocking Clerk Auth

```typescript
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: "user_test_123",
    orgId: "org_test_abc",
    orgRole: "org:admin",
  }),
}));
```

## Anti-Patterns

- NEVER write tests that depend on test execution order
- NEVER make real database or network calls in unit tests — mock all external dependencies
- NEVER test internal implementation details (private functions, internal state)
- NEVER skip testing permission boundaries — they are security-critical
- NEVER write a test without an assertion
