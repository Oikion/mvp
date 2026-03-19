# Cypress E2E Testing Conventions

This file applies whenever you are working in `cypress/`.

## Test Framework

- **Framework**: Cypress
- **Config file**: `cypress.config.ts`
- **Base URL**: `http://localhost:3000/`
- **Component testing**: Cypress Component Testing with Next.js webpack bundler
- **CI**: GitHub Actions (`.github/workflows/cypress.yml`)

## Directory Structure

```
cypress/
  e2e/                    # E2E test specs
    1-getting-started/    # Basic smoke tests
    2-nextcrm-basic/      # Feature-level tests
  fixtures/               # Test data (JSON files)
  support/
    commands.ts           # Custom Cypress commands
    component.ts          # Component test setup
    e2e.ts               # E2E test setup (runs before all tests)
```

## E2E Test Pattern

```typescript
describe("Feature Name", () => {
  beforeEach(() => {
    // Login, seed data, and navigate before each test
    cy.visit("/el/app/feature");
  });

  it("should perform the expected behavior", () => {
    // Arrange
    cy.get("[data-testid='create-button']").click();

    // Act
    cy.get("[data-testid='name-input']").type("Test Name");
    cy.get("[data-testid='submit-button']").click();

    // Assert
    cy.contains("Test Name").should("be.visible");
  });

  afterEach(() => {
    // Clean up test data created during the test
  });
});
```

## Conventions

- **Selectors**: Use `data-testid` attributes — not CSS classes, element text, or positional selectors
- **Behavior**: Test user-visible behavior, not implementation details
- **Independence**: Each test must be independent — never rely on test execution order or shared state between `it()` blocks
- **Cleanup**: Clean up test data in `afterEach` or use a dedicated seeding/teardown approach
- **Locales**: Test both Greek (`/el/`) and English (`/en/`) locale paths when testing i18n-sensitive features

## Multi-Tenant Test Considerations

- Tests must use a dedicated test organization — never run against production data
- Verify data isolation: create data under one org, confirm it does not appear when authenticated as a different org
- Test all permission levels where relevant: `ORG_OWNER`, `ADMIN`, `AGENT`, `VIEWER`
- Use fixtures in `cypress/fixtures/` to define repeatable test organizations and users

## CI Integration

Tests run automatically on pull requests via GitHub Actions:

- **PostgreSQL**: A service container provides the test database
- **Migrations**: `pnpm db:deploy` runs before tests to apply pending migrations
- **Parallel runs**: Tests are split across runners for speed
- **Artifacts**: Screenshots and videos are saved as CI artifacts on failure for debugging

## Adding data-testid Attributes

When creating or modifying UI components, add `data-testid` to all interactive elements:

```tsx
// Buttons
<Button data-testid="create-client-button">Create Client</Button>

// Inputs
<Input data-testid="client-name-input" />

// Form containers
<form data-testid="new-client-form">

// List items
<div data-testid={`client-row-${client.id}`}>
```

Convention: `{noun}-{action}` for buttons (`create-client-button`, `delete-property-button`), `{noun}-{field}` for inputs (`client-name-input`, `property-price-input`).

## What to Test

**Critical paths (always cover):**
- Login flow and redirect to the correct locale path
- Create / edit / delete for primary entities (clients, properties, mandates)
- Navigation between main sections

**Permission boundaries:**
- VIEWERs cannot see create/edit/delete controls
- AGENTs cannot delete entities they do not own
- Unauthorized direct URL access returns 403 or redirects

**Tenant isolation:**
- Data created by org A is not visible when logged in as org B

**Form validation:**
- Required fields show error messages when submitted empty
- Invalid input (e.g. non-numeric price) is rejected with a visible error

**Error states:**
- Not-found pages render correctly
- Network error during submit shows a toast or inline error

## Anti-Patterns

- NEVER use CSS class selectors or text-based selectors — use `data-testid` only
- NEVER write tests that depend on other tests running first
- NEVER hardcode locale-specific strings as expected text — assert on `data-testid` visibility instead
- NEVER skip the `afterEach` cleanup when tests create database records
