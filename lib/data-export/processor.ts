import { Readable } from "node:stream";
import { prismadb } from "@/lib/prisma";
import { uploadToBlob } from "@/lib/vercel-blob";
import resendHelper from "@/lib/resend";
import { DataExportStatus } from "@prisma/client";
import {
  decryptContactForOrg,
  decryptPropertyForOrg,
  decryptCalendarEventForOrg,
  decryptDocumentForOrg,
  decryptMessageForOrg,
  decryptRequestForOrg,
} from "@/lib/model-encryption";

// =============================================================================
// Types
// =============================================================================

interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

// =============================================================================
// Main Processor
// =============================================================================

const EXPORT_PAGE_SIZE = 500;

/**
 * Process a data export request.
 * Called by a background job worker — safe to run for many minutes.
 */
export async function processDataExportRequest(requestId: string): Promise<ExportResult> {
  try {
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

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const filename = `export-${organizationId}-${Date.now()}.json`;

    // Stream JSON directly to Vercel Blob — never holds the full export in memory.
    // `Readable.toWeb()` returns `streamWeb.ReadableStream` from @types/node, which
    // is type-incompatible with the global `ReadableStream` expected by @vercel/blob
    // despite being the same runtime object. The cast is intentional.
    const exportStream = Readable.toWeb(
      Readable.from(generateExportStream(organizationId, user))
    ) as ReadableStream;

    const { url: blobUrl } = await uploadToBlob(filename, exportStream, {
      contentType: "application/json",
      addRandomSuffix: true,
    });

    // Store the raw blob URL internally; expose only the authenticated proxy to users.
    const downloadUrl = `/api/gdpr/export/${requestId}/download`;

    await prismadb.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: DataExportStatus.COMPLETED,
        downloadUrl: blobUrl,
        expiresAt,
      },
    });

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await sendExportReadyEmail(user.email, user.name, `${appBaseUrl}${downloadUrl}`, expiresAt);

    console.log("[DATA_EXPORT] Export completed:", requestId);

    return { success: true, downloadUrl: `${appBaseUrl}${downloadUrl}` };
  } catch (error) {
    console.error("[DATA_EXPORT] Processing failed:", error);

    await prismadb.dataExportRequest.update({
      where: { id: requestId },
      data: { status: DataExportStatus.FAILED },
    });

    return { success: false, error: String(error) };
  }
}

// =============================================================================
// Streaming JSON Generation
// =============================================================================

/**
 * Yields Buffer chunks for a single JSON array by paginating the fetcher in
 * batches of EXPORT_PAGE_SIZE. Items are separated by commas so the caller
 * can wrap the output in `[` ... `]` to form a valid JSON array.
 *
 * @param fetcher   Returns a page of raw database rows given (skip, take).
 * @param decryptor Optional async function that decrypts a single row before
 *                  serialisation.  Must be idempotent (guarded by isEncrypted).
 * @param maxRows   Hard cap on total rows emitted (used for messages /
 *                  notifications where we replicate the original take: 1000
 *                  behaviour).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function* yieldEntityArray<T = any>(
  fetcher: (skip: number, take: number) => Promise<T[]>,
  decryptor?: (item: T) => Promise<unknown>,
  maxRows?: number
): AsyncGenerator<Buffer> {
  let skip = 0;
  let fetched = 0;
  let isFirst = true;

  while (true) {
    const limit = maxRows
      ? Math.min(EXPORT_PAGE_SIZE, maxRows - fetched)
      : EXPORT_PAGE_SIZE;
    if (limit <= 0) break;

    const batch = await fetcher(skip, limit);
    if (batch.length === 0) break;

    const processed = decryptor
      ? await Promise.all(batch.map(decryptor))
      : batch;

    for (const item of processed) {
      if (!isFirst) yield Buffer.from(",");
      yield Buffer.from(JSON.stringify(item));
      isFirst = false;
    }

    fetched += batch.length;
    skip += batch.length;
    if (batch.length < limit) break;
  }
}

/**
 * Async generator that emits valid JSON in the ExportedData shape, paging
 * through each entity type so heap usage stays bounded to ~EXPORT_PAGE_SIZE
 * rows of decrypted data at any given moment.
 *
 * Output format is identical to the previous in-memory implementation — the
 * download proxy can stream it unchanged.
 */
async function* generateExportStream(
  organizationId: string,
  user: { id: string; name: string | null; email: string }
): AsyncGenerator<Buffer> {
  const heapAtStart = process.memoryUsage().heapUsed;
  console.log(
    `[DATA_EXPORT] Start org=${organizationId}: heapUsed=${Math.round(heapAtStart / 1024 / 1024)}MB`
  );

  // Prefetch all row counts in one parallel round-trip.
  // COUNT queries are negligible but let us compute totalRecords before
  // streaming begins (we can't use arr.length when rows are never all in memory).
  const [
    contactCount,
    propertyCount,
    propertyContactCount,
    documentCount,
    calendarEventCount,
    taskCount,
    notificationCount,
    feedbackCount,
    socialPostCount,
    messageCount,
    apiKeyCount,
    webhookCount,
    requestCount,
    dealCount,
  ] = await Promise.all([
    prismadb.contact.count({ where: { organizationId } }),
    prismadb.properties.count({ where: { organizationId } }),
    prismadb.property_Contacts.count({ where: { Properties: { organizationId } } }),
    prismadb.documents.count({ where: { organizationId } }),
    prismadb.calendarEvent.count({ where: { organizationId } }),
    prismadb.crm_Accounts_Tasks.count({ where: { organizationId } }),
    prismadb.notification.count({ where: { organizationId } }),
    prismadb.feedback.count({ where: { organizationId } }),
    prismadb.socialPost.count({ where: { organizationId } }),
    prismadb.message.count({ where: { organizationId } }),
    prismadb.apiKey.count({ where: { organizationId } }),
    prismadb.webhookEndpoint.count({ where: { organizationId } }),
    prismadb.request.count({ where: { organizationId } }),
    prismadb.deal.count({ where: { organizationId } }),
  ]);

  // Replicate original caps: notifications and messages are capped at 1000.
  const effectiveNotificationCount = Math.min(notificationCount, 1000);
  const effectiveMessageCount = Math.min(messageCount, 1000);

  const totalRecords =
    contactCount +
    propertyCount +
    propertyContactCount +
    documentCount +
    calendarEventCount +
    taskCount +
    effectiveNotificationCount +
    feedbackCount +
    socialPostCount +
    effectiveMessageCount +
    apiKeyCount +
    webhookCount +
    requestCount +
    dealCount;

  console.log(
    `[DATA_EXPORT] Processing org ${organizationId}: ${contactCount} contacts, ` +
      `${propertyCount} properties, ${requestCount} requests, ${dealCount} deals` +
      ` — ${totalRecords} total records`
  );

  const exportedAt = new Date().toISOString();

  // ── JSON header ────────────────────────────────────────────────────────────
  yield Buffer.from(
    `{"exportedAt":${JSON.stringify(exportedAt)}` +
      `,"organizationId":${JSON.stringify(organizationId)}` +
      `,"requestedBy":${JSON.stringify(user)}` +
      `,"data":{`
  );

  // ── contacts ───────────────────────────────────────────────────────────────
  yield Buffer.from(`"contacts":[`);
  yield* yieldEntityArray(
    (skip, take) =>
      prismadb.contact.findMany({
        where: { organizationId },
        skip,
        take,
        orderBy: { id: "asc" },
        include: { contactComments: true },
      }),
    (c) => decryptContactForOrg(c, organizationId)
  );
  yield Buffer.from(`]`);

  // ── properties ─────────────────────────────────────────────────────────────
  yield Buffer.from(`,"properties":[`);
  yield* yieldEntityArray(
    (skip, take) =>
      prismadb.properties.findMany({
        where: { organizationId },
        skip,
        take,
        orderBy: { id: "asc" },
        include: { Property_Contacts: true, PropertyComment: true, PropertyShowing: true },
      }),
    (p) => decryptPropertyForOrg(p, organizationId)
  );
  yield Buffer.from(`]`);

  // ── propertyContacts ───────────────────────────────────────────────────────
  yield Buffer.from(`,"propertyContacts":[`);
  yield* yieldEntityArray((skip, take) =>
    prismadb.property_Contacts.findMany({
      where: { Properties: { organizationId } },
      skip,
      take,
      orderBy: { id: "asc" },
    })
  );
  yield Buffer.from(`]`);

  // ── documents (metadata only, no file contents) ────────────────────────────
  yield Buffer.from(`,"documents":[`);
  yield* yieldEntityArray(
    (skip, take) =>
      prismadb.documents.findMany({
        where: { organizationId },
        skip,
        take,
        orderBy: { id: "asc" },
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
    (d) => decryptDocumentForOrg(d, organizationId)
  );
  yield Buffer.from(`]`);

  // ── calendarEvents ─────────────────────────────────────────────────────────
  yield Buffer.from(`,"calendarEvents":[`);
  yield* yieldEntityArray(
    (skip, take) =>
      prismadb.calendarEvent.findMany({
        where: { organizationId },
        skip,
        take,
        orderBy: { id: "asc" },
        include: { EventInvitee: true, CalendarReminder: true },
      }),
    (e) => decryptCalendarEventForOrg(e, organizationId)
  );
  yield Buffer.from(`]`);

  // ── tasks ──────────────────────────────────────────────────────────────────
  yield Buffer.from(`,"tasks":[`);
  yield* yieldEntityArray((skip, take) =>
    prismadb.crm_Accounts_Tasks.findMany({
      where: { organizationId },
      skip,
      take,
      orderBy: { id: "asc" },
      include: { crm_Accounts_Tasks_Comments: true },
    })
  );
  yield Buffer.from(`]`);

  // ── notifications (capped at 1000, newest first) ───────────────────────────
  yield Buffer.from(`,"notifications":[`);
  yield* yieldEntityArray(
    (skip, take) =>
      prismadb.notification.findMany({
        where: { organizationId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
    undefined,
    1000
  );
  yield Buffer.from(`]`);

  // ── feedback ───────────────────────────────────────────────────────────────
  yield Buffer.from(`,"feedback":[`);
  yield* yieldEntityArray((skip, take) =>
    prismadb.feedback.findMany({
      where: { organizationId },
      skip,
      take,
      orderBy: { id: "asc" },
    })
  );
  yield Buffer.from(`]`);

  // ── socialPosts ────────────────────────────────────────────────────────────
  yield Buffer.from(`,"socialPosts":[`);
  yield* yieldEntityArray((skip, take) =>
    prismadb.socialPost.findMany({
      where: { organizationId },
      skip,
      take,
      orderBy: { id: "asc" },
      include: { SocialPostComment: true, SocialPostLike: true },
    })
  );
  yield Buffer.from(`]`);

  // ── messages (capped at 1000, newest first) ────────────────────────────────
  yield Buffer.from(`,"messages":[`);
  yield* yieldEntityArray(
    (skip, take) =>
      prismadb.message.findMany({
        where: { organizationId },
        skip,
        take,
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
    (m) => decryptMessageForOrg(m, organizationId),
    1000
  );
  yield Buffer.from(`]`);

  // ── apiKeys (masked — actual key field excluded) ───────────────────────────
  yield Buffer.from(`,"apiKeys":[`);
  yield* yieldEntityArray((skip, take) =>
    prismadb.apiKey.findMany({
      where: { organizationId },
      skip,
      take,
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })
  );
  yield Buffer.from(`]`);

  // ── webhooks (secret excluded) ─────────────────────────────────────────────
  yield Buffer.from(`,"webhooks":[`);
  yield* yieldEntityArray((skip, take) =>
    prismadb.webhookEndpoint.findMany({
      where: { organizationId },
      skip,
      take,
      orderBy: { id: "asc" },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
    })
  );
  yield Buffer.from(`]`);

  // ── requests ───────────────────────────────────────────────────────────────
  yield Buffer.from(`,"requests":[`);
  yield* yieldEntityArray(
    (skip, take) =>
      prismadb.request.findMany({
        where: { organizationId },
        skip,
        take,
        orderBy: { id: "asc" },
        include: { requestContacts: true },
      }),
    (r) => decryptRequestForOrg(r, organizationId)
  );
  yield Buffer.from(`]`);

  // ── deals ──────────────────────────────────────────────────────────────────
  yield Buffer.from(`,"deals":[`);
  yield* yieldEntityArray((skip, take) =>
    prismadb.deal.findMany({
      where: { organizationId },
      skip,
      take,
      orderBy: { id: "asc" },
      include: { dealParties: true, stageLogs: true },
    })
  );
  yield Buffer.from(`]`);

  // ── JSON footer ────────────────────────────────────────────────────────────
  yield Buffer.from(
    `},"metadata":{"totalRecords":${totalRecords},"exportVersion":"1.0.0"}}`
  );

  const heapAtEnd = process.memoryUsage().heapUsed;
  console.log(
    `[DATA_EXPORT] Complete org=${organizationId}: heapUsed=${Math.round(heapAtEnd / 1024 / 1024)}MB`
  );
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
 * Immediately process a data export request.
 * Use this for development or when background workers aren't available.
 *
 * WARNING: This blocks the response and may timeout for large exports.
 */
export async function processDataExportImmediate(requestId: string): Promise<ExportResult> {
  return processDataExportRequest(requestId);
}

// =============================================================================
// Cleanup Expired Exports
// =============================================================================

/**
 * Clean up expired export requests.
 * Run this periodically via cron job.
 */
export async function cleanupExpiredExports(): Promise<number> {
  const result = await prismadb.dataExportRequest.updateMany({
    where: {
      status: DataExportStatus.COMPLETED,
      expiresAt: { lt: new Date() },
    },
    data: {
      status: DataExportStatus.EXPIRED,
      downloadUrl: null,
    },
  });

  console.log("[DATA_EXPORT] Cleaned up expired exports:", result.count);

  return result.count;
}
