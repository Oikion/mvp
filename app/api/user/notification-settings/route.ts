import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    // Get or create notification settings using upsert to avoid race conditions
    const settings = await prismadb.userNotificationSettings.upsert({
      where: { userId: user.id },
      update: {}, // No updates if exists
      create: {
        userId: user.id,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[GET_NOTIFICATION_SETTINGS]", error);
    return NextResponse.json(
      { error: "Failed to get notification settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    // Validate the fields
    const allowedFields = [
      "socialEmailEnabled",
      "socialInAppEnabled",
      "crmEmailEnabled",
      "crmInAppEnabled",
      "calendarEmailEnabled",
      "calendarInAppEnabled",
      "tasksEmailEnabled",
      "tasksInAppEnabled",
      "dealsEmailEnabled",
      "dealsInAppEnabled",
      "documentsEmailEnabled",
      "documentsInAppEnabled",
      "systemEmailEnabled",
      "systemInAppEnabled",
    ];

    // Filter only allowed boolean fields
    const updateData: Record<string, boolean> = {};
    for (const field of allowedFields) {
      if (typeof body[field] === "boolean") {
        updateData[field] = body[field];
      }
    }

    // Upsert notification settings
    const settings = await prismadb.userNotificationSettings.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[UPDATE_NOTIFICATION_SETTINGS]", error);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}

