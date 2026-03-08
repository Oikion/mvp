"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import resendHelper from "@/lib/resend";
import { render } from "@react-email/render";
import { DeletionRequestDecisionEmail } from "@/emails/data-control/DeletionRequestDecision";

// =============================================================================
// Types
// =============================================================================

interface DataRequestFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: "ALL" | "EXPORT" | "DELETION";
  status?: string;
}

interface DataRequestItem {
  id: string;
  type: "EXPORT" | "DELETION";
  userEmail: string;
  userName: string | null;
  organizationId: string;
  status: string;
  reason?: string | null;
  gracePeriodEndsAt?: Date | null;
  reviewNote?: string | null;
  createdAt: Date;
}

interface DataRequestsResult {
  requests: DataRequestItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  counts: {
    total: number;
    pendingDeletions: number;
    pendingExports: number;
    completed: number;
    rejected: number;
  };
}

// =============================================================================
// Get Platform Data Requests
// =============================================================================

export async function getPlatformDataRequests(
  filters: DataRequestFilters = {}
): Promise<DataRequestsResult> {
  await requirePlatformAdmin();

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  const search = filters.search?.toLowerCase() || "";
  const typeFilter = filters.type || "ALL";
  const statusFilter = filters.status || "ALL";

  // Fetch deletion requests
  const deletionWhere: Record<string, unknown> = {};
  if (statusFilter !== "ALL" && typeFilter !== "EXPORT") {
    deletionWhere.status = statusFilter;
  }

  // Fetch export requests
  const exportWhere: Record<string, unknown> = {};
  if (statusFilter !== "ALL" && typeFilter !== "DELETION") {
    exportWhere.status = statusFilter;
  }

  const [deletionRequests, exportRequests] = await Promise.all([
    typeFilter === "EXPORT"
      ? Promise.resolve([])
      : prismadb.dataDeletionRequest.findMany({
          where: deletionWhere,
          orderBy: { createdAt: "desc" },
        }),
    typeFilter === "DELETION"
      ? Promise.resolve([])
      : prismadb.dataExportRequest.findMany({
          where: exportWhere,
          orderBy: { createdAt: "desc" },
        }),
  ]);

  // Get all unique user IDs
  const userIds = new Set<string>();
  deletionRequests.forEach((r) => userIds.add(r.requestedById));
  exportRequests.forEach((r) => userIds.add(r.requestedById));

  // Fetch user details
  const users = await prismadb.users.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, email: true, name: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Combine and normalize
  let combined: DataRequestItem[] = [
    ...deletionRequests.map((r) => {
      const user = userMap.get(r.requestedById);
      return {
        id: r.id,
        type: "DELETION" as const,
        userEmail: user?.email || r.requestedById,
        userName: user?.name || null,
        organizationId: r.organizationId,
        status: r.status,
        reason: r.reason,
        gracePeriodEndsAt: r.gracePeriodEndsAt,
        reviewNote: r.reviewNote,
        createdAt: r.createdAt,
      };
    }),
    ...exportRequests.map((r) => {
      const user = userMap.get(r.requestedById);
      return {
        id: r.id,
        type: "EXPORT" as const,
        userEmail: user?.email || r.requestedById,
        userName: user?.name || null,
        organizationId: r.organizationId,
        status: r.status,
        createdAt: r.createdAt,
      };
    }),
  ];

  // Apply search filter
  if (search) {
    combined = combined.filter(
      (r) =>
        r.userEmail.toLowerCase().includes(search) ||
        r.userName?.toLowerCase().includes(search) ||
        r.organizationId.toLowerCase().includes(search)
    );
  }

  // Sort by date descending
  combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Calculate counts
  const counts = {
    total: combined.length,
    pendingDeletions: combined.filter(
      (r) => r.type === "DELETION" && r.status === "PENDING"
    ).length,
    pendingExports: combined.filter(
      (r) => r.type === "EXPORT" && r.status === "PENDING"
    ).length,
    completed: combined.filter((r) => r.status === "COMPLETED").length,
    rejected: combined.filter((r) => r.status === "REJECTED").length,
  };

  // Paginate
  const totalCount = combined.length;
  const totalPages = Math.ceil(totalCount / limit);
  const paginatedRequests = combined.slice(skip, skip + limit);

  return {
    requests: paginatedRequests,
    totalCount,
    page,
    totalPages,
    counts,
  };
}

// =============================================================================
// Review Data Deletion Request
// =============================================================================

export async function reviewDataDeletion(
  requestId: string,
  action: "approve" | "reject",
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();

  const request = await prismadb.dataDeletionRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.status !== "PENDING") {
    return {
      success: false,
      error: `Cannot ${action} a request with status ${request.status}`,
    };
  }

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  await prismadb.dataDeletionRequest.update({
    where: { id: requestId },
    data: {
      status: newStatus,
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: note || null,
    },
  });

  await logAdminAction(
    admin.id,
    action === "approve" ? "APPROVE_DATA_DELETION" : "REJECT_DATA_DELETION",
    requestId,
    { reason: note }
  );

  // Send decision email to user
  sendDecisionEmail(request.requestedById, requestId, action, note, request.gracePeriodEndsAt).catch(
    (err) => console.error("[DATA_DELETION] Decision email failed:", err)
  );

  return { success: true };
}

// =============================================================================
// Execute Data Deletion
// =============================================================================

export async function executeDataDeletion(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();

  const request = await prismadb.dataDeletionRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.status !== "APPROVED") {
    return {
      success: false,
      error: "Request must be approved before execution",
    };
  }

  if (new Date() < request.gracePeriodEndsAt) {
    return {
      success: false,
      error: "Grace period has not ended yet",
    };
  }

  // Mark as processing
  await prismadb.dataDeletionRequest.update({
    where: { id: requestId },
    data: { status: "PROCESSING" },
  });

  try {
    const orgId = request.organizationId;

    // Delete org data in order (respecting foreign keys)
    // Models with onDelete: Cascade on their FK will auto-delete children
    // when the parent is deleted, so we only need to explicitly delete
    // models that don't cascade or need to go first.
    await prismadb.$transaction([
      // Messages & conversations
      prismadb.message.deleteMany({ where: { organizationId: orgId } }),
      // Social (comments & likes cascade via onDelete: Cascade on SocialPost FK)
      prismadb.socialPost.deleteMany({ where: { organizationId: orgId } }),
      // Calendar (reminders & invitees cascade via onDelete: Cascade)
      prismadb.calendarEvent.deleteMany({ where: { organizationId: orgId } }),
      // Tasks (comments cascade via onDelete: Cascade)
      prismadb.crm_Accounts_Tasks.deleteMany({
        where: { organizationId: orgId },
      }),
      // Documents
      prismadb.documents.deleteMany({ where: { organizationId: orgId } }),
      // Property contacts (no cascade, has relation filter)
      prismadb.property_Contacts.deleteMany({
        where: { Properties: { organizationId: orgId } },
      }),
      // Properties (comments & showings cascade via onDelete: Cascade)
      prismadb.properties.deleteMany({ where: { organizationId: orgId } }),
      // Client contacts
      prismadb.client_Contacts.deleteMany({
        where: { organizationId: orgId },
      }),
      // Clients (comments cascade via onDelete: Cascade)
      prismadb.clients.deleteMany({ where: { organizationId: orgId } }),
      // Mandates
      prismadb.mandate.deleteMany({ where: { organizationId: orgId } }),
      // Notifications
      prismadb.notification.deleteMany({ where: { organizationId: orgId } }),
      // Feedback
      prismadb.feedback.deleteMany({ where: { organizationId: orgId } }),
      // API keys & webhooks
      prismadb.apiKey.deleteMany({ where: { organizationId: orgId } }),
      prismadb.webhookEndpoint.deleteMany({
        where: { organizationId: orgId },
      }),
      // Data export requests
      prismadb.dataExportRequest.deleteMany({
        where: { organizationId: orgId },
      }),
    ]);

    // Mark as completed
    await prismadb.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: "COMPLETED",
        executedAt: new Date(),
      },
    });

    await logAdminAction(admin.id, "EXECUTE_DATA_DELETION", requestId, {
      organizationId: orgId,
    });

    console.log("[DATA_DELETION] Deletion executed for org:", orgId);

    return { success: true };
  } catch (error) {
    console.error("[DATA_DELETION] Execution failed:", error);

    // Revert to approved so admin can retry
    await prismadb.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" },
    });

    return {
      success: false,
      error: "Deletion failed. Please try again or contact engineering.",
    };
  }
}

// =============================================================================
// Email Helper
// =============================================================================

async function sendDecisionEmail(
  userId: string,
  requestId: string,
  decision: "approve" | "reject",
  note: string | undefined,
  gracePeriodEndsAt: Date
): Promise<void> {
  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user) return;

  const resend = await resendHelper();

  const html = await render(
    DeletionRequestDecisionEmail({
      userName: user.name || user.email,
      requestId,
      decision: decision === "approve" ? "approved" : "rejected",
      adminNote: note,
      gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
    })
  );

  await resend.emails.send({
    from: "Oikion <noreply@oikion.app>",
    to: user.email,
    subject: `Data Deletion Request ${decision === "approve" ? "Approved" : "Not Approved"}`,
    html,
  });
}
