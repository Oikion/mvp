"use server";

import { getCurrentOrgIdSafe, getCurrentUserSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { prismaForOrg } from "@/lib/tenant";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { revalidatePath } from "next/cache";
import { generateFriendlyId } from "@/lib/friendly-id";
import { randomBytes } from "crypto";
import { requireAction } from "@/lib/permissions/action-guards";

/**
 * Generate a unique URL-friendly slug for a post
 */
function generatePostSlug(): string {
  // Generate a 6-character URL-safe slug
  return randomBytes(4).toString("base64url").slice(0, 6);
}

interface CreateSocialPostInput {
  type: "property" | "client" | "mandate" | "document" | "text";
  content: string;
  linkedEntityId?: string;
  attachmentIds?: string[];
}

interface CreateSocialPostResult {
  success: boolean;
  post?: any;
  visibility?: "PRIVATE" | "SECURE" | "PUBLIC";
  message?: string;
}

/**
 * Get the current user's profile visibility status
 */
export async function getMyProfileVisibility(): Promise<{ 
  hasProfile: boolean; 
  visibility: "PRIVATE" | "SECURE" | "PUBLIC";
}> {
  const currentUser = await getCurrentUserSafe();

  if (!currentUser) {
    return { hasProfile: false, visibility: "PRIVATE" };
  }

  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { visibility: true },
  });

  return {
    hasProfile: !!profile,
    visibility: (profile?.visibility as "PRIVATE" | "SECURE" | "PUBLIC") || "PRIVATE",
  };
}

export async function createSocialPost(input: CreateSocialPostInput): Promise<CreateSocialPostResult> {
  // Permission check: Users need social:create_post permission
  const guard = await requireAction("social:create_post");
  if (guard) return guard;

  const orgId = await getCurrentOrgIdSafe();
  const currentUser = await getCurrentUserSafe();
  
  if (!orgId || !currentUser) {
    return { success: false, message: "Not authenticated" };
  }

  const { type, content, linkedEntityId, attachmentIds } = input;

  // Check user's profile visibility
  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { visibility: true },
  });

  const visibility = (profile?.visibility as "PRIVATE" | "SECURE" | "PUBLIC") || "PRIVATE";

  let linkedEntityTitle: string | undefined = undefined;
  let linkedEntitySubtitle: string | undefined = undefined;
  let linkedEntityMetadata: Record<string, any> | undefined = undefined;

  // Fetch linked entity details if provided
  if (linkedEntityId && type !== "text") {
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
      const client = await prisma.contact.findUnique({
        where: { id: linkedEntityId },
        select: {
          displayName: true,
          status: true,
        },
      });

      if (client) {
        const decrypted = await decryptContactForOrg(client, orgId);
        linkedEntityTitle = decrypted.displayName || "Unnamed Contact";
        linkedEntitySubtitle = decrypted.status || undefined;
        linkedEntityMetadata = {
          status: decrypted.status,
        };
      }
    } else if (type === "mandate") {
      const mandate = await prisma.mandate.findUnique({
        where: { id: linkedEntityId },
        select: { title: true, transaction_type: true, property_type: true },
      });

      if (mandate) {
        linkedEntityTitle = mandate.title || "Unnamed Mandate";
        linkedEntityMetadata = {
          transactionType: mandate.transaction_type,
          propertyType: mandate.property_type,
        };
      }
    } else if (type === "document") {
      const document = await prisma.documents.findUnique({
        where: { id: linkedEntityId },
        select: { document_name: true },
      });

      if (document) {
        linkedEntityTitle = document.document_name || "Unnamed Document";
      }
    }
  }

  try {
    // Generate friendly ID and URL slug
    const postId = await generateFriendlyId(prismadb, "SocialPost", orgId);
    const postSlug = generatePostSlug();

    const post = await prismadb.socialPost.create({
      data: {
        id: postId,
        slug: postSlug,
        organizationId: orgId,
        authorId: currentUser.id,
        postType: type,
        content: content || null,
        linkedEntityId: linkedEntityId || null,
        linkedEntityType: linkedEntityId ? type : null,
        linkedEntityTitle,
        linkedEntitySubtitle,
        linkedEntityMetadata,
        updatedAt: new Date(),
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

    revalidatePath("/network/feed");

    // Publish Ably event for real-time updates
    try {
      const { publishToChannel, getSocialFeedChannelName } = await import("@/lib/ably");
      
      // Fetch attachments for the post
      const attachments = await prismadb.attachment.findMany({
        where: { socialPostId: post.id },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          url: true,
        },
      });

      // SECURITY: Ably is an external service — never send decrypted PII
      // (client names, entity titles, post content) through its servers.
      // Subscribers fetch the full post via API using the post ID.
      const postData = {
        id: post.id,
        slug: post.slug,
        type: type,
        timestamp: post.createdAt.toISOString(),
        authorId: currentUser.id,
        linkedEntityId: linkedEntityId || undefined,
        linkedEntityType: linkedEntityId ? type : undefined,
        hasAttachments: attachments.length > 0,
      };

      await publishToChannel(
        getSocialFeedChannelName(orgId),
        "post",
        { type: "created", post: postData }
      );
    } catch {
      // Ably not configured, skip real-time notification
    }
    
    // Provide context-specific messages based on visibility
    let message: string;
    switch (visibility) {
      case "PRIVATE":
        message = "Post created. Only your connections can see it (your profile is Private).";
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
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create post",
    };
  }
}
