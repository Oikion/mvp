import { NextResponse } from "next/server";
import { shareViaEmail, shareMultipleViaEmail } from "@/actions/social/share-via-email";
import { getCurrentUserSafe } from "@/lib/get-current-user";
import { z } from "zod";

const shareViaEmailSchema = z.object({
  entityType: z.enum(["property", "client", "post"]),
  entityId: z.string().uuid(),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  personalMessage: z.string().max(500).optional(),
});

const shareMultipleSchema = z.object({
  entities: z.array(
    z.object({
      entityType: z.enum(["property", "client", "post"]),
      entityId: z.string().uuid(),
    })
  ).min(1).max(10),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  personalMessage: z.string().max(500).optional(),
});

/**
 * POST /api/share/email
 * Share an entity or multiple entities via email
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUserSafe();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Check if it's a single share or multiple shares
    if (body.entities && Array.isArray(body.entities)) {
      // Multiple entities share
      const parsed = shareMultipleSchema.safeParse(body);
      
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const result = await shareMultipleViaEmail(
        parsed.data.entities,
        parsed.data.recipientEmail,
        parsed.data.recipientName,
        parsed.data.personalMessage
      );

      if (!result.success) {
        return NextResponse.json(
          { 
            error: "Some shares failed", 
            summary: result.summary,
            results: result.results 
          },
          { status: 207 } // Multi-status
        );
      }

      return NextResponse.json({
        success: true,
        message: `Successfully shared ${result.summary.successful} item(s)`,
        summary: result.summary,
      });
    } else {
      // Single entity share
      const parsed = shareViaEmailSchema.safeParse(body);
      
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const result = await shareViaEmail(parsed.data);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        data: result.data,
      });
    }
  } catch (error) {
    console.error("[SHARE_EMAIL_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
