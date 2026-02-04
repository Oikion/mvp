"use server";

import { Users } from "@prisma/client";

import { getOrgMembersFromDb } from "@/lib/org-members";

interface GetOrganizationUsersParams {
  select?: Record<string, boolean>;
  onlyActive?: boolean;
  organizationId?: string;
}

export async function getOrganizationUsers<T = Users>(params?: GetOrganizationUsersParams): Promise<T[]> {
  const { users } = await getOrgMembersFromDb({
    organizationId: params?.organizationId,
    select: params?.select,
  });

  let result = users as T[];

  if (params?.onlyActive) {
    result = (result as Users[]).filter((user) => (user as Users).userStatus === "ACTIVE") as T[];
  }

  return result;
}

