import { getCurrentUser } from "@/lib/get-current-user";
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();

    // Fetch feedback history for the current user
    const feedbackHistory = await prismadb.feedback.findMany({
      where: {
        userId: currentUser.id,
      },
      orderBy: {
        createdAt: "desc",
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
      },
    });

    return NextResponse.json({ feedback: feedbackHistory }, { status: 200 });
  } catch (error: unknown) {
    // If authentication error, return 401
    if (error instanceof Error && (error.message.includes("not authenticated") || error.message.includes("not found"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

