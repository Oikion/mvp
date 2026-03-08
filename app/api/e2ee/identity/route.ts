import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import crypto from "crypto";

/**
 * POST /api/e2ee/identity — First-time E2EE setup
 * Creates identity key + generates server-side pepper
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { publicKey, wrappedPrivateKey, salt, pbkdfIterations, signedPreKey, oneTimePreKeys } = body;

    if (!publicKey || !wrappedPrivateKey || !salt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if already set up
    const existing = await prismadb.userIdentityKey.findUnique({
      where: { userId },
    });
    if (existing) {
      return NextResponse.json({ error: "E2EE already set up" }, { status: 409 });
    }

    // Generate server-side pepper
    const pepper = crypto.randomBytes(32).toString("hex");

    // Create identity key, pepper, and pre-keys in a transaction
    const result = await prismadb.$transaction(async (tx) => {
      const identityKey = await tx.userIdentityKey.create({
        data: {
          userId,
          publicKey,
          wrappedPrivateKey,
          salt,
          pbkdfIterations: pbkdfIterations ?? 100000,
        },
      });

      await tx.userE2eePepper.create({
        data: { userId, pepper },
      });

      // Store signed pre-key
      if (signedPreKey) {
        await tx.userPreKey.create({
          data: {
            userId,
            keyType: "SIGNED",
            publicKey: signedPreKey.publicKey,
            signature: signedPreKey.signature,
          },
        });
      }

      // Store one-time pre-keys
      if (oneTimePreKeys?.length) {
        await tx.userPreKey.createMany({
          data: oneTimePreKeys.map((pk: string) => ({
            userId,
            keyType: "ONE_TIME" as const,
            publicKey: pk,
          })),
        });
      }

      return identityKey;
    });

    return NextResponse.json({ id: result.id, publicKey: result.publicKey });
  } catch (error) {
    console.error("[E2EE Identity POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/e2ee/identity — Fetch own identity key info
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identityKey = await prismadb.userIdentityKey.findUnique({
      where: { userId },
      select: {
        id: true,
        publicKey: true,
        wrappedPrivateKey: true,
        salt: true,
        pbkdfIterations: true,
        keyVersion: true,
      },
    });

    if (!identityKey) {
      return NextResponse.json({ isSetUp: false });
    }

    return NextResponse.json({ isSetUp: true, ...identityKey });
  } catch (error) {
    console.error("[E2EE Identity GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * PUT /api/e2ee/identity — Rotate identity key (re-wrap with new PIN)
 */
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { wrappedPrivateKey, salt, pbkdfIterations } = body;

    if (!wrappedPrivateKey || !salt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updated = await prismadb.userIdentityKey.update({
      where: { userId },
      data: {
        wrappedPrivateKey,
        salt,
        pbkdfIterations: pbkdfIterations ?? 100000,
        keyVersion: { increment: 1 },
      },
    });

    return NextResponse.json({ id: updated.id, keyVersion: updated.keyVersion });
  } catch (error) {
    console.error("[E2EE Identity PUT]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
