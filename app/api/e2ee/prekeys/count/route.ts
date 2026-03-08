import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * GET /api/e2ee/prekeys/count — Check remaining one-time pre-keys
 * Used by client to decide when to replenish
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
