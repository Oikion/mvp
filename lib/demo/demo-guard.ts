import { prismadb } from "@/lib/prisma";

export async function isDemoOrg(orgId: string): Promise<boolean> {
  if (!orgId) throw new Error("[demo-guard] isDemoOrg: orgId is required");

  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { isDemo: true },
  });

  return settings?.isDemo === true;
}
