import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

/**
 * GET /api/e2ee/prekeys/count — Check remaining one-time pre-keys
 * Used by client to decide when to replenish
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const count = await prismadb.userPreKey.count({
      where: {
        userId,
        keyType: "ONE_TIME",
        isConsumed: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[E2EE PreKeys Count]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
