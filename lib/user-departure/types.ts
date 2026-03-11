// Re-export the Prisma enum for convenience
export { DepartureReason } from "@prisma/client";
import type { DepartureReason } from "@prisma/client";

export type DepartureResult = {
  orgId: string;
  reason: DepartureReason;
  nulledReferences: number;
  deletedPersonalData: number;
  errors: string[];
  timestamp: Date;
};
