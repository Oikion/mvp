import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { runIntraOrgMatches } from "@/actions/matchmaking/compute-intra-org-matches";
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiInternalError,
  apiBadRequest,
  apiRateLimited,
} from "@/lib/api-response";

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

const bodySchema = z.object({ requestId: z.string().cuid().optional() }).strict();

export async function POST(req: Request): Promise<Response> {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    // Optional: pass a requestId to update its lastMatchRunAt
    const rawBody = await req.json().catch(() => ({}));
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) return apiBadRequest("Invalid request body");
    const { requestId } = parseResult.data;

    // Org-level gate: prevent repeated full-org recomputes
    const lastOrgRun = await prismadb.propertyRequestMatch.findFirst({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    if (lastOrgRun?.updatedAt) {
      const elapsed = Date.now() - lastOrgRun.updatedAt.getTime();
      if (elapsed < RATE_LIMIT_MS) {
        const retryAfterSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
        return apiRateLimited(`Rate limited. Try again in ${retryAfterSec}s.`);
      }
    }

    if (requestId) {
      const request = await prismadb.request.findFirst({
        where: { id: requestId, organizationId },
        select: { lastMatchRunAt: true },
      });

      if (!request) return apiNotFound("Request");

      if (request.lastMatchRunAt) {
        const elapsed = Date.now() - request.lastMatchRunAt.getTime();
        if (elapsed < RATE_LIMIT_MS) {
          const retryAfterSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
          return apiRateLimited(`Rate limited. Try again in ${retryAfterSec}s.`);
        }
      }

      await prismadb.request.update({
        where: { id: requestId, organizationId },
        data: { lastMatchRunAt: new Date() },
      });
    }

    const result = await runIntraOrgMatches(organizationId);

    return apiSuccess({
      upserted: result.upserted,
      skipped: result.skipped,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("[MATCHMAKING_RUN_NOW]", error);
    return apiInternalError("Failed to run matching");
  }
}
