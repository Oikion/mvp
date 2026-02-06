# TDD Workflow for Oikion

Test-Driven Development adapted for the Oikion SaaS stack: Next.js 16, Cypress, Prisma 6, Clerk auth.

## When to Use

- Implementing new features with clear acceptance criteria
- Fixing bugs where the expected behavior is well-defined
- Refactoring code that needs safety nets

## Red-Green-Refactor Cycle

### Phase 1: RED (Write Failing Tests)

Write Cypress tests that describe the expected behavior BEFORE writing implementation code.

```typescript
// cypress/e2e/crm/create-client.cy.ts
describe("Create Client", () => {
  beforeEach(() => {
    cy.loginAs("agent"); // Custom command for auth
    cy.visit("/el/app/crm/clients");
  });

  it("should create a new client with required fields", () => {
    cy.get("[data-testid='create-client-button']").click();
    cy.get("[data-testid='client-name-input']").type("Test Client");
    cy.get("[data-testid='client-email-input']").type("test@example.com");
    cy.get("[data-testid='submit-button']").click();
    cy.contains("Test Client").should("be.visible");
  });

  it("should show validation errors for missing required fields", () => {
    cy.get("[data-testid='create-client-button']").click();
    cy.get("[data-testid='submit-button']").click();
    cy.get("[data-testid='error-message']").should("be.visible");
  });
});
```

Rules for RED phase:
- Write tests based on requirements, NOT implementation
- Tests MUST fail (verify they fail before proceeding)
- Include positive and negative test cases
- Add `data-testid` attributes as you define tests
- DO NOT write any implementation code yet

### Phase 2: GREEN (Make Tests Pass)

Write the minimum code to make all tests pass.

```
Implementation order:
1. Prisma schema (if new model needed)
2. Zod validation schema
3. Server action with permission guard + org isolation
4. API route (if needed for SWR)
5. SWR hook (if client-side data needed)
6. UI components
```

Rules for GREEN phase:
- Write the simplest code that makes tests pass
- DO NOT modify tests during this phase
- DO NOT optimize or refactor yet
- Run tests after every significant change
- Commit when all tests are green

### Phase 3: REFACTOR (Improve Quality)

Clean up the implementation while keeping all tests green.

Refactoring checklist:
- [ ] Extract shared logic into utilities or hooks
- [ ] Ensure tenant isolation is correct
- [ ] Add proper error handling
- [ ] Add i18n translations (both `el` and `en`)
- [ ] Follow design system patterns
- [ ] Remove duplication
- [ ] Add missing permission checks
- [ ] Run the verification loop skill

Rules for REFACTOR phase:
- Tests MUST stay green throughout
- Run tests after each refactoring step
- If a test breaks, undo the refactoring and try a different approach

## Git Strategy

```
feat: add failing tests for client creation (RED)
feat: implement client creation (GREEN)
refactor: clean up client creation (REFACTOR)
```

Commit at each phase boundary with descriptive Conventional Commit messages.

## Multi-Tenant Testing

When testing tenant isolation:
1. Create test data for Organization A
2. Switch context to Organization B
3. Verify Organization B cannot see Organization A's data
4. Verify API returns 404 (not 403) to prevent information leakage
