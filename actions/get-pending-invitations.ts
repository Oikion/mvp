"use server";

import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";

export interface PendingInvitation {
  id: string;
  emailAddress: string;
  role: string;
  roleName: string;
  createdAt: number;
  expiresAt: number;
}

export async function getPendingInvitations(): Promise<PendingInvitation[] | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const guard = await requireAction("admin:invite_users");
  if (guard) return null;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;

  let organizationId: string;
  try {
    organizationId = await getCurrentOrgId();
  } catch {
    return null;
  }

  const clerk = createClerkClient({ secretKey });

  const result = await clerk.organizations.getOrganizationInvitationList({
    organizationId,
    status: ["pending"],
    limit: 100,
  });

  return (result.data ?? []).map((inv) => ({
    id: inv.id,
    emailAddress: inv.emailAddress,
    role: inv.role,
    roleName: inv.roleName,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
  }));
}
