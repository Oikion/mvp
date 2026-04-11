import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { generateFriendlyIds, type EntityType } from "@/lib/friendly-id";
import { getOrgDek } from "@/lib/key-management";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportError {
  row: number;
  field: string;
  error: string;
  value?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}

export interface ImportEntityConfig<T> {
  prismaModel: "contact" | "properties" | "mandate";
  entityIdType: EntityType;
  importSchema: z.ZodSchema<T>;
  normalizeEnums: (raw: Record<string, unknown>) => Record<string, unknown>;
  encryptWithDek: (
    data: Record<string, unknown>,
    dek: Buffer
  ) => Record<string, unknown>;
  toPrismaData: (
    item: T,
    encryptedFields: Record<string, unknown>,
    friendlyId: string,
    userId: string,
    orgId: string
  ) => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a user-provided ID string:
 * lowercase, trim, replace spaces with dashes, remove special chars,
 * collapse multiple dashes.
 */
function normalizeId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Resolve user-provided IDs against existing DB records and in-batch
 * collisions. Appends `-N` suffixes to resolve conflicts.
 */
async function resolveUserProvidedIds(
  ids: string[],
  orgId: string,
  prismaModel: "contact" | "properties" | "mandate"
): Promise<string[]> {
  const model = prismadb[prismaModel] as any;

  // Batch-fetch all existing friendlyIds that match any of the provided ids
  const existing: Array<{ friendlyId: string }> = await model.findMany({
    where: {
      organizationId: orgId,
      friendlyId: { in: ids },
    },
    select: { friendlyId: true },
  });

  const existingSet = new Set(existing.map((r: { friendlyId: string }) => r.friendlyId));
  const usedInBatch = new Set<string>();
  const resolved: string[] = [];

  for (const id of ids) {
    let candidate = id;
    let suffix = 1;

    while (existingSet.has(candidate) || usedInBatch.has(candidate)) {
      candidate = `${id}-${suffix}`;
      suffix++;
    }

    usedInBatch.add(candidate);
    resolved.push(candidate);
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

export async function executeImport<T>(
  config: ImportEntityConfig<T>,
  rows: Record<string, unknown>[],
  orgId: string,
  userId: string
): Promise<ImportResult> {
  const errors: ImportError[] = [];

  // ── 1. Validate ──────────────────────────────────────────────────────────
  const validItems: { index: number; raw: Record<string, unknown>; parsed: T }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const normalized = config.normalizeEnums(rows[i]);
    const result = config.importSchema.safeParse(normalized);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          row: i + 2, // +1 for 0-index, +1 for header row
          field: issue.path.join(".") || "unknown",
          error: issue.message,
          value: String(normalized[issue.path[0] as string] ?? ""),
        });
      }
    } else {
      validItems.push({ index: i, raw: normalized, parsed: result.data });
    }
  }

  if (validItems.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      failed: rows.length,
      errors,
    };
  }

  // ── 2. Batch ID generation ───────────────────────────────────────────────
  // Separate items with user-provided IDs from those needing auto-gen
  const withUserId: { idx: number; id: string }[] = [];
  const withoutUserId: number[] = [];

  for (let i = 0; i < validItems.length; i++) {
    const rawId = (validItems[i].parsed as any).id;
    if (rawId && typeof rawId === "string" && rawId.trim()) {
      withUserId.push({ idx: i, id: normalizeId(rawId) });
    } else {
      withoutUserId.push(i);
    }
  }

  const friendlyIds: string[] = new Array(validItems.length);

  // Resolve user-provided IDs (batch conflict check)
  if (withUserId.length > 0) {
    const rawIds = withUserId.map((w) => w.id);
    const resolved = await resolveUserProvidedIds(
      rawIds,
      orgId,
      config.prismaModel
    );
    for (let i = 0; i < withUserId.length; i++) {
      friendlyIds[withUserId[i].idx] = resolved[i];
    }
  }

  // Auto-generate IDs for items without user-provided ones
  if (withoutUserId.length > 0) {
    const generated = await generateFriendlyIds(
      prismadb,
      config.entityIdType,
      withoutUserId.length,
      orgId
    );
    for (let i = 0; i < withoutUserId.length; i++) {
      friendlyIds[withoutUserId[i]] = generated[i];
    }
  }

  // ── 3. Encrypt ───────────────────────────────────────────────────────────
  const dek = await getOrgDek(orgId);
  const encryptedPerItem: Record<string, unknown>[] = validItems.map((item) =>
    config.encryptWithDek(item.raw, dek)
  );

  // ── 4. Batch insert ──────────────────────────────────────────────────────
  const prismaData = validItems.map((item, i) =>
    config.toPrismaData(
      item.parsed,
      encryptedPerItem[i],
      friendlyIds[i],
      userId,
      orgId
    )
  );

  const model = prismadb[config.prismaModel] as any;

  let imported = 0;

  try {
    // Attempt single batch insert
    const result = await model.createMany({
      data: prismaData,
      skipDuplicates: true,
    });
    imported = result.count;
  } catch {
    // Fallback: individual creates (preserves per-row error details)
    for (let j = 0; j < prismaData.length; j++) {
      try {
        await model.create({ data: prismaData[j] });
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({
          row: validItems[j]?.index == null ? 0 : validItems[j].index + 2,
          field: "",
          error: msg,
        });
      }
    }
  }

  const failed = rows.length - validItems.length + (validItems.length - imported);

  return {
    imported,
    skipped: 0,
    failed,
    errors,
  };
}
