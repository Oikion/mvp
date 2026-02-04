import { Resend } from "resend";
import { getResendApiKey } from "./system-settings";

export default async function resendHelper() {
  const apiKey = await getResendApiKey();

  if (!apiKey) {
    throw new Error("Resend API key not configured. Set it in Platform Admin > Settings or via RESEND_API_KEY environment variable.");
  }

  const resend = new Resend(apiKey);

  return resend;
}
