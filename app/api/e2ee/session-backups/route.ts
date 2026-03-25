import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { encryptWithKey, decryptWithKey } from "@/lib/encryption";
import { getOrgDek, getOrgDekByVersion, getOrgKeyVersion } from "@/lib/key-management";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const SessionBackupItemSchema = z.object({
  sessionType: z.enum(["ratchet", "megolm-out", "megolm-in"]),
  sessionKey: z.string().min(1).max(512),
  eciesBlob: z.string().min(1).max(65536),     // 64 KB max
  ephemeralPubKey: z.string().min(1).max(512),
  iv: z.string().min(1).max(64),
}).strict();

const SessionBackupBatchSchema = z.object({
  backups: z.array(SessionBackupItemSchema).min(1).max(50),
}).strict();

// ---------------------------------------------------------------------------
// POST /api/e2ee/session-backups — Batch upsert session backups
// ---------------------------------------------------------------------------

/**
 * Accepts a batch of ECIES-encrypted session blobs, wraps each with the org
 * DEK (dual-layer encryption), then upserts into E2eeSessionBackup.
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = SessionBackupBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const dek = await getOrgDek(orgId);
    const dekVersion = await getOrgKeyVersion(orgId);

    const results: Array<{ sessionKey: string; version: number }> = [];

    for (const item of parsed.data.backups) {
      // Wrap the ECIES blob with the org DEK (server-side layer)
      const encryptedState = encryptWithKey(item.eciesBlob, dek);

      // Upsert: increment version on conflict
      const record = await prismadb.e2eeSessionBackup.upsert({
        where: {
          userId_organizationId_sessionType_sessionKey: {
            userId,
            organizationId: orgId,
            sessionType: item.sessionType,
            sessionKey: item.sessionKey,
          },
        },
        create: {
          userId,
          organizationId: orgId,
          sessionType: item.sessionType,
          sessionKey: item.sessionKey,
          encryptedState,
          ephemeralPubKey: item.ephemeralPubKey,
          iv: item.iv,
          dekVersion,
          version: 1,
        },
        update: {
          encryptedState,
          ephemeralPubKey: item.ephemeralPubKey,
          iv: item.iv,
          dekVersion,
          version: { increment: 1 },
        },
      });

      results.push({ sessionKey: record.sessionKey, version: record.version });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[E2EE_SESSION_BACKUPS]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/e2ee/session-backups — Fetch all session backups for caller
// ---------------------------------------------------------------------------

/**
 * Returns DEK-unwrapped ECIES blobs so the client can restore its sessions.
 * Accepts optional ?sessionType= query param to narrow results.
 */
export async function GET(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionType = searchParams.get("sessionType") ?? undefined;

    const records = await prismadb.e2eeSessionBackup.findMany({
      where: {
        userId,
        organizationId: orgId,
        ...(sessionType ? { sessionType } : {}),
      },
    });

    const backups = await Promise.all(
      records.map(async (backup) => {
        const dek = await getOrgDekByVersion(orgId, backup.dekVersion);
        const eciesBlob = decryptWithKey(backup.encryptedState, dek);

        return {
          sessionType: backup.sessionType,
          sessionKey: backup.sessionKey,
          eciesBlob,
          ephemeralPubKey: backup.ephemeralPubKey,
          iv: backup.iv,
          version: backup.version,
          updatedAt: backup.updatedAt,
        };
      })
    );

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("[E2EE_SESSION_BACKUPS]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/e2ee/session-backups — Wipe all session backups for caller
// ---------------------------------------------------------------------------

/**
 * Deletes every session backup belonging to the authenticated user in the org.
 * Typically called during E2EE key rotation or account wipe.
 */
export async function DELETE() {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count } = await prismadb.e2eeSessionBackup.deleteMany({
      where: { userId, organizationId: orgId },
    });

    return NextResponse.json({ deleted: count });
  } catch (error) {
    console.error("[E2EE_SESSION_BACKUPS]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
