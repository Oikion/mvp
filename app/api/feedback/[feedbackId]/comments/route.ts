import { getCurrentUser } from "@/lib/get-current-user";
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

export async function POST(
  req: Request,
  props: { params: Promise<{ feedbackId: string }> }
) {
  try {
    const { feedbackId } = await props.params;
    const currentUser = await getCurrentUser();

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    if (content.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 });
    }

    // Verify the feedback belongs to the current user
    const feedback = await prismadb.feedback.findFirst({
      where: {
        id: feedbackId,
        userId: currentUser.id,
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Check comment count limit (max 100 per feedback)
    const commentCount = await prismadb.feedbackComment.count({
      where: { feedbackId },
    });

    if (commentCount >= 100) {
      return NextResponse.json({ error: "Maximum comments reached for this feedback" }, { status: 400 });
    }

    // Create the comment
    const comment = await prismadb.feedbackComment.create({
      data: {
        id: crypto.randomUUID(),
        feedbackId,
        authorId: currentUser.id,
        authorType: "user",
        authorName: currentUser.name || currentUser.email || "User",
        content: content.trim(),
      },
    });

    // Update the feedback status to indicate there's a new user response
    // Only update if currently not pending (so admin knows there's new activity)
    if (feedback.status !== "pending") {
      await prismadb.feedback.update({
        where: { id: feedbackId },
        data: {
          status: "user_replied",
        },
      });
    }

    return NextResponse.json({
      comment: {
        id: comment.id,
        createdAt: comment.createdAt,
        authorId: comment.authorId,
        authorType: comment.authorType,
        authorName: comment.authorName,
        content: comment.content,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("[FEEDBACK_COMMENT_POST]", error);
    // If authentication error, return 401
    if (error instanceof Error && (error.message.includes("not authenticated") || error.message.includes("not found"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  props: { params: Promise<{ feedbackId: string }> }
) {
  try {
    const { feedbackId } = await props.params;
    const currentUser = await getCurrentUser();

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID is required" }, { status: 400 });
    }

    // Verify the feedback belongs to the current user
    const feedback = await prismadb.feedback.findFirst({
      where: {
        id: feedbackId,
        userId: currentUser.id,
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Get all comments for this feedback
    const comments = await prismadb.feedbackComment.findMany({
      where: { feedbackId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        authorId: true,
        authorType: true,
        authorName: true,
        content: true,
      },
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: unknown) {
    console.error("[FEEDBACK_COMMENTS_GET]", error);
    // If authentication error, return 401
    if (error instanceof Error && (error.message.includes("not authenticated") || error.message.includes("not found"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
