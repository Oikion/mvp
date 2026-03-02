"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";
import { revalidatePath } from "next/cache";
import type { PropertyInquiry } from "@prisma/client";

interface UpdateAssignmentInput {
  inquiryId: string;
  status?: "NEW" | "READ" | "CONTACTED" | "ARCHIVED";
  notes?: string;
}

export async function updateAssignmentStatus(
  input: UpdateAssignmentInput
): Promise<ActionResponse<PropertyInquiry>> {
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

    // Verify the inquiry belongs to this agent
    const existingInquiry = await prismadb.propertyInquiry.findFirst({
      where: {
        id: input.inquiryId,
        agentProfileId: agentProfile.id,
      },
    });

    if (!existingInquiry) {
      return actionNotFound("Inquiry");
    }

    // Update the inquiry
    const updateData: { updatedAt: Date; status?: "NEW" | "READ" | "CONTACTED" | "ARCHIVED"; notes?: string } = {
      updatedAt: new Date(),
    };

    if (input.status) {
      updateData.status = input.status;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    const updated = await prismadb.propertyInquiry.update({
      where: { id: input.inquiryId },
      data: updateData,
    });

    revalidatePath("/app/assignments");
    return actionSuccess(updated);
  } catch (error) {
    console.error("[UPDATE_ASSIGNMENT_STATUS]", error);
    return actionError("Failed to update assignment", error);
  }
}
