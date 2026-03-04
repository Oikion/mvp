"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";

export interface ToggleNetworkFeatureInput {
  organizationId: string;
  isEnabled: boolean;
}

export async function toggleNetworkFeature(
  input: ToggleNetworkFeatureInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePlatformAdmin();
    const { userId } = await auth();

    await prismadb.organizationFeature.upsert({
      where: {
        organizationId_feature: {
          organizationId: input.organizationId,
          feature: "network",
        },
      },
      create: {
        organizationId: input.organizationId,
        feature: "network",
        isEnabled: input.isEnabled,
        grantedBy: userId ?? admin.clerkId,
        grantedAt: input.isEnabled ? new Date() : null,
      },
      update: {
        isEnabled: input.isEnabled,
        grantedBy: input.isEnabled ? (userId ?? admin.clerkId) : undefined,
        grantedAt: input.isEnabled ? new Date() : null,
      },
    });

    await logAdminAction(
      admin.clerkId,
      input.isEnabled ? "ENABLE_NETWORK_FEATURE" : "DISABLE_NETWORK_FEATURE",
      input.organizationId
    );

    return { success: true };
  } catch (error) {
    console.error("[TOGGLE_NETWORK_FEATURE]", error);
    return { success: false, error: "Failed to toggle network feature" };
  }
}
