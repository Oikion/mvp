"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import type { PropertyInquiry } from "@prisma/client";

interface GetAssignmentsFilters {
  status?: "NEW" | "READ" | "CONTACTED" | "ARCHIVED";
}

export async function getAssignments(
  filters: GetAssignmentsFilters = {}
): Promise<ActionResponse<PropertyInquiry[]>> {
  try {
    const currentUser = await getCurrentUser();

    // Get the user's agent profile
    const agentProfile = await prismadb.agentProfile.findFirst({
      where: { userId: currentUser.id },
      select: { id: true },
    });

    if (!agentProfile) {
      return actionError("Agent profile not found", "NOT_FOUND");
    }

    // Build where clause
    const whereClause: { agentProfileId: string; status?: "NEW" | "READ" | "CONTACTED" | "ARCHIVED" } = {
      agentProfileId: agentProfile.id,
    };

    if (filters.status) {
      whereClause.status = filters.status;
    }

    // Fetch inquiries
    const inquiries = await prismadb.propertyInquiry.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    return actionSuccess(inquiries);
  } catch (error) {
    console.error("[GET_ASSIGNMENTS]", error);
    return actionError("Failed to fetch assignments", error);
  }
}
