// app/[locale]/(platform-admin)/platform-admin/blog/page.tsx
// Blog Management - View and manage blog posts

import { prismadb } from "@/lib/prisma";
import { BlogClient } from "./components/BlogClient";

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { status, page } = await searchParams;

  // Build filter
  const where: Record<string, unknown> = {};
  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }

  // Get posts with pagination
  const pageSize = 20;
  const currentPage = parseInt(page || "1");
  const skip = (currentPage - 1) * pageSize;

  const [posts, totalCount] = await Promise.all([
    prismadb.blogPost.findMany({
      where,
      take: pageSize,
      skip,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        tags: true,
        categories: true,
        publishedAt: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
        createdVia: true,
      },
    }),
    prismadb.blogPost.count({ where }),
  ]);

  // Get status counts for filters
  const statusCounts = await prismadb.blogPost.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const stats = {
    total: totalCount,
    byStatus: statusCounts.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <BlogClient
          posts={posts.map((p) => ({
            ...p,
            publishedAt: p.publishedAt?.toISOString() || null,
            scheduledAt: p.scheduledAt?.toISOString() || null,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          }))}
          stats={stats}
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / pageSize)}
          currentStatus={status || "all"}
          locale={locale}
        />
      </div>
    </div>
  );
}
