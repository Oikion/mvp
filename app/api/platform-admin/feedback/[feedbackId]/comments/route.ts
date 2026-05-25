import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createNotification } from "@/lib/notifications/notification-service";
import { z } from "zod";

// Allowed origins for attachment URLs — must match project storage providers
const ALLOWED_ATTACHMENT_ORIGINS = [
  "https://public.blob.vercel-storage.com",
  "https://fra1.digitaloceanspaces.com",
];

const attachmentSchema = z
  .object({
    url: z
      .string()
      .url()
      .refine(
        (url) => ALLOWED_ATTACHMENT_ORIGINS.some((origin) => url.startsWith(origin)),
        { message: "Attachment URL must be from an allowed storage origin" }
      ),
    name: z.string().min(1).max(255),
    size: z.number().int().min(0).max(50_000_000),
    type: z.string().max(100),
  })
  .optional();

/**
 * GET /api/platform-admin/feedback/[feedbackId]/comments
 * Fetch all comments for a feedback entry (admin only)
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ feedbackId: string }> }
) {
  try {
    await requirePlatformAdmin();

    const { feedbackId } = await props.params;

    if (!feedbackId) {
      return NextResponse.json(
        { error: "Feedback ID is required" },
        { status: 400 }
      );
    }

    // Verify the feedback exists
    const feedback = await prismadb.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Get all comments for this feedback
    const comments = await prismadb.feedbackComment.findMany({
      where: { feedbackId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        feedbackId: true,
        authorId: true,
        authorType: true,
        authorName: true,
        content: true,
        attachmentUrl: true,
        attachmentName: true,
        attachmentSize: true,
        attachmentType: true,
      },
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: unknown) {
    console.error("[ADMIN_FEEDBACK_COMMENTS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/platform-admin/feedback/[feedbackId]/comments
 * Add a comment to a feedback entry (admin only)
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ feedbackId: string }> }
) {
  try {
    const admin = await requirePlatformAdmin();

    const { feedbackId } = await props.params;

    if (!feedbackId) {
      return NextResponse.json(
        { error: "Feedback ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { content } = body;

    // Validate attachment before any other use
    const attachmentResult = attachmentSchema.safeParse(body.attachment);
    if (body.attachment && !attachmentResult.success) {
      return NextResponse.json(
        { error: "Invalid attachment", details: attachmentResult.error.flatten() },
        { status: 400 }
      );
    }
    const attachment = attachmentResult.data;

    // Content or attachment is required
    if ((!content || typeof content !== "string" || !content.trim()) && !attachment) {
      return NextResponse.json(
        { error: "Message content or attachment is required" },
        { status: 400 }
      );
    }

    if (content && content.length > 5000) {
      return NextResponse.json(
        { error: "Message too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    // Verify the feedback exists and get user info
    const feedback = await prismadb.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Check comment count limit (max 100 per feedback)
    const commentCount = await prismadb.feedbackComment.count({
      where: { feedbackId },
    });

    if (commentCount >= 100) {
      return NextResponse.json(
        { error: "Maximum comments reached for this feedback" },
        { status: 400 }
      );
    }

    const adminName =
      [admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
      "Platform Admin";

    // Create the comment with optional attachment
    const comment = await prismadb.feedbackComment.create({
      data: {
        id: crypto.randomUUID(),
        feedbackId,
        authorId: admin.id,
        authorType: "admin",
        authorName: adminName,
        content: content?.trim() || "",
        // Include attachment data if provided
        ...(attachment && {
          attachmentUrl: attachment.url,
          attachmentName: attachment.name,
          attachmentSize: attachment.size,
          attachmentType: attachment.type,
        }),
      },
    });

    // Update feedback status to indicate admin responded
    await prismadb.feedback.update({
      where: { id: feedbackId },
      data: {
        status: "reviewed",
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    });

    // Send notification to the user if they have a userId
    if (feedback.userId) {
      let notificationMessage = content?.length > 100 
        ? content.substring(0, 100) + "..." 
        : content || "";
        
      if (attachment) {
        notificationMessage = content
          ? `${notificationMessage} [Attachment: ${attachment.name}]`
          : `[Attachment: ${attachment.name}]`;
      }

      await createNotification({
        userId: feedback.userId,
        organizationId: feedback.organizationId,
        type: "FEEDBACK_RESPONSE" as never,
        title: "New response to your feedback",
        message: notificationMessage,
        entityType: "FEEDBACK" as never,
        entityId: feedbackId,
        actorId: admin.id,
        actorName: adminName,
        metadata: {
          feedbackType: feedback.feedbackType,
          commentId: comment.id,
          hasAttachment: !!attachment,
        },
      });
    }

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          createdAt: comment.createdAt,
          feedbackId: comment.feedbackId,
          authorId: comment.authorId,
          authorType: comment.authorType,
          authorName: comment.authorName,
          content: comment.content,
          attachmentUrl: comment.attachmentUrl,
          attachmentName: comment.attachmentName,
          attachmentSize: comment.attachmentSize,
          attachmentType: comment.attachmentType,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[ADMIN_FEEDBACK_COMMENT_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}





