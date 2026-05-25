import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  parsePaginationParams,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { Prisma } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Get internal user IDs for all members of a Clerk organization.
 * Users model has no organizationId — Clerk manages membership externally.
 */
async function getOrgUserIds(organizationId: string): Promise<string[]> {
  const clerk = await clerkClient();
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId,
    limit: 200,
  });
  const memberClerkIds = memberships.data
    .map(m => m.publicUserData?.userId)
    .filter(Boolean) as string[];

  if (memberClerkIds.length === 0) return [];

  const users = await prismadb.users.findMany({
    where: { clerkUserId: { in: memberClerkIds } },
    select: { id: true },
  });
  return users.map(u => u.id);
}

// Type for referral with includes in list view
type ReferralListItem = Prisma.ReferralGetPayload<{
  include: {
    referralCode: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
    referredUser: {
      select: {
        id: true;
        name: true;
        email: true;
        created_on: true;
      };
    };
    payouts: {
      select: {
        id: true;
        amount: true;
        status: true;
        paidAt: true;
        createdAt: true;
      };
    };
  };
}>;

/**
 * GET /api/v1/referrals
 * List referrals for the authenticated user's organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const userId = url.searchParams.get("userId");

    // Build where clause — scope to org members to prevent cross-tenant leakage
    const orgUserIds = await getOrgUserIds(context.organizationId);
    if (orgUserIds.length === 0) {
      return createApiSuccessResponse({ referrals: [] }, 200, { nextCursor: null, hasMore: false, limit });
    }

    const where: Prisma.ReferralWhereInput = {
      referralCode: {
        userId: { in: userId ? [userId] : orgUserIds },
      },
    };

    if (status) {
      where.status = status.toUpperCase() as "PENDING" | "CONVERTED" | "CANCELLED";
    }

    // Fetch referrals
    const referrals = await prismadb.referral.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      include: {
        referralCode: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
            created_on: true,
          },
        },
        payouts: {
          select: {
            id: true,
            amount: true,
            status: true,
            paidAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }) as ReferralListItem[];

    const hasMore = referrals.length > limit;
    const items = hasMore ? referrals.slice(0, -1) : referrals;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return createApiSuccessResponse(
      {
        referrals: items.map((referral) => ({
          id: referral.id,
          status: referral.status,
          totalEarnings: Number(referral.totalEarnings),
          convertedAt: referral.convertedAt?.toISOString() || null,
          createdAt: referral.createdAt.toISOString(),
          referrer: {
            name: referral.referralCode.user?.name ?? null,
            email: referral.referralCode.user?.email ?? "",
          },
          referredUser: {
            name: referral.referredUser?.name ?? null,
            email: referral.referredUser?.email ?? "",
            joinedAt: referral.referredUser?.created_on?.toISOString() || null,
          },
          commissionRate: Number(referral.referralCode.commissionRate),
          payouts: referral.payouts.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            status: p.status,
            paidAt: p.paidAt?.toISOString() || null,
            createdAt: p.createdAt.toISOString(),
          })),
        })),
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.REFERRALS_READ] }
);

// Type for referral code with user include
type ReferralCodeWithUser = Prisma.ReferralCodeGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

/**
 * POST /api/v1/referrals
 * Track a new referral (when a user signs up with a referral code)
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const { referralCode, referredUserId } = body;

    // Validate required fields
    if (!referralCode) {
      return createApiErrorResponse("Missing required field: referralCode", 400);
    }

    if (!referredUserId) {
      return createApiErrorResponse("Missing required field: referredUserId", 400);
    }

    // Find the referral code
    const code = await prismadb.referralCode.findUnique({
      where: { code: referralCode },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }) as ReferralCodeWithUser | null;

    if (!code) {
      return createApiErrorResponse("Invalid referral code", 404);
    }

    if (!code.isActive) {
      return createApiErrorResponse("Referral code is no longer active", 400);
    }

    // Check if the referred user is the same as the referrer
    if (code.userId === referredUserId) {
      return createApiErrorResponse("Cannot use your own referral code", 400);
    }

    // Check if user was already referred
    const existingReferral = await prismadb.referral.findUnique({
      where: { referredUserId },
    });

    if (existingReferral) {
      return createApiErrorResponse("User has already been referred", 409);
    }

    // Verify the referred user exists
    const referredUser = await prismadb.users.findUnique({
      where: { id: referredUserId },
      select: { id: true, name: true, email: true },
    });

    if (!referredUser) {
      return createApiErrorResponse("Referred user not found", 404);
    }

    // Create the referral
    const referral = await prismadb.referral.create({
      data: {
        referralCodeId: code.id,
        referredUserId,
        status: "PENDING",
        totalEarnings: 0,
      },
    });

    return createApiSuccessResponse(
      {
        referral: {
          id: referral.id,
          status: referral.status,
          referrer: {
            name: code.user?.name ?? null,
          },
          referredUser: {
            name: referredUser.name,
            email: referredUser.email,
          },
          commissionRate: Number(code.commissionRate),
          createdAt: referral.createdAt.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.REFERRALS_WRITE] }
);
