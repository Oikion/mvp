import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;

  try {
    const currentUser = await getCurrentUser();

    const userId = params.userId;

    if (!userId) {
      return new NextResponse("No userID, userId is required", { status: 401 });
    }

    if (currentUser.id !== userId && !currentUser.is_admin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { organizationId, secretKey } = await req.json();

    if (!organizationId || !secretKey) {
      return new NextResponse("No data from form (organizationId, secretKey)", {
        status: 401,
      });
    }

    // The `openAi_keys` storage model was removed from the schema; this
    // integration is no longer available. Auth/ownership checks are retained
    // above so the endpoint stays consistent with the rest of the API surface.
    return new NextResponse("OpenAI key storage is not available", {
      status: 501,
    });
  } catch (error) {
    console.log("[USER_UPDATE_OPENAIKEY]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
