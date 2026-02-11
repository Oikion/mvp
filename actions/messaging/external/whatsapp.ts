"use server";

const GRAPH_API_VERSION = "v18.0";

export async function sendWhatsAppMessage(params: {
  accessToken?: string | null;
  phoneNumberId?: string | null;
  recipientId: string;
  content: string;
}): Promise<string> {
  if (!params.accessToken || !params.phoneNumberId) {
    throw new Error("WhatsApp access token or phone number ID missing");
  }

  const to = params.recipientId.replace(/\D/g, "");
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${params.phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: params.content },
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? "WhatsApp send message failed");
  }

  return data.messages?.[0]?.id ?? "";
}
