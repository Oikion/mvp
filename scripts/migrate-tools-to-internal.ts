/**
 * Migrate AI Tools to INTERNAL_ACTION
 *
 * This script updates AI tools from API_ROUTE to INTERNAL_ACTION endpoint type,
 * enabling direct function calls instead of HTTP requests.
 *
 * Usage:
 *   pnpm exec tsx scripts/migrate-tools-to-internal.ts           # Dry run (default)
 *   pnpm exec tsx scripts/migrate-tools-to-internal.ts --apply   # Apply changes
 *   pnpm exec tsx scripts/migrate-tools-to-internal.ts --list    # List current tools
 */

import { config } from "dotenv";
// Load environment variables from .env.local
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Tool name to internal action path mapping
// These map to the functions in actions/ai/tools/
const TOOL_MIGRATIONS: Record<string, { endpointPath: string; category: string }> = {
  // Calendar tools
  get_upcoming_events: { endpointPath: "ai/tools/calendar", category: "calendar" },
  list_events: { endpointPath: "ai/tools/calendar", category: "calendar" },
  create_event: { endpointPath: "ai/tools/calendar", category: "calendar" },
  create_reminder: { endpointPath: "ai/tools/calendar", category: "calendar" },
  find_available_slots: { endpointPath: "ai/tools/calendar", category: "calendar" },

  // CRM - Client tools
  list_clients: { endpointPath: "ai/tools/crm", category: "crm" },
  get_client_details: { endpointPath: "ai/tools/crm", category: "crm" },
  create_client: { endpointPath: "ai/tools/crm", category: "crm" },
  update_client_preferences: { endpointPath: "ai/tools/crm", category: "crm" },
  search_clients_semantic: { endpointPath: "ai/tools/crm", category: "crm" },

  // CRM - Task tools
  list_tasks: { endpointPath: "ai/tools/crm", category: "crm" },
  create_task: { endpointPath: "ai/tools/crm", category: "crm" },

  // MLS - Property tools
  list_properties: { endpointPath: "ai/tools/mls", category: "mls" },
  get_property_details: { endpointPath: "ai/tools/mls", category: "mls" },
  create_property: { endpointPath: "ai/tools/mls", category: "mls" },
  search_properties_semantic: { endpointPath: "ai/tools/mls", category: "mls" },

  // Document tools
  list_documents: { endpointPath: "ai/tools/documents", category: "documents" },
  get_document_details: { endpointPath: "ai/tools/documents", category: "documents" },
  analyze_document: { endpointPath: "ai/tools/documents", category: "documents" },
  chat_with_document: { endpointPath: "ai/tools/documents", category: "documents" },

  // Message tools
  get_recent_conversations: { endpointPath: "ai/tools/messages", category: "messaging" },
  draft_message_response: { endpointPath: "ai/tools/messages", category: "messaging" },
  send_message: { endpointPath: "ai/tools/messages", category: "messaging" },
};

async function listTools() {
  console.log("\n📋 Current AI Tools:\n");
  console.log("─".repeat(100));

  const tools = await prisma.aiTool.findMany({
    orderBy: { category: "asc" },
    select: {
      name: true,
      displayName: true,
      category: true,
      endpointType: true,
      endpointPath: true,
      isEnabled: true,
    },
  });

  let currentCategory = "";
  for (const tool of tools) {
    if (tool.category !== currentCategory) {
      currentCategory = tool.category;
      console.log(`\n[${currentCategory.toUpperCase()}]`);
    }

    const status = tool.isEnabled ? "✅" : "❌";
    const type = tool.endpointType.padEnd(15);
    console.log(`  ${status} ${tool.name.padEnd(30)} ${type} ${tool.endpointPath}`);
  }

  console.log("\n" + "─".repeat(100));
  console.log(`Total: ${tools.length} tools`);
  console.log(
    `  API_ROUTE: ${tools.filter((t) => t.endpointType === "API_ROUTE").length}`
  );
  console.log(
    `  INTERNAL_ACTION: ${tools.filter((t) => t.endpointType === "INTERNAL_ACTION").length}`
  );
  console.log(
    `  EXTERNAL_URL: ${tools.filter((t) => t.endpointType === "EXTERNAL_URL").length}`
  );
}

async function migrateTools(dryRun: boolean) {
  console.log("\n🔄 Migrating AI Tools to INTERNAL_ACTION\n");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes will be made)" : "APPLYING CHANGES"}`);
  console.log("─".repeat(80));

  const toolsToMigrate = Object.keys(TOOL_MIGRATIONS);
  let migratedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const toolName of toolsToMigrate) {
    const migration = TOOL_MIGRATIONS[toolName];

    // Find the tool in the database
    const tool = await prisma.aiTool.findUnique({
      where: { name: toolName },
      select: {
        id: true,
        name: true,
        endpointType: true,
        endpointPath: true,
      },
    });

    if (!tool) {
      console.log(`⚠️  Tool "${toolName}" not found in database`);
      notFoundCount++;
      continue;
    }

    if (tool.endpointType === "INTERNAL_ACTION") {
      console.log(`⏭️  "${toolName}" already using INTERNAL_ACTION`);
      skippedCount++;
      continue;
    }

    console.log(
      `📝 ${toolName}: ${tool.endpointType} → INTERNAL_ACTION (${migration.endpointPath})`
    );

    if (!dryRun) {
      await prisma.aiTool.update({
        where: { id: tool.id },
        data: {
          endpointType: "INTERNAL_ACTION",
          endpointPath: migration.endpointPath,
        },
      });
    }

    migratedCount++;
  }

  console.log("\n" + "─".repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`  Migrated: ${migratedCount}`);
  console.log(`  Skipped (already INTERNAL_ACTION): ${skippedCount}`);
  console.log(`  Not found: ${notFoundCount}`);

  if (dryRun && migratedCount > 0) {
    console.log("\n💡 Run with --apply to apply these changes:");
    console.log("   pnpm exec tsx scripts/migrate-tools-to-internal.ts --apply");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "--dry-run";

  try {
    switch (command) {
      case "--list":
        await listTools();
        break;

      case "--apply":
        await migrateTools(false);
        break;

      case "--dry-run":
      default:
        await migrateTools(true);
        break;
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
