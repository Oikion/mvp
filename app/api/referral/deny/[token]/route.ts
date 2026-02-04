import { NextResponse } from "next/server";
import { verifyActionToken } from "@/actions/referrals/apply-to-referral-programme";
import { denyReferrer } from "@/actions/referrals/admin-deny-referrer";

export async function GET(
  req: Request,
  props: { params: Promise<{ token: string }> }
) {
  const params = await props.params;
  const { token } = params;

  try {
    const verification = await verifyActionToken(token);

    if (!verification.valid) {
      return new NextResponse(
        generateErrorPage("Invalid or Expired Link", "This denial link is invalid or has expired. Please contact support if you need assistance."),
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    if (verification.action !== "deny") {
      return new NextResponse(
        generateErrorPage("Invalid Action", "This link is not valid for denying applications."),
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    const result = await denyReferrer(verification.userId!);

    if (!result.success) {
      return new NextResponse(
        generateErrorPage("Denial Failed", result.error || "Failed to deny the application. Please try again."),
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    return new NextResponse(
      generateSuccessPage("Application Denied", "The referral application has been denied. The user has been notified of the decision."),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    console.error("Error processing denial:", error);
    return new NextResponse(
      generateErrorPage("Error", "An unexpected error occurred. Please try again later."),
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

function generateSuccessPage(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title} - Oikion</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { max-width: 480px; margin: 20px; padding: 40px; background: white; border-radius: 16px; text-align: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .icon { width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .icon svg { width: 32px; height: 32px; color: #d97706; }
        h1 { color: #18181b; font-size: 24px; margin: 0 0 12px; }
        p { color: #52525b; font-size: 16px; margin: 0 0 24px; line-height: 1.5; }
        .logo { color: #18181b; font-size: 14px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="logo">Oikion</div>
      </div>
    </body>
    </html>
  `;
}

function generateErrorPage(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title} - Oikion</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { max-width: 480px; margin: 20px; padding: 40px; background: white; border-radius: 16px; text-align: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .icon { width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .icon svg { width: 32px; height: 32px; color: #dc2626; }
        h1 { color: #18181b; font-size: 24px; margin: 0 0 12px; }
        p { color: #52525b; font-size: 16px; margin: 0 0 24px; line-height: 1.5; }
        .logo { color: #18181b; font-size: 14px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="logo">Oikion</div>
      </div>
    </body>
    </html>
  `;
}
