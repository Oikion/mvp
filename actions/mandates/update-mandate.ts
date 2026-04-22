"use server";

/**
 * update-mandate.ts — backward-compat shim for legacy callers.
 *
 * The underlying Mandate model was removed (Phase 2 migration). Requests are
 * the canonical demand-side entity. This file delegates to `updateRequest`
 * from `actions/requests/update-request`, which owns Zod validation,
 * encryption, tenant isolation, and activity logging.
 *
 * New code should import `updateRequest` directly from `@/actions/requests`.
 */

import { updateRequest } from "@/actions/requests/update-request";
import type { ActionResponse } from "@/lib/action-response";
import type { UpdateRequestInput } from "@/lib/validations/requests";

export interface UpdateMandateInput {
  id: string;
  title?: string;
  notes?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Updates a Request (formerly Mandate) by id.
 *
 * Delegates to `updateRequest` — all validation, encryption, permission
 * checks, and tenant isolation are performed there.
 */
export async function updateMandate(
  input: UpdateMandateInput
): Promise<ActionResponse<{ id: string }>> {
  const { id, ...rest } = input;
  return updateRequest(id, rest as UpdateRequestInput);
}
