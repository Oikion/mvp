import { prismadb } from "@/lib/prisma";

/**
 * Validates that an assigned_to value is a real Users.id.
 * Returns the user ID if valid, null otherwise.
 *
 * This prevents P2003 FK violations when assigned_to references
 * a non-existent user (e.g. Clerk membership IDs, deleted users).
 */
export async function validateAssignedTo(
  assignedTo: string | null | undefined
): Promise<string | null> {
  if (!assignedTo || assignedTo.trim() === "") return null;

  const user = await prismadb.users.findFirst({
    where: { id: assignedTo },
    select: { id: true },
  });

  if (!user) return null;

  return user.id;
}
