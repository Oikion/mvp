import { getOrgMembersFromDb } from "@/lib/org-members";
import { Users } from "@prisma/client";

export const getActiveUsersCount = async () => {
  const { users } = await getOrgMembersFromDb();
  return (users as Users[]).filter((user) => user.userStatus === "ACTIVE").length;
};
