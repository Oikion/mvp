import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { getDocument } from "@/actions/documents/get-document";
import { prismadb } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { mergeDocumentMentions } from "@/actions/documents/parse-mentions";
import { deleteFromBlob } from "@/lib/vercel-blob";
import { invalidateCache } from "@/lib/cache-invalidate";

export async function GET(
  req: Request,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const params = await props.params;
    
    const document = await getDocument(params.documentId, organizationId);
    
    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("[DOCUMENT_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const params = await props.params;
    
    const body = await req.json();
    const {
      document_name,
      description,
      document_type,
      assigned_user,
      clientIds,
      propertyIds,
      eventIds,
      taskIds,
    } = body;

    // Get existing document
    const existingDocument = await prismadb.documents.findFirst({
      where: { id: params.documentId, organizationId },
    });

    if (!existingDocument) {
      return new NextResponse("Document not found", { status: 404 });
    }

    // Merge mentions if description changed
    const mergedMentions = await mergeDocumentMentions(
      description,
      {
        clientIds,
        propertyIds,
        eventIds,
        taskIds,
      },
      organizationId
    );

    // Update document
    const document = await prismadb.documents.update({
      where: { id: params.documentId },
      data: {
        document_name: document_name || existingDocument.document_name,
        description: description !== undefined ? description : existingDocument.description,
        document_type: document_type || existingDocument.document_type,
        assigned_user: assigned_user || existingDocument.assigned_user,
        mentions: mergedMentions as unknown as Prisma.InputJsonValue,
        accountsIDs: mergedMentions.clients.map((c) => c.id),
        linkedPropertiesIds: mergedMentions.properties.map((p) => p.id),
        linkedCalComEventsIds: mergedMentions.events.map((e) => e.id),
        linkedTasksIds: mergedMentions.tasks.map((t) => t.id),
        accounts: {
          set: mergedMentions.clients.map((c) => ({ id: c.id })),
        },
        linkedProperties: {
          set: mergedMentions.properties.map((p) => ({ id: p.id })),
        },
        linkedCalComEvents: {
          set: mergedMentions.events.map((e) => ({ id: e.id })),
        },
        linkedTasks: {
          set: mergedMentions.tasks.map((t) => ({ id: t.id })),
        },
      },
      include: {
        accounts: true,
        linkedProperties: true,
        linkedCalComEvents: true,
        linkedTasks: true,
      },
    });

    await invalidateCache(["documents"]);

    return NextResponse.json(document);
  } catch (error) {
    console.error("[DOCUMENT_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const params = await props.params;

    const document = await prismadb.documents.findFirst({
      where: { id: params.documentId, organizationId },
    });

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    // Delete file from Vercel Blob
    try {
      await deleteFromBlob(document.document_file_url);
    } catch (error) {
      console.error("Error deleting blob:", error);
      // Continue with document deletion even if blob deletion fails
    }

    // Delete document
    await prismadb.documents.delete({
      where: { id: params.documentId },
    });

    await invalidateCache(["documents"]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DOCUMENT_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

