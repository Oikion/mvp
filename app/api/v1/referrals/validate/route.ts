import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

/**
 * GET /api/v1/referrals/validate
 * Validate a referral code (public endpoint - no authentication required)
 * Query params: code (required)
 * 
 * This is a public endpoint to allow validation during registration
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required parameter: code",
      },
      { status: 400 }
    );
  }

  try {
    // Find the referral code
    const referralCode = await prismadb.referralCode.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            name: true,
            firstName: true,
          },
        },
      },
    });

    if (!referralCode) {
      return NextResponse.json(
        {
          success: true,
          data: {
            valid: false,
            error: "Invalid referral code",
          },
        },
        { status: 200 }
      );
    }

    if (!referralCode.isActive) {
      return NextResponse.json(
        {
          success: true,
          data: {
            valid: false,
            error: "Referral code is no longer active",
          },
        },
        { status: 200 }
      );
    }

    // Get a display name for the referrer (anonymized)
    const referrerName = referralCode.user.name || referralCode.user.firstName || "A friend";
    // Only show first name or first part of name for privacy
    const displayName = referrerName.split(" ")[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          valid: true,
          referrerName: displayName,
          commissionRate: Number(referralCode.commissionRate),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[VALIDATE_REFERRAL_CODE]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate referral code",
      },
      { status: 500 }
    );
  }
}
