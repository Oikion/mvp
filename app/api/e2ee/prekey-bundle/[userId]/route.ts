import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * GET /api/e2ee/prekey-bundle/[userId] — Fetch pre-key bundle for X3DH
 * Atomically consumes one one-time pre-key
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: requesterId } = await auth();
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: targetUserId } = await params;

    // Fetch identity key
    const identityKey = await prismadb.userIdentityKey.findUnique({
      where: { userId: targetUserId },
      select: { publicKey: true },
    });

    if (!identityKey) {
      return NextResponse.json({ error: "User has not set up E2EE" }, { status: 404 });
    }

    // Fetch signed pre-key
    const signedPreKey = await prismadb.userPreKey.findFirst({
      where: {
        userId: targetUserId,
        keyType: "SIGNED",
        isConsumed: false,
      },
      orderBy: { createdAt: "desc" },
      select: { publicKey: true, signature: true },
    });

    if (!signedPreKey) {
      return NextResponse.json({ error: "No signed pre-key available" }, { status: 404 });
    }

    // Atomically consume one one-time pre-key (if available)
    let oneTimePreKey: { publicKey: string; id: string } | null = null;
    const otp = await prismadb.userPreKey.findFirst({
      where: {
        userId: targetUserId,
        keyType: "ONE_TIME",
        isConsumed: false,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, publicKey: true },
    });

    if (otp) {
      // Mark as consumed atomically
      await prismadb.userPreKey.update({
        where: { id: otp.id },
        data: { isConsumed: true },
      });
      oneTimePreKey = otp;
    }

    return NextResponse.json({
      identityKey: identityKey.publicKey,
      signedPreKey: signedPreKey.publicKey,
      signature: signedPreKey.signature,
      oneTimePreKey: oneTimePreKey?.publicKey ?? undefined,
      oneTimePreKeyId: oneTimePreKey?.id ?? undefined,
    });
  } catch (error) {
    console.error("[E2EE PreKey Bundle GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
