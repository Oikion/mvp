import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const bodySchema = z.object({
  step: z.number().int().min(-1),
});

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid step value" }, { status: 400 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const existing = (user.publicMetadata ?? {}) as Record<string, unknown>;

    await clerk.users.updateUser(userId, {
      publicMetadata: { ...existing, tourStep: parsed.data.step },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TOUR_PROGRESS]", error);
    return NextResponse.json({ error: "Failed to update tour progress" }, { status: 500 });
  }
}
