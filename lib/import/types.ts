import type { ZodSchema } from "zod";

/**
 * Configuration for importing a specific entity type.
 * Used by the per-entity import configs (client, property, mandate).
 */
export interface ImportEntityConfig<T> {
  prismaModel: string;
  entityIdType: string;
  importSchema: ZodSchema<T>;
  normalizeEnums: (data: Record<string, unknown>) => Record<string, unknown>;
  encryptWithDek(
    data: Record<string, unknown>,
    dek: Buffer
  ): Record<string, unknown>;
  toPrismaData(
    item: T,
    encryptedFields: Record<string, unknown>,
    friendlyId: string,
    userId: string,
    orgId: string
  ): Record<string, unknown>;
}

export interface ImportError {
  row: number;
  field: string;
  error: string;
  value?: string;
}
