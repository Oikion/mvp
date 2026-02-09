"use server";

import { revalidatePath } from "next/cache";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { ReservedNameType } from "@prisma/client";

import { isReservedName } from "@/lib/reserved-names";

export async function createOrganizationAction(name: string, slug?: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: "User not authenticated" };
    }

    const clerk = clerkClient() as any;

    // Create the organization
    const resolvedSlug =
      slug ||
      name
        .toLowerCase()
        .replaceAll(/\s+/g, "-")
        .replaceAll(/[^a-z0-9-]/g, "");

    const nameReserved = await isReservedName({
      type: ReservedNameType.ORG_NAME,
      value: name,
    });

    if (nameReserved) {
      return { error: "ORG_NAME_RESERVED" };
    }

    const slugReserved = await isReservedName({
      type: ReservedNameType.ORG_SLUG,
      value: resolvedSlug,
    });

    if (slugReserved) {
      return { error: "ORG_SLUG_RESERVED" };
    }

    const organization = await clerk.organizations.createOrganization({
      name,
      slug: resolvedSlug,
      createdBy: userId,
    });

    // Revalidate the current path to update the UI
    revalidatePath("/");

    return { success: true, organization };
  } catch (error: any) {
    console.error("Error creating organization:", error);
    return { 
      error: error?.message || "Failed to create organization. Please try again." 
    };
  }
}

