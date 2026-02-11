import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "@/lib/get-current-user";
import {
  apiBadRequest,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  validateBody,
} from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({ accessToken: z.string().min(1) }).strict();

const VIBER_GET_ACCOUNT_URL = "https://chatapi.viber.com/pa/get_account_info";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiUnauthorized();
    }

    await getCurrentOrgId();
    const body = await req.json().catch(() => null);
    const validation = validateBody(body, schema);
    if (!validation.success) {
      return validation.error;
    }

    const res = await fetch(VIBER_GET_ACCOUNT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Viber-Auth-Token": validation.data.accessToken,
      },
      body: JSON.stringify({}),
    });

    const data = (await res.json().catch(() => null)) as {
      status?: number;
      status_message?: string;
      id?: string;
      name?: string;
      uri?: string;
    };

    if (!res.ok || data.status !== 0) {
      return apiBadRequest(
        data.status_message ?? "Invalid token or bot not found"
      );
    }

    return apiSuccess({
      id: data.id ?? null,
      name: data.name ?? "Viber Bot",
      uri: data.uri ?? null,
    });
  } catch (error) {
    console.error("[API] Viber validate error:", error);
    return apiInternalError("Failed to validate Viber token", error as Error);
  }
}
