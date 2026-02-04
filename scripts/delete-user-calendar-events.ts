/**
 * Script to delete all calendar events for a specific user
 * Usage: npx tsx scripts/delete-user-calendar-events.ts <username>
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load environment variables from .env and .env.local
config({ path: ".env" });
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function deleteUserCalendarEvents(username: string) {
  try {
    console.log(`\n🔍 Looking for user with username: "${username}"...`);

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

    // Find all calendar events assigned to this user
    const events = await prisma.calendarEvent.findMany({
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

    console.log(`\n📅 Found ${events.length} calendar event(s) for this user:`);
    
    if (events.length === 0) {
      console.log(`✅ No calendar events to delete.`);
      await prisma.$disconnect();
      return;
    }

    // Display events
    events.forEach((event, index) => {
      console.log(`\n   ${index + 1}. Event ID: ${event.id}`);
      console.log(`      Title: ${event.title || "(No title)"}`);
      console.log(`      Type: ${event.eventType || "N/A"}`);
      console.log(`      Start: ${event.startTime.toISOString()}`);
      console.log(`      End: ${event.endTime.toISOString()}`);
    });

    // Confirm deletion
    console.log(`\n⚠️  WARNING: This will permanently delete ${events.length} calendar event(s).`);
    console.log(`\n🗑️  Deleting calendar events...`);

    // Delete related records first (due to foreign key constraints)
    
    // 1. Delete CalendarReminder records
    const reminderDeleteResult = await prisma.calendarReminder.deleteMany({
      where: {
        eventId: {
          in: events.map((e) => e.id),
        },
      },
    });
    console.log(`   - Deleted ${reminderDeleteResult.count} calendar reminder(s)`);

    // 2. Delete EventInvitee records
    const inviteeDeleteResult = await prisma.eventInvitee.deleteMany({
      where: {
        eventId: {
          in: events.map((e) => e.id),
        },
      },
    });
    console.log(`   - Deleted ${inviteeDeleteResult.count} event invitee(s)`);

    // 3. Delete the calendar events
    const deleteResult = await prisma.calendarEvent.deleteMany({
      where: {
        assignedUserId: user.id,
      },
    });

    console.log(`\n✅ Successfully deleted ${deleteResult.count} calendar event(s) for user "${username}".`);

  } catch (error) {
    console.error("\n❌ Error deleting calendar events:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error("❌ Usage: npx tsx scripts/delete-user-calendar-events.ts <username>");
  console.error("   Example: npx tsx scripts/delete-user-calendar-events.ts testopoulos");
  process.exit(1);
}

// Run the script
deleteUserCalendarEvents(username)
  .then(() => {
    console.log("\n✨ Script completed successfully.\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
