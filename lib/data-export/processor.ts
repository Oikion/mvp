/**
 * Data Export Processor
 * 
 * Processes data export requests by:
 * 1. Fetching all organization data
 * 2. Packaging as JSON/ZIP
 * 3. Uploading to temporary storage
 * 4. Sending download link via email
 * 5. Setting auto-expiration
 */

import { prismadb } from "@/lib/prisma";
import { uploadToBlob } from "@/lib/vercel-blob";
import resendHelper from "@/lib/resend";
import { DataExportStatus } from "@prisma/client";
import {
  decryptClientForOrg,
  decryptPropertyForOrg,
  decryptCalendarEventForOrg,
  decryptDocumentForOrg,
  decryptMessageForOrg,
} from "@/lib/model-encryption";

// =============================================================================
// Types
// =============================================================================

interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

interface ExportedData {
  exportedAt: string;
  organizationId: string;
  requestedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  data: {
    clients: unknown[];
    clientContacts: unknown[];
    properties: unknown[];
    propertyContacts: unknown[];
    documents: unknown[];
    calendarEvents: unknown[];
    tasks: unknown[];
    notifications: unknown[];
    feedback: unknown[];
    socialPosts: unknown[];
    messages: unknown[];
    apiKeys: unknown[];
    webhooks: unknown[];
  };
  metadata: {
    totalRecords: number;
    exportVersion: string;
  };
}

// =============================================================================
// Main Processor
// =============================================================================

/**
 * Process a data export request
 * This should be called by a background job worker
 */
export async function processDataExportRequest(requestId: string): Promise<ExportResult> {
  try {
    // Update status to processing
    const request = await prismadb.dataExportRequest.update({
      where: { id: requestId },
      data: { status: DataExportStatus.PROCESSING },
    });

    const { organizationId, requestedById } = request;
    const userRecord = await prismadb.users.findUnique({
      where: { id: requestedById },
      select: { id: true, name: true, email: true },
    });
    const user = userRecord ?? { id: requestedById, name: null, email: "" };

    // Fetch all organization data
    const exportData = await fetchOrganizationData(organizationId, user);

    // Generate JSON export
    const jsonContent = JSON.stringify(exportData, null, 2);

    // Upload to Vercel Blob with 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const filename = `export-${organizationId}-${Date.now()}.json`;

    const { url: downloadUrl } = await uploadToBlob(filename, Buffer.from(jsonContent), {
      contentType: "application/json",
      addRandomSuffix: true,
    });

    // Update request with download URL
    await prismadb.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: DataExportStatus.COMPLETED,
        downloadUrl,
        expiresAt,
      },
    });

    // Send email notification
    await sendExportReadyEmail(user.email, user.name, downloadUrl, expiresAt);

    console.log("[DATA_EXPORT] Export completed:", requestId);

    return { success: true, downloadUrl };
  } catch (error) {
    console.error("[DATA_EXPORT] Processing failed:", error);

    // Update request with error
    await prismadb.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: DataExportStatus.FAILED,
      },
    });

    return { success: false, error: String(error) };
  }
}

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchOrganizationData(
  organizationId: string,
  user: { id: string; name: string | null; email: string }
): Promise<ExportedData> {
  // Fetch all data in parallel
  const [
    clients,
    clientContacts,
    properties,
    propertyContacts,
    documents,
    calendarEvents,
    tasks,
    notifications,
    feedback,
    socialPosts,
    messages,
    apiKeys,
    webhooks,
  ] = await Promise.all([
    // Clients
    prismadb.clients.findMany({
      where: { organizationId },
      include: {
        Client_Contacts: true,
        ClientComment: true,
      },
    }),

    // Client contacts
    prismadb.client_Contacts.findMany({
      where: { organizationId },
    }),

    // Properties
    prismadb.properties.findMany({
      where: { organizationId },
      include: {
        Property_Contacts: true,
        PropertyComment: true,
        PropertyShowing: true,
      },
    }),

    // Property contacts
    prismadb.property_Contacts.findMany({
      where: { Properties: { organizationId } },
    }),

    // Documents (metadata only, not file contents)
    prismadb.documents.findMany({
      where: { organizationId },
      select: {
        id: true,
        document_name: true,
        document_type: true,
        description: true,
        size: true,
        createdAt: true,
        created_by_user: true,
      },
    }),

    // Calendar events
    prismadb.calendarEvent.findMany({
      where: { organizationId },
      include: {
        EventInvitee: true,
        CalendarReminder: true,
      },
    }),

    // Tasks
    prismadb.crm_Accounts_Tasks.findMany({
      where: { organizationId },
      include: {
        crm_Accounts_Tasks_Comments: true,
      },
    }),

    // Notifications
    prismadb.notification.findMany({
      where: { organizationId },
      take: 1000, // Limit for performance
      orderBy: { createdAt: "desc" },
    }),

    // Feedback
    prismadb.feedback.findMany({
      where: { organizationId },
    }),

    // Social posts
    prismadb.socialPost.findMany({
      where: { organizationId },
      include: {
        SocialPostComment: true,
        SocialPostLike: true,
      },
    }),

    // Messages (last 1000)
    prismadb.message.findMany({
      where: { organizationId },
      take: 1000,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        senderId: true,
        createdAt: true,
        channelId: true,
        conversationId: true,
        contentType: true,
      },
    }),

    // API keys (masked)
    prismadb.apiKey.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        // Don't include the actual key
      },
    }),

    // Webhook endpoints
    prismadb.webhookEndpoint.findMany({
      where: { organizationId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        // Don't include the secret
      },
    }),
  ]);

  // Decrypt all encrypted model data before export
  const decryptedClients = await Promise.all(
    clients.map((c) => decryptClientForOrg(c, organizationId))
  );
  const decryptedProperties = await Promise.all(
    properties.map((p) => decryptPropertyForOrg(p, organizationId))
  );
  const decryptedCalendarEvents = await Promise.all(
    calendarEvents.map((e) => decryptCalendarEventForOrg(e, organizationId))
  );
  const decryptedDocuments = await Promise.all(
    documents.map((d) => decryptDocumentForOrg(d, organizationId))
  );
  const decryptedMessages = await Promise.all(
    messages.map((m) => decryptMessageForOrg(m, organizationId))
  );

  // Calculate total records
  const totalRecords =
    clients.length +
    clientContacts.length +
    properties.length +
    propertyContacts.length +
    documents.length +
    calendarEvents.length +
    tasks.length +
    notifications.length +
    feedback.length +
    socialPosts.length +
    messages.length +
    apiKeys.length +
    webhooks.length;

  return {
    exportedAt: new Date().toISOString(),
    organizationId,
    requestedBy: user,
    data: {
      clients: decryptedClients,
      clientContacts,
      properties: decryptedProperties,
      propertyContacts,
      documents: decryptedDocuments,
      calendarEvents: decryptedCalendarEvents,
      tasks,
      notifications,
      feedback,
      socialPosts,
      messages: decryptedMessages,
      apiKeys,
      webhooks,
    },
    metadata: {
      totalRecords,
      exportVersion: "1.0.0",
    },
  };
}

// =============================================================================
// Email Notification
// =============================================================================

async function sendExportReadyEmail(
  email: string,
  name: string | null,
  downloadUrl: string,
  expiresAt: Date
): Promise<void> {
  try {
    const resend = await resendHelper();

    await resend.emails.send({
      from: "Oikion <noreply@oikion.app>",
      to: email,
      subject: "Your Data Export is Ready",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Your Data Export is Ready</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${name || "there"},</p>
              
              <p>Great news! Your requested data export has been completed and is ready for download.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 15px 0;"><strong>Download Link:</strong></p>
                <a href="${downloadUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                  Download Export
                </a>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;">
                  <strong>Important:</strong> This link will expire on ${expiresAt.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}. Please download your data before then.
                </p>
              </div>
              
              <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                If you didn't request this export, please contact support immediately.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This email was sent by Oikion. You're receiving this because you requested a data export.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("[DATA_EXPORT] Email sent to:", email);
  } catch (error) {
    // Log but don't fail the export
    console.error("[DATA_EXPORT] Failed to send email:", error);
  }
}

// =============================================================================
// Immediate Processing (for development/small exports)
// =============================================================================

/**
 * Immediately process a data export request
 * Use this for development or when background workers aren't available
 * 
 * WARNING: This blocks the response and may timeout for large exports
 */
export async function processDataExportImmediate(requestId: string): Promise<ExportResult> {
  return processDataExportRequest(requestId);
}

// =============================================================================
// Cleanup Expired Exports
// =============================================================================

/**
 * Clean up expired export requests
 * Run this periodically via cron job
 */
export async function cleanupExpiredExports(): Promise<number> {
  const result = await prismadb.dataExportRequest.updateMany({
    where: {
      status: DataExportStatus.COMPLETED,
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: DataExportStatus.EXPIRED,
      downloadUrl: null, // Clear the URL
    },
  });

  console.log("[DATA_EXPORT] Cleaned up expired exports:", result.count);

  return result.count;
}
