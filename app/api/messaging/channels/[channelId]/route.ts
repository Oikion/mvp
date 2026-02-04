import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { leaveChannel } from "@/actions/messaging";

interface RouteParams {
  params: Promise<{ channelId: string }>;
}

/**
 * DELETE /api/messaging/channels/[channelId]
 * 
 * Leave a channel (removes the user from the channel)
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { channelId } = await params;

    const result = await leaveChannel(channelId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to leave channel" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Leave channel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
