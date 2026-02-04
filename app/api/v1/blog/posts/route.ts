import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  parsePaginationParams,
  parseFilterParams,
  ExternalApiContext,
} from "@/lib/external-api-middleware";

/**
 * GET /api/v1/blog/posts
 * List blog posts for the organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, ["status", "tag", "category", "search"]);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tag) {
      where.tags = { has: filters.tag };
    }

    if (filters.category) {
      where.categories = { has: filters.category };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { content: { contains: filters.search, mode: "insensitive" } },
        { excerpt: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Fetch posts
    const posts = await prismadb.blogPost.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        status: true,
        authorId: true,
        tags: true,
        categories: true,
        seoTitle: true,
        seoDescription: true,
        publishedAt: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
        createdVia: true,
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return createApiSuccessResponse(
      {
        posts: items.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          featuredImage: post.featuredImage,
          status: post.status,
          authorId: post.authorId,
          tags: post.tags,
          categories: post.categories,
          seo: {
            title: post.seoTitle,
            description: post.seoDescription,
          },
          publishedAt: post.publishedAt?.toISOString(),
          scheduledAt: post.scheduledAt?.toISOString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
          createdVia: post.createdVia,
        })),
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.BLOG_READ] }
);

/**
 * POST /api/v1/blog/posts
 * Create a new blog post
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      status,
      tags,
      categories,
      seoTitle,
      seoDescription,
      publishedAt,
      scheduledAt,
      n8nWorkflowId,
    } = body;

    // Validate required fields
    if (!title) {
      return createApiErrorResponse("Missing required field: title", 400);
    }

    if (!content) {
      return createApiErrorResponse("Missing required field: content", 400);
    }

    // Generate slug if not provided
    const finalSlug = slug || generateSlug(title);

    // Check if slug is unique
    const existingPost = await prismadb.blogPost.findUnique({
      where: { slug: finalSlug },
    });

    if (existingPost) {
      return createApiErrorResponse(
        `Slug "${finalSlug}" is already in use. Please provide a unique slug.`,
        400
      );
    }

    // Determine publish status
    let finalStatus = status || "DRAFT";
    let finalPublishedAt = publishedAt ? new Date(publishedAt) : null;

    // If status is PUBLISHED and no publishedAt, set it to now
    if (finalStatus === "PUBLISHED" && !finalPublishedAt) {
      finalPublishedAt = new Date();
    }

    // Create the post
    const post = await prismadb.blogPost.create({
      data: {
        organizationId: context.organizationId,
        title,
        slug: finalSlug,
        excerpt: excerpt || null,
        content,
        featuredImage: featuredImage || null,
        status: finalStatus,
        authorId: context.createdById,
        tags: tags || [],
        categories: categories || [],
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || excerpt || null,
        publishedAt: finalPublishedAt,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdVia: "n8n",
        n8nWorkflowId: n8nWorkflowId || null,
      },
    });

    return createApiSuccessResponse(
      {
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          status: post.status,
          publishedAt: post.publishedAt?.toISOString(),
          createdAt: post.createdAt.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.BLOG_WRITE] }
);

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .substring(0, 100); // Limit length
}
