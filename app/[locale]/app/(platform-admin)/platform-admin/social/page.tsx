// app/[locale]/(platform-admin)/platform-admin/social/page.tsx
// Social Media Activity Log - Track social media posts

import { prismadb } from "@/lib/prisma";
import { SocialClient } from "./components/SocialClient";

export default async function SocialPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ platform?: string; status?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { platform, status, page } = await searchParams;

  // Build filter
  const where: Record<string, unknown> = {};
  if (platform && platform !== "all") {
    where.platform = platform.toUpperCase();
  }
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }

  // Get posts with pagination
  const pageSize = 20;
  const currentPage = parseInt(page || "1");
  const skip = (currentPage - 1) * pageSize;

  const [posts, totalCount] = await Promise.all([
    prismadb.socialPostLog.findMany({
      where,
      take: pageSize,
      skip,
      orderBy: { createdAt: "desc" },
    }),
    prismadb.socialPostLog.count({ where }),
  ]);

  // Get stats by platform
  const platformStats = await prismadb.socialPostLog.groupBy({
    by: ["platform"],
    _count: { id: true },
    _sum: {
      likes: true,
      comments: true,
      shares: true,
      impressions: true,
    },
  });

  // Get stats by status
  const statusStats = await prismadb.socialPostLog.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  // Calculate totals
  const totalEngagement = platformStats.reduce(
    (acc, stat) => ({
      likes: acc.likes + (stat._sum.likes || 0),
      comments: acc.comments + (stat._sum.comments || 0),
      shares: acc.shares + (stat._sum.shares || 0),
      impressions: acc.impressions + (stat._sum.impressions || 0),
    }),
    { likes: 0, comments: 0, shares: 0, impressions: 0 }
  );

  const stats = {
    total: totalCount,
    byPlatform: platformStats.reduce((acc, stat) => {
      acc[stat.platform] = {
        count: stat._count.id,
        likes: stat._sum.likes || 0,
        comments: stat._sum.comments || 0,
        shares: stat._sum.shares || 0,
        impressions: stat._sum.impressions || 0,
      };
      return acc;
    }, {} as Record<string, { count: number; likes: number; comments: number; shares: number; impressions: number }>),
    byStatus: statusStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>),
    totalEngagement,
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <SocialClient
          posts={posts.map((p) => ({
            ...p,
            engagementRate: p.engagementRate?.toNumber() || null,
            scheduledAt: p.scheduledAt?.toISOString() || null,
            postedAt: p.postedAt?.toISOString() || null,
            lastSyncedAt: p.lastSyncedAt?.toISOString() || null,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          }))}
          stats={stats}
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / pageSize)}
          currentPlatform={platform || "all"}
          currentStatus={status || "all"}
          locale={locale}
        />
      </div>
    </div>
  );
}
