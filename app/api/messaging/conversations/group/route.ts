import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createGroupConversation } from "@/actions/messaging/direct-messages";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { participantIds, name } = body;

  if (!Array.isArray(participantIds) || participantIds.length < 2) {
    return NextResponse.json(
      { error: "At least 2 participant IDs required" },
      { status: 400 }
    );
  }

  const result = await createGroupConversation({
    participantIds,
    name: name ?? "",
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ conversationId: result.conversationId });
}
