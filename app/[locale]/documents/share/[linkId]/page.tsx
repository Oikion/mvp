import { getDocumentByShareLink } from "@/actions/documents/get-document";
import { notFound } from "next/navigation";
import { SharedDocumentViewer } from "./components/SharedDocumentViewer";
import { prismadb } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { headers } from "next/headers";

export default async function SharedDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ linkId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { linkId } = await params;
  const search = await searchParams;
  const password = typeof search.password === "string" ? search.password : undefined;

  const document = await getDocumentByShareLink(linkId);

  if (!document) {
    notFound();
  }

  // Check if link is enabled
  if (!document.linkEnabled) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Link Disabled</h1>
        <p className="text-muted-foreground">This link has been disabled.</p>
      </div>
    );
  }

  // Check if link has expired
  if (document.expiresAt && new Date(document.expiresAt) < new Date()) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Link Expired</h1>
        <p className="text-muted-foreground">This link has expired.</p>
      </div>
    );
  }

  // Handle password protection
  if (document.passwordProtected) {
    if (!password) {
      return <SharedDocumentViewer linkId={linkId} requiresPassword={true} />;
    }

    if (!document.passwordHash) {
      return (
        <div className="container mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground">Password protection error.</p>
        </div>
      );
    }

    const isValid = await compare(password, document.passwordHash);
    if (!isValid) {
      return <SharedDocumentViewer linkId={linkId} requiresPassword={true} invalidPassword={true} />;
    }
  }

  // Track view
  const headersList = await headers();
  const viewerIp = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  const viewerUserAgent = headersList.get("user-agent") || "unknown";

  await prismadb.documentView.create({
    data: {
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

  return <SharedDocumentViewer linkId={linkId} document={document} requiresPassword={false} />;
}

