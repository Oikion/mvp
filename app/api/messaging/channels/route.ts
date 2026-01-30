import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationChannels, createChannel } from "@/actions/messaging";
import { ChannelType } from "@prisma/client";

/**
 * GET /api/messaging/channels
 * 
 * Returns all channels for the current organization.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await getOrganizationChannels();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to get channels" },
        { status: 500 }
      );
    }

    return NextResponse.json({ channels: result.channels });
  } catch (error) {
    console.error("[API] Get channels error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messaging/channels
 * 
 * Create a new channel.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, description, channelType, isDefault } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Channel name is required" },
        { status: 400 }
      );
    }

    const result = await createChannel({
      name,
      description,
      channelType: channelType as ChannelType,
      isDefault,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create channel" },
        { status: 400 }
      );
    }

    return NextResponse.json({ channel: result.channel }, { status: 201 });
  } catch (error) {
    console.error("[API] Create channel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
