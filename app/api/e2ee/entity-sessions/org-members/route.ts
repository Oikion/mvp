import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { getOrgMembersFromDb } from "@/lib/org-members";
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";

export async function GET(_req: Request) {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    const encryptionMode = await getOrgEncryptionMode(orgId);
    if (encryptionMode !== EncryptionMode.E2EE) {
      return NextResponse.json({ error: "Not an E2EE organization" }, { status: 400 });
    }

    const { users } = await getOrgMembersFromDb({ organizationId: orgId });
    const userIds = users.map((u: any) => u.id);

    const identities = await prismadb.userIdentityKey.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, publicKey: true, pendingSessionReshare: true },
    });

    const identityMap = new Map(identities.map((i) => [i.userId, i]));

    return NextResponse.json({
      members: users.map((u: any) => {
        const identity = identityMap.get(u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          identityPublicKey: identity?.publicKey ?? null,
          pendingKeyRotation: identity?.pendingSessionReshare ?? false,
        };
      }),
    });
  } catch (error) {
    console.error("[E2EE_ORG_MEMBERS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch org members" }, { status: 500 });
  }
}
