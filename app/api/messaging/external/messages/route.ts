import { auth } from "@clerk/nextjs/server";
import {
  apiBadRequest,
  apiCreated,
  apiInternalError,
  apiUnauthorized,
} from "@/lib/api-response";
import { sendExternalMessage } from "@/actions/messaging/external/send";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return apiBadRequest("Invalid request body");
    }

    const result = await sendExternalMessage(body);
    if (!result.success) {
      return apiBadRequest(result.error, result.details);
    }

    return apiCreated({ messageId: result.data?.messageId, externalMessageId: result.data?.externalMessageId });
  } catch (error) {
    console.error("[API] External message send error:", error);
    return apiInternalError("Failed to send external message", error as Error);
  }
}
