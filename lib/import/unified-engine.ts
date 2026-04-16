/**
 * lib/import/unified-engine.ts
 *
 * Unified import engine — processes validated rows containing Client + Property
 * + Mandate data. The batch engine wraps all writes in a single $transaction
 * using createMany for performance and atomicity.
 *
 * Primary export: executeBatchImport()
 * Deprecated export: executeUnifiedImport() — calls executeBatchImport() internally
 */

import { prismadb } from "@/lib/prisma";
import { generateFriendlyIds, type EntityType } from "@/lib/friendly-id";
import { getOrgDek } from "@/lib/key-management";
import { type ImportError } from "./types";
import {
  UNIFIED_FIELD_DEFINITIONS,
  stripEntityPrefix,
} from "./unified-field-definitions";
import { generateMandateTitle, generateClientName } from "./name-generator";
import { contactImportConfig } from "./contact-import-config";
import { propertyImportConfig } from "./property-import-config";
import { requestImportConfig } from "./request-import-config";
import {
  normalizeClientEnums,
  normalizePropertyEnums,
  normalizeMandateEnums,
} from "./enum-normalizer";
import { contactImportSchema } from "./contact-import-schema";
import { propertyImportSchema } from "./property-import-schema";
import { requestImportSchema } from "./request-import-schema";
import type { ValidatedRow } from "./validation-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchImportResult {
  clients: Array<{ uuid: string; friendlyId: string }>;
  properties: Array<{ uuid: string; friendlyId: string }>;
  mandates: Array<{ uuid: string; friendlyId: string }>;
  linkCounts: {
    clientProperty: number;
    mandateProperty: number;
    mandateClient: number;
  };
  errors: Array<{ rowIndex: number; entity: string; error: string }>;
  skippedCount: number;
}

/** @deprecated — kept for backward compatibility. Use BatchImportResult. */
export interface UnifiedImportResult {
  clients: { created: number; reused: number; failed: number };
  properties: { created: number; failed: number };
  mandates: { created: number; failed: number };
  links: { clientProperty: number; mandateClient: number; mandateProperty: number };
  skipped: number;
  errors: ImportError[];
  entityIds: { clients: string[]; properties: string[]; mandates: string[] };
}

// ---------------------------------------------------------------------------
// Field -> entity ownership map (built once at module load)
// ---------------------------------------------------------------------------

const fieldEntityMap = new Map<string, "contact" | "property" | "request">();
for (const def of UNIFIED_FIELD_DEFINITIONS) {
  fieldEntityMap.set(def.key, def.entity);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNonEmpty(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

function partitionRow(
  row: Record<string, unknown>,
): {
  clientRow: Record<string, unknown>;
  propertyRow: Record<string, unknown>;
  mandateRow: Record<string, unknown>;
} {
  const clientRow: Record<string, unknown> = {};
  const propertyRow: Record<string, unknown> = {};
  const mandateRow: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const entity = fieldEntityMap.get(key);
    if (!entity) continue;
    if (entity === "contact") clientRow[key] = value;
    else if (entity === "property") propertyRow[key] = value;
    else mandateRow[key] = value;
  }

  return { clientRow, propertyRow, mandateRow };
}

function clientDedupKeyFromRow(row: Record<string, unknown>): string {
  const phone = String(row.primary_phone ?? "")
    .trim()
    .replace(/\D/g, "");
  const email = String(row.primary_email ?? "").trim().toLowerCase();
  const name = String(row.contact_name ?? "").trim().toLowerCase();
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return `name:${name}`;
}

// ---------------------------------------------------------------------------
// Batch-optimized friendly ID generation
// ---------------------------------------------------------------------------

async function generateBatchFriendlyIds(
  tx: any,
  entityType: EntityType,
  count: number,
  orgId: string,
): Promise<string[]> {
  if (count === 0) return [];
  return generateFriendlyIds(tx, entityType, count, orgId);
}

// ---------------------------------------------------------------------------
// Main batch import
// ---------------------------------------------------------------------------

export async function executeBatchImport(
  validatedRows: ValidatedRow[],
  orgId: string,
  userId: string,
  assignedTo?: string | null,
): Promise<BatchImportResult> {
  const errors: BatchImportResult["errors"] = [];
  let skippedCount = 0;

  if (validatedRows.length === 0) {
    return {
      clients: [],
      properties: [],
      mandates: [],
      linkCounts: { clientProperty: 0, mandateProperty: 0, mandateClient: 0 },
      errors: [],
      skippedCount: 0,
    };
  }

  // 1. Fetch org DEK once
  const dek = await getOrgDek(orgId);

  // 2. Pre-process: determine unique entities, assign UUIDs, build dedup maps.
  //    Track per-row entity UUID mappings for junction links.

  // --- Client dedup ---
  // Key: clientDedupKey -> { uuid, rowIndices }
  const clientDedupMap = new Map<string, { uuid: string; rowIndex: number }>();
  // Per-row: rowIndex -> clientUuid (for linking)
  const rowClientUuid = new Map<number, string>();
  // Per-row: rowIndex -> clientName (for mandate title)
  const rowClientName = new Map<number, string>();

  // --- Property dedup ---
  const propertyDedupMap = new Map<string, { uuid: string; rowIndex: number }>();
  const rowPropertyUuid = new Map<number, string>();
  const rowPropertyName = new Map<number, string>();

  // --- Mandate (no dedup, 1 per row) ---
  const rowMandateUuid = new Map<number, string>();

  // Collect data arrays for createMany
  interface ClientCreateData {
    uuid: string;
    prismaData: Record<string, unknown>;
  }
  interface PropertyCreateData {
    uuid: string;
    prismaData: Record<string, unknown>;
  }
  interface MandateCreateData {
    uuid: string;
    prismaData: Record<string, unknown>;
  }

  const clientsToCreate: ClientCreateData[] = [];
  const propertiesToCreate: PropertyCreateData[] = [];
  const mandatesToCreate: MandateCreateData[] = [];

  // Track friendly IDs by UUID for result assembly
  const clientFriendlyIds = new Map<string, string>();
  const propertyFriendlyIds = new Map<string, string>();
  const mandateFriendlyIds = new Map<string, string>();

  // Count unique entities needed for batch friendly ID generation
  let uniqueClientCount = 0;
  let uniquePropertyCount = 0;
  let mandateCount = 0;

  // First pass: identify unique entities and count
  for (const row of validatedRows) {
    if (!row.hasContact && !row.hasProperty && !row.hasRequest) {
      skippedCount++;
      continue;
    }

    if (row.hasContact && row.contactDedupKey) {
      if (!clientDedupMap.has(row.contactDedupKey)) {
        clientDedupMap.set(row.contactDedupKey, {
          uuid: crypto.randomUUID(),
          rowIndex: row.rowIndex,
        });
        uniqueClientCount++;
      }
    }

    if (row.hasProperty && row.propertyDedupKey) {
      if (!propertyDedupMap.has(row.propertyDedupKey)) {
        propertyDedupMap.set(row.propertyDedupKey, {
          uuid: crypto.randomUUID(),
          rowIndex: row.rowIndex,
        });
        uniquePropertyCount++;
      }
    }

    if (row.hasRequest) {
      mandateCount++;
    }
  }

  // Pre-generate all friendly IDs in batch (outside transaction, uses raw SQL)
  const clientFriendlyIdBatch =
    uniqueClientCount > 0
      ? await generateFriendlyIds(prismadb, "Clients", uniqueClientCount, orgId)
      : [];
  const propertyFriendlyIdBatch =
    uniquePropertyCount > 0
      ? await generateFriendlyIds(prismadb, "Properties", uniquePropertyCount, orgId)
      : [];
  const mandateFriendlyIdBatch =
    mandateCount > 0
      ? await generateFriendlyIds(prismadb, "Mandates", mandateCount, orgId)
      : [];

  let clientFidCursor = 0;
  let propertyFidCursor = 0;
  let mandateFidCursor = 0;

  // Second pass: build Prisma data arrays
  // Track which dedup keys have already been processed (for first-occurrence assembly)
  const processedClientKeys = new Set<string>();
  const processedPropertyKeys = new Set<string>();

  for (const row of validatedRows) {
    if (!row.hasContact && !row.hasProperty && !row.hasRequest) {
      continue; // already counted as skipped
    }

    // --- CONTACT ---
    if (row.hasContact && row.contactRow && row.contactDedupKey) {
      const dedupEntry = clientDedupMap.get(row.contactDedupKey);
      if (dedupEntry) {
        const clientUuid = dedupEntry.uuid;
        rowClientUuid.set(row.rowIndex, clientUuid);

        const clientName = String(row.contactRow.contact_name ?? row.contactRow.name ?? "");
        rowClientName.set(row.rowIndex, clientName);

        // Only build create data for the first occurrence of this dedup key
        if (!processedClientKeys.has(row.contactDedupKey)) {
          processedClientKeys.add(row.contactDedupKey);

          try {
            const clientRowData = { ...row.contactRow };

            // Encrypt with DEK (use the raw validated row which already has
            // stripped keys from the validation engine)
            const encrypted = contactImportConfig.encryptWithDek(clientRowData, dek);

            // Get friendly ID from pre-generated batch
            const friendlyId = clientFriendlyIdBatch[clientFidCursor++];
            clientFriendlyIds.set(clientUuid, friendlyId);

            // Build Prisma data using the import config's toPrismaData
            const prismaData = contactImportConfig.toPrismaData(
              clientRowData as any,
              encrypted,
              friendlyId,
              userId,
              orgId,
            );

            // Override with pre-generated UUID
            prismaData.id = clientUuid;

            // Apply assignedTo if provided
            if (assignedTo) {
              prismaData.assigned_to = assignedTo;
            }

            clientsToCreate.push({ uuid: clientUuid, prismaData });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({
              rowIndex: row.rowIndex,
              entity: "contact",
              error: msg,
            });
            // Remove from dedup map so links won't reference this entity
            rowClientUuid.delete(row.rowIndex);
          }
        }
      }
    }

    // --- PROPERTY ---
    if (row.hasProperty && row.propertyRow && row.propertyDedupKey) {
      const dedupEntry = propertyDedupMap.get(row.propertyDedupKey);
      if (dedupEntry) {
        const propertyUuid = dedupEntry.uuid;
        rowPropertyUuid.set(row.rowIndex, propertyUuid);

        const propertyName = String(row.propertyRow.property_name ?? "");
        rowPropertyName.set(row.rowIndex, propertyName);

        // Only build create data for the first occurrence
        if (!processedPropertyKeys.has(row.propertyDedupKey)) {
          processedPropertyKeys.add(row.propertyDedupKey);

          try {
            const propertyRowData = { ...row.propertyRow };

            // Encrypt
            const encrypted = propertyImportConfig.encryptWithDek(propertyRowData, dek);

            // Get friendly ID
            const friendlyId = propertyFriendlyIdBatch[propertyFidCursor++];
            propertyFriendlyIds.set(propertyUuid, friendlyId);

            // Build Prisma data
            const prismaData = propertyImportConfig.toPrismaData(
              propertyRowData as any,
              encrypted,
              friendlyId,
              userId,
              orgId,
            );

            prismaData.id = propertyUuid;

            if (assignedTo) {
              prismaData.assigned_to = assignedTo;
            }

            propertiesToCreate.push({ uuid: propertyUuid, prismaData });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({
              rowIndex: row.rowIndex,
              entity: "property",
              error: msg,
            });
            rowPropertyUuid.delete(row.rowIndex);
          }
        }
      }
    }

    // --- REQUEST ---
    if (row.hasRequest && row.requestRow) {
      try {
        const mandateUuid = crypto.randomUUID();
        const mandateRowData = { ...row.requestRow };

        // Budget auto-copy from property price (already done in validation
        // engine for requestRow, but re-check for safety)
        if (row.hasProperty && row.propertyRow?.price != null) {
          if (mandateRowData.budget_min == null)
            mandateRowData.budget_min = row.propertyRow.price;
          if (mandateRowData.budget_max == null)
            mandateRowData.budget_max = row.propertyRow.price;
        }

        // The mandateRow from validation already has normalized enums and title.
        // If title is missing, generate it now.
        if (!mandateRowData.title) {
          const clientName = rowClientName.get(row.rowIndex) ?? null;
          const propertyName = rowPropertyName.get(row.rowIndex) ?? null;
          mandateRowData.title = generateMandateTitle(
            mandateRowData,
            clientName,
            propertyName,
          );
        }

        // Encrypt
        const encrypted = requestImportConfig.encryptWithDek(mandateRowData, dek);

        // Get friendly ID
        const friendlyId = mandateFriendlyIdBatch[mandateFidCursor++];
        mandateFriendlyIds.set(mandateUuid, friendlyId);

        // Build Prisma data
        const prismaData = requestImportConfig.toPrismaData(
          mandateRowData as any,
          encrypted,
          friendlyId,
          userId,
          orgId,
        );

        prismaData.id = mandateUuid;

        if (assignedTo) {
          prismaData.assigned_to = assignedTo;
        }

        rowMandateUuid.set(row.rowIndex, mandateUuid);
        mandatesToCreate.push({ uuid: mandateUuid, prismaData });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({
          rowIndex: row.rowIndex,
          entity: "request",
          error: msg,
        });
      }
    }
  }

  // 3. Build junction link arrays
  interface ClientPropertyLink {
    id: string;
    clientId: string;
    propertyId: string;
  }
  interface MandatePropertyLink {
    mandateId: string;
    propertyId: string;
  }
  interface MandateClientLink {
    mandateId: string;
    clientId: string;
  }

  const clientPropertyLinks: ClientPropertyLink[] = [];
  const mandatePropertyLinks: MandatePropertyLink[] = [];
  const mandateClientLinks: MandateClientLink[] = [];

  // Dedup junction links (a deduped client may link to the same property from multiple rows)
  const cpLinkSet = new Set<string>();
  const mpLinkSet = new Set<string>();
  const mcLinkSet = new Set<string>();

  for (const row of validatedRows) {
    const clientUuid = rowClientUuid.get(row.rowIndex);
    const propertyUuid = rowPropertyUuid.get(row.rowIndex);
    const mandateUuid = rowMandateUuid.get(row.rowIndex);

    if (clientUuid && propertyUuid) {
      const key = `${clientUuid}:${propertyUuid}`;
      if (!cpLinkSet.has(key)) {
        cpLinkSet.add(key);
        clientPropertyLinks.push({
          id: crypto.randomUUID(),
          clientId: clientUuid,
          propertyId: propertyUuid,
        });
      }
    }

    if (mandateUuid && propertyUuid) {
      const key = `${mandateUuid}:${propertyUuid}`;
      if (!mpLinkSet.has(key)) {
        mpLinkSet.add(key);
        mandatePropertyLinks.push({
          mandateId: mandateUuid,
          propertyId: propertyUuid,
        });
      }
    }

    if (mandateUuid && clientUuid) {
      const key = `${mandateUuid}:${clientUuid}`;
      if (!mcLinkSet.has(key)) {
        mcLinkSet.add(key);
        mandateClientLinks.push({
          mandateId: mandateUuid,
          clientId: clientUuid,
        });
      }
    }
  }

  // 4. Execute everything inside a single transaction
  await prismadb.$transaction(
    async (tx: any) => {
      // Phase 1 — Clients
      if (clientsToCreate.length > 0) {
        await tx.clients.createMany({
          data: clientsToCreate.map((c) => c.prismaData),
          skipDuplicates: true,
        });
      }

      // Phase 2 — Properties
      if (propertiesToCreate.length > 0) {
        await tx.properties.createMany({
          data: propertiesToCreate.map((p) => p.prismaData),
          skipDuplicates: true,
        });
      }

      // Phase 3 — Mandates
      if (mandatesToCreate.length > 0) {
        await tx.mandate.createMany({
          data: mandatesToCreate.map((m) => m.prismaData),
          skipDuplicates: true,
        });
      }

      // Phase 4 — Junction Links
      if (clientPropertyLinks.length > 0) {
        await tx.client_Properties.createMany({
          data: clientPropertyLinks,
          skipDuplicates: true,
        });
      }

      if (mandatePropertyLinks.length > 0) {
        await tx.mandate_Properties.createMany({
          data: mandatePropertyLinks,
          skipDuplicates: true,
        });
      }

      if (mandateClientLinks.length > 0) {
        await tx.mandate_Clients.createMany({
          data: mandateClientLinks,
          skipDuplicates: true,
        });
      }
    },
    { timeout: 15000 },
  );

  // 5. Assemble typed result
  const result: BatchImportResult = {
    clients: clientsToCreate.map((c) => ({
      uuid: c.uuid,
      friendlyId: clientFriendlyIds.get(c.uuid) ?? "",
    })),
    properties: propertiesToCreate.map((p) => ({
      uuid: p.uuid,
      friendlyId: propertyFriendlyIds.get(p.uuid) ?? "",
    })),
    mandates: mandatesToCreate.map((m) => ({
      uuid: m.uuid,
      friendlyId: mandateFriendlyIds.get(m.uuid) ?? "",
    })),
    linkCounts: {
      clientProperty: clientPropertyLinks.length,
      mandateProperty: mandatePropertyLinks.length,
      mandateClient: mandateClientLinks.length,
    },
    errors,
    skippedCount,
  };

  return result;
}

// ---------------------------------------------------------------------------
// Deprecated wrapper — will be removed in Task 22
// ---------------------------------------------------------------------------

/**
 * @deprecated Use executeBatchImport() with pre-validated rows instead.
 * This function partitions + validates + imports in one call (old API).
 * Kept temporarily for backward compatibility during migration.
 */
export async function executeUnifiedImport(
  rows: Record<string, unknown>[],
  orgId: string,
  userId: string,
): Promise<UnifiedImportResult> {
  // Lazy import to avoid circular dependency
  const { validateImportData } = await import("./validation-engine");

  const validation = validateImportData(rows);
  const batchResult = await executeBatchImport(
    validation.validRows,
    orgId,
    userId,
  );

  // Map BatchImportResult back to the old UnifiedImportResult shape
  const clientReusedCount = Math.max(
    0,
    (validation.entitySummary.contacts.total -
      validation.entitySummary.contacts.unique),
  );

  const errors: ImportError[] = [
    // Validation errors
    ...validation.errorRows.map((e) => ({
      row: e.rowIndex + 2, // +2 for 0-index + header
      field: `${e.entity}.${e.field}`,
      error: e.error,
      value: e.rawValue != null ? String(e.rawValue) : undefined,
    })),
    // Batch execution errors
    ...batchResult.errors.map((e) => ({
      row: e.rowIndex + 2,
      field: e.entity,
      error: e.error,
    })),
  ];

  return {
    clients: {
      created: batchResult.clients.length,
      reused: clientReusedCount,
      failed: validation.errorRows.filter((e) => e.entity === "contact").length +
        batchResult.errors.filter((e) => e.entity === "contact").length,
    },
    properties: {
      created: batchResult.properties.length,
      failed: validation.errorRows.filter((e) => e.entity === "property").length +
        batchResult.errors.filter((e) => e.entity === "property").length,
    },
    mandates: {
      created: batchResult.mandates.length,
      failed: validation.errorRows.filter((e) => e.entity === "request").length +
        batchResult.errors.filter((e) => e.entity === "request").length,
    },
    links: {
      clientProperty: batchResult.linkCounts.clientProperty,
      mandateClient: batchResult.linkCounts.mandateClient,
      mandateProperty: batchResult.linkCounts.mandateProperty,
    },
    skipped: batchResult.skippedCount,
    errors,
    entityIds: {
      clients: batchResult.clients.map((c) => c.uuid),
      properties: batchResult.properties.map((p) => p.uuid),
      mandates: batchResult.mandates.map((m) => m.uuid),
    },
  };
}
