import { getCurrentUser } from "@/lib/get-current-user";
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

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

    // Fetch feedback with comments - only if it belongs to the current user
    const feedback = await prismadb.feedback.findFirst({
      where: {
        id: feedbackId,
        userId: currentUser.id,
      },
      select: {
        id: true,
        createdAt: true,
        feedbackType: true,
        feedback: true,
        url: true,
        browserName: true,
        browserVersion: true,
        osName: true,
        osVersion: true,
        screenResolution: true,
        hasScreenshot: true,
        hasConsoleLogs: true,
        consoleLogsCount: true,
        emailSent: true,
        emailSentAt: true,
        status: true,
        adminResponse: true,
        respondedAt: true,
        comments: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            createdAt: true,
            authorId: true,
            authorType: true,
            authorName: true,
            content: true,
          },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({ feedback }, { status: 200 });
  } catch (error: unknown) {
    console.error("[FEEDBACK_GET_BY_ID]", error);
    // If authentication error, return 401
    if (error instanceof Error && (error.message.includes("not authenticated") || error.message.includes("not found"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
