"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { z } from "zod";
import { ChangelogStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ChangelogTag, ChangelogCategoryData } from "@/lib/changelog-constants";

// Tag validation schema
const tagSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().min(1).max(20),
});

// Category validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  color: z.string().min(1, "Color is required").max(20),
  icon: z.string().min(1, "Icon is required").max(30),
  sortOrder: z.number().optional(),
});

const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(50).optional(),
  color: z.string().min(1, "Color is required").max(20).optional(),
  icon: z.string().min(1, "Icon is required").max(30).optional(),
  sortOrder: z.number().optional(),
});

// Entry validation schemas
const createChangelogSchema = z.object({
  version: z.string().min(1, "Version is required").max(50),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(50000),
  customCategoryId: z.string().uuid("Category is required"),
  tags: z.array(tagSchema).max(10).optional(),
  status: z.nativeEnum(ChangelogStatus).optional(),
});

const updateChangelogSchema = z.object({
  id: z.string().uuid(),
  version: z.string().min(1, "Version is required").max(50).optional(),
  title: z.string().min(1, "Title is required").max(200).optional(),
  description: z.string().min(1, "Description is required").max(50000).optional(),
  customCategoryId: z.string().uuid().optional(),
  tags: z.array(tagSchema).max(10).optional(),
  status: z.nativeEnum(ChangelogStatus).optional(),
});

// Result types
interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface ChangelogEntryData {
  id: string;
  version: string;
  title: string;
  description: string;
  customCategory: ChangelogCategoryData | null;
  status: ChangelogStatus;
  tags: ChangelogTag[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

// ============================================
// CATEGORY ACTIONS
// ============================================

/**
 * Create a new custom category
 * Requires platform admin access
 */
export async function createCustomCategory(
  data: z.infer<typeof createCategorySchema>
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const validation = createCategorySchema.safeParse(data);

    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const { name, color, icon, sortOrder } = validation.data;

    // Check if category with same name exists
    const existing = await prismadb.changelogCustomCategory.findUnique({
      where: { name },
    });

    if (existing) {
      return { success: false, error: "A category with this name already exists" };
    }

    // Get max sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxSort = await prismadb.changelogCustomCategory.aggregate({
        _max: { sortOrder: true },
      });
      finalSortOrder = (maxSort._max.sortOrder || 0) + 1;
    }

    const category = await prismadb.changelogCustomCategory.create({
      data: {
        name,
        color,
        icon,
        sortOrder: finalSortOrder,
      },
    });

    await logAdminAction(admin.clerkId, "CREATE_CHANGELOG", category.id, {
      type: "category",
      name,
      color,
      icon,
    });

    revalidatePath("/app/platform-admin/changelog");

    return { success: true, data: category };
  } catch (error) {
    console.error("[CREATE_CUSTOM_CATEGORY]", error);
    return { success: false, error: "Failed to create category" };
  }
}

/**
 * Update a custom category
 * Requires platform admin access
 */
export async function updateCustomCategory(
  data: z.infer<typeof updateCategorySchema>
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const validation = updateCategorySchema.safeParse(data);

    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const { id, ...updateData } = validation.data;

    // Check if category exists
    const existing = await prismadb.changelogCustomCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Category not found" };
    }

    // If name is being changed, check for duplicates
    if (updateData.name && updateData.name !== existing.name) {
      const duplicate = await prismadb.changelogCustomCategory.findUnique({
        where: { name: updateData.name },
      });
      if (duplicate) {
        return { success: false, error: "A category with this name already exists" };
      }
    }

    const category = await prismadb.changelogCustomCategory.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction(admin.clerkId, "UPDATE_CHANGELOG", id, {
      type: "category",
      changes: updateData,
    });

    revalidatePath("/app/platform-admin/changelog");
    revalidatePath("/changelog");

    return { success: true, data: category };
  } catch (error) {
    console.error("[UPDATE_CUSTOM_CATEGORY]", error);
    return { success: false, error: "Failed to update category" };
  }
}

/**
 * Delete a custom category
 * Requires platform admin access
 */
export async function deleteCustomCategory(id: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();

    if (!id) {
      return { success: false, error: "Category ID is required" };
    }

    // Check if category exists
    const existing = await prismadb.changelogCustomCategory.findUnique({
      where: { id },
      include: { _count: { select: { entries: true } } },
    });

    if (!existing) {
      return { success: false, error: "Category not found" };
    }

    if (existing._count.entries > 0) {
      return {
        success: false,
        error: `Cannot delete category. It is used by ${existing._count.entries} changelog entries.`,
      };
    }

    await prismadb.changelogCustomCategory.delete({
      where: { id },
    });

    await logAdminAction(admin.clerkId, "DELETE_CHANGELOG", id, {
      type: "category",
      name: existing.name,
    });

    revalidatePath("/app/platform-admin/changelog");

    return { success: true };
  } catch (error) {
    console.error("[DELETE_CUSTOM_CATEGORY]", error);
    return { success: false, error: "Failed to delete category" };
  }
}

/**
 * Get all custom categories
 * Requires platform admin access
 */
export async function getCustomCategories(): Promise<ChangelogCategoryData[]> {
  try {
    await requirePlatformAdmin();

    const categories = await prismadb.changelogCustomCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
    }));
  } catch (error) {
    console.error("[GET_CUSTOM_CATEGORIES]", error);
    return [];
  }
}

/**
 * Get all categories for public use (no auth required)
 */
export async function getPublicCategories(): Promise<ChangelogCategoryData[]> {
  try {
    const categories = await prismadb.changelogCustomCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
    }));
  } catch (error) {
    console.error("[GET_PUBLIC_CATEGORIES]", error);
    return [];
  }
}

// ============================================
// ENTRY ACTIONS
// ============================================

/**
 * Create a new changelog entry
 * Requires platform admin access
 */
export async function createChangelogEntry(
  data: z.infer<typeof createChangelogSchema>
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const validation = createChangelogSchema.safeParse(data);

    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const { version, title, description, customCategoryId, tags, status } = validation.data;

    // Get admin's database user
    const adminUser = await prismadb.users.findUnique({
      where: { clerkUserId: admin.clerkId },
      select: { id: true },
    });

    if (!adminUser) {
      return { success: false, error: "Admin user not found" };
    }

    // Verify category exists
    const category = await prismadb.changelogCustomCategory.findUnique({
      where: { id: customCategoryId },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    // Create the changelog entry
    const entry = await prismadb.changelogEntry.create({
      data: {
        version,
        title,
        description,
        customCategoryId,
        tags: tags || [],
        status: status || ChangelogStatus.DRAFT,
        publishedAt: status === ChangelogStatus.PUBLISHED ? new Date() : null,
        createdById: adminUser.id,
      },
    });

    // Log the action
    await logAdminAction(admin.clerkId, "CREATE_CHANGELOG", entry.id, {
      version,
      title,
      category: category.name,
      status: status || "DRAFT",
    });

    revalidatePath("/app/platform-admin/changelog");
    revalidatePath("/changelog");

    return { success: true, data: entry };
  } catch (error) {
    console.error("[CREATE_CHANGELOG_ENTRY]", error);
    return { success: false, error: "Failed to create changelog entry" };
  }
}

/**
 * Update an existing changelog entry
 * Requires platform admin access
 */
export async function updateChangelogEntry(
  data: z.infer<typeof updateChangelogSchema>
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const validation = updateChangelogSchema.safeParse(data);

    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const { id, ...updateData } = validation.data;

    // Check if entry exists
    const existing = await prismadb.changelogEntry.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Changelog entry not found" };
    }

    // If category is being changed, verify it exists
    if (updateData.customCategoryId) {
      const category = await prismadb.changelogCustomCategory.findUnique({
        where: { id: updateData.customCategoryId },
      });
      if (!category) {
        return { success: false, error: "Category not found" };
      }
    }

    // Handle publishedAt when status changes to PUBLISHED
    const finalUpdateData: Record<string, unknown> = { ...updateData };
    if (updateData.status === ChangelogStatus.PUBLISHED && !existing.publishedAt) {
      finalUpdateData.publishedAt = new Date();
    }

    // Update the entry
    const entry = await prismadb.changelogEntry.update({
      where: { id },
      data: finalUpdateData,
    });

    // Log the action
    await logAdminAction(admin.clerkId, "UPDATE_CHANGELOG", id, {
      changes: updateData,
    });

    revalidatePath("/app/platform-admin/changelog");
    revalidatePath("/changelog");

    return { success: true, data: entry };
  } catch (error) {
    console.error("[UPDATE_CHANGELOG_ENTRY]", error);
    return { success: false, error: "Failed to update changelog entry" };
  }
}

/**
 * Delete (archive) a changelog entry
 * Sets status to ARCHIVED instead of hard delete
 * Requires platform admin access
 */
export async function deleteChangelogEntry(id: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();

    if (!id) {
      return { success: false, error: "Entry ID is required" };
    }

    // Check if entry exists
    const existing = await prismadb.changelogEntry.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Changelog entry not found" };
    }

    // Soft delete by setting status to ARCHIVED
    await prismadb.changelogEntry.update({
      where: { id },
      data: { status: ChangelogStatus.ARCHIVED },
    });

    // Log the action
    await logAdminAction(admin.clerkId, "DELETE_CHANGELOG", id, {
      previousStatus: existing.status,
    });

    revalidatePath("/app/platform-admin/changelog");
    revalidatePath("/changelog");

    return { success: true };
  } catch (error) {
    console.error("[DELETE_CHANGELOG_ENTRY]", error);
    return { success: false, error: "Failed to delete changelog entry" };
  }
}

/**
 * Publish a changelog entry
 * Requires platform admin access
 */
export async function publishChangelogEntry(id: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();

    if (!id) {
      return { success: false, error: "Entry ID is required" };
    }

    // Check if entry exists
    const existing = await prismadb.changelogEntry.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Changelog entry not found" };
    }

    if (existing.status === ChangelogStatus.PUBLISHED) {
      return { success: false, error: "Entry is already published" };
    }

    // Publish the entry
    await prismadb.changelogEntry.update({
      where: { id },
      data: {
        status: ChangelogStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    // Log the action
    await logAdminAction(admin.clerkId, "PUBLISH_CHANGELOG", id, {
      previousStatus: existing.status,
    });

    revalidatePath("/app/platform-admin/changelog");
    revalidatePath("/changelog");

    return { success: true };
  } catch (error) {
    console.error("[PUBLISH_CHANGELOG_ENTRY]", error);
    return { success: false, error: "Failed to publish changelog entry" };
  }
}

/**
 * Get changelog entries for admin interface
 * Supports filtering by status
 * Requires platform admin access
 */
export async function getChangelogEntries(options?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  entries: ChangelogEntryData[];
  total: number;
  stats: {
    total: number;
    byStatus: Record<string, number>;
  };
}> {
  try {
    await requirePlatformAdmin();

    const status = options?.status;
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Build filter
    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    // Get entries with pagination
    const [entries, total] = await Promise.all([
      prismadb.changelogEntry.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: {
          customCategory: true,
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prismadb.changelogEntry.count({ where }),
    ]);

    // Get status counts
    const statusCounts = await prismadb.changelogEntry.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const stats = {
      total: await prismadb.changelogEntry.count(),
      byStatus: statusCounts.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        version: entry.version,
        title: entry.title,
        description: entry.description,
        customCategory: entry.customCategory
          ? {
              id: entry.customCategory.id,
              name: entry.customCategory.name,
              color: entry.customCategory.color,
              icon: entry.customCategory.icon,
              sortOrder: entry.customCategory.sortOrder,
            }
          : null,
        status: entry.status,
        tags: (entry.tags as unknown as ChangelogTag[]) || [],
        publishedAt: entry.publishedAt?.toISOString() || null,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        createdBy: entry.createdBy,
      })),
      total,
      stats,
    };
  } catch (error) {
    console.error("[GET_CHANGELOG_ENTRIES]", error);
    return {
      entries: [],
      total: 0,
      stats: { total: 0, byStatus: {} },
    };
  }
}

/**
 * Get published changelog entries for public page
 * No authentication required
 */
export async function getPublishedChangelogEntries(): Promise<ChangelogEntryData[]> {
  try {
    const entries = await prismadb.changelogEntry.findMany({
      where: { status: ChangelogStatus.PUBLISHED },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: {
        customCategory: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return entries.map((entry) => ({
      id: entry.id,
      version: entry.version,
      title: entry.title,
      description: entry.description,
      customCategory: entry.customCategory
        ? {
            id: entry.customCategory.id,
            name: entry.customCategory.name,
            color: entry.customCategory.color,
            icon: entry.customCategory.icon,
            sortOrder: entry.customCategory.sortOrder,
          }
        : null,
      status: entry.status,
      tags: (entry.tags as unknown as ChangelogTag[]) || [],
      publishedAt: entry.publishedAt?.toISOString() || null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      createdBy: entry.createdBy,
    }));
  } catch (error) {
    console.error("[GET_PUBLISHED_CHANGELOG_ENTRIES]", error);
    return [];
  }
}
