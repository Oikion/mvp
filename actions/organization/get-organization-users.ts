"use server";

import { Users } from "@prisma/client";

import { getCurrentOrgId } from "@/lib/get-current-user";
import { getOrgMembersFromDb } from "@/lib/org-members";

interface GetOrganizationUsersParams {
  select?: Record<string, boolean>;
  onlyActive?: boolean;
  organizationId?: string;
}

// Columns a client is allowed to request — never expose admin flags,
// tokens, or other sensitive Users columns through this public action.
const SAFE_USER_FIELDS = new Set([
  "id",
  "clerkUserId",
  "name",
  "firstName",
  "lastName",
  "email",
  "avatar",
  "userStatus",
  "created_on",
]);

export async function getOrganizationUsers<T = Users>(params?: GetOrganizationUsersParams): Promise<T[]> {
  // Org context always comes from the server session — a client-supplied
  // organizationId is only accepted if it matches the caller's active org.
  const organizationId = await getCurrentOrgId();
  if (params?.organizationId && params.organizationId !== organizationId) {
    throw new Error("Forbidden");
  }

  let select: Record<string, boolean> | undefined;
  if (params?.select) {
    select = Object.fromEntries(
      Object.entries(params.select).filter(([key, value]) => value === true && SAFE_USER_FIELDS.has(key))
    );
    if (Object.keys(select).length === 0) {
      select = undefined;
    }
  }

  const { users } = await getOrgMembersFromDb({
    organizationId,
    select,
  });

  let result = users as T[];

  if (params?.onlyActive) {
    result = (result as Users[]).filter((user) => (user as Users).userStatus === "ACTIVE") as T[];
  }

  return result;
}
