"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createOrganizationAction(name: string, slug?: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: "User not authenticated" };
    }

    const clerk = clerkClient();

    // Create the organization
    const organization = await clerk.organizations.createOrganization({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
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

