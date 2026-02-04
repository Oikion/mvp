"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

export async function deleteConversation(id: string) {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgIdSafe();
  
  if (!user || !organizationId) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify ownership before deleting
    const existing = await prismadb.aiConversation.findFirst({
      where: {
        id,
        organizationId,
        userId: user.id,
      },
    });

    if (!existing) {
      throw new Error("Conversation not found");
    }

    await prismadb.aiConversation.delete({
      where: { id },
    });

    revalidatePath("/ai");

    return { success: true };
  } catch (error) {
    console.error("[DELETE_CONVERSATION]", error);
    throw new Error("Failed to delete conversation");
  }
}
