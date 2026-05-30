import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { decryptDocumentForOrg } from "@/lib/model-encryption";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = await params;

  const document = await prismadb.documents.findFirst({
    where: { id: documentId, organizationId },
    select: {
      document_file_url: true,
      document_file_mimeType: true,
      document_name: true,
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { document_name: decryptedName } = await decryptDocumentForOrg(
    { document_name: document.document_name },
    organizationId,
  );

  // Proxy file through this auth-gated route.
  // TODO: when Vercel Blob private mode is configured, generate a presigned URL and redirect instead.
  const blobRes = await fetch(document.document_file_url);
  if (!blobRes.ok) return NextResponse.json({ error: "File unavailable" }, { status: 502 });

  const content = await blobRes.arrayBuffer();
  const safeName = encodeURIComponent(`${decryptedName ?? documentId}.pdf`).replace(/%20/g, "_");

  return new NextResponse(content, {
    headers: {
      "Content-Type": document.document_file_mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
