import { prismadb } from "@/lib/prisma";
import { encryptWithKey } from "@/lib/encryption";
import { getOrgDek, getOrgKeyVersion } from "@/lib/key-management";

interface BackupItem {
  sessionType: string;
  sessionKey: string;
  eciesBlob: string;
  ephemeralPubKey: string;
  iv: string;
}

export async function processBackupBatch(
  userId: string,
  orgId: string,
  backups: BackupItem[]
): Promise<Array<{ sessionKey: string; version: number }>> {
  const dek = await getOrgDek(orgId);
  const dekVersion = await getOrgKeyVersion(orgId);
  const results: Array<{ sessionKey: string; version: number }> = [];

  for (const item of backups) {
    const encryptedState = encryptWithKey(item.eciesBlob, dek);
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

  return results;
}
