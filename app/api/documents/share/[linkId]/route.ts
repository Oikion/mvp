import { NextResponse } from "next/server";
import { getDocumentByShareLink } from "@/actions/documents/get-document";
import { prismadb } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { headers } from "next/headers";

export async function GET(
  req: Request,
  props: { params: Promise<{ linkId: string }> }
) {
  try {
    const params = await props.params;
    const document = await getDocumentByShareLink(params.linkId);

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    // Check if link is enabled
    if (!document.linkEnabled) {
      return new NextResponse("Link is disabled", { status: 403 });
    }

    // Check if link has expired
    if (document.expiresAt && new Date(document.expiresAt) < new Date()) {
      return new NextResponse("Link has expired", { status: 403 });
    }

    // If password protected, require password in query params or header
    if (document.passwordProtected) {
      const { searchParams } = new URL(req.url);
      const providedPassword = searchParams.get("password");
      
      if (!providedPassword) {
        return NextResponse.json(
          { requiresPassword: true },
          { status: 401 }
        );
      }

      if (!document.passwordHash) {
        return new NextResponse("Password protection error", { status: 500 });
      }

      const isValid = await compare(providedPassword, document.passwordHash);
      if (!isValid) {
        return new NextResponse("Invalid password", { status: 401 });
      }
    }

    // Track view
    const headersList = await headers();
    const viewerIp = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const viewerUserAgent = headersList.get("user-agent") || "unknown";

    await prismadb.documentView.create({
      data: {
        id: crypto.randomUUID(),
        documentId: document.id,
        viewerIp,
        viewerUserAgent,
      },
    });

    // Update document view count
    await prismadb.documents.update({
      where: { id: document.id },
      data: {
        viewsCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("[DOCUMENT_SHARE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ linkId: string }> }
) {
  try {
    const params = await props.params;
    const body = await req.json();
    const { password } = body;

    const document = await getDocumentByShareLink(params.linkId);

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    if (!document.passwordProtected || !document.passwordHash) {
      return new NextResponse("Document is not password protected", { status: 400 });
    }

    const isValid = await compare(password, document.passwordHash);
    
    if (!isValid) {
      return new NextResponse("Invalid password", { status: 401 });
    }

    // Track view after password verification
    const headersList = await headers();
    const viewerIp = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const viewerUserAgent = headersList.get("user-agent") || "unknown";

    await prismadb.documentView.create({
      data: {
        id: crypto.randomUUID(),
        documentId: document.id,
        viewerIp,
        viewerUserAgent,
      },
    });

    await prismadb.documents.update({
      where: { id: document.id },
      data: {
        viewsCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("[DOCUMENT_SHARE_VERIFY]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

