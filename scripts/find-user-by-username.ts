#!/usr/bin/env npx tsx

/**
 * Find Clerk User ID by username
 * Usage: npx tsx scripts/find-user-by-username.ts testopoulos
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local first, then .env
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { createClerkClient } from "@clerk/backend";

async function findUserByUsername(username: string) {
  // Try both CLERK_SECRET_KEY and CLERK_API_KEY (older naming)
  const clerkKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY;
  
  if (!clerkKey) {
    console.error("❌ Error: CLERK_SECRET_KEY or CLERK_API_KEY environment variable is not set");
    process.exit(1);
  }

  const clerk = createClerkClient({
    secretKey: clerkKey,
  });

  try {
    console.log(`🔍 Searching for user with username: ${username}`);
    
    // Search for users by username
    const users = await clerk.users.getUserList({
      username: [username],
      limit: 10,
    });

    if (users.data.length === 0) {
      console.log(`❌ No user found with username: ${username}`);
      console.log("\nTrying to list all users...");
      
      // Try to list all users to see what's available
      const allUsers = await clerk.users.getUserList({ limit: 100 });
      console.log(`\nFound ${allUsers.data.length} total users:`);
      allUsers.data.forEach(user => {
        console.log(`  - ${user.username || user.emailAddresses[0]?.emailAddress || "No identifier"} (${user.id})`);
      });
      process.exit(1);
    }

    console.log(`\n✅ Found ${users.data.length} user(s):\n`);
    
    for (const user of users.data) {
      console.log(`User ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.emailAddresses[0]?.emailAddress || "N/A"}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Created: ${user.createdAt}`);
      console.log(`---`);
    }

    // Return the first user's ID
    return users.data[0].id;
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("❌ Error: Username argument is required");
    console.error("Usage: npx tsx scripts/find-user-by-username.ts <username>");
    process.exit(1);
  }

  const username = args[0];
  const userId = await findUserByUsername(username);
  
  console.log(`\n📋 To seed demo data for this user, run:`);
  console.log(`npx tsx scripts/seed-demo-data.ts --clerk-user-id ${userId}`);
}

main();
