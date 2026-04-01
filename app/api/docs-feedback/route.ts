import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

const feedbackSchema = z.object({
  pageSlug: z.string().min(1).max(500),
  docScope: z.enum(["public", "private"]),
  locale: z.string().min(2).max(5),
  rating: z.enum(["up", "down"]),
  comment: z.string().max(1000).optional(),
}).strict();

/**
 * POST /api/docs-feedback
 * Submit feedback for a documentation page.
 * Public docs accept anonymous feedback; private docs capture userId.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback data" },
        { status: 400 }
      );
    }

    const { pageSlug, docScope, locale, rating, comment } = parsed.data;

    // Capture userId if authenticated (optional for public docs)
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId;
    } catch {
      // Anonymous feedback is fine for public docs
    }

    await prismadb.docFeedback.create({
      data: {
        pageSlug,
        docScope,
        locale,
        rating,
        comment: comment || null,
        userId,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[DOCS_FEEDBACK]", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/docs-feedback?pageSlug=...&locale=...
 * Get aggregate feedback counts for a page (for future admin dashboard).
 */
export async function GET(req: NextRequest) {
  try {
    const pageSlug = req.nextUrl.searchParams.get("pageSlug");
    const locale = req.nextUrl.searchParams.get("locale") || "en";

    if (!pageSlug) {
      return NextResponse.json(
        { error: "pageSlug is required" },
        { status: 400 }
      );
    }

    const [upCount, downCount] = await Promise.all([
      prismadb.docFeedback.count({
        where: { pageSlug, locale, rating: "up" },
      }),
      prismadb.docFeedback.count({
        where: { pageSlug, locale, rating: "down" },
      }),
    ]);

    return NextResponse.json({
      pageSlug,
      locale,
      up: upCount,
      down: downCount,
    });
  } catch (error) {
    console.error("[DOCS_FEEDBACK_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
