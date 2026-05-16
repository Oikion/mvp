import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { seedDemoOrgExtras } from "@/lib/demo/seed-demo-org";
import { apiUnauthorized, apiForbidden, apiBadRequest, apiInternalError } from "@/lib/api-response";

const bodySchema = z
  .object({ orgId: z.string().min(1).optional() })
  .strict();

// Hard cap: process at most 25 orgs per call to avoid function timeouts.
const MAX_ORGS_PER_CALL = 25;

/**
 * POST /api/admin/reseed-demo
 *
 * Backfills missing demo org extras (deals, notifications, calendar events,
 * tasks) for existing demo orgs. Safe to call multiple times — all writes
 * use skipDuplicates or upsert.
 *
 * Body: { orgId?: string }  — omit to reseed up to 25 demo orgs at once
 * Returns: { reseeded: number, skipped: number, errors: string[] }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiUnauthorized();
    if (!(await isPlatformAdmin())) return apiForbidden();

    const rawBody = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) return apiBadRequest("Invalid request body");
    const targetOrgId = parsed.data.orgId;

    // Find demo org settings (optionally scoped to one org, capped at MAX_ORGS_PER_CALL)
    const demoSettings = await prismadb.organizationSettings.findMany({
      where: {
        isDemo: true,
        ...(targetOrgId ? { organizationId: targetOrgId } : {}),
      },
      select: { organizationId: true, createdBy: true },
      take: MAX_ORGS_PER_CALL,
    });

    if (demoSettings.length === 0) {
      return NextResponse.json({ reseeded: 0, skipped: 0, errors: [] });
    }

    // Deduplicate Clerk user lookups — fetch locale once per unique creator.
    const uniqueCreatorIds = Array.from(
      new Set(demoSettings.map((s) => s.createdBy).filter(Boolean) as string[])
    );
    const localeMap = new Map<string, "el" | "en">();
    try {
      const client = await clerkClient();
      for (const uid of uniqueCreatorIds) {
        try {
          const user = await client.users.getUser(uid);
          const lang = (user.publicMetadata as Record<string, unknown>)?.userLanguage;
          localeMap.set(uid, lang === "en" ? "en" : "el");
        } catch {
          localeMap.set(uid, "el");
        }
      }
    } catch {
      // Clerk unavailable — default all to "el"
    }

    let reseeded = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const { organizationId: orgId, createdBy } of demoSettings) {
      if (!createdBy) {
        skipped++;
        errors.push(`${orgId}: no createdBy on record — skipped`);
        continue;
      }

      try {
        const locale = localeMap.get(createdBy) ?? "el";
        await seedDemoOrgExtras(orgId, createdBy, locale);
        reseeded++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${orgId}: ${msg}`);
        console.error("[RESEED_DEMO] Failed to reseed org", orgId, err);
      }
    }

    return NextResponse.json({ reseeded, skipped, errors });
  } catch (error) {
    console.error("[RESEED_DEMO]", error);
    return apiInternalError("Internal server error", error);
  }
}
