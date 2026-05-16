import { auth } from "@clerk/nextjs/server";

import { getOrgMembersFromDb } from "@/lib/org-members";

export const getEmployees = async () => {
  const { userId } = await auth();
  if (!userId) return [];

  const { users, memberships } = await getOrgMembersFromDb();

  return users.map((user) => {
    const membership = memberships.find(
      (m) => m.publicUserData?.userId === user.clerkUserId
    );
    return {
      ...user,
      orgRole: membership?.role ?? "org:member",
    };
  });
};
