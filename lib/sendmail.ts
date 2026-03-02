import { Resend } from "resend";
import type { CreateEmailOptions } from "resend";
import { EMAIL_CONFIG } from "./resend-segments";

interface EmailOptions {
  from?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export default async function sendEmail(options: EmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[sendEmail] RESEND_API_KEY not set, skipping email send");
    return;
  }

  const resend = new Resend(apiKey);

  const bodyFields: { html?: string; text?: string } = options.html
    ? { html: options.html, text: options.text }
    : { text: options.text ?? "" };

  const payload: CreateEmailOptions = {
    from: options.from || EMAIL_CONFIG.FROM,
    to: options.to,
    subject: options.subject,
    ...bodyFields,
  } as CreateEmailOptions;

  try {
    await resend.emails.send(payload);
  } catch (error) {
    console.error("[sendEmail] Failed to send email:", error);
  }
}
