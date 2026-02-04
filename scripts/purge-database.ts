#!/usr/bin/env ts-node

/**
 * PURGE DATABASE SCRIPT
 * 
 * WARNING: This script permanently deletes ALL data from the database
 * and ALL organizations from Clerk. Use with extreme caution!
 * 
 * Usage:
 *   ts-node scripts/purge-database.ts
 * 
 * Environment variables required:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - CLERK_SECRET_KEY: Clerk secret key for API access
 * 
 * Safety: Requires explicit confirmation before proceeding
 */

const { PrismaClient } = require("@prisma/client");
const { createClerkClient } = require("@clerk/backend");
const readline = require("readline");

const prismadb = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function confirmPurge(): Promise<boolean> {
  console.log("\n⚠️  WARNING: This will permanently delete ALL data! ⚠️\n");
  console.log("This includes:");
  console.log("  - All users");
  console.log("  - All organizations (from Clerk)");
  console.log("  - All clients/accounts");
  console.log("  - All properties");
  console.log("  - All CRM tasks");
  console.log("  - All documents");
  console.log("  - All other related data\n");

  const answer1 = await question("Type 'DELETE ALL DATA' to confirm: ");
  if (answer1 !== "DELETE ALL DATA") {
    console.log("❌ Confirmation text does not match. Aborting.");
    return false;
  }

  const answer2 = await question("\nAre you absolutely sure? Type 'YES' to proceed: ");
  if (answer2 !== "YES") {
    console.log("❌ Confirmation failed. Aborting.");
    return false;
  }

  return true;
}

async function purgeDatabase() {
  // Safety check: Require explicit confirmation
  const confirmed = await confirmPurge();
  if (!confirmed) {
    rl.close();
    process.exit(0);
  }

  const results: any = {
    deleted: {},
    errors: [],
  };

  console.log("\n🗑️  Starting database purge...\n");

  try {
    // Delete in order to respect foreign key constraints

    // 1. Delete CRM account tasks
    try {
      const count = await prismadb.crm_Accounts_Tasks.deleteMany({});
      results.deleted.crm_Accounts_Tasks = count.count;
      console.log(`✓ Deleted ${count.count} CRM account tasks`);
    } catch (error: any) {
      results.errors.push({ model: "crm_Accounts_Tasks", error: error.message });
      console.error(`✗ Error deleting CRM account tasks: ${error.message}`);
    }

    // 2. Delete client-property relationships
    try {
      const count = await prismadb.client_Properties.deleteMany({});
      results.deleted.client_Properties = count.count;
      console.log(`✓ Deleted ${count.count} client-property relationships`);
    } catch (error: any) {
      results.errors.push({ model: "client_Properties", error: error.message });
      console.error(`✗ Error deleting client-property relationships: ${error.message}`);
    }

    // 7. Delete property contacts
    try {
      const count = await prismadb.property_Contacts.deleteMany({});
      results.deleted.property_Contacts = count.count;
      console.log(`✓ Deleted ${count.count} property contacts`);
    } catch (error: any) {
      results.errors.push({ model: "property_Contacts", error: error.message });
      console.error(`✗ Error deleting property contacts: ${error.message}`);
    }

    // 8. Delete properties
    try {
      const count = await prismadb.properties.deleteMany({});
      results.deleted.properties = count.count;
      console.log(`✓ Deleted ${count.count} properties`);
    } catch (error: any) {
      results.errors.push({ model: "properties", error: error.message });
      console.error(`✗ Error deleting properties: ${error.message}`);
    }

    // 9. Delete client contacts
    try {
      const count = await prismadb.client_Contacts.deleteMany({});
      results.deleted.client_Contacts = count.count;
      console.log(`✓ Deleted ${count.count} client contacts`);
    } catch (error: any) {
      results.errors.push({ model: "client_Contacts", error: error.message });
      console.error(`✗ Error deleting client contacts: ${error.message}`);
    }

    // 10. Delete clients (CRM accounts)
    try {
      const count = await prismadb.clients.deleteMany({});
      results.deleted.clients = count.count;
      console.log(`✓ Deleted ${count.count} clients`);
    } catch (error: any) {
      results.errors.push({ model: "clients", error: error.message });
      console.error(`✗ Error deleting clients: ${error.message}`);
    }

    // 11. Delete documents
    try {
      const count = await prismadb.documents.deleteMany({});
      results.deleted.documents = count.count;
      console.log(`✓ Deleted ${count.count} documents`);
    } catch (error: any) {
      results.errors.push({ model: "documents", error: error.message });
      console.error(`✗ Error deleting documents: ${error.message}`);
    }

    // 12. Delete document types
    try {
      const count = await prismadb.documents_Types.deleteMany({});
      results.deleted.documents_Types = count.count;
      console.log(`✓ Deleted ${count.count} document types`);
    } catch (error: any) {
      results.errors.push({ model: "documents_Types", error: error.message });
      console.error(`✗ Error deleting document types: ${error.message}`);
    }

    // 13. Delete todo lists
    try {
      const count = await prismadb.todoList.deleteMany({});
      results.deleted.todoList = count.count;
      console.log(`✓ Deleted ${count.count} todo lists`);
    } catch (error: any) {
      results.errors.push({ model: "todoList", error: error.message });
      console.error(`✗ Error deleting todo lists: ${error.message}`);
    }

    // 15. Delete users (should be last)
    try {
      const count = await prismadb.users.deleteMany({});
      results.deleted.users = count.count;
      console.log(`✓ Deleted ${count.count} users`);
    } catch (error: any) {
      results.errors.push({ model: "users", error: error.message });
      console.error(`✗ Error deleting users: ${error.message}`);
    }

    // 16. Delete organizations from Clerk
    console.log("\n🗑️  Purging Clerk organizations...\n");
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    try {
      let allOrgIds: string[] = [];
      let hasMore = true;
      let offset = 0;
      const limit = 100;

      while (hasMore) {
        try {
          const usersList = await clerk.users.getUserList({ limit, offset });

          for (const user of usersList.data) {
            try {
              const orgMemberships = await clerk.users.getOrganizationMembershipList({
                userId: user.id,
              });

              for (const membership of orgMemberships.data || []) {
                const orgId = membership.organization.id;
                if (!allOrgIds.includes(orgId)) {
                  allOrgIds.push(orgId);
                }
              }
            } catch (error: any) {
              // User might not have organizations or might be deleted
              // Silently continue
            }
          }

          hasMore = usersList.data.length === limit;
          offset += limit;
        } catch (error: any) {
          console.error(`✗ Error fetching users from Clerk: ${error.message}`);
          hasMore = false;
        }
      }

      // Delete all organizations
      let deletedOrgs = 0;
      for (const orgId of allOrgIds) {
        try {
          await clerk.organizations.deleteOrganization(orgId);
          deletedOrgs++;
          console.log(`✓ Deleted Clerk organization ${orgId}`);
        } catch (error: any) {
          if (error?.status !== 404) {
            results.errors.push({
              model: "clerk_organizations",
              organizationId: orgId,
              error: error.message,
            });
            console.error(`✗ Error deleting Clerk org ${orgId}: ${error.message}`);
          }
        }
      }
      results.deleted.clerk_organizations = deletedOrgs;
      console.log(`\n✓ Deleted ${deletedOrgs} Clerk organizations`);
    } catch (error: any) {
      results.errors.push({ model: "clerk_organizations", error: error.message });
      console.error(`✗ Error purging Clerk organizations: ${error.message}`);
    }

    const totalDeleted = Object.values(results.deleted).reduce(
      (sum: number, count: any) => sum + (count || 0),
      0
    );

    console.log("\n" + "=".repeat(50));
    console.log("✅ Database purge completed!");
    console.log(`📊 Total records deleted: ${totalDeleted}`);
    console.log(`📋 Tables processed: ${Object.keys(results.deleted).length}`);
    if (results.errors.length > 0) {
      console.log(`⚠️  Errors encountered: ${results.errors.length}`);
      console.log("\nErrors:");
      results.errors.forEach((err: any) => {
        console.log(`  - ${err.model}: ${err.error}`);
      });
    }
    console.log("=".repeat(50) + "\n");
  } catch (error: any) {
    console.error("\n❌ Fatal error during purge:", error);
    throw error;
  } finally {
    await prismadb.$disconnect();
    rl.close();
  }
}

// Run the purge
purgeDatabase()
  .then(() => {
    console.log("Script completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

