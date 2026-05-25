import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getOrgMembersFromDb } from "@/lib/org-members";

/**
 * GET /api/e2ee/prekey-bundle/[userId] — Fetch pre-key bundle for X3DH
 * Atomically consumes one one-time pre-key.
 *
 * Security: Verifies the target user is a member of the requester's active org.
 * This prevents cross-org bundle theft and OTP key exhaustion attacks.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: requesterId, orgId } = await auth();
    if (!requesterId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: targetUserId } = await params;

    // NC-1: Verify the target user belongs to the requester's active org.
    // clerkUserIds is the list of Clerk user IDs in the org (matches UserIdentityKey.userId format).
    const orgMembers = await getOrgMembersFromDb({ organizationId: orgId });
    if (!orgMembers.clerkUserIds.includes(targetUserId)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch identity key (including Ed25519 signing public key for SPK verification)
    const identityKey = await prismadb.userIdentityKey.findUnique({
      where: { userId: targetUserId },
      select: { publicKey: true, signingPublicKey: true },
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

    // NH-1: Atomically consume one one-time pre-key using conditional update.
    // findFirst + updateMany(where: { isConsumed: false }) ensures that if two concurrent
    // requests pick the same key, only one succeeds (count=1). The loser retries with
    // the next available key — no transaction needed because updateMany is atomic at DB level.
    let oneTimePreKey: { publicKey: string; id: string } | null = null;
    const OTP_MAX_RETRIES = 3;
    for (let attempt = 0; attempt < OTP_MAX_RETRIES; attempt++) {
      const candidate = await prismadb.userPreKey.findFirst({
        where: {
          userId: targetUserId,
          keyType: "ONE_TIME",
          isConsumed: false,
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, publicKey: true },
        skip: attempt, // Skip previously contested keys
      });

      if (!candidate) break; // No more OTP keys available

      // Conditional update — only succeeds if the key is still unconsumed
      const consumed = await prismadb.userPreKey.updateMany({
        where: { id: candidate.id, isConsumed: false },
        data: { isConsumed: true },
      });

      if (consumed.count > 0) {
        oneTimePreKey = candidate;
        break;
      }
      // count === 0 means another request consumed it first — try next key
    }

    // Count remaining unconsumed OTP keys for the target user (post-consumption).
    // If refillNeeded is true, the X3DH initiator should notify the target user
    // (e.g., via the in-app notification system) that they should upload more one-time prekeys.
    // Without OTP keys, new sessions use 3-DH instead of 4-DH, reducing forward secrecy.
    const remainingOtpCount = await prismadb.userPreKey.count({
      where: {
        userId: targetUserId,
        keyType: "ONE_TIME",
        isConsumed: false,
      },
    });
    const REFILL_THRESHOLD = 10;
    const refillNeeded = remainingOtpCount < REFILL_THRESHOLD;

    return NextResponse.json({
      identityKey: identityKey.publicKey,
      signingPublicKey: identityKey.signingPublicKey ?? undefined,
      signedPreKey: signedPreKey.publicKey,
      signature: signedPreKey.signature,
      oneTimePreKey: oneTimePreKey?.publicKey ?? undefined,
      oneTimePreKeyId: oneTimePreKey?.id ?? undefined,
      refillNeeded,
      remainingOtpCount,
    });
  } catch (error) {
    console.error("[E2EE PreKey Bundle GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
