/**
 * tests/import/batch-engine.test.ts
 *
 * Verifies the batch import engine: transaction wrapping, createMany calls,
 * typed result arrays, junction link creation, and assignedTo propagation.
 *
 * All DB and encryption dependencies are mocked.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
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
        clients: {
          createMany: mockCreateMany,
          findMany: mockFindMany,
        },
        properties: {
          createMany: mockCreateMany,
          findMany: mockFindMany,
        },
        mandate: {
          createMany: mockCreateMany,
          findMany: mockFindMany,
        },
        client_Properties: {
          createMany: mockCreateMany,
        },
        mandate_Properties: {
          createMany: mockCreateMany,
        },
        mandate_Clients: {
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
        entityType === "Clients"
          ? "clt"
          : entityType === "Properties"
            ? "prp"
            : "mnd";
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
let executeBatchImport: typeof import("@/lib/import/unified-engine").executeBatchImport;
beforeAll(async () => {
  ({ executeBatchImport } = await import("@/lib/import/unified-engine"));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidatedRow(
  overrides: Partial<ValidatedRow>,
): ValidatedRow {
  return {
    rowIndex: 0,
    clientRow: null,
    propertyRow: null,
    mandateRow: null,
    hasClient: false,
    hasProperty: false,
    hasMandate: false,
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
        hasClient: true,
        clientRow: { client_name: "Alice", client_type: "BUYER" },
        clientDedupKey: "name:alice",
      }),
    ];

    await executeBatchImport(rows, "org-1", "user-1");

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  // ---- 2. createMany called for each entity type ----

  it("calls createMany for clients, properties, and mandates", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasClient: true,
        hasProperty: true,
        hasMandate: true,
        clientRow: { client_name: "Alice", client_type: "BUYER" },
        propertyRow: { property_name: "Villa Test", property_type: "HOUSE" },
        mandateRow: {
          transaction_type: "SALE",
          title: "Buy House",
          budget_min: 100000,
        },
        clientDedupKey: "name:alice",
        propertyDedupKey: "name:villa test",
      }),
    ];

    await executeBatchImport(rows, "org-1", "user-1");

    // createMany should be called at least 3 times (clients, properties, mandates)
    // plus junction tables
    expect(mockCreateMany.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  // ---- 3. Result has typed arrays with uuid and friendlyId ----

  it("returns typed result with uuid and friendlyId arrays", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasClient: true,
        clientRow: { client_name: "Bob" },
        clientDedupKey: "name:bob",
      }),
    ];

    const result = await executeBatchImport(rows, "org-1", "user-1");

    expect(result).toHaveProperty("clients");
    expect(result).toHaveProperty("properties");
    expect(result).toHaveProperty("mandates");
    expect(result).toHaveProperty("linkCounts");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("skippedCount");

    // Clients should have entries with uuid and friendlyId
    expect(result.clients.length).toBeGreaterThan(0);
    expect(result.clients[0]).toHaveProperty("uuid");
    expect(result.clients[0]).toHaveProperty("friendlyId");
  });

  // ---- 4. Junction links are created ----

  it("creates junction links for client-property, mandate-property, and mandate-client", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasClient: true,
        hasProperty: true,
        hasMandate: true,
        clientRow: { client_name: "Carol" },
        propertyRow: { property_name: "Beach House" },
        mandateRow: {
          transaction_type: "SALE",
          title: "Buy Beach House",
        },
        clientDedupKey: "name:carol",
        propertyDedupKey: "name:beach house",
      }),
    ];

    const result = await executeBatchImport(rows, "org-1", "user-1");

    // The link counts should reflect the created links
    expect(result.linkCounts.clientProperty).toBe(1);
    expect(result.linkCounts.mandateProperty).toBe(1);
    expect(result.linkCounts.mandateClient).toBe(1);
  });

  // ---- 5. assignedTo is applied to created entities ----

  it("applies assignedTo to client, property, and mandate data", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasClient: true,
        hasProperty: true,
        clientRow: { client_name: "Dave" },
        propertyRow: { property_name: "Mountain Cabin" },
        clientDedupKey: "name:dave",
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

  it("deduplicates clients with the same dedupKey", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasClient: true,
        hasProperty: true,
        clientRow: { client_name: "Eve" },
        propertyRow: { property_name: "Prop A" },
        clientDedupKey: "name:eve",
        propertyDedupKey: "name:prop a",
      }),
      makeValidatedRow({
        rowIndex: 1,
        hasClient: true,
        hasProperty: true,
        clientRow: { client_name: "Eve" },
        propertyRow: { property_name: "Prop B" },
        clientDedupKey: "name:eve",
        propertyDedupKey: "name:prop b",
      }),
    ];

    const result = await executeBatchImport(rows, "org-1", "user-1");

    // Only one unique client should be created
    expect(result.clients).toHaveLength(1);
    // But two properties
    expect(result.properties).toHaveLength(2);
  });

  // ---- 7. Empty rows produce empty result ----

  it("returns empty result for empty input", async () => {
    const result = await executeBatchImport([], "org-1", "user-1");

    expect(result.clients).toHaveLength(0);
    expect(result.properties).toHaveLength(0);
    expect(result.mandates).toHaveLength(0);
    expect(result.linkCounts.clientProperty).toBe(0);
    expect(result.linkCounts.mandateProperty).toBe(0);
    expect(result.linkCounts.mandateClient).toBe(0);
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
        hasClient: false,
        hasProperty: false,
        hasMandate: false,
      }),
      makeValidatedRow({
        rowIndex: 1,
        hasClient: false,
        hasProperty: false,
        hasMandate: false,
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

  // ---- 10. Transaction receives 30s timeout option ----

  it("passes 30000ms timeout to $transaction", async () => {
    const rows: ValidatedRow[] = [
      makeValidatedRow({
        rowIndex: 0,
        hasClient: true,
        clientRow: { client_name: "Timeout Test" },
        clientDedupKey: "name:timeout test",
      }),
    ];

    await executeBatchImport(rows, "org-1", "user-1");

    expect(mockTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 30000 },
    );
  });
});
