import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createNotification } from "@/lib/notifications/notification-service";

/**
 * Check if current user is a platform admin
 * This is a route-compatible version of the check
 */
async function checkPlatformAdmin() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();

  if (userEmail) {
    // Production admin emails
    const prodAdminEmails = process.env.PLATFORM_ADMIN_EMAILS;
    if (prodAdminEmails) {
      const adminEmailList = prodAdminEmails
        .replace(/"/g, "")
        .split(",")
        .map((e) => e.toLowerCase().trim());

      if (adminEmailList.includes(userEmail)) {
        return {
          id: user.id,
          clerkId: user.id,
          email: userEmail,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      }
    }

    // Development bypass
    if (process.env.NODE_ENV !== "production") {
      const devAdminEmails = process.env.PLATFORM_ADMIN_DEV_EMAILS;
      if (devAdminEmails) {
        const devEmailList = devAdminEmails
          .replace(/"/g, "")
          .split(",")
          .map((e) => e.toLowerCase().trim());

        if (devEmailList.includes(userEmail)) {
          return {
            id: user.id,
            clerkId: user.id,
            email: userEmail,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        }
      }
    }
  }

  // Check Clerk privateMetadata
  if (user.privateMetadata?.isPlatformAdmin === true) {
    return {
      id: user.id,
      clerkId: user.id,
      email: userEmail || "",
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  return null;
}

/**
 * GET /api/platform-admin/feedback/[feedbackId]/comments
 * Fetch all comments for a feedback entry (admin only)
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ feedbackId: string }> }
) {
  try {
    const admin = await checkPlatformAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized: Platform admin access required" },
        { status: 401 }
      );
    }

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
    const admin = await checkPlatformAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized: Platform admin access required" },
        { status: 401 }
      );
    }

    const { feedbackId } = await props.params;

    if (!feedbackId) {
      return NextResponse.json(
        { error: "Feedback ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { content, attachment } = body;

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





