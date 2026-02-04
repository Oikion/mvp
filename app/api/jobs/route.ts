/**
 * Background Jobs API
 * 
 * POST /api/jobs - Submit a new background job
 * GET /api/jobs - List jobs for the organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prismadb } from '@/lib/prisma';
import {
  submitJob,
  getJobsByOrganization,
  type JobType,
  type JobPayload,
  type JobStatus,
} from '@/lib/jobs';

export const dynamic = 'force-dynamic';

// ===========================================
// POST /api/jobs - Submit a new job
// ===========================================

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, payload, priority, metadata } = body;

    // Validate job type
    const validTypes: JobType[] = [
      'market-intel-scrape',
      'newsletter-send',
      'portal-publish-xe',
      'bulk-export',
    ];

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid job type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate payload
    if (!payload) {
      return NextResponse.json(
        { error: 'Payload is required' },
        { status: 400 }
      );
    }

    // Get user ID for audit
    const user = await prismadb.users.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    // Build callback URL for the worker to report progress
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/jobs/callback`;

    // Submit the job
    const result = await submitJob({
      type: type as JobType,
      organizationId: orgId,
      payload: payload as JobPayload,
      priority: priority || 'normal',
      metadata,
      createdBy: user?.id,
      callbackUrl,
    });

    return NextResponse.json(result, {
      status: result.success ? 201 : 409,
    });
  } catch (error) {
    console.error('[JOBS_POST]', error);
    return NextResponse.json(
      { error: 'Failed to submit job' },
      { status: 500 }
    );
  }
}

// ===========================================
// GET /api/jobs - List jobs
// ===========================================

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as JobType | null;
    const statusFilter = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Parse status filter
    let statuses: JobStatus[] | undefined;
    if (statusFilter) {
      statuses = statusFilter.split(',').filter(Boolean) as JobStatus[];
    }

    const result = await getJobsByOrganization(orgId, {
      type: type || undefined,
      status: statuses,
      limit: Math.min(limit, 100),
      offset,
    });

    return NextResponse.json({
      jobs: result.jobs,
      total: result.total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + result.jobs.length < result.total,
    });
  } catch (error) {
    console.error('[JOBS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to list jobs' },
      { status: 500 }
    );
  }
}
