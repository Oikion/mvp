"use server";

const VIBER_SEND_MESSAGE_URL = "https://chatapi.viber.com/pa/send_message";

const SENDER_NAME = "Oikion";

export async function sendViberMessage(params: {
  accessToken?: string | null;
  recipientId: string;
  content: string;
}): Promise<string> {
  if (!params.accessToken) {
    throw new Error("Viber access token missing");
  }

  const res = await fetch(VIBER_SEND_MESSAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Viber-Auth-Token": params.accessToken,
    },
    body: JSON.stringify({
      receiver: params.recipientId,
      type: "text",
      sender: { name: SENDER_NAME },
      text: params.content,
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    status?: number;
    message_token?: string;
  };

  if (!res.ok || data.status !== 0) {
    throw new Error("Viber send message failed");
  }

  return String(data.message_token ?? "");
}
