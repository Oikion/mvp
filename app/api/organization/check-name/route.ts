import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { checkOrgNameAvailability } from "@/actions/organization/check-name";
import type { NameAvailabilityResult } from "@/actions/organization/check-name";

export async function GET(
  req: NextRequest
): Promise<NextResponse<NameAvailabilityResult | { error: string }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Name parameter is required" },
        { status: 400 }
      );
    }

    const result = await checkOrgNameAvailability(name);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to check name availability" },
      { status: 500 }
    );
  }
}
