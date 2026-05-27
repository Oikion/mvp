import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { apiUnauthorized, apiForbidden, apiNotFound } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return apiUnauthorized();

  const { id } = await params;

  const request = await prismadb.dataExportRequest.findFirst({
    where: { id, organizationId },
  });

  if (!request) return apiNotFound("Export request");

  if (request.expiresAt && request.expiresAt < new Date()) {
    return NextResponse.json({ error: "This export link has expired" }, { status: 410 });
  }

  if (request.requestedById !== userId) {
    return apiForbidden("You do not have access to this export");
  }

  if (!request.downloadUrl) {
    return NextResponse.json({ error: "Export file is no longer available" }, { status: 410 });
  }

  try {
    const blobResponse = await fetch(request.downloadUrl);
    if (!blobResponse.ok) {
      console.error("[GDPR_EXPORT_DOWNLOAD] Blob fetch failed:", blobResponse.status, id);
      return NextResponse.json({ error: "Export file could not be retrieved" }, { status: 502 });
    }

    // Null the download URL to enforce single-use download
    await prismadb.dataExportRequest.update({
      where: { id },
      data: { downloadUrl: null },
    });

    const body = await blobResponse.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gdpr-export.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GDPR_EXPORT_DOWNLOAD]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
