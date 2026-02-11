"use server";

const GRAPH_VERSION = "v18.0";

export async function sendMessengerMessage(params: {
  accessToken?: string | null;
  pageId?: string | null;
  recipientId: string;
  content: string;
}): Promise<string> {
  if (!params.accessToken || !params.pageId) {
    throw new Error("Messenger access token or page ID missing");
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${params.pageId}/messages?access_token=${encodeURIComponent(params.accessToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: params.recipientId },
      messaging_type: "RESPONSE",
      message: { text: params.content },
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    message_id?: string;
    error?: { message?: string };
  };

  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? "Messenger send failed");
  }

  return data.message_id ?? "";
}
