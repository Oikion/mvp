import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { getDocuments } from "@/actions/documents/get-documents";
import { createDocument } from "@/actions/documents/create-document";
import { invalidateCache } from "@/lib/cache-invalidate";

export async function GET(req: Request) {
  try {
    await getCurrentUser();
    
    const { searchParams } = new URL(req.url);
    const filters = {
      clientId: searchParams.get("clientId") || undefined,
      propertyId: searchParams.get("propertyId") || undefined,
      eventId: searchParams.get("eventId") || undefined,
      taskId: searchParams.get("taskId") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const documents = await getDocuments(filters);
    return NextResponse.json(documents);
  } catch (error: any) {
    console.error("[DOCUMENTS_GET]", error);
    const errorMessage = error?.message || "Internal error";
    return NextResponse.json(
      { error: errorMessage },
      { status: error?.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const document_name = formData.get("document_name") as string;
    const description = formData.get("description") as string | null;
    const document_type = formData.get("document_type") as string | null;
    const assigned_user = formData.get("assigned_user") as string | null;
    
    // Explicit associations
    const clientIds = formData.get("clientIds") 
      ? JSON.parse(formData.get("clientIds") as string) 
      : undefined;
    const propertyIds = formData.get("propertyIds")
      ? JSON.parse(formData.get("propertyIds") as string)
      : undefined;
    const eventIds = formData.get("eventIds")
      ? JSON.parse(formData.get("eventIds") as string)
      : undefined;
    const taskIds = formData.get("taskIds")
      ? JSON.parse(formData.get("taskIds") as string)
      : undefined;

    // Share settings
    const linkEnabled = formData.get("linkEnabled") === "true";
    const passwordProtected = formData.get("passwordProtected") === "true";
    const passwordHash = formData.get("passwordHash") as string | null;
    const expiresAt = formData.get("expiresAt")
      ? new Date(formData.get("expiresAt") as string)
      : undefined;

    if (!file || !document_name) {
      return new NextResponse("File and document name are required", { status: 400 });
    }

    const document = await createDocument({
      document_name,
      description: description || undefined,
      document_file: file,
      document_file_mimeType: file.type,
      document_type: document_type || undefined,
      assigned_user: assigned_user || undefined,
      clientIds,
      propertyIds,
      eventIds,
      taskIds,
      linkEnabled,
      passwordProtected,
      passwordHash: passwordHash || undefined,
      expiresAt,
    });

    await invalidateCache(["documents"]);

    return NextResponse.json(document);
  } catch (error: any) {
    console.error("[DOCUMENTS_POST]", error);
    const errorMessage = error?.message || "Internal error";
    return NextResponse.json(
      { error: errorMessage },
      { status: error?.status || 500 }
    );
  }
}

