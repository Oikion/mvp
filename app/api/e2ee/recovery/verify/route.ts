import { NextResponse } from "next/server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";

// ─── Input Schema ──────────────────────────────

const RecoveryVerifySchema = z
  .object({
    orgId: z.string().min(1),   // The organization to recover
    code: z.string().min(1),    // Plaintext recovery code entered by the user
  })
  .strict();

// ─── POST /api/e2ee/recovery/verify ───────────

/**
 * Verify a recovery code and return the wrapped ORK for client-side decryption.
 *
 * This endpoint is intentionally unauthenticated: recovery is for lockout scenarios
 * where the admin cannot pass a Clerk session (e.g., key material lost). It is
 * rate-limited at the proxy/middleware level (proxy.ts "strict" tier — 10 req/min).
 *
 * Security properties:
 *   - Atomic check-and-consume: the code is marked used inside the same DB transaction
 *     that returns the wrapped ORK. A TOCTOU race cannot produce two successful uses.
 *   - Generic error response: the 401 message is identical whether the code is wrong,
 *     already used, or the org has no recovery key — no oracle for attackers.
 *   - The server returns the PER-CODE wrappedOrk (not the admin's wrappedOrk) so the
 *     caller uses PBKDF2(code, salt) → KEK → AES-KW unwrap to recover the ORK.
 *   - SHA-256(code) is used as a lookup index. An attacker who steals the hash still
 *     cannot recover the ORK without the PBKDF2-wrapped key material. See recovery.ts.
 *
 * Returns on success:
 *   { wrappedOrk: string; salt: string }
 *   Pass these to unwrapOrkWithCode(code, salt, wrappedOrk) in lib/e2ee/recovery.ts.
 */
export async function POST(req: Request) {
  try {
    // 1. Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = RecoveryVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { orgId, code } = parsed.data;

    // 2. Compute SHA-256(code) — used as a lookup index in RecoveryCode.codeHash.
    //    This is NOT a security check; AES-KW authenticated decryption is the gate.
    const codeBytes = new TextEncoder().encode(code);
    const hashBuf = await crypto.subtle.digest("SHA-256", codeBytes);
    const inputCodeHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 3. Find the OrgRecoveryKey for this org
    const orgRecoveryKey = await prismadb.orgRecoveryKey.findUnique({
      where: { orgId },
      select: { id: true },
    });

    // Return generic 401 whether org has no recovery key or code doesn't match —
    // do not reveal which condition failed.
    if (!orgRecoveryKey) {
      return NextResponse.json({ error: "Recovery verification failed" }, { status: 401 });
    }

    // 4. Atomic check-and-consume inside a transaction.
    //    Finding the code and marking it used happen in a single DB transaction,
    //    preventing TOCTOU races where two concurrent requests could both succeed.
    let matchedCode: { wrappedOrk: string; salt: string } | null = null;

    try {
      matchedCode = await prismadb.$transaction(async (tx) => {
        // Find an unused RecoveryCode matching the hash
        const found = await tx.recoveryCode.findFirst({
          where: {
            recoveryKeyId: orgRecoveryKey.id,
            codeHash: inputCodeHash,
            used: false,
          },
          select: {
            id: true,
            wrappedOrk: true,
            salt: true,
          },
        });

        if (!found) {
          // Returning null from the transaction callback is valid; we handle it below.
          return null;
        }

        // Mark the code as consumed — single-use guarantee
        await tx.recoveryCode.update({
          where: { id: found.id },
          data: {
            used: true,
            usedAt: new Date(),
          },
        });

        return { wrappedOrk: found.wrappedOrk, salt: found.salt };
      });
    } catch (txError) {
      console.error("[e2ee/recovery/verify] transaction error", txError);
      return NextResponse.json({ error: "Recovery verification failed" }, { status: 500 });
    }

    if (!matchedCode) {
      // Code not found or already used — same generic message either way
      return NextResponse.json({ error: "Recovery verification failed" }, { status: 401 });
    }

    // 5. Return the per-code wrapped ORK.
    //    The client will: PBKDF2(code, salt) → KEK → AES-KW unwrap → raw ORK bytes.
    //    We deliberately do NOT return orgRecoveryKey.wrappedOrk (the admin's copy).
    return NextResponse.json(
      {
        wrappedOrk: matchedCode.wrappedOrk,
        salt: matchedCode.salt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[e2ee/recovery/verify]", error);
    return NextResponse.json({ error: "Recovery verification failed" }, { status: 500 });
  }
}
