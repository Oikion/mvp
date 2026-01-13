import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { createReferralCode, formatReferralUrl } from "@/lib/referrals/create-referral-code";

/**
 * GET /api/v1/referrals/code
 * Get the referral code for a user
 * Query params: userId (optional, defaults to API key creator)
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || context.createdById;

    // Verify user belongs to the organization
    const user = await prismadb.users.findFirst({
      where: {
        id: userId,
        organizationId: context.organizationId,
      },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return createApiErrorResponse("User not found or does not belong to this organization", 404);
    }

    // Get or create referral code
    let referralCode = await prismadb.referralCode.findUnique({
      where: { userId },
    });

    if (!referralCode) {
      // Generate a unique code
      let code = createReferralCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existing = await prismadb.referralCode.findUnique({
          where: { code },
        });

        if (!existing) {
          break;
        }

        code = createReferralCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return createApiErrorResponse("Failed to generate unique referral code", 500);
      }

      referralCode = await prismadb.referralCode.create({
        data: {
          userId,
          code,
          commissionRate: 10, // Default 10%
          isActive: true,
        },
      });
    }

    // Get referral statistics
    const stats = await prismadb.referral.aggregate({
      where: { referralCodeId: referralCode.id },
      _count: { id: true },
      _sum: { totalEarnings: true },
    });

    const convertedCount = await prismadb.referral.count({
      where: {
        referralCodeId: referralCode.id,
        status: "CONVERTED",
      },
    });

    return createApiSuccessResponse({
      referralCode: {
        id: referralCode.id,
        code: referralCode.code,
        commissionRate: Number(referralCode.commissionRate),
        isActive: referralCode.isActive,
        referralUrl: formatReferralUrl(referralCode.code),
        createdAt: referralCode.createdAt.toISOString(),
        updatedAt: referralCode.updatedAt.toISOString(),
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      stats: {
        totalReferrals: stats._count.id,
        convertedReferrals: convertedCount,
        totalEarnings: Number(stats._sum.totalEarnings || 0),
      },
    });
  },
  { requiredScopes: [API_SCOPES.REFERRALS_READ] }
);

/**
 * POST /api/v1/referrals/code
 * Create a referral code for a user (if they don't have one)
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();
    const { userId, commissionRate } = body;

    if (!userId) {
      return createApiErrorResponse("Missing required field: userId", 400);
    }

    // Verify user belongs to the organization
    const user = await prismadb.users.findFirst({
      where: {
        id: userId,
        organizationId: context.organizationId,
      },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return createApiErrorResponse("User not found or does not belong to this organization", 404);
    }

    // Check if user already has a referral code
    const existingCode = await prismadb.referralCode.findUnique({
      where: { userId },
    });

    if (existingCode) {
      return createApiErrorResponse("User already has a referral code", 409);
    }

    // Generate a unique code
    let code = createReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await prismadb.referralCode.findUnique({
        where: { code },
      });

      if (!existing) {
        break;
      }

      code = createReferralCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return createApiErrorResponse("Failed to generate unique referral code", 500);
    }

    // Validate commission rate
    const rate = commissionRate !== undefined ? Number(commissionRate) : 10;
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return createApiErrorResponse("Commission rate must be between 0 and 100", 400);
    }

    // Create the referral code
    const referralCode = await prismadb.referralCode.create({
      data: {
        userId,
        code,
        commissionRate: rate,
        isActive: true,
      },
    });

    return createApiSuccessResponse(
      {
        referralCode: {
          id: referralCode.id,
          code: referralCode.code,
          commissionRate: Number(referralCode.commissionRate),
          isActive: referralCode.isActive,
          referralUrl: formatReferralUrl(referralCode.code),
          createdAt: referralCode.createdAt.toISOString(),
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.REFERRALS_WRITE] }
);

/**
 * PUT /api/v1/referrals/code
 * Update a referral code (regenerate or update commission rate)
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();
    const { userId, regenerate, commissionRate, isActive } = body;

    if (!userId) {
      return createApiErrorResponse("Missing required field: userId", 400);
    }

    // Verify user belongs to the organization
    const user = await prismadb.users.findFirst({
      where: {
        id: userId,
        organizationId: context.organizationId,
      },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return createApiErrorResponse("User not found or does not belong to this organization", 404);
    }

    // Get existing referral code
    const existingCode = await prismadb.referralCode.findUnique({
      where: { userId },
    });

    if (!existingCode) {
      return createApiErrorResponse("User does not have a referral code", 404);
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Regenerate code if requested
    if (regenerate) {
      let code = createReferralCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existing = await prismadb.referralCode.findUnique({
          where: { code },
        });

        if (!existing) {
          break;
        }

        code = createReferralCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return createApiErrorResponse("Failed to generate unique referral code", 500);
      }

      updateData.code = code;
    }

    // Update commission rate if provided
    if (commissionRate !== undefined) {
      const rate = Number(commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return createApiErrorResponse("Commission rate must be between 0 and 100", 400);
      }
      updateData.commissionRate = rate;
    }

    // Update active status if provided
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    // Update the referral code
    const referralCode = await prismadb.referralCode.update({
      where: { userId },
      data: updateData,
    });

    return createApiSuccessResponse({
      referralCode: {
        id: referralCode.id,
        code: referralCode.code,
        commissionRate: Number(referralCode.commissionRate),
        isActive: referralCode.isActive,
        referralUrl: formatReferralUrl(referralCode.code),
        createdAt: referralCode.createdAt.toISOString(),
        updatedAt: referralCode.updatedAt.toISOString(),
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  },
  { requiredScopes: [API_SCOPES.REFERRALS_WRITE] }
);
