import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkUsernameAvailability } from "@/actions/user/check-username";
import type { UsernameAvailabilityResult } from "@/types/onboarding";

export async function GET(req: NextRequest): Promise<NextResponse<UsernameAvailabilityResult | { error: string }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username parameter is required" },
        { status: 400 }
      );
    }

    const result = await checkUsernameAvailability(username);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to check username availability" },
      { status: 500 }
    );
  }
}

