"use server";

import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";

export async function revokeInvitation(invitationId: string): Promise<ActionResponse<null>> {
  const guard = await requireAction("admin:invite_users");
  if (guard) return guard;

  const { userId } = await auth();
  if (!userId) return actionError("Unauthorized", "AUTH_ERROR");

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return actionError("Server configuration error", "CONFIG_ERROR");

  let organizationId: string;
  try {
    organizationId = await getCurrentOrgId();
  } catch {
    return actionError("No organization context", "AUTH_ERROR");
  }

  try {
    const clerk = createClerkClient({ secretKey });
    await clerk.organizations.revokeOrganizationInvitation({
      organizationId,
      invitationId,
      requestingUserId: userId,
    });

    revalidatePath("/app/employees");
    return actionSuccess(null);
  } catch (error) {
    console.error("[REVOKE_INVITATION]", error);
    return actionError("Failed to revoke invitation", error instanceof Error ? error : undefined);
  }
}
