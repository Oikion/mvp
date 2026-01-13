/**
 * Calendar Export API Route
 * 
 * Exports calendar events to PDF format (list or grid view).
 * Includes rate limiting, authorization, and audit logging.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  checkExportRateLimit,
  createRateLimitResponse,
  checkRowLimit,
  createRowLimitResponse,
  getSecureDownloadHeaders,
  createExportAuditLog,
  logExportEvent,
  generateCalendarPDF,
} from "@/lib/export";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId, orgId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in to export data" },
        { status: 401 }
      );
    }
    
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization", message: "You must be part of an organization to export data" },
        { status: 403 }
      );
    }
    
    // Get user from database
    const user = await prismadb.users.findFirst({
      where: { clerkUserId },
      select: { id: true, name: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User not found in database" },
        { status: 404 }
      );
    }
    
    // Check rate limit
    const rateLimitResult = await checkExportRateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.reset);
    }
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const viewType = (searchParams.get("view") || "list") as "list" | "grid";
    const locale = (searchParams.get("locale") || "en") as "en" | "el";
    
    // Date range parameters
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const monthStr = searchParams.get("month"); // For grid view: YYYY-MM format
    
    // Determine date range
    let startDate: Date;
    let endDate: Date;
    let selectedMonth: Date;
    
    if (viewType === "grid" && monthStr) {
      // For grid view, use the specified month
      selectedMonth = parseISO(`${monthStr}-01`);
      startDate = startOfMonth(selectedMonth);
      endDate = endOfMonth(selectedMonth);
    } else if (startDateStr && endDateStr) {
      // Use specified date range
      startDate = parseISO(startDateStr);
      endDate = parseISO(endDateStr);
      selectedMonth = startDate;
    } else {
      // Default: current month
      selectedMonth = new Date();
      startDate = startOfMonth(selectedMonth);
      endDate = endOfMonth(selectedMonth);
    }
    
    // Event type filter
    const eventTypeFilter = searchParams.get("eventType")?.split(",").filter(Boolean) || [];
    
    // Build where clause
    const whereClause: Record<string, unknown> = {
      organizationId: orgId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (eventTypeFilter.length > 0) {
      whereClause.eventType = { in: eventTypeFilter };
    }
    
    // Fetch events assigned to user or where user is invitee
    const events = await prismadb.calComEvent.findMany({
      where: {
        OR: [
          { ...whereClause, assignedUserId: user.id },
          { 
            ...whereClause,
            EventInvitee: { some: { userId: user.id } },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        eventType: true,
        status: true,
        attendeeName: true,
        attendeeEmail: true,
      },
      orderBy: { startTime: "asc" },
    });
    
    // Check row limit
    const rowCheck = checkRowLimit("calendar", events.length);
    if (!rowCheck.allowed) {
      return createRowLimitResponse(rowCheck);
    }
    
    // Transform data for export
    const exportData = events.map(event => ({
      id: event.id,
      title: event.title || "",
      description: event.description || "",
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location || "",
      eventType: event.eventType || "OTHER",
      status: event.status || "",
      attendeeName: event.attendeeName || "",
      attendeeEmail: event.attendeeEmail || "",
    }));
    
    // Create audit log
    const auditLog = createExportAuditLog({
      userId: user.id,
      organizationId: orgId,
      exportType: "calendar",
      format: "pdf",
      rowCount: exportData.length,
      filters: { 
        viewType, 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString(),
        eventType: eventTypeFilter,
      },
      success: true,
    });
    
    logExportEvent(auditLog);
    
    // Generate PDF
    const pdfResult = await generateCalendarPDF(exportData, {
      viewType,
      locale,
      title: locale === "el" ? "Ημερολόγιο" : "Calendar",
      month: selectedMonth,
      dateRange: { start: startDate, end: endDate },
    });
    
    // Return file response
    const headers = getSecureDownloadHeaders(pdfResult.filename, "pdf");
    
    const responseData = pdfResult.blob instanceof Blob 
      ? Buffer.from(await pdfResult.blob.arrayBuffer())
      : pdfResult.blob;
    
    return new Response(responseData, {
      status: 200,
      headers,
    });
    
  } catch (error) {
    console.error("[CALENDAR_EXPORT_ERROR]", error);
    
    return NextResponse.json(
      { 
        error: "Export failed", 
        message: error instanceof Error ? error.message : "An unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}
