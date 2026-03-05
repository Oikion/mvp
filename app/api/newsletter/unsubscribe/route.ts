import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { RESEND_SEGMENTS } from "@/lib/resend-segments";
import prismadb from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json(
        { error: "Missing email or token" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify HMAC token
    if (!verifyUnsubscribeToken(normalizedEmail, token)) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token" },
        { status: 403 }
      );
    }

    // 1. Update local DB — mark as UNSUBSCRIBED in all orgs
    try {
      await prismadb.newsletterSubscriber.updateMany({
        where: { email: normalizedEmail },
        data: {
          status: "UNSUBSCRIBED",
          unsubscribedAt: new Date(),
        },
      });
    } catch (dbError) {
      // Subscriber might not exist in local DB (e.g. added directly via Resend)
      console.warn("[Unsubscribe] DB update skipped:", dbError);
    }

    // 2. Mark as unsubscribed in Resend across both audience segments
    if (resend) {
      const audienceIds = [
        RESEND_SEGMENTS.NEWSLETTER,
        RESEND_SEGMENTS.EARLY_ACCESS,
      ];

      await Promise.allSettled(
        audienceIds.map(async (audienceId) => {
          try {
            await resend.contacts.update({
              audienceId,
              id: normalizedEmail,
              unsubscribed: true,
            });
            console.log(
              `[Unsubscribe] Marked ${normalizedEmail} as unsubscribed in audience ${audienceId}`
            );
          } catch (err) {
            // Contact might not exist in this audience — that's fine
            console.warn(
              `[Unsubscribe] Could not update contact in audience ${audienceId}:`,
              err
            );
          }
        })
      );
    }

    console.log(`[Unsubscribe] Successfully unsubscribed ${normalizedEmail}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Unsubscribe] Error:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}
