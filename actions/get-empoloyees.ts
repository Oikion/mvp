import { auth } from "@clerk/nextjs/server";

import { getOrgMembersFromDb } from "@/lib/org-members";

export const getEmployees = async () => {
  const { userId } = await auth();
  if (!userId) return [];

  const { users } = await getOrgMembersFromDb();
  return users;
};
