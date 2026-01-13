"use server";

import { prismadb } from "@/lib/prisma";
import { createClerkClient } from "@clerk/backend";
import { newUserNotify } from "@/lib/new-user-notify";
import { generateFriendlyId } from "@/lib/friendly-id";

/**
 * Sync a Clerk user with the Prisma Users table
 * Creates or updates the user record based on Clerk user data
 */
export async function syncClerkUser(clerkUserId: string) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  
  let clerkUser;
  try {
    clerkUser = await clerk.users.getUser(clerkUserId);
  } catch (error: unknown) {
    // Handle Clerk API errors (e.g., user not found, API errors)
    const errorObj = error as { status?: number; code?: string; message?: string; errors?: Array<{ code?: string }> };
    const errorStatus = errorObj?.status;
    const errorCode = errorObj?.code;
    const errorMessage = errorObj?.message || "";
    const firstError = errorObj?.errors?.[0];
    
    // Check various ways Clerk might indicate user not found
    if (
      errorStatus === 404 ||
      errorCode === "not_found" ||
      firstError?.code === "not_found" ||
      errorMessage.toLowerCase().includes("not found") ||
      errorMessage.toLowerCase().includes("does not exist")
    ) {
      const notFoundError = new Error(`Clerk user not found: ${clerkUserId}`) as Error & { status: number; code: string };
      // Attach error details for better handling upstream
      notFoundError.status = 404;
      notFoundError.code = "not_found";
      throw notFoundError;
    }
    // Re-throw other errors
    throw error;
  }

  if (!clerkUser) {
    const notFoundError = new Error(`Clerk user not found: ${clerkUserId}`) as Error & { status: number; code: string };
    // Attach error details for better handling upstream
    notFoundError.status = 404;
    notFoundError.code = "not_found";
    throw notFoundError;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const firstName = clerkUser.firstName || null;
  const lastName = clerkUser.lastName || null;
  const name = firstName && lastName
    ? `${firstName} ${lastName}`
    : firstName || lastName || clerkUser.username || email?.split("@")[0] || "User";
  const avatar = clerkUser.imageUrl || null;
  
  // Username from Clerk (source of truth)
  // May be null for legacy users created before username was required
  // These users will be redirected to onboarding to set a username
  const username = clerkUser.username || null;
  if (!username) {
    console.warn(`[clerk-sync] Clerk user ${clerkUserId} has no username. User will be prompted to set one during onboarding.`);
  }
  
  // Get language from publicMetadata (set during sign-up via additionalFields)
  const language = (clerkUser.publicMetadata?.language as string) || "en";
  // Validate language is one of the allowed values
  const validLanguages = ["en", "cz", "de", "uk", "el"];
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
        firstName: firstName || existingByClerkId.firstName,
        lastName: lastName || existingByClerkId.lastName,
        name,
        // Use Clerk username if available, otherwise keep existing
        username: username || existingByClerkId.username,
        avatar,
        userLanguage: userLanguage as "en" | "cz" | "de" | "uk" | "el",
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
        firstName: firstName || existingByEmail.firstName,
        lastName: lastName || existingByEmail.lastName,
        name: name || existingByEmail.name,
        // Use Clerk username if available, otherwise keep existing
        username: username || existingByEmail.username,
        avatar: avatar || existingByEmail.avatar,
        userLanguage: userLanguage as "en" | "cz" | "de" | "uk" | "el",
        lastLoginAt: new Date(),
      },
    });
  }

  // If user exists with email and has a different clerkUserId, update the existing user
  // (This handles the case where the email is already in use)
  if (existingByEmail && existingByEmail.clerkUserId && existingByEmail.clerkUserId !== clerkUserId) {
    // Email is already associated with a different Clerk account
    // Update the existing user with new Clerk data
    return await prismadb.users.update({
      where: { id: existingByEmail.id },
      data: {
        clerkUserId,
        firstName: firstName || existingByEmail.firstName,
        lastName: lastName || existingByEmail.lastName,
        name: name || existingByEmail.name,
        // Use Clerk username if available, otherwise keep existing
        username: username || existingByEmail.username,
        avatar: avatar || existingByEmail.avatar,
        userLanguage: userLanguage as "en" | "cz" | "de" | "uk" | "el",
        lastLoginAt: new Date(),
      },
    });
  }

  // If user exists with email and has the same clerkUserId, update it
  // (This handles race conditions where existingByClerkId might be null but existingByEmail exists)
  if (existingByEmail && existingByEmail.clerkUserId === clerkUserId) {
    return await prismadb.users.update({
      where: { id: existingByEmail.id },
      data: {
        email,
        firstName: firstName || existingByEmail.firstName,
        lastName: lastName || existingByEmail.lastName,
        name,
        // Use Clerk username if available, otherwise keep existing
        username: username || existingByEmail.username,
        avatar,
        userLanguage: userLanguage as "en" | "cz" | "de" | "uk" | "el",
        lastLoginAt: new Date(),
      },
    });
  }

  // Check if this is the first user in the system
  const userCount = await prismadb.users.count();
  const isFirstUser = userCount === 0;

  // Create new user (only if no existing user found)
  // Wrap in try-catch to handle race conditions where user might be created between checks
  try {
    // Generate friendly ID
    const userId = await generateFriendlyId(prismadb, "Users");

    // Type-safe user creation with onboardingCompleted field
    // Note: Prisma types may need regeneration after schema changes
    const newUser = await prismadb.users.create({
      data: {
        id: userId,
        clerkUserId,
        email,
        firstName,
        lastName,
        name,
        username,
        avatar,
        userLanguage: userLanguage as "en" | "cz" | "de" | "uk" | "el",
        is_admin: isFirstUser,
        is_account_admin: false,
        lastLoginAt: new Date(),
        userStatus: "ACTIVE", // Always create users as ACTIVE - no admin approval needed
        onboardingCompleted: false, // New users must complete onboarding
      },
    });
    return newUser;
  } catch (error) {
    // If unique constraint error (email or clerkUserId), try to find and return existing user
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      // Try to find by clerkUserId first
      const existingUser = await prismadb.users.findFirst({
        where: { clerkUserId },
      });
      if (existingUser) {
        return existingUser;
      }
      // Try to find by email
      const existingByEmailRetry = await prismadb.users.findUnique({
        where: { email },
      });
      if (existingByEmailRetry) {
        // Update it with the clerkUserId if missing
        return await prismadb.users.update({
          where: { id: existingByEmailRetry.id },
          data: {
            clerkUserId,
            firstName: firstName || existingByEmailRetry.firstName,
            lastName: lastName || existingByEmailRetry.lastName,
            name,
            // Use Clerk username if available, otherwise keep existing
            username: username || existingByEmailRetry.username,
            avatar: avatar || existingByEmailRetry.avatar,
            userLanguage: userLanguage as "en" | "cz" | "de" | "uk" | "el",
            lastLoginAt: new Date(),
          },
        });
      }
    }
    // Re-throw if it's not a unique constraint error or we couldn't recover
    throw error;
  }
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

/**
 * Delete all organizations owned by a user and clean up related database records
 * This ensures complete deletion when a user deletes their account
 * Deletes ALL organizations where the user is an admin/owner
 */
export async function deleteUserOwnedOrganizations(clerkUserId: string) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  try {
    // Get all organization memberships for the user
    let organizationMemberships;
    try {
      organizationMemberships = await clerk.users.getOrganizationMembershipList({
        userId: clerkUserId,
      });
    } catch (error: unknown) {
      // If user has no organizations or error fetching, return empty array
      const errorStatus = (error as { status?: number })?.status;
      if (errorStatus === 404) {
        return [];
      }
      throw error;
    }

    const deletedOrgIds: string[] = [];

    // Process each organization membership
    for (const membership of organizationMemberships.data || []) {
      const organizationId = membership.organization.id;
      const role = membership.role;

      // Check if user is owner/admin (org:admin role indicates ownership)
      // In Clerk, org:admin is the owner/admin role
      if (role === "org:admin") {
        try {
          // Verify user is actually an admin by checking organization members
          // This ensures we only delete orgs where user is truly an admin
          let orgMembers;
          try {
            orgMembers = await clerk.organizations.getOrganizationMembershipList({
              organizationId: organizationId,
            });
          } catch (memberError: unknown) {
            // If organization doesn't exist or can't get members, skip it
            const errorStatus = (memberError as { status?: number })?.status;
            if (errorStatus === 404) {
              continue;
            }
            throw memberError;
          }

          // Verify the user is actually an admin in this organization
          const isUserAdmin = orgMembers.data.some(
            (member) => member.publicUserData?.userId === clerkUserId && member.role === "org:admin"
          );

          if (isUserAdmin) {
            // Clean up database records BEFORE deleting from Clerk
            // This ensures data is removed even if Clerk deletion fails
            await cleanupOrganizationData([organizationId]);

            // Delete the organization through Clerk API
            try {
              // Delete the organization - Clerk should handle this synchronously
              await clerk.organizations.deleteOrganization(organizationId);
              
              deletedOrgIds.push(organizationId);
              
              // Note: Verification of deletion is skipped in server context
              // Clerk handles deletion synchronously, and eventual consistency is handled by Clerk
            } catch (orgError: unknown) {
              // If organization already deleted or doesn't exist (404), that's fine
              const errorStatus = (orgError as { status?: number })?.status;
              const errorCode = (orgError as { code?: string })?.code;
              if (errorStatus === 404 || errorCode === "not_found") {
                deletedOrgIds.push(organizationId); // Still count it as deleted since data is cleaned up
              }
              // Continue with other organizations even if one fails
            }
          }
        } catch (error) {
          // Continue with other organizations even if one fails
        }
      }
    }

    return deletedOrgIds;
  } catch (error: unknown) {
    // Handle case where user has no organizations or user doesn't exist
    const errorStatus = (error as { status?: number })?.status;
    const errorCode = (error as { code?: string })?.code;
    if (errorStatus === 404 || errorCode === "not_found") {
      return [];
    }
    throw error;
  }
}

/**
 * Delete an organization by slug (useful for manual cleanup)
 */
export async function deleteOrganizationBySlug(slug: string) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  try {
    // List all organizations and find by slug
    // Note: Clerk API doesn't have direct slug filtering, so we need to search
    let foundOrganization: { id: string; slug: string | null } | null = null;
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore && !foundOrganization) {
      try {
        const organizationsList = await clerk.organizations.getOrganizationList({
          limit,
          offset,
        });

        for (const org of organizationsList.data || []) {
          if (org.slug === slug) {
            foundOrganization = org;
            break;
          }
        }

        hasMore = organizationsList.data && organizationsList.data.length === limit;
        offset += limit;
      } catch (error) {
        hasMore = false;
      }
    }

    if (!foundOrganization) {
      throw new Error(`Organization with slug "${slug}" not found`);
    }

    const organizationId = foundOrganization.id;

    // Clean up database records
    await cleanupOrganizationData([organizationId]);

    // Delete from Clerk
    await clerk.organizations.deleteOrganization(organizationId);

    // Verify deletion
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await clerk.organizations.getOrganization({ organizationId });
      throw new Error(`Organization ${organizationId} still exists after deletion`);
    } catch (verifyError: unknown) {
      const errorStatus = (verifyError as { status?: number })?.status;
      const errorCode = (verifyError as { code?: string })?.code;
      if (errorStatus === 404 || errorCode === "not_found") {
        return { success: true, organizationId, slug };
      }
      throw verifyError;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Clean up database records that reference deleted organization IDs
 */
async function cleanupOrganizationData(organizationIds: string[]) {
  try {
    // Delete clients (CRM accounts) associated with these organizations
    await prismadb.clients.deleteMany({
      where: {
        organizationId: {
          in: organizationIds,
        },
      },
    });

    // Delete properties associated with these organizations
    await prismadb.properties.deleteMany({
      where: {
        organizationId: {
          in: organizationIds,
        },
      },
    });
  } catch (error) {
    // Don't throw - we want to continue even if cleanup fails partially
  }
}
