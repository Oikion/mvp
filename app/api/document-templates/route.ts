import { auth } from "@clerk/nextjs/server";
import { apiUnauthorized, apiSuccess, apiInternalError } from "@/lib/api-response";
import { listDocumentTemplates } from "@/actions/document-templates";

export async function GET(_req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const result = await listDocumentTemplates();
    if (!result.success) {
      return apiInternalError("Internal server error");
    }

    return apiSuccess(result.data);
  } catch (error) {
    console.error("[API_DOCUMENT_TEMPLATES_GET]", error);
    return apiInternalError("Internal server error");
  }
}
