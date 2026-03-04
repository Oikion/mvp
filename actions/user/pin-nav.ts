"use server"

import { getCurrentUser } from "@/lib/get-current-user"
import { prismadb } from "@/lib/prisma"

const MAX_PINS = 5

export async function updatePinnedNavUrls(
  urls: string[]
): Promise<{ success: boolean; pinnedNavUrls?: string[]; error?: string }> {
  try {
    const user = await getCurrentUser()

    if (urls.length > MAX_PINS) {
      return { success: false, error: `Maximum ${MAX_PINS} pins allowed` }
    }

    const updated = await prismadb.users.update({
      where: { id: user.id },
      data: { pinnedNavUrls: urls },
      select: { pinnedNavUrls: true },
    })

    return { success: true, pinnedNavUrls: updated.pinnedNavUrls }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update pinned nav items",
    }
  }
}
