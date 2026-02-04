"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import resendHelper from "@/lib/resend";
import { FeatureAccessRequestEmail } from "@/emails/admin/FeatureAccessRequest";

// Platform admin email for feature access requests
const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || "contact@oikion.com";

// Feature display names mapping
const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  market_intel: "Market Intelligence",
  ai_assistant: "AI Assistant",
};

interface RequestFeatureAccessInput {
  feature: string;
  message: string;
}

interface RequestFeatureAccessResult {
  success: boolean;
  error?: string;
}

/**
 * Request access to a premium feature for the current organization.
 * Sends an email notification to platform admins and creates a record
 * to track the request.
 */
export async function requestFeatureAccess(
  input: RequestFeatureAccessInput
): Promise<RequestFeatureAccessResult> {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgIdSafe();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    if (!orgId) {
      return { success: false, error: "Organization context required" };
    }

    // Validate feature
    const { feature, message } = input;
    const featureDisplayName = FEATURE_DISPLAY_NAMES[feature];
    
    if (!featureDisplayName) {
      return { success: false, error: "Invalid feature specified" };
    }

    if (!message || message.trim().length < 10) {
      return { success: false, error: "Please provide a detailed reason (at least 10 characters)" };
    }

    // Check if organization already has access
    const existingFeature = await prismadb.organizationFeature.findUnique({
      where: {
        organizationId_feature: {
          organizationId: orgId,
          feature,
        },
      },
    });

    if (existingFeature?.isEnabled) {
      return { success: false, error: "Your organization already has access to this feature" };
    }

    // Check if there's a pending request (using metadata field)
    if (existingFeature?.metadata) {
      const metadata = existingFeature.metadata as { requestStatus?: string };
      if (metadata.requestStatus === "pending") {
        return { success: false, error: "Your organization already has a pending request for this feature" };
      }
    }

    // Get organization details from Clerk
    const clerk = await clerkClient();
    let org;
    try {
      org = await clerk.organizations.getOrganization({ organizationId: orgId });
    } catch {
      return { success: false, error: "Failed to retrieve organization details" };
    }

    // Create or update the feature record with pending status
    await prismadb.organizationFeature.upsert({
      where: {
        organizationId_feature: {
          organizationId: orgId,
          feature,
        },
      },
      create: {
        organizationId: orgId,
        feature,
        isEnabled: false,
        metadata: {
          requestStatus: "pending",
          requestedBy: user.id,
          requestedAt: new Date().toISOString(),
          requestMessage: message.trim(),
        },
      },
      update: {
        metadata: {
          requestStatus: "pending",
          requestedBy: user.id,
          requestedAt: new Date().toISOString(),
          requestMessage: message.trim(),
        },
      },
    });

    // Send email notification to platform admin
    try {
      const resend = await resendHelper();
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Oikion <mail@oikion.com>",
        to: ADMIN_EMAIL,
        subject: `Feature Access Request: ${featureDisplayName} from ${org.name}`,
        react: FeatureAccessRequestEmail({
          userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unknown User",
          userEmail: user.email || "",
          organizationName: org.name,
          organizationId: orgId,
          feature,
          featureDisplayName,
          message: message.trim(),
        }),
      });
    } catch (emailError) {
      console.error("[requestFeatureAccess] Failed to send email:", emailError);
      // Don't fail the request if email fails - the record is created
    }

    return { success: true };
  } catch (error) {
    console.error("[requestFeatureAccess] Error:", error);
    return { success: false, error: "Failed to submit access request" };
  }
}
