"use server";

import { getCurrentOrgIdSafe, getCurrentUserSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { prismaForOrg } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { generateFriendlyId } from "@/lib/friendly-id";

interface CreateSocialPostInput {
  type: "property" | "client" | "text";
  content: string;
  linkedEntityId?: string;
  attachmentIds?: string[];
}

interface CreateSocialPostResult {
  success: boolean;
  post?: any;
  visibility?: "PERSONAL" | "SECURE" | "PUBLIC";
  message?: string;
}

/**
 * Get the current user's profile visibility status
 */
export async function getMyProfileVisibility(): Promise<{ 
  hasProfile: boolean; 
  visibility: "PERSONAL" | "SECURE" | "PUBLIC";
}> {
  const currentUser = await getCurrentUserSafe();
  
  if (!currentUser) {
    return { hasProfile: false, visibility: "PERSONAL" };
  }

  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { visibility: true },
  });

  return {
    hasProfile: !!profile,
    visibility: (profile?.visibility as "PERSONAL" | "SECURE" | "PUBLIC") || "PERSONAL",
  };
}

export async function createSocialPost(input: CreateSocialPostInput): Promise<CreateSocialPostResult> {
  const orgId = await getCurrentOrgIdSafe();
  const currentUser = await getCurrentUserSafe();
  
  if (!orgId || !currentUser) {
    throw new Error("Not authenticated");
  }

  const { type, content, linkedEntityId, attachmentIds } = input;

  // Check user's profile visibility
  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { visibility: true },
  });

  const visibility = (profile?.visibility as "PERSONAL" | "SECURE" | "PUBLIC") || "PERSONAL";

  let linkedEntityTitle: string | undefined = undefined;
  let linkedEntitySubtitle: string | undefined = undefined;
  let linkedEntityMetadata: Record<string, any> | undefined = undefined;

  // Fetch linked entity details if provided
  if (linkedEntityId && (type === "property" || type === "client")) {
    const prisma = prismaForOrg(orgId);

    if (type === "property") {
      const property = await prisma.properties.findUnique({
        where: { id: linkedEntityId },
        select: {
          property_name: true,
          municipality: true,
          area: true,
          price: true,
          property_type: true,
          transaction_type: true,
        },
      });

      if (property) {
        linkedEntityTitle = property.property_name || "Unnamed Property";
        linkedEntitySubtitle = [property.municipality, property.area].filter(Boolean).join(", ") || undefined;
        linkedEntityMetadata = {
          price: property.price,
          propertyType: property.property_type,
          transactionType: property.transaction_type,
        };
      }
    } else if (type === "client") {
      const client = await prisma.clients.findUnique({
        where: { id: linkedEntityId },
        select: {
          client_name: true,
          intent: true,
          person_type: true,
          budget_min: true,
          budget_max: true,
        },
      });

      if (client) {
        linkedEntityTitle = client.client_name || "Unnamed Client";
        linkedEntitySubtitle = client.intent || undefined;
        linkedEntityMetadata = {
          intent: client.intent,
          personType: client.person_type,
          budgetMin: client.budget_min ? Number(client.budget_min) : null,
          budgetMax: client.budget_max ? Number(client.budget_max) : null,
        };
      }
    }
  }

  try {
    // Generate friendly ID
    const postId = await generateFriendlyId(prismadb, "SocialPost");

    const post = await prismadb.socialPost.create({
      data: {
        id: postId,
        organizationId: orgId,
        authorId: currentUser.id,
        postType: type,
        content: content || null,
        linkedEntityId: linkedEntityId || null,
        linkedEntityType: linkedEntityId ? type : null,
        linkedEntityTitle,
        linkedEntitySubtitle,
        linkedEntityMetadata,
      },
    });

    // Link attachments to the post
    if (attachmentIds && attachmentIds.length > 0) {
      await prismadb.attachment.updateMany({
        where: {
          id: { in: attachmentIds },
          uploadedById: currentUser.id,
          socialPostId: null, // Only link unattached ones
        },
        data: {
          socialPostId: post.id,
        },
      });
    }

    revalidatePath("/social-feed");
    
    // Provide context-specific messages based on visibility
    let message: string;
    switch (visibility) {
      case "PERSONAL":
        message = "Post created. Only your connections can see it (your profile is Personal).";
        break;
      case "SECURE":
        message = "Post created. Registered users and your connections can see it.";
        break;
      case "PUBLIC":
        message = "Post created successfully and is visible to everyone.";
        break;
    }
    
    return {
      success: true,
      post,
      visibility,
      message,
    };
  } catch (error) {
    console.error("Error creating social post:", error);
    throw new Error("Failed to create post");
  }
}
