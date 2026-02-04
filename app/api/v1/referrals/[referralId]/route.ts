import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { Prisma } from "@prisma/client";

// Type for referral with includes
type ReferralWithIncludes = Prisma.ReferralGetPayload<{
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
        userStatus: true;
      };
    };
    payouts: true;
  };
}>;

/**
 * GET /api/v1/referrals/[referralId]
 * Get details for a specific referral
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    // Extract referralId from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const referralId = pathParts[pathParts.length - 1];

    if (!referralId) {
      return createApiErrorResponse("Referral ID is required", 400);
    }

    const referral = await prismadb.referral.findFirst({
      where: {
        id: referralId,
        // Note: Organization filtering should be done at application level
        // since Users doesn't have organizationId directly
      },
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
            userStatus: true,
          },
        },
        payouts: {
          orderBy: { createdAt: "desc" },
        },
      },
    }) as ReferralWithIncludes | null;

    if (!referral) {
      return createApiErrorResponse("Referral not found", 404);
    }

    // Calculate total paid
    const totalPaid = referral.payouts
      .filter((p) => p.status === "PAID")
      .reduce((sum: number, p) => sum + Number(p.amount), 0);

    return createApiSuccessResponse({
      referral: {
        id: referral.id,
        status: referral.status,
        totalEarnings: Number(referral.totalEarnings),
        totalPaid,
        convertedAt: referral.convertedAt?.toISOString() || null,
        createdAt: referral.createdAt.toISOString(),
        updatedAt: referral.updatedAt.toISOString(),
        referrer: {
          id: referral.referralCode.user.id,
          name: referral.referralCode.user.name,
          email: referral.referralCode.user.email,
          code: referral.referralCode.code,
          commissionRate: Number(referral.referralCode.commissionRate),
        },
        referredUser: {
          id: referral.referredUser.id,
          name: referral.referredUser.name,
          email: referral.referredUser.email,
          status: referral.referredUser.userStatus,
          joinedAt: referral.referredUser.created_on?.toISOString() || null,
        },
        payouts: referral.payouts.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          status: p.status,
          notes: p.notes,
          paidAt: p.paidAt?.toISOString() || null,
          paidByAdminId: p.paidByAdminId,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    });
  },
  { requiredScopes: [API_SCOPES.REFERRALS_READ] }
);

/**
 * PATCH /api/v1/referrals/[referralId]
 * Update a referral's status or earnings
 */
export const PATCH = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    // Extract referralId from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const referralId = pathParts[pathParts.length - 1];

    if (!referralId) {
      return createApiErrorResponse("Referral ID is required", 400);
    }

    const body = await req.json();
    const { status, totalEarnings } = body;

    // Find the referral
    const referral = await prismadb.referral.findFirst({
      where: {
        id: referralId,
      },
    });

    if (!referral) {
      return createApiErrorResponse("Referral not found", 404);
    }

    // Build update data
    const updateData: Prisma.ReferralUpdateInput = {};

    if (status) {
      const validStatuses = ["PENDING", "CONVERTED", "CANCELLED"];
      if (!validStatuses.includes(status.toUpperCase())) {
        return createApiErrorResponse(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          400
        );
      }
      updateData.status = status.toUpperCase() as "PENDING" | "CONVERTED" | "CANCELLED";

      // Set convertedAt if status is changing to CONVERTED
      if (status.toUpperCase() === "CONVERTED" && referral.status !== "CONVERTED") {
        updateData.convertedAt = new Date();
      }
    }

    if (totalEarnings !== undefined) {
      const earnings = Number(totalEarnings);
      if (isNaN(earnings) || earnings < 0) {
        return createApiErrorResponse("Total earnings must be a non-negative number", 400);
      }
      updateData.totalEarnings = earnings;
    }

    // Update the referral
    const updatedReferral = await prismadb.referral.update({
      where: { id: referralId },
      data: updateData,
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
          },
        },
      },
    });

    return createApiSuccessResponse({
      referral: {
        id: updatedReferral.id,
        status: updatedReferral.status,
        totalEarnings: Number(updatedReferral.totalEarnings),
        convertedAt: updatedReferral.convertedAt?.toISOString() || null,
        createdAt: updatedReferral.createdAt.toISOString(),
        updatedAt: updatedReferral.updatedAt.toISOString(),
        referrer: {
          id: updatedReferral.referralCode.user.id,
          name: updatedReferral.referralCode.user.name,
          email: updatedReferral.referralCode.user.email,
        },
        referredUser: {
          id: updatedReferral.referredUser.id,
          name: updatedReferral.referredUser.name,
          email: updatedReferral.referredUser.email,
        },
      },
    });
  },
  { requiredScopes: [API_SCOPES.REFERRALS_WRITE] }
);
