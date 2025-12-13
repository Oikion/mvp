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
  } catch (error: any) {
    // Handle Clerk API errors (e.g., user not found, API errors)
    const errorStatus = error?.status;
    const errorCode = error?.code;
    const errorMessage = error?.message || "";
    const firstError = error?.errors?.[0];
    
    // Check various ways Clerk might indicate user not found
    if (
      errorStatus === 404 ||
      errorCode === "not_found" ||
      firstError?.code === "not_found" ||
      errorMessage.toLowerCase().includes("not found") ||
      errorMessage.toLowerCase().includes("does not exist")
    ) {
      const notFoundError = new Error(`Clerk user not found: ${clerkUserId}`);
      // Attach error details for better handling upstream
      (notFoundError as any).status = 404;
      (notFoundError as any).code = "not_found";
      throw notFoundError;
    }
    // Re-throw other errors
    throw error;
  }

  if (!clerkUser) {
    const notFoundError = new Error(`Clerk user not found: ${clerkUserId}`);
    // Attach error details for better handling upstream
    (notFoundError as any).status = 404;
    (notFoundError as any).code = "not_found";
    throw notFoundError;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = clerkUser.firstName && clerkUser.lastName
    ? `${clerkUser.firstName} ${clerkUser.lastName}`
    : clerkUser.firstName || clerkUser.lastName || clerkUser.username || email?.split("@")[0] || "User";
  const avatar = clerkUser.imageUrl || null;
  
  // Generate username if not provided - use Clerk username or create from email
  const username = clerkUser.username || email?.split("@")[0] || `user_${clerkUserId.substring(0, 8)}`;
  
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
        name,
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
        name: name || existingByEmail.name,
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
        name: name || existingByEmail.name,
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
        name,
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
            name,
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
    } catch (error: any) {
      // If user has no organizations or error fetching, return empty array
      if (error?.status === 404) {
        console.log(`[DELETE_ORG] User ${clerkUserId} has no organizations`);
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
          } catch (memberError: any) {
            // If organization doesn't exist or can't get members, skip it
            if (memberError?.status === 404) {
              console.log(`[DELETE_ORG] Organization ${organizationId} not found, skipping`);
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
              // Get organization details before deletion for logging
              let orgDetails;
              try {
                orgDetails = await clerk.organizations.getOrganization({ organizationId });
              } catch (getError: any) {
                // If we can't get org details, still try to delete
                console.warn(`[DELETE_ORG] Could not fetch org details for ${organizationId}`);
              }

              // Delete the organization - Clerk should handle this synchronously
              await clerk.organizations.deleteOrganization(organizationId);
              
              deletedOrgIds.push(organizationId);
              console.log(`[DELETE_ORG] Successfully deleted organization ${organizationId}${orgDetails ? ` (slug: ${orgDetails.slug})` : ''} owned by user ${clerkUserId}`);
              
              // Note: Verification of deletion is skipped in server context
              // Clerk handles deletion synchronously, and eventual consistency is handled by Clerk
            } catch (orgError: any) {
              // If organization already deleted or doesn't exist (404), that's fine
              if (orgError?.status === 404 || orgError?.code === "not_found") {
                console.log(`[DELETE_ORG] Organization ${organizationId} already deleted or doesn't exist`);
                deletedOrgIds.push(organizationId); // Still count it as deleted since data is cleaned up
              } else {
                console.error(`[DELETE_ORG] Failed to delete organization ${organizationId}:`, orgError);
                // Log the error but continue with other organizations
                // The organization might be in a state that prevents deletion
                console.error(`[DELETE_ORG] Error details:`, {
                  status: orgError?.status,
                  code: orgError?.code,
                  message: orgError?.message,
                });
              }
            }
          }
        } catch (error: any) {
          console.error(`[DELETE_ORG] Error processing organization ${organizationId}:`, error);
          // Continue with other organizations even if one fails
          // Log detailed error information
          console.error(`[DELETE_ORG] Error details:`, {
            organizationId,
            status: error?.status,
            code: error?.code,
            message: error?.message,
          });
        }
      }
    }

    return deletedOrgIds;
  } catch (error: any) {
    // Handle case where user has no organizations or user doesn't exist
    if (error?.status === 404 || error?.code === "not_found") {
      console.log(`[DELETE_ORG] User ${clerkUserId} has no organizations or user not found`);
      return [];
    }
    console.error(`[DELETE_ORG] Error deleting organizations for user ${clerkUserId}:`, error);
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
    let foundOrganization: any = null;
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
      } catch (error: any) {
        console.error(`[DELETE_ORG_BY_SLUG] Error fetching organizations:`, error);
        hasMore = false;
      }
    }

    if (!foundOrganization) {
      throw new Error(`Organization with slug "${slug}" not found`);
    }

    const organizationId = foundOrganization.id;

    console.log(`[DELETE_ORG_BY_SLUG] Found organization ${organizationId} with slug "${slug}"`);

    // Clean up database records
    await cleanupOrganizationData([organizationId]);

    // Delete from Clerk
    await clerk.organizations.deleteOrganization(organizationId);

    // Verify deletion
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await clerk.organizations.getOrganization(organizationId);
      throw new Error(`Organization ${organizationId} still exists after deletion`);
    } catch (verifyError: any) {
      if (verifyError?.status === 404 || verifyError?.code === "not_found") {
        console.log(`[DELETE_ORG_BY_SLUG] Successfully deleted organization "${slug}" (${organizationId})`);
        return { success: true, organizationId, slug };
      }
      throw verifyError;
    }
  } catch (error: any) {
    console.error(`[DELETE_ORG_BY_SLUG] Error deleting organization by slug "${slug}":`, error);
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

    // Delete OpenAI keys associated with these organizations
    await prismadb.openAi_keys.deleteMany({
      where: {
        organization_id: {
          in: organizationIds,
        },
      },
    });

    console.log(`[CLEANUP_ORG_DATA] Cleaned up data for ${organizationIds.length} organizations`);
  } catch (error) {
    console.error(`[CLEANUP_ORG_DATA] Error cleaning up organization data:`, error);
    // Don't throw - we want to continue even if cleanup fails partially
  }
}
