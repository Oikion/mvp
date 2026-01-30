import type { User } from "@clerk/nextjs/server";

/**
 * Extended user type that matches the current session structure
 * This includes additional fields from the Prisma Users table
 */
export type ExtendedUser = User & {
  id: string;
  _id: string;
  avatar?: string | null;
  isAdmin: boolean;
  userLanguage: string;
  userStatus: string;
  lastLoginAt?: Date | null;
};

/**
 * Session type for compatibility with existing code
 */
export type Session = {
  user: ExtendedUser;
};

