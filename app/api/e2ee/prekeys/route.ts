import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { z } from "zod";

const PreKeyUploadSchema = z.object({
  signedPreKey: z.object({
    keyId: z.string().uuid().optional(),
    publicKey: z.string().min(1).max(1000),
    signature: z.string().min(1).max(1000),
  }).optional(),
  oneTimePreKeys: z.array(z.object({
    keyId: z.string().uuid().optional(),
    publicKey: z.string().min(1).max(1000),
  })).min(1).max(100).optional(),
}).strict().refine((d) => d.signedPreKey || (d.oneTimePreKeys && d.oneTimePreKeys.length > 0), {
  message: "Must provide signedPreKey or oneTimePreKeys",
});

/**
 * POST /api/e2ee/prekeys — Upload batch of pre-keys
 * Accepts signed pre-key and/or one-time pre-keys
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const body = await req.json();
    const parsed = PreKeyUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { signedPreKey, oneTimePreKeys } = parsed.data;

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
        data: oneTimePreKeys.map((pk) => ({
          userId,
          keyType: "ONE_TIME" as const,
          publicKey: pk.publicKey,
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
