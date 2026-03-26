/**
 * Import File Deduplication Check Endpoint
 *
 * POST /api/import/dedupe-check
 *
 * Checks if a file has been previously imported within the last 30 days
 * using SHA-256 file hash comparison.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId: organizationId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fileHash } = body;

    // Validate fileHash format (SHA-256 hex string)
    if (!fileHash || typeof fileHash !== "string" || !/^[a-f0-9]{64}$/i.test(fileHash)) {
      return NextResponse.json(
        { error: "Invalid file hash. Expected 64-character hex string (SHA-256)" },
        { status: 400 }
      );
    }

    // Check for imports within the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existing = await prismadb.importHistory.findFirst({
      where: {
        organizationId,
        fileHash,
        status: { notIn: ["BATCH_DELETED", "PARTIALLY_DELETED"] },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        sourceFilename: true,
        createdCount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return NextResponse.json({
        duplicate: true,
        previousImport: {
          id: existing.id,
          date: existing.createdAt,
          filename: existing.sourceFilename,
          createdCount: existing.createdCount,
          status: existing.status,
        },
      });
    }

    return NextResponse.json({ duplicate: false });
  } catch (error) {
    console.error("[IMPORT_DEDUPE_CHECK_POST]", error);
    return NextResponse.json(
      { error: "Failed to check for duplicate imports" },
      { status: 500 }
    );
  }
}
