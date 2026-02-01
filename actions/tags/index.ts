"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

// ============================================
// Types
// ============================================

export type EntityType = "property" | "client" | "document" | "event" | "user" | "task" | "deal";

export interface Tag {
  id: string;
  name: string;
  color: string;
  category: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  usageCount?: number;
}

export interface CreateTagInput {
  name: string;
  color?: string;
  category?: string;
  description?: string;
}

export interface UpdateTagInput {
  id: string;
  name?: string;
  color?: string;
  category?: string | null;
  description?: string | null;
}

export interface TagEntityInput {
  tagId: string;
  entityId: string;
  entityType: EntityType;
}

export interface BulkTagInput {
  tagIds: string[];
  entityId: string;
  entityType: EntityType;
}

// ============================================
// Tag CRUD Operations
// ============================================

/**
 * Get all tags for the current organization
 */
export async function getTags(options?: { category?: string; search?: string }) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    const tags = await prismadb.tag.findMany({
      where: {
        organizationId,
        ...(options?.category && { category: options.category }),
        ...(options?.search && {
          name: {
            contains: options.search,
            mode: "insensitive" as const,
          },
        }),
      },
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
      include: {
        _count: {
          select: {
            propertyTags: true,
            clientTags: true,
            documentTags: true,
            eventTags: true,
            userTags: true,
            taskTags: true,
            dealTags: true,
          },
        },
      },
    });

    const tagsWithUsage: Tag[] = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      category: tag.category,
      description: tag.description,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      usageCount:
        tag._count.propertyTags +
        tag._count.clientTags +
        tag._count.documentTags +
        tag._count.eventTags +
        tag._count.userTags +
        tag._count.taskTags +
        tag._count.dealTags,
    }));

    return { success: true, data: tagsWithUsage };
  } catch (error) {
    console.error("[GET_TAGS]", error);
    return { success: false, error: "Failed to fetch tags" };
  }
}

/**
 * Create a new tag
 */
export async function createTag(input: CreateTagInput) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: "Tag name is required" };
    }

    // Check if tag with same name already exists
    const existingTag = await prismadb.tag.findUnique({
      where: {
        name_organizationId: {
          name: input.name.trim(),
          organizationId,
        },
      },
    });

    if (existingTag) {
      return { success: false, error: "A tag with this name already exists" };
    }

    const tag = await prismadb.tag.create({
      data: {
        name: input.name.trim(),
        color: input.color || "#6366f1",
        category: input.category?.trim() || null,
        description: input.description?.trim() || null,
        organizationId,
        createdBy: user.id,
      },
    });

    revalidatePath("/");

    return { success: true, data: tag };
  } catch (error) {
    console.error("[CREATE_TAG]", error);
    return { success: false, error: "Failed to create tag" };
  }
}

/**
 * Update a tag
 */
export async function updateTag(input: UpdateTagInput) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify tag exists and belongs to organization
    const existingTag = await prismadb.tag.findFirst({
      where: {
        id: input.id,
        organizationId,
      },
    });

    if (!existingTag) {
      return { success: false, error: "Tag not found" };
    }

    // If updating name, check for conflicts
    if (input.name && input.name.trim() !== existingTag.name) {
      const conflictingTag = await prismadb.tag.findUnique({
        where: {
          name_organizationId: {
            name: input.name.trim(),
            organizationId,
          },
        },
      });

      if (conflictingTag) {
        return { success: false, error: "A tag with this name already exists" };
      }
    }

    const tag = await prismadb.tag.update({
      where: { id: input.id },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(input.color && { color: input.color }),
        ...(input.category !== undefined && { category: input.category?.trim() || null }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
      },
    });

    revalidatePath("/");

    return { success: true, data: tag };
  } catch (error) {
    console.error("[UPDATE_TAG]", error);
    return { success: false, error: "Failed to update tag" };
  }
}

/**
 * Delete a tag
 */
export async function deleteTag(tagId: string) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify tag exists and belongs to organization
    const existingTag = await prismadb.tag.findFirst({
      where: {
        id: tagId,
        organizationId,
      },
    });

    if (!existingTag) {
      return { success: false, error: "Tag not found" };
    }

    await prismadb.tag.delete({
      where: { id: tagId },
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("[DELETE_TAG]", error);
    return { success: false, error: "Failed to delete tag" };
  }
}

// ============================================
// Entity Tagging Operations
// ============================================

/**
 * Get tags for a specific entity
 */
export async function getEntityTags(entityId: string, entityType: EntityType) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    let tags;

    switch (entityType) {
      case "property":
        tags = await prismadb.propertyTag.findMany({
          where: { propertyId: entityId },
          include: { tag: true },
        });
        break;
      case "client":
        tags = await prismadb.clientTag.findMany({
          where: { clientId: entityId },
          include: { tag: true },
        });
        break;
      case "document":
        tags = await prismadb.documentTag.findMany({
          where: { documentId: entityId },
          include: { tag: true },
        });
        break;
      case "event":
        tags = await prismadb.eventTag.findMany({
          where: { eventId: entityId },
          include: { tag: true },
        });
        break;
      case "user":
        tags = await prismadb.userTag.findMany({
          where: { userId: entityId },
          include: { tag: true },
        });
        break;
      case "task":
        tags = await prismadb.taskTag.findMany({
          where: { taskId: entityId },
          include: { tag: true },
        });
        break;
      case "deal":
        tags = await prismadb.dealTag.findMany({
          where: { dealId: entityId },
          include: { tag: true },
        });
        break;
      default:
        return { success: false, error: "Invalid entity type" };
    }

    // Filter to only return tags from this organization
    const orgTags = tags
      .filter((t) => t.tag.organizationId === organizationId)
      .map((t) => t.tag);

    return { success: true, data: orgTags };
  } catch (error) {
    console.error("[GET_ENTITY_TAGS]", error);
    return { success: false, error: "Failed to fetch entity tags" };
  }
}

/**
 * Tag an entity
 */
export async function tagEntity(input: TagEntityInput) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify tag exists and belongs to organization
    const tag = await prismadb.tag.findFirst({
      where: {
        id: input.tagId,
        organizationId,
      },
    });

    if (!tag) {
      return { success: false, error: "Tag not found" };
    }

    switch (input.entityType) {
      case "property":
        await prismadb.propertyTag.upsert({
          where: {
            propertyId_tagId: { propertyId: input.entityId, tagId: input.tagId },
          },
          create: { propertyId: input.entityId, tagId: input.tagId },
          update: {},
        });
        break;
      case "client":
        await prismadb.clientTag.upsert({
          where: {
            clientId_tagId: { clientId: input.entityId, tagId: input.tagId },
          },
          create: { clientId: input.entityId, tagId: input.tagId },
          update: {},
        });
        break;
      case "document":
        await prismadb.documentTag.upsert({
          where: {
            documentId_tagId: { documentId: input.entityId, tagId: input.tagId },
          },
          create: { documentId: input.entityId, tagId: input.tagId },
          update: {},
        });
        break;
      case "event":
        await prismadb.eventTag.upsert({
          where: {
            eventId_tagId: { eventId: input.entityId, tagId: input.tagId },
          },
          create: { eventId: input.entityId, tagId: input.tagId },
          update: {},
        });
        break;
      case "user":
        await prismadb.userTag.upsert({
          where: {
            userId_tagId: { userId: input.entityId, tagId: input.tagId },
          },
          create: { userId: input.entityId, tagId: input.tagId },
          update: {},
        });
        break;
      case "task":
        await prismadb.taskTag.upsert({
          where: {
            taskId_tagId: { taskId: input.entityId, tagId: input.tagId },
          },
          create: { taskId: input.entityId, tagId: input.tagId },
          update: {},
        });
        break;
      case "deal":
        await prismadb.dealTag.upsert({
          where: {
            dealId_tagId: { dealId: input.entityId, tagId: input.tagId },
          },
          create: { dealId: input.entityId, tagId: input.tagId },
          update: {},
        });
        break;
      default:
        return { success: false, error: "Invalid entity type" };
    }

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("[TAG_ENTITY]", error);
    return { success: false, error: "Failed to tag entity" };
  }
}

/**
 * Untag an entity
 */
export async function untagEntity(input: TagEntityInput) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify tag exists and belongs to organization
    const tag = await prismadb.tag.findFirst({
      where: {
        id: input.tagId,
        organizationId,
      },
    });

    if (!tag) {
      return { success: false, error: "Tag not found" };
    }

    switch (input.entityType) {
      case "property":
        await prismadb.propertyTag.deleteMany({
          where: { propertyId: input.entityId, tagId: input.tagId },
        });
        break;
      case "client":
        await prismadb.clientTag.deleteMany({
          where: { clientId: input.entityId, tagId: input.tagId },
        });
        break;
      case "document":
        await prismadb.documentTag.deleteMany({
          where: { documentId: input.entityId, tagId: input.tagId },
        });
        break;
      case "event":
        await prismadb.eventTag.deleteMany({
          where: { eventId: input.entityId, tagId: input.tagId },
        });
        break;
      case "user":
        await prismadb.userTag.deleteMany({
          where: { userId: input.entityId, tagId: input.tagId },
        });
        break;
      case "task":
        await prismadb.taskTag.deleteMany({
          where: { taskId: input.entityId, tagId: input.tagId },
        });
        break;
      case "deal":
        await prismadb.dealTag.deleteMany({
          where: { dealId: input.entityId, tagId: input.tagId },
        });
        break;
      default:
        return { success: false, error: "Invalid entity type" };
    }

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("[UNTAG_ENTITY]", error);
    return { success: false, error: "Failed to untag entity" };
  }
}

/**
 * Bulk update tags for an entity (replace all)
 */
export async function bulkUpdateEntityTags(input: BulkTagInput) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify all tags exist and belong to organization
    if (input.tagIds.length > 0) {
      const tags = await prismadb.tag.findMany({
        where: {
          id: { in: input.tagIds },
          organizationId,
        },
      });

      if (tags.length !== input.tagIds.length) {
        return { success: false, error: "Some tags not found" };
      }
    }

    await prismadb.$transaction(async (tx) => {
      switch (input.entityType) {
        case "property":
          await tx.propertyTag.deleteMany({ where: { propertyId: input.entityId } });
          if (input.tagIds.length > 0) {
            await tx.propertyTag.createMany({
              data: input.tagIds.map((tagId) => ({ propertyId: input.entityId, tagId })),
            });
          }
          break;
        case "client":
          await tx.clientTag.deleteMany({ where: { clientId: input.entityId } });
          if (input.tagIds.length > 0) {
            await tx.clientTag.createMany({
              data: input.tagIds.map((tagId) => ({ clientId: input.entityId, tagId })),
            });
          }
          break;
        case "document":
          await tx.documentTag.deleteMany({ where: { documentId: input.entityId } });
          if (input.tagIds.length > 0) {
            await tx.documentTag.createMany({
              data: input.tagIds.map((tagId) => ({ documentId: input.entityId, tagId })),
            });
          }
          break;
        case "event":
          await tx.eventTag.deleteMany({ where: { eventId: input.entityId } });
          if (input.tagIds.length > 0) {
            await tx.eventTag.createMany({
              data: input.tagIds.map((tagId) => ({ eventId: input.entityId, tagId })),
            });
          }
          break;
        case "user":
          await tx.userTag.deleteMany({ where: { userId: input.entityId } });
          if (input.tagIds.length > 0) {
            await tx.userTag.createMany({
              data: input.tagIds.map((tagId) => ({ userId: input.entityId, tagId })),
            });
          }
          break;
        case "task":
          await tx.taskTag.deleteMany({ where: { taskId: input.entityId } });
          if (input.tagIds.length > 0) {
            await tx.taskTag.createMany({
              data: input.tagIds.map((tagId) => ({ taskId: input.entityId, tagId })),
            });
          }
          break;
        case "deal":
          await tx.dealTag.deleteMany({ where: { dealId: input.entityId } });
          if (input.tagIds.length > 0) {
            await tx.dealTag.createMany({
              data: input.tagIds.map((tagId) => ({ dealId: input.entityId, tagId })),
            });
          }
          break;
        default:
          throw new Error("Invalid entity type");
      }
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("[BULK_UPDATE_ENTITY_TAGS]", error);
    return { success: false, error: "Failed to update tags" };
  }
}

/**
 * Get unique categories for tags
 */
export async function getTagCategories() {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return { success: false, error: "Unauthorized" };
    }

    const categories = await prismadb.tag.findMany({
      where: {
        organizationId,
        category: { not: null },
      },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return {
      success: true,
      data: categories.map((c) => c.category).filter(Boolean) as string[],
    };
  } catch (error) {
    console.error("[GET_TAG_CATEGORIES]", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}
