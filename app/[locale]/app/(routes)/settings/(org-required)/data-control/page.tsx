import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import { getActionPermissionContext } from "@/lib/permissions/action-service";
import type { PolicyEra } from "@/lib/data-ownership/types";
import { OrgRole } from "@prisma/client";
import { DataControlClient } from "./components/DataControlClient";

export default async function DataControlPage() {
  const { orgId } = await auth();
  if (!orgId) redirect("/app");

  const context = await getActionPermissionContext();
  if (!context) redirect("/app");

  const isOwner = context.role === OrgRole.OWNER;
  const isAdmin = context.role === OrgRole.OWNER || context.role === OrgRole.LEAD;

  if (!isAdmin) redirect("/app/admin");

  const [settings, consentCounts] = await Promise.all([
    prismadb.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: {
        dataOwnershipMode: true,
        dataOwnershipSetAt: true,
        dataOwnershipChangedAt: true,
        dataOwnershipChangedBy: true,
        policyVersion: true,
        policyHistory: true,
      },
    }),
    prismadb.orgMemberConsent.groupBy({
      by: ["policyVersion"],
      where: { organizationId: orgId },
      _count: { userId: true },
      orderBy: { policyVersion: "asc" },
    }),
  ]);

  const currentVersion = settings?.policyVersion ?? 1;
  const consentedAtCurrent =
    consentCounts.find((c) => c.policyVersion === currentVersion)?._count.userId ?? 0;

  return (
    <DataControlClient
      settings={
        settings
          ? {
              dataOwnershipMode: settings.dataOwnershipMode,
              dataOwnershipSetAt: settings.dataOwnershipSetAt?.toISOString() ?? null,
              dataOwnershipChangedAt: settings.dataOwnershipChangedAt?.toISOString() ?? null,
              policyVersion: settings.policyVersion,
              policyHistory: (settings.policyHistory as PolicyEra[] | null) ?? [],
            }
          : null
      }
      isOwner={isOwner}
      consentedAtCurrent={consentedAtCurrent}
    />
  );
}
