"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { SubmissionStatus } from "@prisma/client";

export interface FormSubmission {
  id: string;
  createdAt: string;
  status: SubmissionStatus;
  senderName: string | null;
  senderEmail: string | null;
  formData: Record<string, any>;
  notes: string | null;
}

export interface GetSubmissionsResult {
  submissions: FormSubmission[];
  total: number;
  hasMore: boolean;
}

/**
 * Get all contact form submissions for the current user's agent profile
 */
export async function getFormSubmissions(options?: {
  status?: SubmissionStatus;
  limit?: number;
  offset?: number;
}): Promise<GetSubmissionsResult> {
  const currentUser = await getCurrentUser();
  const { status, limit = 50, offset = 0 } = options || {};

  // Get the user's agent profile
  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  if (!profile) {
    return { submissions: [], total: 0, hasMore: false };
  }

  // Build where clause
  const where: any = {
    profileId: profile.id,
  };

  if (status) {
    where.status = status;
  }

  // Get total count
  const total = await prismadb.agentContactSubmission.count({ where });

  // Get submissions
  const submissionsRaw = await prismadb.agentContactSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const submissions: FormSubmission[] = submissionsRaw.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    status: s.status,
    senderName: s.senderName,
    senderEmail: s.senderEmail,
    formData: s.formData as Record<string, any>,
    notes: s.notes,
  }));

  return {
    submissions,
    total,
    hasMore: offset + submissions.length < total,
  };
}

/**
 * Get a single submission by ID
 */
export async function getFormSubmission(id: string): Promise<FormSubmission | null> {
  const currentUser = await getCurrentUser();

  // Get the user's agent profile
  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  if (!profile) {
    return null;
  }

  const submission = await prismadb.agentContactSubmission.findFirst({
    where: {
      id,
      profileId: profile.id,
    },
  });

  if (!submission) {
    return null;
  }

  return {
    id: submission.id,
    createdAt: submission.createdAt.toISOString(),
    status: submission.status,
    senderName: submission.senderName,
    senderEmail: submission.senderEmail,
    formData: submission.formData as Record<string, any>,
    notes: submission.notes,
  };
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();

    // Get the user's agent profile
    const profile = await prismadb.agentProfile.findUnique({
      where: { userId: currentUser.id },
      select: { id: true },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Verify ownership and update
    const submission = await prismadb.agentContactSubmission.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
    });

    if (!submission) {
      return { success: false, error: "Submission not found" };
    }

    await prismadb.agentContactSubmission.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/crm/form-submissions");
    return { success: true };
  } catch (error) {
    console.error("Error updating submission status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Update submission notes
 */
export async function updateSubmissionNotes(
  id: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();

    // Get the user's agent profile
    const profile = await prismadb.agentProfile.findUnique({
      where: { userId: currentUser.id },
      select: { id: true },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Verify ownership and update
    const submission = await prismadb.agentContactSubmission.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
    });

    if (!submission) {
      return { success: false, error: "Submission not found" };
    }

    await prismadb.agentContactSubmission.update({
      where: { id },
      data: { notes },
    });

    revalidatePath("/crm/form-submissions");
    return { success: true };
  } catch (error) {
    console.error("Error updating submission notes:", error);
    return { success: false, error: "Failed to update notes" };
  }
}

/**
 * Delete a submission
 */
export async function deleteSubmission(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();

    // Get the user's agent profile
    const profile = await prismadb.agentProfile.findUnique({
      where: { userId: currentUser.id },
      select: { id: true },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Verify ownership and delete
    const submission = await prismadb.agentContactSubmission.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
    });

    if (!submission) {
      return { success: false, error: "Submission not found" };
    }

    await prismadb.agentContactSubmission.delete({
      where: { id },
    });

    revalidatePath("/crm/form-submissions");
    return { success: true };
  } catch (error) {
    console.error("Error deleting submission:", error);
    return { success: false, error: "Failed to delete submission" };
  }
}

/**
 * Mark submission as read (change from NEW to READ)
 */
export async function markSubmissionAsRead(
  id: string
): Promise<{ success: boolean; error?: string }> {
  return updateSubmissionStatus(id, "READ");
}

/**
 * Get submission counts by status
 */
export async function getSubmissionCounts(): Promise<Record<SubmissionStatus | "all", number>> {
  const currentUser = await getCurrentUser();

  // Get the user's agent profile
  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  if (!profile) {
    return { all: 0, NEW: 0, READ: 0, CONTACTED: 0, ARCHIVED: 0 };
  }

  const counts = await prismadb.agentContactSubmission.groupBy({
    by: ["status"],
    where: { profileId: profile.id },
    _count: true,
  });

  const result: Record<SubmissionStatus | "all", number> = {
    all: 0,
    NEW: 0,
    READ: 0,
    CONTACTED: 0,
    ARCHIVED: 0,
  };

  counts.forEach((c) => {
    result[c.status] = c._count;
    result.all += c._count;
  });

  return result;
}
