"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { Prisma } from "@prisma/client";
import { createNotification } from "@/lib/notifications/notification-service";

// Console log entry type
export interface ConsoleLogEntry {
  type: string;
  message: string;
  timestamp?: number | string;
  stack?: string;
  args?: unknown[];
}

// Attachment type for feedback
export interface FeedbackAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  createdAt: Date;
}

export interface PlatformFeedback {
  id: string;
  createdAt: Date;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  organizationId: string;
  feedbackType: string;
  feedback: string;
  url: string | null;
  userAgent: string | null;
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  screenResolution: string | null;
  hasScreenshot: boolean;
  hasConsoleLogs: boolean;
  consoleLogsCount: number | null;
  screenshot: string | null; // Vercel Blob URL (new) or base64 string (legacy)
  consoleLogs: ConsoleLogEntry[] | null; // @deprecated - legacy JSON, use consoleLogsUrl
  consoleLogsUrl: string | null; // Vercel Blob URL for console logs text file
  attachments: FeedbackAttachment[];
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  adminNotes: string | null;
  adminResponse: string | null;
  respondedAt: Date | null;
  respondedBy: string | null;
  emailSent: boolean;
  emailSentAt: Date | null;
}

export interface GetFeedbackOptions {
  page?: number;
  limit?: number;
  search?: string;
  feedbackType?: string;
  status?: string;
  sortBy?: "createdAt" | "feedbackType" | "status";
  sortOrder?: "asc" | "desc";
}

export interface GetFeedbackResult {
  feedback: PlatformFeedback[];
  totalCount: number;
  page: number;
  totalPages: number;
  countsByType: Record<string, number>;
  countsByStatus: Record<string, number>;
}

export interface FeedbackCommentData {
  id: string;
  createdAt: Date;
  feedbackId: string;
  authorId: string;
  authorType: string;
  authorName: string | null;
  content: string;
  // Attachment fields
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentType: string | null;
}

// Helper function to map feedback entry to PlatformFeedback
// Using Record<string, unknown> to handle schema fields that may not be in Prisma types yet
function mapFeedbackEntry(entry: Record<string, unknown>): PlatformFeedback {
  const attachments = (entry.attachments as FeedbackAttachment[] | undefined) || [];
  
  return {
    id: entry.id as string,
    createdAt: entry.createdAt as Date,
    userId: entry.userId as string | null,
    userEmail: entry.userEmail as string | null,
    userName: entry.userName as string | null,
    organizationId: entry.organizationId as string,
    feedbackType: entry.feedbackType as string,
    feedback: entry.feedback as string,
    url: entry.url as string | null,
    userAgent: entry.userAgent as string | null,
    browserName: entry.browserName as string | null,
    browserVersion: entry.browserVersion as string | null,
    osName: entry.osName as string | null,
    osVersion: entry.osVersion as string | null,
    screenResolution: entry.screenResolution as string | null,
    hasScreenshot: entry.hasScreenshot as boolean,
    hasConsoleLogs: entry.hasConsoleLogs as boolean,
    consoleLogsCount: entry.consoleLogsCount as number | null,
    screenshot: entry.screenshot as string | null,
    consoleLogs: entry.consoleLogs as ConsoleLogEntry[] | null,
    consoleLogsUrl: entry.consoleLogsUrl as string | null,
    attachments: attachments.map((att) => ({
      id: att.id,
      fileName: att.fileName,
      fileSize: att.fileSize,
      fileType: att.fileType,
      url: att.url,
      createdAt: att.createdAt,
    })),
    status: (entry.status as string) ?? "pending",
    reviewedBy: entry.reviewedBy as string | null,
    reviewedAt: entry.reviewedAt as Date | null,
    adminNotes: entry.adminNotes as string | null,
    adminResponse: (entry.adminResponse as string) ?? null,
    respondedAt: (entry.respondedAt as Date) ?? null,
    respondedBy: (entry.respondedBy as string) ?? null,
    emailSent: entry.emailSent as boolean,
    emailSentAt: entry.emailSentAt as Date | null,
  };
}

/**
 * Get all feedback submissions for platform admin
 */
export async function getPlatformFeedback(
  options: GetFeedbackOptions = {}
): Promise<GetFeedbackResult> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  const {
    page = 1,
    limit = 20,
    search = "",
    feedbackType = "ALL",
    status = "ALL",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  try {
    // Log the action
    await logAdminAction(admin.clerkId, "VIEW_FEEDBACK", undefined, { page, search, feedbackType, status });

    // Build where clause
    const whereConditions: Prisma.FeedbackWhereInput = {};

    if (feedbackType !== "ALL") {
      whereConditions.feedbackType = feedbackType;
    }

    // Cast whereConditions to any to handle schema drift for status field
    const whereAny = whereConditions as Record<string, unknown>;
    if (status !== "ALL") {
      whereAny.status = status;
    }

    if (search) {
      whereConditions.OR = [
        { feedback: { contains: search, mode: "insensitive" } },
        { userEmail: { contains: search, mode: "insensitive" } },
        { userName: { contains: search, mode: "insensitive" } },
        { url: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prismadb.feedback.count({ where: whereConditions });
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get counts by type
    const typeCountsRaw = await prismadb.feedback.groupBy({
      by: ["feedbackType"],
      _count: { feedbackType: true },
    });
    const countsByType: Record<string, number> = {};
    typeCountsRaw.forEach((item) => {
      countsByType[item.feedbackType] = item._count.feedbackType;
    });

    // Get counts by status - use raw query to handle schema drift
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusCountsRaw = await (prismadb.feedback as any).groupBy({
      by: ["status"],
      _count: { status: true },
    });
    const countsByStatus: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statusCountsRaw.forEach((item: any) => {
      if (item.status && item._count?.status) {
        countsByStatus[item.status] = item._count.status;
      }
    });

    // Get feedback entries with attachments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feedbackEntries = await (prismadb.feedback as any).findMany({
      where: whereConditions,
      include: {
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            url: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    // Process feedback entries - cast to unknown first to handle schema drift
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedFeedback: PlatformFeedback[] = feedbackEntries.map((entry: any) => 
      mapFeedbackEntry(entry as unknown as Record<string, unknown>)
    );

    return {
      feedback: processedFeedback,
      totalCount,
      page,
      totalPages,
      countsByType,
      countsByStatus,
    };
  } catch (error) {
    console.error("[GET_PLATFORM_FEEDBACK]", error);
    throw new Error("Failed to fetch feedback");
  }
}

/**
 * Get a single feedback entry by ID
 */
export async function getPlatformFeedbackById(
  feedbackId: string
): Promise<PlatformFeedback | null> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  try {
    // Log the action
    await logAdminAction(admin.clerkId, "VIEW_FEEDBACK_DETAILS", feedbackId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = await (prismadb.feedback as any).findUnique({
      where: { id: feedbackId },
      include: {
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            url: true,
            createdAt: true,
          },
        },
      },
    });

    if (!entry) {
      return null;
    }

    return mapFeedbackEntry(entry as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("[GET_PLATFORM_FEEDBACK_BY_ID]", error);
    throw new Error("Failed to fetch feedback details");
  }
}

/**
 * Update feedback status and add admin notes
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  newStatus: string,
  adminNotes?: string
): Promise<PlatformFeedback> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  try {
    // Log the action
    await logAdminAction(admin.clerkId, "UPDATE_FEEDBACK_STATUS", feedbackId, { newStatus, adminNotes });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prismadb.feedback as any).update({
      where: { id: feedbackId },
      data: {
        status: newStatus,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
        ...(adminNotes && { adminNotes }),
      },
    });

    return mapFeedbackEntry(updated as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("[UPDATE_FEEDBACK_STATUS]", error);
    throw new Error("Failed to update feedback status");
  }
}

/**
 * Respond to user feedback - sends a notification to the user
 */
export async function respondToFeedback(
  feedbackId: string,
  response: string
): Promise<PlatformFeedback> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  try {
    // Get the feedback entry first to check if user exists
    const feedbackEntry = await prismadb.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedbackEntry) {
      throw new Error("Feedback not found");
    }

    // Cast to handle schema drift
    const feedbackAny = feedbackEntry as unknown as Record<string, unknown>;
    const currentStatus = feedbackAny.status as string | undefined;

    // Log the action
    await logAdminAction(admin.clerkId, "RESPOND_TO_FEEDBACK", feedbackId, { response: response.substring(0, 100) });

    // Update the feedback with the response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prismadb.feedback as any).update({
      where: { id: feedbackId },
      data: {
        adminResponse: response,
        respondedAt: new Date(),
        respondedBy: admin.id,
        // Also mark as reviewed if still pending
        ...(currentStatus === "pending" && {
          status: "reviewed",
          reviewedBy: admin.id,
          reviewedAt: new Date(),
        }),
      },
    });

    // Send notification to the user if they have a userId
    if (feedbackEntry.userId) {
      const feedbackTypeLabels: Record<string, string> = {
        bug: "Bug Report",
        feature: "Feature Request",
        general: "General Feedback",
        question: "Question",
        other: "Feedback",
      };
      
      const feedbackLabel = feedbackTypeLabels[feedbackEntry.feedbackType] || "Feedback";

      await createNotification({
        userId: feedbackEntry.userId,
        organizationId: feedbackEntry.organizationId,
        type: "FEEDBACK_RESPONSE" as never, // Type cast to handle enum drift
        title: `Response to Your ${feedbackLabel}`,
        message: response,
        entityType: "FEEDBACK" as never, // Type cast to handle enum drift
        entityId: feedbackId,
        actorId: admin.id,
        actorName: [admin.firstName, admin.lastName].filter(Boolean).join(" ") || "Platform Admin",
        metadata: {
          feedbackType: feedbackEntry.feedbackType,
          originalFeedback: feedbackEntry.feedback.substring(0, 200),
        },
      });
    }

    return mapFeedbackEntry(updated as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("[RESPOND_TO_FEEDBACK]", error);
    throw new Error("Failed to respond to feedback");
  }
}

/**
 * Get all comments for a feedback entry
 */
export async function getFeedbackComments(
  feedbackId: string
): Promise<FeedbackCommentData[]> {
  // Verify admin access
  await requirePlatformAdmin();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comments = await (prismadb as any).feedbackComment.findMany({
      where: { feedbackId },
      orderBy: { createdAt: "asc" },
    });

    return comments.map((comment: Record<string, unknown>): FeedbackCommentData => ({
      id: comment.id as string,
      createdAt: comment.createdAt as Date,
      feedbackId: comment.feedbackId as string,
      authorId: comment.authorId as string,
      authorType: comment.authorType as string,
      authorName: comment.authorName as string | null,
      content: comment.content as string,
      attachmentUrl: comment.attachmentUrl as string | null,
      attachmentName: comment.attachmentName as string | null,
      attachmentSize: comment.attachmentSize as number | null,
      attachmentType: comment.attachmentType as string | null,
    }));
  } catch (error) {
    console.error("[GET_FEEDBACK_COMMENTS]", error);
    throw new Error("Failed to fetch feedback comments");
  }
}

// Attachment data for creating comments
export interface CommentAttachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Add a comment to a feedback entry (from admin)
 */
export async function addFeedbackComment(
  feedbackId: string,
  content: string,
  attachment?: CommentAttachment
): Promise<FeedbackCommentData> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  try {
    // Check comment count limit (max 100 per feedback)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentCount = await (prismadb as any).feedbackComment.count({
      where: { feedbackId },
    });

    if (commentCount >= 100) {
      throw new Error("Maximum comments reached for this feedback");
    }

    // Get the feedback to send notification to user
    const feedback = await prismadb.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Log the action
    await logAdminAction(admin.clerkId, "ADD_FEEDBACK_COMMENT" as never, feedbackId, { content: content.substring(0, 100) });

    // Create the comment with optional attachment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comment = await (prismadb as any).feedbackComment.create({
      data: {
        id: crypto.randomUUID(),
        feedbackId,
        authorId: admin.id,
        authorType: "admin",
        authorName: [admin.firstName, admin.lastName].filter(Boolean).join(" ") || "Platform Admin",
        content,
        // Include attachment data if provided
        ...(attachment && {
          attachmentUrl: attachment.url,
          attachmentName: attachment.name,
          attachmentSize: attachment.size,
          attachmentType: attachment.type,
        }),
      },
    });

    // Build notification message
    let notificationMessage = content.length > 100 ? content.substring(0, 100) + "..." : content;
    if (attachment) {
      notificationMessage = content 
        ? `${notificationMessage} [Attachment: ${attachment.name}]`
        : `[Attachment: ${attachment.name}]`;
    }

    // Send notification to the user if they have a userId
    if (feedback.userId) {
      await createNotification({
        userId: feedback.userId,
        organizationId: feedback.organizationId,
        type: "FEEDBACK_RESPONSE" as never, // Type cast to handle enum drift
        title: "New response to your feedback",
        message: notificationMessage,
        entityType: "FEEDBACK" as never, // Type cast to handle enum drift
        entityId: feedbackId,
        actorId: admin.id,
        actorName: [admin.firstName, admin.lastName].filter(Boolean).join(" ") || "Platform Admin",
        metadata: {
          feedbackType: feedback.feedbackType,
          commentId: comment.id,
          hasAttachment: !!attachment,
        },
      });
    }

    return {
      id: comment.id,
      createdAt: comment.createdAt,
      feedbackId: comment.feedbackId,
      authorId: comment.authorId,
      authorType: comment.authorType,
      authorName: comment.authorName,
      content: comment.content,
      attachmentUrl: comment.attachmentUrl || null,
      attachmentName: comment.attachmentName || null,
      attachmentSize: comment.attachmentSize || null,
      attachmentType: comment.attachmentType || null,
    };
  } catch (error) {
    console.error("[ADD_FEEDBACK_COMMENT]", error);
    if (error instanceof Error && error.message === "Maximum comments reached for this feedback") {
      throw error;
    }
    throw new Error("Failed to add feedback comment");
  }
}







