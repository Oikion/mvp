"use server";

import { requireAuth } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";
import { processDataExportImmediate } from "@/lib/data-export";

interface RequestDataExportInput {
  format?: "json" | "zip";
  processImmediately?: boolean; // For development/testing
}

interface DataExportResult {
  requestId: string;
  status: string;
  estimatedTime: string;
  downloadUrl?: string;
}

/**
 * Request a data export for the organization
 * This creates a background job that will:
 * 1. Fetch all organization data
 * 2. Package it as JSON (or ZIP with attachments)
 * 3. Store temporarily and send download link via email
 * 4. Auto-delete after 24 hours
 */
export async function requestDataExport(
  input?: RequestDataExportInput
): Promise<ActionResponse<DataExportResult>> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    // Check for existing pending request
    const existingRequest = await prismadb.dataExportRequest.findFirst({
      where: {
        organizationId,
        requestedById: userId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (existingRequest) {
      return actionError(
        "You already have a pending data export request. Please wait for it to complete.",
        "VALIDATION_ERROR"
      );
    }

    // Create new export request
    const exportRequest = await prismadb.dataExportRequest.create({
      data: {
        organizationId,
        requestedById: userId,
        format: input?.format || "json",
        status: "PENDING",
      },
    });

    console.log("[DATA_EXPORT] Export requested:", exportRequest.id);

    // For development or small orgs, process immediately
    // In production with large data, use a background job queue (Inngest, QStash, etc.)
    if (input?.processImmediately || process.env.NODE_ENV === "development") {
      // Process in background (non-blocking)
      processDataExportImmediate(exportRequest.id).catch((err) => {
        console.error("[DATA_EXPORT] Background processing failed:", err);
      });
    }

    return actionSuccess({
      requestId: exportRequest.id,
      status: "PENDING",
      estimatedTime: input?.processImmediately ? "A few minutes" : "24 hours",
    });
  } catch (error) {
    console.error("[REQUEST_DATA_EXPORT]", error);
    return actionError("Failed to request data export", error as Error);
  }
}

/**
 * Get the status of data export requests
 */
export async function getDataExportStatus(): Promise<
  ActionResponse<{
    requests: {
      id: string;
      status: string;
      format: string;
      downloadUrl: string | null;
      expiresAt: Date | null;
      createdAt: Date;
    }[];
  }>
> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    const requests = await prismadb.dataExportRequest.findMany({
      where: {
        organizationId,
        requestedById: userId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        format: true,
        downloadUrl: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return actionSuccess({ requests });
  } catch (error) {
    console.error("[GET_EXPORT_STATUS]", error);
    return actionError("Failed to get export status", error as Error);
  }
}

/**
 * Cancel a pending data export request
 */
export async function cancelDataExport(requestId: string): Promise<ActionResponse<void>> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    const request = await prismadb.dataExportRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
        requestedById: userId,
        status: "PENDING",
      },
    });

    if (!request) {
      return actionError("Export request not found or cannot be cancelled", "NOT_FOUND");
    }

    await prismadb.dataExportRequest.delete({
      where: { id: requestId },
    });

    return actionSuccess();
  } catch (error) {
    console.error("[CANCEL_EXPORT]", error);
    return actionError("Failed to cancel export", error as Error);
  }
}
