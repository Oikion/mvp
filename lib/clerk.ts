import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Get the current authenticated user from Clerk
 * Returns null if user is not authenticated
 */
export async function getCurrentAuth() {
  return await auth();
}

/**
 * Get the current user's Clerk ID
 * Throws an error if user is not authenticated
 */
export async function getCurrentUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

/**
 * Get the Clerk client instance for server-side operations
 */
export function getClerkClient() {
  return clerkClient();
}

