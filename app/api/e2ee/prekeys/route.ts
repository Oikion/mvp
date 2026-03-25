import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

/**
 * POST /api/e2ee/prekeys — Upload batch of pre-keys
 * Accepts signed pre-key and/or one-time pre-keys
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const body = await req.json();
    const { signedPreKey, oneTimePreKeys } = body;

    const created: string[] = [];

    if (signedPreKey) {
      // Deactivate existing signed pre-key
      await prismadb.userPreKey.updateMany({
        where: { userId, keyType: "SIGNED" },
        data: { isConsumed: true },
      });

      await prismadb.userPreKey.create({
        data: {
          userId,
          keyType: "SIGNED",
          publicKey: signedPreKey.publicKey,
          signature: signedPreKey.signature,
        },
      });
      created.push("signedPreKey");
    }

    if (oneTimePreKeys?.length) {
      await prismadb.userPreKey.createMany({
        data: oneTimePreKeys.map((pk: string) => ({
          userId,
          keyType: "ONE_TIME" as const,
          publicKey: pk,
        })),
      });
      created.push(`${oneTimePreKeys.length} oneTimePreKeys`);
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error("[E2EE PreKeys POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
