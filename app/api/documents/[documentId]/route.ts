import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { getDocument } from "@/actions/documents/get-document";
import { prismadb } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { mergeDocumentMentions } from "@/actions/documents/parse-mentions";
import { invalidateCache } from "@/lib/cache-invalidate";
import { requireCanModify, checkAssignedToChange } from "@/lib/permissions/guards";

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
    // Permission check: Viewers cannot edit documents
    const permissionError = await requireCanModify();
    if (permissionError) return permissionError;

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const params = await props.params;

    const body = await req.json();
    const {
      document_name,
      description,
      content,
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

    // Permission check: Members cannot change assigned user
    const assignedToError = await checkAssignedToChange(
      { assigned_to: assigned_user },
      existingDocument.assigned_user
    );
    if (assignedToError) return assignedToError;

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
        content: content ?? undefined,
        document_type: document_type || existingDocument.document_type,
        assigned_user: assigned_user || existingDocument.assigned_user,
        mentions: mergedMentions as unknown as Prisma.InputJsonValue,
        contactsIDs: mergedMentions.clients.map((c) => c.id),
        linkedPropertiesIds: mergedMentions.properties.map((p) => p.id),
        linkedCalendarEventsIds: mergedMentions.events.map((e) => e.id),
        linkedTasksIds: mergedMentions.tasks.map((t) => t.id),
        Contacts: {
          set: mergedMentions.clients.map((c) => ({ id: c.id })),
        },
        Properties: {
          set: mergedMentions.properties.map((p) => ({ id: p.id })),
        },
        CalendarEvent: {
          set: mergedMentions.events.map((e) => ({ id: e.id })),
        },
        crm_Accounts_Tasks_DocumentsToCrmAccountsTasks: {
          set: mergedMentions.tasks.map((t) => ({ id: t.id })),
        },
      },
      include: {
        Contacts: true,
        Properties: true,
        CalendarEvent: true,
        crm_Accounts_Tasks_DocumentsToCrmAccountsTasks: true,
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
    // Permission check: Viewers cannot delete documents
    const permissionError = await requireCanModify();
    if (permissionError) return permissionError;

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const params = await props.params;

    const document = await prismadb.documents.findFirst({
      where: { id: params.documentId, organizationId },
    });

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    await prismadb.$transaction(async (tx) => {
      await tx.documents.update({
        where: { id: params.documentId, organizationId },
        data: { archivedAt: new Date(), archivedBy: user.id },
      });
      await tx.documentView.deleteMany({ where: { documentId: params.documentId } });
      await tx.sharedEntity.deleteMany({
        where: { entityType: "DOCUMENT", entityId: params.documentId },
      });
      await tx.documents.update({
        where: { id: params.documentId },
        data: {
          Contacts: { set: [] },
          Properties: { set: [] },
          Requests: { set: [] },
        },
      });
    });

    await invalidateCache(["documents"]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DOCUMENT_ARCHIVE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
