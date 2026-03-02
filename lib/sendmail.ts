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

  const payload: CreateEmailOptions = {
    from: options.from || EMAIL_CONFIG.FROM,
    to: options.to,
    subject: options.subject,
    // Resend requires at least one of html or text; default to empty text if neither supplied
    html: options.html,
    text: options.text ?? (options.html ? undefined : ""),
  } as CreateEmailOptions;

  try {
    await resend.emails.send(payload);
  } catch (error) {
    console.error("[sendEmail] Failed to send email:", error);
  }
}
