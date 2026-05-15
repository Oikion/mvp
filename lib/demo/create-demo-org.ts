import { createClerkClient } from "@clerk/backend";
import { seedDemoOrg, pickDemoAgencyName } from "@/lib/demo/seed-demo-org";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export interface CreateDemoOrgResult {
  demoOrgId: string;
}

export async function createDemoOrgForUser(
  userId: string,
  locale: "el" | "en"
): Promise<CreateDemoOrgResult> {
  const agencyName = pickDemoAgencyName();

  const demoOrg = await clerkClient.organizations.createOrganization({
    name: agencyName,
    createdBy: userId,
    publicMetadata: {
      isDemo: true,
      demoSeededAt: new Date().toISOString(),
    },
  });

  await seedDemoOrg(demoOrg.id, userId, locale);

  return { demoOrgId: demoOrg.id };
}
