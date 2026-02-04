/**
 * Tag Migration Script
 * 
 * Migrates existing tags from legacy formats to the new unified Tag system:
 * - Documents.tags (Json) → DocumentTag relations
 * - Client_Contacts.tags (String[]) → Skipped (different use case - contact-specific)
 * - crm_Accounts_Tasks.tags (Json) → TaskTag relations
 * 
 * Run with: npx tsx scripts/migrate-tags.ts
 * 
 * Options:
 *   --dry-run    Preview changes without applying them
 *   --org=<id>   Migrate only a specific organization
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MigrationStats {
  documentsProcessed: number;
  documentTagsCreated: number;
  tasksProcessed: number;
  taskTagsCreated: number;
  tagsCreated: number;
  errors: string[];
}

// Predefined colors for auto-created tags
const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
];

function getRandomColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

async function getOrCreateTag(
  organizationId: string,
  tagName: string,
  createdBy: string,
  stats: MigrationStats,
  dryRun: boolean
): Promise<string | null> {
  const normalizedName = tagName.trim();
  
  if (!normalizedName) {
    return null;
  }

  // Check if tag exists
  const existingTag = await prisma.tag.findUnique({
    where: {
      name_organizationId: {
        name: normalizedName,
        organizationId,
      },
    },
  });

  if (existingTag) {
    return existingTag.id;
  }

  // Create new tag
  if (dryRun) {
    console.log(`[DRY RUN] Would create tag: "${normalizedName}" for org ${organizationId}`);
    stats.tagsCreated++;
    return `dry-run-tag-${normalizedName}`;
  }

  try {
    const newTag = await prisma.tag.create({
      data: {
        name: normalizedName,
        color: getRandomColor(),
        organizationId,
        createdBy,
        category: "Migrated",
        description: "Auto-migrated from legacy tag system",
      },
    });
    stats.tagsCreated++;
    console.log(`Created tag: "${normalizedName}" (${newTag.id})`);
    return newTag.id;
  } catch (error) {
    stats.errors.push(`Failed to create tag "${normalizedName}": ${error}`);
    return null;
  }
}

async function migrateDocumentTags(
  organizationId: string | undefined,
  stats: MigrationStats,
  dryRun: boolean
) {
  console.log("\n📄 Migrating Document Tags...\n");

  // Find documents with legacy tags
  const documents = await prisma.documents.findMany({
    where: {
      ...(organizationId && { organizationId }),
      tags: { not: null },
    },
    select: {
      id: true,
      organizationId: true,
      created_by_user: true,
      tags: true,
    },
  });

  for (const doc of documents) {
    stats.documentsProcessed++;
    
    // Parse tags from JSON
    let tags: string[] = [];
    try {
      if (typeof doc.tags === "string") {
        tags = JSON.parse(doc.tags);
      } else if (Array.isArray(doc.tags)) {
        tags = doc.tags;
      } else if (doc.tags && typeof doc.tags === "object") {
        // Handle object format { tags: [...] }
        const tagObj = doc.tags as Record<string, unknown>;
        if (Array.isArray(tagObj.tags)) {
          tags = tagObj.tags;
        }
      }
    } catch (error) {
      stats.errors.push(`Failed to parse tags for document ${doc.id}: ${error}`);
      continue;
    }

    if (tags.length === 0) {
      continue;
    }

    const createdBy = doc.created_by_user || "system";

    for (const tagName of tags) {
      if (typeof tagName !== "string" || !tagName.trim()) {
        continue;
      }

      const tagId = await getOrCreateTag(
        doc.organizationId,
        tagName,
        createdBy,
        stats,
        dryRun
      );

      if (!tagId) {
        continue;
      }

      // Check if relation already exists
      const existingRelation = await prisma.documentTag.findUnique({
        where: {
          documentId_tagId: {
            documentId: doc.id,
            tagId,
          },
        },
      });

      if (existingRelation) {
        continue;
      }

      if (dryRun) {
        console.log(`[DRY RUN] Would link tag "${tagName}" to document ${doc.id}`);
        stats.documentTagsCreated++;
      } else {
        try {
          await prisma.documentTag.create({
            data: {
              documentId: doc.id,
              tagId,
            },
          });
          stats.documentTagsCreated++;
        } catch (error) {
          stats.errors.push(`Failed to link tag to document ${doc.id}: ${error}`);
        }
      }
    }
  }
}

async function migrateTaskTags(
  organizationId: string | undefined,
  stats: MigrationStats,
  dryRun: boolean
) {
  console.log("\n✅ Migrating Task Tags...\n");

  // Find tasks with legacy tags
  const tasks = await prisma.crm_Accounts_Tasks.findMany({
    where: {
      ...(organizationId && { organizationId }),
      tags: { not: null },
    },
    select: {
      id: true,
      organizationId: true,
      user: true,
      tags: true,
    },
  });

  for (const task of tasks) {
    stats.tasksProcessed++;
    
    // Parse tags from JSON
    let tags: string[] = [];
    try {
      if (typeof task.tags === "string") {
        tags = JSON.parse(task.tags);
      } else if (Array.isArray(task.tags)) {
        tags = task.tags;
      } else if (task.tags && typeof task.tags === "object") {
        const tagObj = task.tags as Record<string, unknown>;
        if (Array.isArray(tagObj.tags)) {
          tags = tagObj.tags;
        }
      }
    } catch (error) {
      stats.errors.push(`Failed to parse tags for task ${task.id}: ${error}`);
      continue;
    }

    if (tags.length === 0) {
      continue;
    }

    const createdBy = task.user || "system";

    for (const tagName of tags) {
      if (typeof tagName !== "string" || !tagName.trim()) {
        continue;
      }

      const tagId = await getOrCreateTag(
        task.organizationId,
        tagName,
        createdBy,
        stats,
        dryRun
      );

      if (!tagId) {
        continue;
      }

      // Check if relation already exists
      const existingRelation = await prisma.taskTag.findUnique({
        where: {
          taskId_tagId: {
            taskId: task.id,
            tagId,
          },
        },
      });

      if (existingRelation) {
        continue;
      }

      if (dryRun) {
        console.log(`[DRY RUN] Would link tag "${tagName}" to task ${task.id}`);
        stats.taskTagsCreated++;
      } else {
        try {
          await prisma.taskTag.create({
            data: {
              taskId: task.id,
              tagId,
            },
          });
          stats.taskTagsCreated++;
        } catch (error) {
          stats.errors.push(`Failed to link tag to task ${task.id}: ${error}`);
        }
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const orgArg = args.find((a) => a.startsWith("--org="));
  const organizationId = orgArg ? orgArg.split("=")[1] : undefined;

  console.log("🏷️  Tag Migration Script");
  console.log("========================");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  if (organizationId) {
    console.log(`Organization: ${organizationId}`);
  } else {
    console.log("Organization: All");
  }
  console.log("");

  const stats: MigrationStats = {
    documentsProcessed: 0,
    documentTagsCreated: 0,
    tasksProcessed: 0,
    taskTagsCreated: 0,
    tagsCreated: 0,
    errors: [],
  };

  try {
    await migrateDocumentTags(organizationId, stats, dryRun);
    await migrateTaskTags(organizationId, stats, dryRun);

    console.log("\n========================");
    console.log("📊 Migration Summary");
    console.log("========================");
    console.log(`Tags created: ${stats.tagsCreated}`);
    console.log(`Documents processed: ${stats.documentsProcessed}`);
    console.log(`Document-tag links created: ${stats.documentTagsCreated}`);
    console.log(`Tasks processed: ${stats.tasksProcessed}`);
    console.log(`Task-tag links created: ${stats.taskTagsCreated}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors (${stats.errors.length}):`);
      stats.errors.forEach((err) => console.log(`  - ${err}`));
    }

    if (dryRun) {
      console.log("\n✅ Dry run complete. No changes were made.");
      console.log("Run without --dry-run to apply changes.");
    } else {
      console.log("\n✅ Migration complete!");
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
