"use server";

/**
 * update-client shim — v2 legacy compatibility layer.
 *
 * Cell components in the contacts table still call updateClient(id, { old_field: value }).
 * This shim maps old Client field names → Contact field names and delegates to updateContact.
 *
 * TODO: migrate cell components to call updateContact directly and remove this shim.
 */

import { updateContact } from "@/actions/contacts/update-contact";
import type { ActionResponse } from "@/lib/action-response";

interface LegacyClientPatch {
  client_name?: string;
  client_status?: string;
  assigned_to?: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
}

export async function updateClient(
  id: string,
  patch: LegacyClientPatch
): Promise<ActionResponse> {
  const mapped: Record<string, unknown> = { id };

  if (patch.client_name !== undefined) mapped.displayName = patch.client_name;
  if (patch.client_status !== undefined) mapped.status = patch.client_status;
  if (patch.assigned_to !== undefined) mapped.assignedAgentId = patch.assigned_to;
  if (patch.primary_email !== undefined) mapped.email = patch.primary_email;
  if (patch.primary_phone !== undefined) mapped.primaryPhone = patch.primary_phone;

  return updateContact(mapped as Parameters<typeof updateContact>[0]);
}
