import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { isE2EEOrg } from "@/lib/entity-session/encryption-mode";

// ─── Input Schema ──────────────────────────────

const RecoveryCodeInputSchema = z
  .object({
    codeHash: z.string().min(64).max(64),   // SHA-256 hex = exactly 64 chars
    wrappedOrk: z.string().min(1),
    salt: z.string().min(1),
  })
  .strict();

const RecoverySetupSchema = z
  .object({
    adminWrappedOrk: z.string().min(1),     // ORK wrapped with admin's PIN-derived KEK
    adminSalt: z.string().min(1),           // Salt used in admin's KEK derivation for ORK wrap
    codes: z.array(RecoveryCodeInputSchema).length(8),  // Exactly 8 recovery codes
  })
  .strict();

// ─── POST /api/e2ee/recovery/setup ────────────

/**
 * Store recovery codes for an E2EE organization.
 *
 * Only org owners/admins may call this endpoint — recovery codes are a root-level
 * security control and must not be configurable by regular members.
 *
 * Each call is idempotent with respect to regeneration: all existing codes and the
 * existing OrgRecoveryKey are deleted atomically before the new ones are created.
 * This supports the "regenerate codes" flow triggered when fewer than 3 remain.
 *
 * Cryptographic data arrives pre-computed from the client (lib/e2ee/recovery.ts):
 *   - adminWrappedOrk: ORK wrapped with admin's existing PIN-derived KEK (AES-KW)
 *   - adminSalt:       salt used during admin's KEK derivation (for future admin unwrap)
 *   - codes[]:         per-code wrapped ORK + PBKDF2 salt + SHA-256(code) lookup hash
 *
 * The server never sees plaintext codes or the raw ORK.
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate — require both user and org context
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify the org is in E2EE mode — recovery codes only make sense for E2EE orgs
    const e2ee = await isE2EEOrg(orgId);
    if (!e2ee) {
      return NextResponse.json(
        { error: "Recovery codes are only available for E2EE organizations" },
        { status: 403 }
      );
    }

    // 3. Require org owner or admin role (recovery codes are a root security control)
    const authSession = await auth();
    const isOwner = await authSession.has({ role: "org:owner" });
    const isAdmin = await authSession.has({ role: "org:admin" });
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = RecoverySetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { adminWrappedOrk, adminSalt, codes } = parsed.data;

    // 5. Upsert the OrgRecoveryKey and RecoveryCodes in a single transaction.
    //    We delete existing records first to support the "regenerate codes" flow.
    //    The Prisma schema defines RecoveryCode.recoveryKey with onDelete: Cascade,
    //    but we delete codes explicitly first to be clear about intent.
    await prismadb.$transaction(async (tx) => {
      // Find any existing recovery key for this org
      const existing = await tx.orgRecoveryKey.findUnique({
        where: { orgId },
        select: { id: true },
      });

      if (existing) {
        // Cascade: RecoveryCode rows have onDelete: Cascade, so deleting the parent
        // OrgRecoveryKey removes all associated codes. We delete explicitly anyway
        // for clarity and to guarantee atomicity within this transaction.
        await tx.recoveryCode.deleteMany({
          where: { recoveryKeyId: existing.id },
        });
        await tx.orgRecoveryKey.delete({
          where: { id: existing.id },
        });
      }

      // Create the new OrgRecoveryKey
      const recoveryKey = await tx.orgRecoveryKey.create({
        data: {
          orgId,
          wrappedOrk: adminWrappedOrk,
          salt: adminSalt,
          wrappedByUserId: userId,
        },
      });

      // Create each of the 8 per-code RecoveryCode records
      await tx.recoveryCode.createMany({
        data: codes.map((c) => ({
          recoveryKeyId: recoveryKey.id,
          codeHash: c.codeHash,
          wrappedOrk: c.wrappedOrk,
          salt: c.salt,
          used: false,
        })),
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[e2ee/recovery/setup]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
