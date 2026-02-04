import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkOrgSlugAvailability } from "@/actions/organization/check-slug";
import type { SlugAvailabilityResult } from "@/actions/organization/check-slug";

export async function GET(
  req: NextRequest
): Promise<NextResponse<SlugAvailabilityResult | { error: string }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    const result = await checkOrgSlugAvailability(slug);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 }
    );
  }
}
