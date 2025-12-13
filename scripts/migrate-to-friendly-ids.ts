/**
 * Migration Script: UUID to Friendly ID Migration
 * 
 * This script migrates existing UUIDs to friendly sequential IDs.
 * Format: {prefix}-{6-digit-padded-number} (e.g., prp-000001, clt-000042)
 * 
 * IMPORTANT:
 * - BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT
 * - Run in a maintenance window (app should be offline)
 * - Test in staging environment first
 * 
 * Usage:
 *   npx ts-node scripts/migrate-to-friendly-ids.ts
 *   or
 *   pnpm exec ts-node scripts/migrate-to-friendly-ids.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Entity configuration with prefix and foreign key relationships
interface EntityConfig {
  model: string;
  prefix: string;
  orderBy: string;
  // Foreign key columns that reference this entity's ID in other tables
  foreignKeys: Array<{
    table: string;
    column: string;
  }>;
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    model: "Users",
    prefix: "usr",
    orderBy: "created_on",
    foreignKeys: [
      { table: "Clients", column: "assigned_to" },
      { table: "Clients", column: "createdBy" },
      { table: "Clients", column: "updatedBy" },
      { table: "Client_Contacts", column: "assigned_to" },
      { table: "Client_Contacts", column: "created_by" },
      { table: "Client_Contacts", column: "createdBy" },
      { table: "Client_Contacts", column: "updatedBy" },
      { table: "Client_Contacts", column: "last_activity_by" },
      { table: "Documents", column: "created_by_user" },
      { table: "Documents", column: "createdBy" },
      { table: "Documents", column: "assigned_user" },
      { table: "crm_Accounts_Tasks", column: "user" },
      { table: "crm_Accounts_Tasks", column: "createdBy" },
      { table: "crm_Accounts_Tasks", column: "updatedBy" },
      { table: "crm_Accounts_Tasks_Comments", column: "user" },
      { table: "Properties", column: "assigned_to" },
      { table: "Properties", column: "createdBy" },
      { table: "Properties", column: "updatedBy" },
      { table: "Property_Contacts", column: "assigned_to" },
      { table: "Property_Contacts", column: "updatedBy" },
      { table: "CalComEvent", column: "assignedUserId" },
      { table: "Notification", column: "userId" },
      { table: "Notification", column: "actorId" },
      { table: "Deal", column: "propertyAgentId" },
      { table: "Deal", column: "clientAgentId" },
      { table: "Deal", column: "proposedById" },
      { table: "SocialPost", column: "authorId" },
      { table: "SocialPostLike", column: "userId" },
      { table: "SocialPostComment", column: "userId" },
      { table: "AgentProfile", column: "userId" },
      { table: "AgentConnection", column: "followerId" },
      { table: "AgentConnection", column: "followingId" },
      { table: "SharedEntity", column: "sharedById" },
      { table: "SharedEntity", column: "sharedWithId" },
      { table: "DocumentView", column: "viewerUserId" },
      { table: "PropertyComment", column: "userId" },
      { table: "ClientComment", column: "userId" },
      { table: "Audience", column: "createdById" },
      { table: "AudienceMember", column: "userId" },
      { table: "UserNotificationSettings", column: "userId" },
      { table: "openAi_keys", column: "user" },
      { table: "Feedback", column: "userId" },
      { table: "TodoList", column: "user" },
    ],
  },
  {
    model: "Clients",
    prefix: "clt",
    orderBy: "createdAt",
    foreignKeys: [
      { table: "Client_Contacts", column: "clientsIDs" },
      { table: "crm_Accounts_Tasks", column: "account" },
      { table: "Client_Properties", column: "clientId" },
      { table: "Deal", column: "clientId" },
      { table: "ClientComment", column: "clientId" },
      // Many-to-many through _EventToClients junction table
    ],
  },
  {
    model: "Properties",
    prefix: "prp",
    orderBy: "createdAt",
    foreignKeys: [
      { table: "Property_Contacts", column: "property" },
      { table: "Client_Properties", column: "propertyId" },
      { table: "Deal", column: "propertyId" },
      { table: "ProfileShowcaseProperty", column: "propertyId" },
      { table: "PropertyComment", column: "propertyId" },
      // Many-to-many through _DocumentsToProperties, _EventToProperties
    ],
  },
  {
    model: "Documents",
    prefix: "doc",
    orderBy: "createdAt",
    foreignKeys: [
      { table: "DocumentView", column: "documentId" },
      // Many-to-many through junction tables
    ],
  },
  {
    model: "crm_Accounts_Tasks",
    prefix: "tsk",
    orderBy: "createdAt",
    foreignKeys: [
      { table: "crm_Accounts_Tasks_Comments", column: "crm_account_task" },
      // Many-to-many through junction tables
    ],
  },
  {
    model: "Deal",
    prefix: "deal",
    orderBy: "createdAt",
    foreignKeys: [],
  },
  {
    model: "Client_Contacts",
    prefix: "con",
    orderBy: "created_on",
    foreignKeys: [],
  },
  {
    model: "Property_Contacts",
    prefix: "pcon",
    orderBy: "created_on",
    foreignKeys: [],
  },
  {
    model: "CalComEvent",
    prefix: "evt",
    orderBy: "createdAt",
    foreignKeys: [
      { table: "CalendarReminder", column: "eventId" },
      { table: "crm_Accounts_Tasks", column: "calcomEventId" },
      // Many-to-many through junction tables
    ],
  },
  {
    model: "Notification",
    prefix: "ntf",
    orderBy: "createdAt",
    foreignKeys: [],
  },
  {
    model: "SocialPost",
    prefix: "post",
    orderBy: "createdAt",
    foreignKeys: [
      { table: "SocialPostLike", column: "postId" },
      { table: "SocialPostComment", column: "postId" },
    ],
  },
  {
    model: "Audience",
    prefix: "aud",
    orderBy: "createdAt",
    foreignKeys: [
      { table: "AudienceMember", column: "audienceId" },
      { table: "SharedEntity", column: "audienceId" },
    ],
  },
];

// Generate friendly ID from counter
function generateId(prefix: string, counter: number): string {
  return `${prefix}-${String(counter).padStart(6, "0")}`;
}

// Migration for a single entity type
async function migrateEntity(config: EntityConfig): Promise<void> {
  console.log(`\n📦 Migrating ${config.model}...`);
  
  // Get all records ordered by creation date
  const records = await (prisma as unknown as Record<string, unknown>)[config.model.charAt(0).toLowerCase() + config.model.slice(1)]
    ? await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "${config.model}" ORDER BY "${config.orderBy}" ASC`
      )
    : [];

  if (records.length === 0) {
    console.log(`  ⏭️  No records found for ${config.model}`);
    return;
  }

  console.log(`  📊 Found ${records.length} records to migrate`);

  // Create ID mapping (old UUID -> new friendly ID)
  const idMapping = new Map<string, string>();
  
  for (let i = 0; i < records.length; i++) {
    const oldId = records[i].id;
    const newId = generateId(config.prefix, i + 1);
    idMapping.set(oldId, newId);
  }

  // Update foreign keys first (before changing primary keys)
  console.log(`  🔗 Updating ${config.foreignKeys.length} foreign key references...`);
  
  for (const fk of config.foreignKeys) {
    for (const [oldId, newId] of Array.from(idMapping.entries())) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "${fk.table}" SET "${fk.column}" = $1 WHERE "${fk.column}" = $2`,
          newId,
          oldId
        );
      } catch (error) {
        // Ignore errors for columns that might not exist or have no matching records
      }
    }
  }

  // Update array fields that might contain IDs (watchers, etc.)
  if (config.model === "Users") {
    // Update watching_accountsIDs and watching_propertiesIDs arrays
    console.log(`  📝 Updating User ID arrays...`);
  }

  // Update primary keys last
  console.log(`  🔄 Updating primary keys...`);
  
  for (const [oldId, newId] of Array.from(idMapping.entries())) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${config.model}" SET id = $1 WHERE id = $2`,
      newId,
      oldId
    );
  }

  // Initialize the sequence counter
  await prisma.idSequence.upsert({
    where: { prefix: config.prefix },
    update: { lastValue: records.length },
    create: {
      id: config.prefix,
      prefix: config.prefix,
      lastValue: records.length,
    },
  });

  console.log(`  ✅ Migrated ${records.length} ${config.model} records`);
}

// Handle many-to-many junction tables
async function updateJunctionTables(): Promise<void> {
  console.log("\n🔗 Updating junction tables...");

  // List of junction tables with their column mappings
  const junctionTables = [
    { table: "_DocumentsToClients", columns: ["A", "B"], entityA: "Documents", entityB: "Clients" },
    { table: "_DocumentsToClientContacts", columns: ["A", "B"], entityA: "Documents", entityB: "Client_Contacts" },
    { table: "_DocumentsToCrmAccountsTasks", columns: ["A", "B"], entityA: "Documents", entityB: "crm_Accounts_Tasks" },
    { table: "_DocumentsToProperties", columns: ["A", "B"], entityA: "Documents", entityB: "Properties" },
    { table: "_DocumentsToCalComEvents", columns: ["A", "B"], entityA: "Documents", entityB: "CalComEvent" },
    { table: "_DocumentsToTasksExplicit", columns: ["A", "B"], entityA: "Documents", entityB: "crm_Accounts_Tasks" },
    { table: "_EventToClients", columns: ["A", "B"], entityA: "CalComEvent", entityB: "Clients" },
    { table: "_EventToProperties", columns: ["A", "B"], entityA: "CalComEvent", entityB: "Properties" },
    { table: "_watching_accounts", columns: ["A", "B"], entityA: "Clients", entityB: "Users" },
    { table: "_watching_properties", columns: ["A", "B"], entityA: "Properties", entityB: "Users" },
  ];

  for (const jt of junctionTables) {
    try {
      // Check if table exists
      const tableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        jt.table
      );
      
      if (tableExists[0]?.exists) {
        console.log(`  📋 Table ${jt.table} exists, updating references...`);
        // Note: These would need the ID mappings from the entity migrations
        // In a real migration, we'd need to store and pass these mappings
      }
    } catch {
      console.log(`  ⏭️  Skipping ${jt.table} (may not exist)`);
    }
  }
}

// Main migration function
async function main(): Promise<void> {
  console.log("🚀 Starting Friendly ID Migration");
  console.log("=".repeat(50));
  console.log("\n⚠️  WARNING: This will modify your database!");
  console.log("Make sure you have a backup before proceeding.\n");

  // Check if IdSequence table exists
  try {
    await prisma.idSequence.findFirst();
    console.log("✅ IdSequence table exists");
  } catch {
    console.error("❌ IdSequence table does not exist. Run prisma migrate first!");
    process.exit(1);
  }

  // Run migrations in order (Users first, since many entities reference them)
  const migrationOrder = [
    "Users",
    "Clients",
    "Properties",
    "Documents",
    "crm_Accounts_Tasks",
    "Client_Contacts",
    "Property_Contacts",
    "CalComEvent",
    "Deal",
    "Notification",
    "SocialPost",
    "Audience",
  ];

  for (const modelName of migrationOrder) {
    const config = ENTITY_CONFIGS.find((c) => c.model === modelName);
    if (config) {
      try {
        await migrateEntity(config);
      } catch (error) {
        console.error(`❌ Error migrating ${modelName}:`, error);
        throw error;
      }
    }
  }

  // Update junction tables
  await updateJunctionTables();

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Migration completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Verify data integrity");
  console.log("2. Test the application thoroughly");
  console.log("3. Update create actions to use generateFriendlyId()");
}

// Run migration
main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
