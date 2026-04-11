import { z } from "zod";
import {
  DealStage,
  DealTransactionType,
  AgentRole,
  DealPartyRole,
} from "@prisma/client";

/**
 * Zod schemas for Deal (v2.0 Phase 3) input validation.
 * Prevents mass assignment attacks and ensures data integrity.
 *
 * All enum schemas use z.nativeEnum() derived from @prisma/client.
 * After any Prisma schema change, run `prisma generate` — TypeScript will catch drift.
 */

// ── Enum schemas ──

export const dealStageSchema = z.nativeEnum(DealStage);
export const dealTransactionTypeSchema = z.nativeEnum(DealTransactionType);
export const agentRoleSchema = z.nativeEnum(AgentRole);
export const dealPartyRoleSchema = z.nativeEnum(DealPartyRole);

// ── Commission split schema (JSON structure) ──

export const commissionSplitSchema = z
  .object({
    listingAgent: z.number().min(0).max(100),
    buyerAgent: z.number().min(0).max(100),
    agency: z.number().min(0).max(100).optional().default(0),
  })
  .refine(
    (data) => {
      const total = data.listingAgent + data.buyerAgent + (data.agency ?? 0);
      return Math.abs(total - 100) < 0.01;
    },
    { message: "Commission split must total 100%" }
  )
  .optional()
  .nullable();

// ── Base deal fields schema ──

const dealFieldsSchema = z.object({
  // Core references
  propertyId: z.string().min(1, "Property is required"),
  requestId: z.string().optional().nullable(),
  notaryContactId: z.string().optional().nullable(),

  // Agent assignments
  listingAgentId: z.string().optional().nullable(),
  buyerAgentId: z.string().optional().nullable(),

  // Classification
  stage: dealStageSchema.optional().default("INTEREST"),
  dealType: dealTransactionTypeSchema.optional().nullable(),
  agentRole: agentRoleSchema.optional().nullable(),

  // Financial — sale
  agreedPrice: z.coerce.number().min(0).optional().nullable(),
  totalCommission: z.coerce.number().min(0).optional().nullable(),
  commissionRate: z.coerce.number().min(0).max(100).optional().nullable(),
  commissionCurrency: z.enum(["EUR", "USD", "GBP", "CHF"]).optional().default("EUR"),
  commissionSplit: commissionSplitSchema,
  depositAmount: z.coerce.number().min(0).optional().nullable(),
  depositDate: z.coerce.date().optional().nullable(),
  listingAgentSplit: z.coerce.number().min(0).max(100).optional().default(50),
  buyerAgentSplit: z.coerce.number().min(0).max(100).optional().default(50),

  // Financial — rental
  monthlyRentAmount: z.coerce.number().min(0).optional().nullable(),
  securityDeposit: z.coerce.number().min(0).optional().nullable(),
  leaseStartDate: z.coerce.date().optional().nullable(),
  leaseEndDate: z.coerce.date().optional().nullable(),
  leaseDurationMonths: z.coerce.number().int().min(1).optional().nullable(),

  // Descriptive
  title: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  fallenThroughReason: z.string().max(1000).optional().nullable(),

  // Metrics
  contractDate: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
}).strict();

/**
 * Schema for creating a new deal.
 * Property is required; everything else is optional with sensible defaults.
 */
export const createDealSchema = dealFieldsSchema
  .refine(
    (data) => {
      // Rental deals should have rental fields
      if (data.dealType === "RENT" && !data.monthlyRentAmount && !data.agreedPrice) {
        return true; // Allow creating without price initially
      }
      return true;
    },
    { message: "Invalid deal configuration" }
  )
  .refine(
    (data) =>
      !data.leaseStartDate ||
      !data.leaseEndDate ||
      new Date(data.leaseEndDate) >= new Date(data.leaseStartDate),
    { message: "Lease end date must be on or after lease start date", path: ["leaseEndDate"] }
  );

/**
 * Schema for updating an existing deal.
 * All fields optional except id.
 */
export const updateDealSchema = z
  .object({
    id: z.string().min(1, "Deal ID is required"),
  })
  .merge(dealFieldsSchema.partial())
  .strict();

/**
 * Schema for advancing a deal through pipeline stages.
 */
export const advanceDealStageSchema = z
  .object({
    dealId: z.string().min(1, "Deal ID is required"),
    toStage: dealStageSchema,
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict()
  .refine(
    (data) =>
      data.toStage !== "FALLEN_THROUGH" ||
      (data.notes != null && data.notes.trim().length > 0),
    {
      message: "A reason is required when marking a deal as fallen through",
      path: ["notes"],
    }
  );

/**
 * Schema for adding/removing deal parties.
 */
export const dealPartySchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  contactId: z.string().min(1, "Contact ID is required"),
  role: dealPartyRoleSchema,
  notes: z.string().max(1000).optional().nullable(),
}).strict();

/**
 * Schema for deal search/filter parameters.
 */
export const dealQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  stage: dealStageSchema.optional(),
  dealType: dealTransactionTypeSchema.optional(),
  search: z.string().max(100).optional(),
  propertyId: z.string().optional(),
  contactId: z.string().optional(),
  includeDeleted: z.enum(["true", "false"]).optional(),
});

/**
 * Schema for deal form (shared by wizard + quick-add).
 */
export const dealFormSchema = z.object({
  propertyId: z.string().optional(),
  requestId: z.string().optional().nullable(),
  dealType: dealTransactionTypeSchema.optional().nullable(),
  agentRole: agentRoleSchema.optional().nullable(),
  stage: dealStageSchema.optional(),
  listingAgentId: z.string().optional().nullable(),
  buyerAgentId: z.string().optional().nullable(),
  notaryContactId: z.string().optional().nullable(),
  agreedPrice: z.coerce.number().optional().nullable(),
  totalCommission: z.coerce.number().optional().nullable(),
  commissionRate: z.coerce.number().optional().nullable(),
  listingAgentSplit: z.coerce.number().optional(),
  buyerAgentSplit: z.coerce.number().optional(),
  monthlyRentAmount: z.coerce.number().optional().nullable(),
  securityDeposit: z.coerce.number().optional().nullable(),
  leaseStartDate: z.coerce.date().optional().nullable(),
  leaseEndDate: z.coerce.date().optional().nullable(),
  leaseDurationMonths: z.coerce.number().int().optional().nullable(),
  title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
  .strict()
  .refine(
    (data) =>
      !data.leaseStartDate ||
      !data.leaseEndDate ||
      new Date(data.leaseEndDate) >= new Date(data.leaseStartDate),
    { message: "Lease end date must be on or after lease start date", path: ["leaseEndDate"] }
  );
