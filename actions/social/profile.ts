"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentUserSafe } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

// Profile visibility levels
export type ProfileVisibility = "PERSONAL" | "SECURE" | "PUBLIC";

export interface AgentProfileInput {
  bio?: string;
  publicPhone?: string;
  publicEmail?: string;
  specializations?: string[];
  serviceAreas?: string[];
  languages?: string[];
  yearsExperience?: number;
  certifications?: string[];
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  visibility?: ProfileVisibility;
}

/**
 * Get the current user's agent profile
 */
export async function getMyAgentProfile() {
  const currentUser = await getCurrentUser();

  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          username: true,
        },
      },
    },
  });

  // Return profile with slug derived from username
  if (profile) {
    return {
      ...profile,
      slug: profile.user.username || profile.slug,
    };
  }

  return profile;
}

/**
 * Get a public agent profile by username
 * Profile URL is now based on the user's username
 * @param username - the user's username (used as profile URL)
 * @param isAuthenticated - whether the requesting user is logged in
 */
export async function getAgentProfileBySlug(username: string, isAuthenticated: boolean = false) {
  // First, find the user by username
  const user = await prismadb.users.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  // Then get the profile for that user
  const profile = await prismadb.agentProfile.findFirst({
    where: {
      userId: user.id,
      // PERSONAL profiles are never visible
      // SECURE profiles require authentication
      // PUBLIC profiles are always visible
      visibility: isAuthenticated 
        ? { in: ["PUBLIC", "SECURE"] } 
        : "PUBLIC",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          username: true,
          _count: {
            select: {
              followers: {
                where: { status: "ACCEPTED" },
              },
              following: {
                where: { status: "ACCEPTED" },
              },
            },
          },
        },
      },
      // Get showcased properties with their order
      showcaseProperties: {
        orderBy: { order: "asc" },
        include: {
          property: {
            select: {
              id: true,
              property_name: true,
              property_type: true,
              transaction_type: true,
              price: true,
              address_city: true,
              address_state: true,
              bedrooms: true,
              bathrooms: true,
              square_feet: true,
              size_net_sqm: true,
              linkedDocuments: {
                where: {
                  document_file_mimeType: {
                    startsWith: "image/",
                  },
                },
                select: {
                  document_file_url: true,
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  // Transform the data to match the expected format
  // Properties are now sourced from showcaseProperties instead of user.properties
  // Slug is now derived from username for consistency
  const transformedProfile = {
    ...profile,
    slug: profile.user.username || profile.slug, // Use username as the URL slug
    user: {
      ...profile.user,
      properties: profile.showcaseProperties.map((sp) => sp.property),
      _count: {
        ...profile.user._count,
        properties: profile.showcaseProperties.length,
      },
    },
  };

  return transformedProfile;
}

/**
 * Check if a slug is available
 */
export async function checkSlugAvailability(slug: string, excludeUserId?: string) {
  const existing = await prismadb.agentProfile.findFirst({
    where: {
      slug,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
  });

  return !existing;
}

/**
 * Generate a unique slug from a name
 */
export async function generateUniqueSlug(baseName: string): Promise<string> {
  const baseSlug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = baseSlug;
  let counter = 1;

  while (!(await checkSlugAvailability(slug))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Create or update agent profile
 * Profile URL is derived from user's username - no custom slug allowed
 */
export async function upsertAgentProfile(input: AgentProfileInput) {
  const currentUser = await getCurrentUser();

  // Profile URL is based on username - user must have a username set
  if (!currentUser.username) {
    throw new Error("Please set your username in your account settings first. Your username will be your public profile URL.");
  }

  const existingProfile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
  });

  // The slug is synced with username for database consistency
  const slug = currentUser.username.toLowerCase();

  const profileData = {
    slug,
    bio: input.bio,
    publicPhone: input.publicPhone,
    publicEmail: input.publicEmail || currentUser.email,
    specializations: input.specializations || [],
    serviceAreas: input.serviceAreas || [],
    languages: input.languages || [],
    yearsExperience: input.yearsExperience,
    certifications: input.certifications || [],
    socialLinks: input.socialLinks || {},
    visibility: input.visibility ?? "PERSONAL",
  };

  if (existingProfile) {
    const profile = await prismadb.agentProfile.update({
      where: { userId: currentUser.id },
      data: profileData,
    });
    revalidatePath("/profile/public");
    revalidatePath(`/agent/${currentUser.username}`);
    return profile;
  } else {
    const profile = await prismadb.agentProfile.create({
      data: {
        userId: currentUser.id,
        ...profileData,
      },
    });
    revalidatePath("/profile/public");
    return profile;
  }
}

/**
 * Update profile visibility
 */
export async function updateProfileVisibility(visibility: ProfileVisibility) {
  const currentUser = await getCurrentUser();

  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
  });

  if (!profile) {
    throw new Error("Profile not found. Please create your profile first.");
  }

  const updated = await prismadb.agentProfile.update({
    where: { userId: currentUser.id },
    data: { visibility },
  });

  revalidatePath("/profile/public");
  // Use username for revalidation since that's the URL
  if (currentUser.username) {
    revalidatePath(`/agent/${currentUser.username}`);
  }

  return updated;
}

/**
 * Search agent profiles (only PUBLIC and SECURE for authenticated users)
 */
export async function searchAgentProfiles(query: string, limit: number = 20) {
  const currentUser = await getCurrentUserSafe();
  const isAuthenticated = !!currentUser;

  const profiles = await prismadb.agentProfile.findMany({
    where: {
      // Only show PUBLIC profiles to everyone, SECURE to authenticated users
      visibility: isAuthenticated 
        ? { in: ["PUBLIC", "SECURE"] } 
        : "PUBLIC",
      // Only show profiles for users that have a username (required for public URL)
      user: {
        username: { not: null },
      },
      OR: [
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { username: { contains: query, mode: "insensitive" } } },
        { bio: { contains: query, mode: "insensitive" } },
        { serviceAreas: { hasSome: [query] } },
        { specializations: { hasSome: [query] } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          username: true,
          _count: {
            select: {
              properties: {
                where: {
                  portal_visibility: "PUBLIC",
                  property_status: "ACTIVE",
                },
              },
            },
          },
        },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  // Transform to use username as slug
  return profiles.map((profile) => ({
    ...profile,
    slug: profile.user.username || profile.slug,
  }));
}

