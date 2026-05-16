#!/usr/bin/env npx tsx

/**
 * Backfill extra demo data (deals, notifications, calendar events, tasks)
 * for all existing demo orgs.
 *
 * Usage:
 *   pnpm tsx scripts/reseed-demo-orgs.ts
 *   pnpm tsx scripts/reseed-demo-orgs.ts --org-id org_xxxx  # single org
 *   pnpm tsx scripts/reseed-demo-orgs.ts --dry-run          # list orgs, no writes
 *
 * Requires DATABASE_URL and CLERK_SECRET_KEY in .env / .env.local
 */

import * as dotenv from "dotenv";
import * as path from "path";

// dotenv MUST run before @/lib/* modules load — those read DATABASE_URL at initialization.
// Static `import` statements are hoisted, so we keep only side-effect-free imports at the
// top level and use dynamic import() inside main() to guarantee env vars are injected first.
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const targetOrgId = args.find((_, i) => args[i - 1] === "--org-id");
const dryRun = args.includes("--dry-run");

async function main() {
  // Dynamic imports run after dotenv has injected DATABASE_URL into process.env
  const { prismadb } = await import("@/lib/prisma");
  const { seedDemoOrgExtras } = await import("@/lib/demo/seed-demo-org");
  const { createClerkClient } = await import("@clerk/backend");

  const clerkAdmin = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const demoSettings = await prismadb.organizationSettings.findMany({
    where: {
      isDemo: true,
      ...(targetOrgId ? { organizationId: targetOrgId } : {}),
    },
    select: { organizationId: true, createdBy: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (demoSettings.length === 0) {
    console.log("No demo orgs found.");
    return;
  }

  console.log(`Found ${demoSettings.length} demo org(s)${dryRun ? " [dry-run — no writes]" : ""}:\n`);

  // Deduplicate Clerk locale lookups
  const uniqueCreators = Array.from(
    new Set(demoSettings.map((s) => s.createdBy).filter(Boolean) as string[])
  );
  const localeMap = new Map<string, "el" | "en">();
  for (const uid of uniqueCreators) {
    try {
      const user = await clerkAdmin.users.getUser(uid);
      const lang = (user.publicMetadata as Record<string, unknown>)?.userLanguage;
      localeMap.set(uid, lang === "en" ? "en" : "el");
    } catch {
      localeMap.set(uid, "el");
    }
  }

  let reseeded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { organizationId: orgId, createdBy, createdAt } of demoSettings) {
    const age = Math.round((Date.now() - createdAt.getTime()) / 86_400_000);
    const locale = (createdBy ? localeMap.get(createdBy) : undefined) ?? "el";

    console.log(`  ${orgId}  age=${age}d  locale=${locale}  createdBy=${createdBy ?? "unknown"}`);

    if (!createdBy) {
      console.log(`    ⚠ skipped — no createdBy on record`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`    ✓ would reseed`);
      continue;
    }

    try {
      await seedDemoOrgExtras(orgId, createdBy, locale);
      console.log(`    ✓ reseeded`);
      reseeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`    ✗ error: ${msg}`);
      errors.push(`${orgId}: ${msg}`);
    }
  }

  console.log(`\nDone. reseeded=${reseeded}  skipped=${skipped}  errors=${errors.length}`);
  if (errors.length > 0) {
    console.error("\nErrors:");
    errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }

  await prismadb.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
