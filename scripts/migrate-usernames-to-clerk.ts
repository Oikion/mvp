/**
 * Migration Script: Sync existing usernames from local database to Clerk
 * 
 * This script is used when migrating from custom username storage to Clerk's native username system.
 * 
 * Usage:
 *   npx tsx scripts/migrate-usernames-to-clerk.ts
 * 
 * What it does:
 * 1. Fetches all users with a local username but no Clerk username set
 * 2. Checks if the username is available in Clerk
 * 3. If available, updates the Clerk user with the local username
 * 4. If not available, logs the conflict for manual resolution
 * 
 * Prerequisites:
 * - CLERK_SECRET_KEY must be set in .env
 * - DATABASE_URL must be set in .env
 */

import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";

const prisma = new PrismaClient();
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

interface MigrationResult {
  userId: string;
  email: string;
  localUsername: string;
  status: "success" | "conflict" | "error" | "no_clerk_user";
  clerkUsername?: string;
  error?: string;
}

async function migrateUsernames(): Promise<void> {
  console.log("Starting username migration to Clerk...\n");
  
  const results: MigrationResult[] = [];
  
  // Get all users with a local username and a Clerk ID
  const usersToMigrate = await prisma.users.findMany({
    where: {
      username: { not: null },
      clerkUserId: { not: null },
    },
    select: {
      id: true,
      email: true,
      username: true,
      clerkUserId: true,
    },
  });
  
  console.log(`Found ${usersToMigrate.length} users to check\n`);
  
  for (const user of usersToMigrate) {
    if (!user.username || !user.clerkUserId) continue;
    
    console.log(`Processing: ${user.email} (local username: ${user.username})`);
    
    try {
      // Get the Clerk user
      const clerkUser = await clerk.users.getUser(user.clerkUserId);
      
      // Check if Clerk user already has a username
      if (clerkUser.username) {
        if (clerkUser.username.toLowerCase() === user.username.toLowerCase()) {
          console.log(`  ✓ Already synced: ${clerkUser.username}`);
          results.push({
            userId: user.id,
            email: user.email,
            localUsername: user.username,
            status: "success",
            clerkUsername: clerkUser.username,
          });
        } else {
          console.log(`  ⚠ Mismatch: Clerk has "${clerkUser.username}", local has "${user.username}"`);
          results.push({
            userId: user.id,
            email: user.email,
            localUsername: user.username,
            status: "conflict",
            clerkUsername: clerkUser.username,
            error: `Username mismatch: Clerk="${clerkUser.username}", local="${user.username}"`,
          });
        }
        continue;
      }
      
      // Check if the local username is available in Clerk
      const existingUsers = await clerk.users.getUserList({
        username: [user.username.toLowerCase()],
      });
      
      if (existingUsers.data.length > 0) {
        console.log(`  ✗ Username "${user.username}" is taken in Clerk by another user`);
        results.push({
          userId: user.id,
          email: user.email,
          localUsername: user.username,
          status: "conflict",
          error: `Username "${user.username}" is already taken in Clerk`,
        });
        continue;
      }
      
      // Update Clerk user with the local username
      await clerk.users.updateUser(user.clerkUserId, {
        username: user.username.toLowerCase(),
      });
      
      console.log(`  ✓ Migrated: ${user.username}`);
      results.push({
        userId: user.id,
        email: user.email,
        localUsername: user.username,
        status: "success",
        clerkUsername: user.username.toLowerCase(),
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Check if it's a "user not found" error
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        console.log(`  ✗ Clerk user not found for ${user.email}`);
        results.push({
          userId: user.id,
          email: user.email,
          localUsername: user.username,
          status: "no_clerk_user",
          error: "Clerk user not found",
        });
      } else {
        console.log(`  ✗ Error: ${errorMessage}`);
        results.push({
          userId: user.id,
          email: user.email,
          localUsername: user.username,
          status: "error",
          error: errorMessage,
        });
      }
    }
  }
  
  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(60) + "\n");
  
  const successCount = results.filter(r => r.status === "success").length;
  const conflictCount = results.filter(r => r.status === "conflict").length;
  const errorCount = results.filter(r => r.status === "error").length;
  const noClerkUserCount = results.filter(r => r.status === "no_clerk_user").length;
  
  console.log(`Total processed: ${results.length}`);
  console.log(`  ✓ Success: ${successCount}`);
  console.log(`  ⚠ Conflicts: ${conflictCount}`);
  console.log(`  ✗ Errors: ${errorCount}`);
  console.log(`  ? No Clerk user: ${noClerkUserCount}`);
  
  // Print conflicts that need manual resolution
  const conflicts = results.filter(r => r.status === "conflict");
  if (conflicts.length > 0) {
    console.log("\n" + "-".repeat(60));
    console.log("CONFLICTS REQUIRING MANUAL RESOLUTION:");
    console.log("-".repeat(60));
    for (const conflict of conflicts) {
      console.log(`\nUser: ${conflict.email}`);
      console.log(`  Local username: ${conflict.localUsername}`);
      console.log(`  Issue: ${conflict.error}`);
    }
  }
  
  // Print errors
  const errors = results.filter(r => r.status === "error");
  if (errors.length > 0) {
    console.log("\n" + "-".repeat(60));
    console.log("ERRORS:");
    console.log("-".repeat(60));
    for (const err of errors) {
      console.log(`\nUser: ${err.email}`);
      console.log(`  Error: ${err.error}`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("Migration complete!");
  console.log("=".repeat(60));
}

// Run migration
migrateUsernames()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });


