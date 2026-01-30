"use server";

import { getCurrentUserSafe, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireActionOnEntity } from "@/lib/permissions/action-guards";

export async function deleteSocialPost(postId: string) {
  const currentUser = await getCurrentUserSafe();
  const orgId = await getCurrentOrgIdSafe();
  
  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  try {
    // Verify the post belongs to the current user
    const post = await prismadb.socialPost.findUnique({
      where: { id: postId },
      select: { authorId: true, organizationId: true },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // Permission check: Users need social:delete_post permission with ownership check
    const guard = await requireActionOnEntity(
      "social:delete_post",
      "post" as any,
      postId,
      post.authorId
    );
    if (guard) throw new Error(guard.error);

    if (post.authorId !== currentUser.id) {
      throw new Error("Not authorized to delete this post");
    }

    await prismadb.socialPost.delete({
      where: { id: postId },
    });

    revalidatePath("/social-feed");

    // Publish Ably event for real-time updates
    try {
      const { publishToChannel, getSocialFeedChannelName } = await import("@/lib/ably");
      await publishToChannel(
        getSocialFeedChannelName(post.organizationId),
        "post",
        { type: "deleted", post: { id: postId } }
      );
    } catch {
      // Ably not configured, skip real-time notification
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting social post:", error);
    throw new Error("Failed to delete post");
  }
}















