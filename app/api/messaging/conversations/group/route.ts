import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createGroupConversation } from "@/actions/messaging/direct-messages";

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { participantIds, name } = body as Record<string, unknown>;

    if (!Array.isArray(participantIds) || participantIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 participant IDs required" },
        { status: 400 }
      );
    }

    if (participantIds.length > 50) {
      return NextResponse.json(
        { error: "Group conversations are limited to 50 participants" },
        { status: 400 }
      );
    }

    if (name !== undefined && (typeof name !== "string" || name.length > 100)) {
      return NextResponse.json(
        { error: "Group name must be a string of at most 100 characters" },
        { status: 400 }
      );
    }

    const result = await createGroupConversation({
      participantIds: participantIds as string[],
      name: typeof name === "string" ? name : "",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ conversationId: result.conversationId });
  } catch (error) {
    console.error("[API_MESSAGING_GROUP]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
