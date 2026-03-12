// Re-export the Prisma enum for convenience
export { DepartureReason } from "@prisma/client";
import type { DepartureReason } from "@prisma/client";
import type { MigrationResult } from "@/lib/data-ownership/types";

export type DepartureResult = {
  orgId: string;
  reason: DepartureReason;
  nulledReferences: number;
  deletedPersonalData: number;
  migrationResult?: MigrationResult;
  errors: string[];
  timestamp: Date;
};
