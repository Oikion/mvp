"use server";

import { getCurrentUserSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteSocialPost(postId: string) {
  const currentUser = await getCurrentUserSafe();
  
  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  try {
    // Verify the post belongs to the current user
    const post = await prismadb.socialPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    if (post.authorId !== currentUser.id) {
      throw new Error("Not authorized to delete this post");
    }

    await prismadb.socialPost.delete({
      where: { id: postId },
    });

    revalidatePath("/social-feed");
    return { success: true };
  } catch (error) {
    console.error("Error deleting social post:", error);
    throw new Error("Failed to delete post");
  }
}









