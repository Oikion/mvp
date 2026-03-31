'use server'

import { prismadb } from '@/lib/prisma'
import { requirePlatformAdmin } from '@/lib/platform-admin'

interface GetWebsiteSubmissionsParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  inquiryType?: string
  sortBy?: 'createdAt' | 'inquiryType' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export async function getWebsiteSubmissions({
  page = 1,
  limit = 20,
  search = '',
  status = 'ALL',
  inquiryType = 'ALL',
  sortBy = 'createdAt',
  sortOrder = 'desc',
}: GetWebsiteSubmissionsParams) {
  await requirePlatformAdmin()

  const where: Record<string, unknown> = {}

  if (status !== 'ALL') {
    where.status = status
  }

  if (inquiryType !== 'ALL') {
    where.inquiryType = inquiryType
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { orgName: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [submissions, totalCount, countsByStatus, countsByType] = await Promise.all([
    prismadb.websiteContactSubmission.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prismadb.websiteContactSubmission.count({ where }),
    prismadb.websiteContactSubmission.groupBy({
      by: ['status'],
      _count: true,
    }),
    prismadb.websiteContactSubmission.groupBy({
      by: ['inquiryType'],
      _count: true,
    }),
  ])

  return {
    submissions,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
    countsByStatus: Object.fromEntries(
      countsByStatus.map(s => [s.status, s._count])
    ),
    countsByType: Object.fromEntries(
      countsByType.map(t => [t.inquiryType, t._count])
    ),
  }
}

export async function getWebsiteSubmissionById(id: string) {
  await requirePlatformAdmin()

  return prismadb.websiteContactSubmission.findUnique({
    where: { id },
  })
}

export async function updateSubmissionStatus(
  id: string,
  status: 'NEW' | 'READ' | 'CONTACTED' | 'ARCHIVED',
  notes?: string
) {
  await requirePlatformAdmin()

  return prismadb.websiteContactSubmission.update({
    where: { id },
    data: {
      status,
      ...(notes !== undefined ? { notes } : {}),
    },
  })
}
