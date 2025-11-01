import { prismadb } from "@/lib/prisma";
import { createClerkClient } from "@clerk/backend";
import { newUserNotify } from "@/lib/new-user-notify";

/**
 * Sync a Clerk user with the Prisma Users table
 * Creates or updates the user record based on Clerk user data
 */
export async function syncClerkUser(clerkUserId: string) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const clerkUser = await clerk.users.getUser(clerkUserId);

  if (!clerkUser) {
    throw new Error(`Clerk user not found: ${clerkUserId}`);
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = clerkUser.firstName && clerkUser.lastName
    ? `${clerkUser.firstName} ${clerkUser.lastName}`
    : clerkUser.firstName || clerkUser.lastName || clerkUser.username || email?.split("@")[0] || "User";
  const avatar = clerkUser.imageUrl || null;
  
  // Get language from publicMetadata (set during sign-up via additionalFields)
  const language = (clerkUser.publicMetadata?.language as string) || "en";
  // Validate language is one of the allowed values
  const validLanguages = ["en", "cz", "de", "uk"];
  const userLanguage = validLanguages.includes(language) ? language : "en";

  if (!email) {
    throw new Error(`Clerk user has no email address: ${clerkUserId}`);
  }

  // Check if user already exists by clerkUserId
  const existingByClerkId = await prismadb.users.findFirst({
    where: { clerkUserId },
  });

  // Check if user already exists by email
  const existingByEmail = await prismadb.users.findUnique({
    where: { email },
  });

  // If user exists with clerkUserId, update it
  if (existingByClerkId) {
    return await prismadb.users.update({
      where: { id: existingByClerkId.id },
      data: {
        email,
        name,
        avatar,
        userLanguage: userLanguage as "en" | "cz" | "de" | "uk",
        lastLoginAt: new Date(),
      },
    });
  }

  // If user exists with email but no clerkUserId, link them
  if (existingByEmail && !existingByEmail.clerkUserId) {
    return await prismadb.users.update({
      where: { id: existingByEmail.id },
      data: {
        clerkUserId,
        name: name || existingByEmail.name,
        avatar: avatar || existingByEmail.avatar,
        userLanguage: userLanguage as "en" | "cz" | "de" | "uk",
        lastLoginAt: new Date(),
      },
    });
  }

  // Check if this is the first user in the system
  const userCount = await prismadb.users.count();
  const isFirstUser = userCount === 0;

  // Create new user
  const newUser = await prismadb.users.create({
    data: {
      clerkUserId,
      email,
      name,
      avatar,
      userLanguage: userLanguage as "en" | "cz" | "de" | "uk",
      is_admin: isFirstUser,
      is_account_admin: false,
      lastLoginAt: new Date(),
      userStatus: isFirstUser
        ? "ACTIVE"
        : process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io"
          ? "ACTIVE"
          : "PENDING",
    },
  });

  // Notify admins if this is NOT the first user
  if (!isFirstUser) {
    await newUserNotify(newUser);
  }

  return newUser;
}

/**
 * Update user last login time
 */
export async function updateUserLastLogin(clerkUserId: string) {
  const user = await prismadb.users.findFirst({
    where: { clerkUserId },
  });

  if (user) {
    await prismadb.users.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }
}

/**
 * Delete user from Prisma when deleted from Clerk
 */
export async function deleteClerkUser(clerkUserId: string) {
  const user = await prismadb.users.findFirst({
    where: { clerkUserId },
  });

  if (user) {
    // Note: We're not actually deleting the user, just removing the clerkUserId
    // This preserves data integrity. Adjust based on your business requirements.
    await prismadb.users.update({
      where: { id: user.id },
      data: {
        clerkUserId: null,
      },
    });
  }
}
