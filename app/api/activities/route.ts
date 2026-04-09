import { auth } from "@clerk/nextjs/server";
import { apiUnauthorized, apiSuccess, apiBadRequest, apiInternalError } from "@/lib/api-response";
import { listActivities } from "@/actions/activities";
import { activityParentTypeSchema } from "@/lib/validations/activities";

export async function GET(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const parentTypeRaw = searchParams.get("parentType");
    const parentId = searchParams.get("parentId");

    if (!parentTypeRaw || !parentId) {
      return apiBadRequest("parentType and parentId are required");
    }

    const parentTypeParsed = activityParentTypeSchema.safeParse(parentTypeRaw);
    if (!parentTypeParsed.success) {
      return apiBadRequest("Invalid parentType");
    }

    const result = await listActivities(parentTypeParsed.data, parentId);
    if (!result.success) {
      return apiInternalError("Internal server error");
    }

    return apiSuccess(result.data);
  } catch (error) {
    console.error("[API_ACTIVITIES_GET]", error);
    return apiInternalError("Internal server error");
  }
}
