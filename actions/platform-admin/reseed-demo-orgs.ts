"use server";

import { requirePlatformAdmin } from "@/lib/platform-admin";
import { prismadb } from "@/lib/prisma";
import { topUpDemoOrg, type TopUpResult } from "@/lib/demo/seed-demo-org";

interface ReseedEntry {
  orgId: string;
  result?: TopUpResult;
  error?: string;
}

interface ReseedSummary {
  total: number;
  succeeded: number;
  failed: number;
  entries: ReseedEntry[];
}

/**
 * Top up all existing demo orgs with the current full seed dataset.
 * Idempotent — safe to run multiple times. Each org is processed sequentially
 * so a failure in one doesn't abort the rest.
 */
export async function reseedAllDemoOrgs(): Promise<ReseedSummary> {
  await requirePlatformAdmin();

  const demoSettings = await prismadb.organizationSettings.findMany({
    where: { isDemo: true },
    select: { organizationId: true, createdBy: true },
  });

  const entries: ReseedEntry[] = [];

  for (const setting of demoSettings) {
    if (!setting.createdBy) continue;

    // Detect locale from the general channel name — Greek = "el", anything else = "en"
    const generalChannel = await prismadb.channel.findFirst({
      where: { organizationId: setting.organizationId, slug: "general" },
      select: { name: true },
    });
    const locale: "el" | "en" = generalChannel?.name === "Γενικά" ? "el" : "en";

    try {
      const result = await topUpDemoOrg(setting.organizationId, setting.createdBy, locale);
      entries.push({ orgId: setting.organizationId, result });
    } catch (err) {
      console.error("[RESEED_DEMO_ORGS] Failed for org", setting.organizationId, err);
      entries.push({ orgId: setting.organizationId, error: String(err) });
    }
  }

  const succeeded = entries.filter((e) => !e.error).length;
  return { total: entries.length, succeeded, failed: entries.length - succeeded, entries };
}
