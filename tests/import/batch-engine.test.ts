/**
 * tests/import/batch-engine.test.ts
 *
 * Verifies the batch import engine: transaction wrapping, createMany calls,
 * typed result arrays, junction link creation, and assignedTo propagation.
 *
 * All DB and encryption dependencies are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ValidatedRow } from "@/lib/import/validation-engine";

// ---------------------------------------------------------------------------
// Mocks — vi.mock factories are hoisted, so they must not reference
// variables declared at module scope. We use vi.hoisted() instead.
// ---------------------------------------------------------------------------

const {
  mockCreateMany,
  mockFindMany,
  mockTransaction,
} = vi.hoisted(() => {
  const mockCreateMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockFindMany = vi.fn().mockResolvedValue([]);

  const mockTransaction = vi.fn(
    async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) => {
      const tx = {
        contact: {
          createMany: mockCreateMany,
          findMany: mockFindMany,
        },
        properties: {
          createMany: mockCreateMany,
          findMany: mockFindMany,
        },
        request: {
          createMany: mockCreateMany,
          findMany: mockFindMany,
        },
        contactProperty: {
          createMany: mockCreateMany,
        },
        mandate_Properties: {
          createMany: mockCreateMany,
        },
        requestContact: {
          createMany: mockCreateMany,
        },
        $queryRaw: vi.fn().mockResolvedValue([{ lastValue: 10 }]),
      };
      return fn(tx);
    },
  );

  return { mockCreateMany, mockFindMany, mockTransaction };
});

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    $transaction: mockTransaction,
    $queryRaw: vi.fn().mockResolvedValue([{ lastValue: 50 }]),
  },
}));

vi.mock("@/lib/key-management", () => ({
  getOrgDek: vi.fn().mockResolvedValue(Buffer.alloc(32, 0xaa)),
}));

vi.mock("@/lib/encryption", () => ({
  encryptWithKey: vi.fn(
    (value: string) => `encrypted:${value}`,
  ),
  isEncrypted: vi.fn(() => false),
}));

vi.mock("@/lib/model-encryption", () => ({
  encryptJsonWithKey: vi.fn(
    (value: unknown) => `encrypted_json:${JSON.stringify(value)}`,
  ),
}));

vi.mock("@/lib/friendly-id", () => ({
  generateFriendlyIds: vi.fn(
    (_prisma: unknown, entityType: string, count: number, _orgId: string) => {
      const prefix =
        entityType === "Contact"
          ? "cnt"
          : entityType === "Properties"
            ? "prp"
            : "req";
      return Array.from({ length: count }, (_, i) =>
        `${prefix}-${String(i + 1).padStart(6, "0")}`,
      );
    },
  ),
}));

// Mock crypto.randomUUID to return predictable values
let uuidCounter = 0;
const origCrypto = globalThis.crypto;
vi.stubGlobal("crypto", {
  ...origCrypto,
  randomUUID: () => {
    uuidCounter++;
    return `uuid-${String(uuidCounter).padStart(4, "0")}`;
  },
});

// Import after mocks are established
const { executeBatchImport } = await import("@/lib/import/unified-engine");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidatedRow(
  overrides: Partial<ValidatedRow>,
): ValidatedRow {
  return {
    rowIndex: 0,
    contactRow: null,
    propertyRow: null,
    requestRow: null,
    hasContact: false,
    hasProperty: false,
    hasRequest: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeBatchImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;

    // Reset createMany to return a count
    mockCreateMany.mockResolvedValue({ count: 0 });

    // Reset findMany to return records matching the UUIDs passed in
    mockFindMany.mockImplementation(
      async (args: { where: { id: { in: string[] } } }) => {
        const ids = args?.where?.id?.in ?? [];
        return ids.map((id: string, i: number) => ({
          id,
          friendlyId: `fid-${String(i + 1).padStart(6, "0")}`,
        }));
      },
    );
  });

  // ---- 1. Transaction is called exactly once ----

  it("calls $transaction exactly once", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasContact: true,
        contactRow:{ contact_name: "Alice", contact_type: "BUYER" },
        contactDedupKey:"name:alice",
      }),
    ];

    await executeBatchImport(rows, "org-1", "user-1");

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  // ---- 2. createMany called for each entity type ----

  it("calls createMany for contacts, properties, and requests", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasContact: true,
        hasProperty: true,
        hasRequest: true,
        contactRow:{ contact_name: "Alice", contact_type: "BUYER" },
        propertyRow: { property_name: "Villa Test", property_type: "HOUSE" },
        requestRow:{
          transaction_type: "SALE",
          title: "Buy House",
          budget_min: 100000,
        },
        contactDedupKey:"name:alice",
        propertyDedupKey: "name:villa test",
      }),
    ];

    await executeBatchImport(rows, "org-1", "user-1");

    // createMany should be called at least 3 times (contacts, properties, requests)
    // plus junction tables
    expect(mockCreateMany.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  // ---- 3. Result has typed arrays with uuid and friendlyId ----

  it("returns typed result with uuid and friendlyId arrays", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasContact: true,
        contactRow:{ client_name: "Bob" },
        contactDedupKey:"name:bob",
      }),
    ];

    const result = await executeBatchImport(rows, "org-1", "user-1");

    expect(result).toHaveProperty("contacts");
    expect(result).toHaveProperty("properties");
    expect(result).toHaveProperty("requests");
    expect(result).toHaveProperty("linkCounts");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("skippedCount");

    // Contacts should have entries with uuid and friendlyId
    expect(result.contacts.length).toBeGreaterThan(0);
    expect(result.contacts[0]).toHaveProperty("uuid");
    expect(result.contacts[0]).toHaveProperty("friendlyId");
  });

  // ---- 4. Junction links are created ----

  it("creates junction links for contact-property, request-property, and request-contact", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasContact: true,
        hasProperty: true,
        hasRequest: true,
        contactRow:{ client_name: "Carol" },
        propertyRow: { property_name: "Beach House" },
        requestRow:{
          transaction_type: "SALE",
          title: "Buy Beach House",
        },
        contactDedupKey:"name:carol",
        propertyDedupKey: "name:beach house",
      }),
    ];

    const result = await executeBatchImport(rows, "org-1", "user-1");

    // The link counts should reflect the created links
    expect(result.linkCounts.contactProperty).toBe(1);
    expect(result.linkCounts.requestProperty).toBe(1);
    expect(result.linkCounts.requestContact).toBe(1);
  });

  // ---- 5. assignedTo is applied to created entities ----

  it("applies assignedTo to contact, property, and request data", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasContact: true,
        hasProperty: true,
        contactRow:{ client_name: "Dave" },
        propertyRow: { property_name: "Mountain Cabin" },
        contactDedupKey:"name:dave",
        propertyDedupKey: "name:mountain cabin",
      }),
    ];

    await executeBatchImport(rows, "org-1", "user-1", "agent-42");

    // Verify createMany was called with data containing assigned_to
    const createManyCalls = mockCreateMany.mock.calls;
    // Find a createMany call whose data array contains assigned_to
    const callWithAssignedTo = createManyCalls.find(
      (call: unknown[]) => {
        const arg = call[0] as { data: Array<Record<string, unknown>> };
        return arg?.data?.some(
          (d: Record<string, unknown>) => d.assigned_to === "agent-42",
        );
      },
    );

    expect(callWithAssignedTo).toBeDefined();
  });

  // ---- 6. Client deduplication reuses UUIDs ----

  it("deduplicates contacts with the same dedupKey", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasContact: true,
        hasProperty: true,
        contactRow:{ client_name: "Eve" },
        propertyRow: { property_name: "Prop A" },
        contactDedupKey:"name:eve",
        propertyDedupKey: "name:prop a",
      }),
      makeValidatedRow({
        rowIndex: 1,
        hasContact: true,
        hasProperty: true,
        contactRow:{ client_name: "Eve" },
        propertyRow: { property_name: "Prop B" },
        contactDedupKey:"name:eve",
        propertyDedupKey: "name:prop b",
      }),
    ];

    const result = await executeBatchImport(rows, "org-1", "user-1");

    // Only one unique contact should be created
    expect(result.contacts).toHaveLength(1);
    // But two properties
    expect(result.properties).toHaveLength(2);
  });

  // ---- 7. Empty rows produce empty result ----

  it("returns empty result for empty input", async () => {
    const result = await executeBatchImport([], "org-1", "user-1");

    expect(result.contacts).toHaveLength(0);
    expect(result.properties).toHaveLength(0);
    expect(result.requests).toHaveLength(0);
    expect(result.linkCounts.contactProperty).toBe(0);
    expect(result.linkCounts.requestProperty).toBe(0);
    expect(result.linkCounts.requestContact).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.skippedCount).toBe(0);
    // $transaction should NOT be called for empty input
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // ---- 8. Rows with no entities are counted as skipped ----

  it("counts rows with no entities as skipped", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasContact: false,
        hasProperty: false,
        hasRequest: false,
      }),
      makeValidatedRow({
        rowIndex: 1,
        hasContact: false,
        hasProperty: false,
        hasRequest: false,
      }),
    ];

    const result = await executeBatchImport(rows, "org-1", "user-1");

    expect(result.skippedCount).toBe(2);
  });

  // ---- 9. Property deduplication ----

  it("deduplicates properties with the same dedupKey", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasProperty: true,
        propertyRow: { property_name: "Same Place" },
        propertyDedupKey: "name:same place",
      }),
      makeValidatedRow({
        rowIndex: 1,
        hasProperty: true,
        propertyRow: { property_name: "Same Place Copy" },
        propertyDedupKey: "name:same place",
      }),
    ];

    const result = await executeBatchImport(rows, "org-1", "user-1");

    // Only one unique property should be created
    expect(result.properties).toHaveLength(1);
  });

  // ---- 10. Transaction receives 15s timeout option ----

  it("passes 15000ms timeout to $transaction", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasContact: true,
        contactRow:{ contact_name: "Timeout Test" },
        contactDedupKey:"name:timeout test",
      }),
    ];

    await executeBatchImport(rows, "org-1", "user-1");

    expect(mockTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 15000 },
    );
  });

  // ---- 11. Greek space-formatted budget numbers are coerced correctly ----

  it("handles Greek space-formatted budget numbers in requestRow", async () => {
    // zOptionalPositiveNumber preprocessor strips whitespace before parsing,
    // so "1 500 000" (Greek thousands separator) should be accepted as 1500000.
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasRequest: true,
        requestRow: {
          transaction_type: "SALE",
          title: "Formatted Budget Test",
          budget_min: "1 500 000",
        },
      }),
    ];

    // Should not throw — coerceOptionalNumber strips whitespace before coercion
    const result = await executeBatchImport(rows, "org-1", "user-1");

    expect(result.requests).toHaveLength(1);
  });
});
