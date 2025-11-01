import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * Get the current user from the database using Clerk authentication
 * Returns the user from Prisma Users table based on clerkUserId
 * Throws an error if user is not authenticated or not found
 */
export async function getCurrentUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("User not authenticated");
  }

  const user = await prismadb.users.findFirst({
    where: {
      clerkUserId: clerkUserId,
    },
  });

  if (!user) {
    throw new Error("User not found in database");
  }

  return user;
}

/**
 * Get the current user safely (returns null instead of throwing)
 */
export async function getCurrentUserSafe() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

