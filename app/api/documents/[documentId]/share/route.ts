import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { createShareLink } from "@/lib/documents/create-share-link";
import { hash, compare } from "bcryptjs";
import { invalidateCache } from "@/lib/cache-invalidate";

export async function POST(
  req: Request,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    if (!organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const params = await props.params;

    const document = await prismadb.documents.findFirst({
      where: { id: params.documentId, organizationId },
    });

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    // Generate shareable link if not exists
    const shareableLink = document.shareableLink || createShareLink();

    const updated = await prismadb.documents.update({
      where: { id: params.documentId, organizationId },
      data: {
        shareableLink,
        linkEnabled: true,
      },
    });

    await invalidateCache(["documents"]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[DOCUMENT_SHARE_ENABLE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    if (!organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const params = await props.params;

    const body = await req.json();
    const { passwordProtected, password, expiresAt, linkEnabled } = body;

    const document = await prismadb.documents.findFirst({
      where: { id: params.documentId, organizationId },
    });

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    let passwordHash = document.passwordHash;
    if (passwordProtected && password) {
      passwordHash = await hash(password, 10);
    } else if (!passwordProtected) {
      passwordHash = null;
    }

    const updated = await prismadb.documents.update({
      where: { id: params.documentId, organizationId },
      data: {
        linkEnabled: linkEnabled !== undefined ? linkEnabled : document.linkEnabled,
        passwordProtected: passwordProtected !== undefined ? passwordProtected : document.passwordProtected,
        passwordHash,
        expiresAt: expiresAt ? new Date(expiresAt) : expiresAt === null ? null : document.expiresAt,
      },
    });

    await invalidateCache(["documents"]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[DOCUMENT_SHARE_UPDATE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    if (!organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const params = await props.params;

    const updated = await prismadb.documents.update({
      where: { id: params.documentId, organizationId },
      data: {
        linkEnabled: false,
      },
    });

    await invalidateCache(["documents"]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[DOCUMENT_SHARE_DISABLE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

