import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listDocumentTemplates } from "@/actions/document-templates";

export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await listDocumentTemplates();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("[API_DOCUMENT_TEMPLATES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
