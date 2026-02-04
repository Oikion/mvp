/**
 * Script to verify calendar events cleanup for a specific user
 * Usage: npx tsx scripts/verify-user-calendar-cleanup.ts <username>
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load environment variables from .env and .env.local
config({ path: ".env" });
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function verifyUserCalendarCleanup(username: string) {
  try {
    console.log(`\n🔍 Verifying calendar cleanup for user: "${username}"...`);

    // Find the user by username
    const user = await prisma.users.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      console.error(`❌ User with username "${username}" not found.`);
      process.exit(1);
    }

    console.log(`✅ Found user:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Username: ${user.username}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.name}`);

    // Check for remaining calendar events
    const remainingEvents = await prisma.calendarEvent.findMany({
      where: {
        assignedUserId: user.id,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        eventType: true,
      },
    });

    console.log(`\n📅 Calendar Events Status:`);
    
    if (remainingEvents.length === 0) {
      console.log(`   ✅ No calendar events found - cleanup successful!`);
    } else {
      console.log(`   ⚠️  Found ${remainingEvents.length} remaining event(s):`);
      remainingEvents.forEach((event, index) => {
        console.log(`\n   ${index + 1}. Event ID: ${event.id}`);
        console.log(`      Title: ${event.title || "(No title)"}`);
        console.log(`      Type: ${event.eventType || "N/A"}`);
        console.log(`      Start: ${event.startTime.toISOString()}`);
        console.log(`      End: ${event.endTime.toISOString()}`);
      });
    }

    // Check for orphaned calendar reminders
    const orphanedReminders = await prisma.calendarReminder.findMany({
      where: {
        CalendarEvent: {
          assignedUserId: user.id,
        },
      },
      select: {
        id: true,
        eventId: true,
      },
    });

    console.log(`\n🔔 Calendar Reminders Status:`);
    if (orphanedReminders.length === 0) {
      console.log(`   ✅ No orphaned reminders found`);
    } else {
      console.log(`   ⚠️  Found ${orphanedReminders.length} orphaned reminder(s)`);
    }

    // Check for orphaned event invitees
    const orphanedInvitees = await prisma.eventInvitee.findMany({
      where: {
        CalendarEvent: {
          assignedUserId: user.id,
        },
      },
      select: {
        id: true,
        eventId: true,
      },
    });

    console.log(`\n👥 Event Invitees Status:`);
    if (orphanedInvitees.length === 0) {
      console.log(`   ✅ No orphaned invitees found`);
    } else {
      console.log(`   ⚠️  Found ${orphanedInvitees.length} orphaned invitee(s)`);
    }

    console.log(`\n${"=".repeat(60)}`);
    if (remainingEvents.length === 0 && orphanedReminders.length === 0 && orphanedInvitees.length === 0) {
      console.log(`✅ VERIFICATION PASSED: All calendar data cleaned up successfully!`);
    } else {
      console.log(`⚠️  VERIFICATION WARNING: Some data may need additional cleanup`);
    }
    console.log(`${"=".repeat(60)}\n`);

  } catch (error) {
    console.error("\n❌ Error verifying calendar cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error("❌ Usage: npx tsx scripts/verify-user-calendar-cleanup.ts <username>");
  console.error("   Example: npx tsx scripts/verify-user-calendar-cleanup.ts testopoulos");
  process.exit(1);
}

// Run the script
verifyUserCalendarCleanup(username)
  .then(() => {
    console.log("✨ Verification completed.\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });
