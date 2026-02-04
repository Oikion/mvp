import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/blog/posts/[id]
 * Get a single blog post by ID
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext, routeParams?: RouteParams) => {
    const { id } = await routeParams!.params;

    const post = await prismadb.blogPost.findFirst({
      where: {
        id,
        organizationId: context.organizationId,
      },
    });

    if (!post) {
      return createApiErrorResponse("Blog post not found", 404);
    }

    return createApiSuccessResponse({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
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
        n8nWorkflowId: post.n8nWorkflowId,
      },
    });
  },
  { requiredScopes: [API_SCOPES.BLOG_READ] }
);

/**
 * PUT /api/v1/blog/posts/[id]
 * Update a blog post
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext, routeParams?: RouteParams) => {
    const { id } = await routeParams!.params;
    const body = await req.json();

    // Check if post exists
    const existingPost = await prismadb.blogPost.findFirst({
      where: {
        id,
        organizationId: context.organizationId,
      },
    });

    if (!existingPost) {
      return createApiErrorResponse("Blog post not found", 404);
    }

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
    } = body;

    // If slug is being changed, check uniqueness
    if (slug && slug !== existingPost.slug) {
      const slugExists = await prismadb.blogPost.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return createApiErrorResponse(
          `Slug "${slug}" is already in use. Please provide a unique slug.`,
          400
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) updateData.content = content;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;
    if (categories !== undefined) updateData.categories = categories;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    // Handle publishedAt and status transitions
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    } else if (status === "PUBLISHED" && !existingPost.publishedAt) {
      // Auto-set publishedAt when publishing
      updateData.publishedAt = new Date();
    }

    const post = await prismadb.blogPost.update({
      where: { id },
      data: updateData,
    });

    return createApiSuccessResponse({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        status: post.status,
        publishedAt: post.publishedAt?.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.BLOG_WRITE] }
);

/**
 * DELETE /api/v1/blog/posts/[id]
 * Delete a blog post
 */
export const DELETE = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext, routeParams?: RouteParams) => {
    const { id } = await routeParams!.params;

    // Check if post exists
    const existingPost = await prismadb.blogPost.findFirst({
      where: {
        id,
        organizationId: context.organizationId,
      },
    });

    if (!existingPost) {
      return createApiErrorResponse("Blog post not found", 404);
    }

    await prismadb.blogPost.delete({
      where: { id },
    });

    return createApiSuccessResponse({
      message: "Blog post deleted successfully",
      deletedId: id,
    });
  },
  { requiredScopes: [API_SCOPES.BLOG_WRITE] }
);
