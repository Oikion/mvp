"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import resendHelper from "@/lib/resend";
import ShareEntityEmail, { ShareEntityType } from "@/emails/ShareEntity";

export interface ShareViaEmailInput {
  entityType: ShareEntityType;
  entityId: string;
  recipientEmail: string;
  recipientName?: string;
  personalMessage?: string;
}

interface EntityDetails {
  title: string;
  description?: string;
  url: string;
}

/**
 * Get property details for sharing
 */
async function getPropertyDetails(
  entityId: string,
  organizationId: string,
  currentUserId: string,
  baseUrl: string
): Promise<EntityDetails | null> {
  const property = await prismadb.properties.findFirst({
    where: {
      id: entityId,
      OR: [{ assigned_to: currentUserId }, { organizationId }],
    },
    select: {
      id: true,
      property_name: true,
      property_type: true,
      price: true,
      address_city: true,
      address_state: true,
      description: true,
    },
  });

  if (!property) return null;

  const description = [
    property.property_type,
    property.price ? `€${property.price.toLocaleString()}` : null,
    property.address_city,
    property.address_state,
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    title: property.property_name,
    description: description || property.description || undefined,
    url: `${baseUrl}/mls/properties/${property.id}`,
  };
}

/**
 * Get client details for sharing
 */
async function getClientDetails(
  entityId: string,
  organizationId: string,
  currentUserId: string,
  baseUrl: string
): Promise<EntityDetails | null> {
  const client = await prismadb.clients.findFirst({
    where: {
      id: entityId,
      OR: [{ assigned_to: currentUserId }, { organizationId }],
    },
    select: {
      id: true,
      client_name: true,
      primary_email: true,
      intent: true,
      client_status: true,
    },
  });

  if (!client) return null;

  const description = [client.intent, client.client_status]
    .filter(Boolean)
    .join(" • ");

  return {
    title: client.client_name,
    description: description || undefined,
    url: `${baseUrl}/crm/clients/${client.id}`,
  };
}

/**
 * Get post details for sharing
 */
async function getPostDetails(
  entityId: string,
  organizationId: string,
  baseUrl: string
): Promise<EntityDetails | null> {
  const post = await prismadb.socialPost.findFirst({
    where: {
      id: entityId,
      organizationId,
    },
    select: {
      id: true,
      content: true,
      postType: true,
      linkedEntityTitle: true,
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!post) return null;

  let title = "Social Post";
  if (post.linkedEntityTitle) {
    title = post.linkedEntityTitle;
  } else if (post.content) {
    const truncated = post.content.length > 50;
    title = post.content.substring(0, 50) + (truncated ? "..." : "");
  }

  return {
    title,
    description: post.author.name ? `Posted by ${post.author.name}` : undefined,
    url: `${baseUrl}/social-feed?post=${post.id}`,
  };
}

/**
 * Get entity details based on type and ID
 */
async function getEntityDetails(
  entityType: ShareEntityType,
  entityId: string,
  organizationId: string,
  currentUserId: string
): Promise<EntityDetails | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  switch (entityType) {
    case "property":
      return getPropertyDetails(entityId, organizationId, currentUserId, baseUrl);
    case "client":
      return getClientDetails(entityId, organizationId, currentUserId, baseUrl);
    case "post":
      return getPostDetails(entityId, organizationId, baseUrl);
    default:
      return null;
  }
}

/**
 * Share an entity via email
 */
export async function shareViaEmail(input: ShareViaEmailInput) {
  const currentUser = await getCurrentUser();
  const organizationId = await getCurrentOrgId();
  const resend = await resendHelper();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.recipientEmail)) {
    return { success: false, error: "Invalid email address" };
  }

  // Get entity details
  const entityDetails = await getEntityDetails(
    input.entityType,
    input.entityId,
    organizationId,
    currentUser.id
  );

  if (!entityDetails) {
    return {
      success: false,
      error: "Entity not found or you don't have permission to share it",
    };
  }

  // Determine user language (default to English for external shares)
  const userLanguage = (currentUser.userLanguage as "en" | "el") || "en";

  // Build subject line
  const senderName = currentUser.name || currentUser.email || "Someone";
  const subjectMap = {
    en: {
      property: `${senderName} shared a property with you`,
      client: `${senderName} shared a client with you`,
      post: `${senderName} shared a post with you`,
    },
    el: {
      property: `Ο/Η ${senderName} μοιράστηκε ένα ακίνητο μαζί σας`,
      client: `Ο/Η ${senderName} μοιράστηκε έναν πελάτη μαζί σας`,
      post: `Ο/Η ${senderName} μοιράστηκε μια δημοσίευση μαζί σας`,
    },
  };

  const subject = subjectMap[userLanguage]?.[input.entityType] || subjectMap.en[input.entityType];

  try {
    const result = await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`,
      to: input.recipientEmail,
      subject,
      react: ShareEntityEmail({
        senderName,
        senderEmail: currentUser.email,
        recipientName: input.recipientName || input.recipientEmail.split("@")[0],
        entityType: input.entityType,
        entityTitle: entityDetails.title,
        entityDescription: entityDetails.description,
        entityUrl: entityDetails.url,
        personalMessage: input.personalMessage,
        userLanguage,
      }),
    });

    // Log the share for analytics (optional)
    console.log(
      `[ShareViaEmail] ${currentUser.email} shared ${input.entityType}:${input.entityId} to ${input.recipientEmail}`
    );

    return { success: true, data: result };
  } catch (error) {
    console.error("[ShareViaEmail] Error sending email:", error);
    return {
      success: false,
      error: "Failed to send email. Please try again later.",
    };
  }
}

/**
 * Share multiple entities via email at once
 */
export async function shareMultipleViaEmail(
  entities: Array<{ entityType: ShareEntityType; entityId: string }>,
  recipientEmail: string,
  recipientName?: string,
  personalMessage?: string
) {
  const results = await Promise.all(
    entities.map((entity) =>
      shareViaEmail({
        entityType: entity.entityType,
        entityId: entity.entityId,
        recipientEmail,
        recipientName,
        personalMessage,
      })
    )
  );

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    summary: { successful, failed, total: entities.length },
    results,
  };
}
