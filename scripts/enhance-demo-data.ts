#!/usr/bin/env npx tsx

/**
 * Enhance Demo Data with additional features
 * - Calendar events
 * - Property images
 * - Client interactions/notes
 * - Notifications
 * 
 * Usage: npx tsx scripts/enhance-demo-data.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { PrismaClient, CalendarEventType, type Prisma } from "@prisma/client";

const prismadb = new PrismaClient();

const ORG_ID = "org_389EdbYuC70wfohj24wfNDdA2Cw";
const USER_ID = "usr-000002"; // Demo Testopoulos

// Helper functions
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateHistoricalDate(monthsBack: number): Date {
  const now = new Date();
  const r = Math.random();
  let monthsAgo: number;
  if (r < 0.3) {
    monthsAgo = rand(0, 1); // Recent
  } else if (r < 0.7) {
    monthsAgo = rand(1, 6); // Mid-range
  } else {
    monthsAgo = rand(6, monthsBack); // Older
  }
  
  const date = new Date(now);
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(rand(1, 28));
  date.setHours(rand(8, 20), rand(0, 59), rand(0, 59));
  return date;
}

function generateFutureDate(daysAhead: number = 60): Date {
  const now = new Date();
  const days = rand(1, daysAhead);
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(rand(9, 18), [0, 15, 30, 45][rand(0, 3)], 0);
  return date;
}

// ============================================
// SEED CALENDAR EVENTS
// ============================================

async function seedCalendarEvents() {
  console.log("\n📅 Creating calendar events...");

  const properties = await prismadb.properties.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, property_name: true },
    take: 20,
  });

  const clients = await prismadb.clients.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, client_name: true },
    take: 15,
  });

  const eventTypes = [
    { type: "PROPERTY_VIEWING", title: "Property Showing: {property}", duration: 60 },
    { type: "CLIENT_CONSULTATION", title: "Client Meeting: {client}", duration: 90 },
    { type: "REMINDER", title: "Follow-up Call: {client}", duration: 30 },
    { type: "OTHER", title: "Property Valuation: {property}", duration: 45 },
    { type: "OTHER", title: "Document Signing: {client}", duration: 60 },
    { type: "MEETING", title: "Negotiation Meeting: {client}", duration: 120 },
  ];

  // Get the next available calendarEventId
  const lastEvent = await prismadb.calendarEvent.findFirst({
    orderBy: { calendarEventId: 'desc' },
    select: { calendarEventId: true },
  });
  
  let nextEventId = (lastEvent?.calendarEventId || 0) + 1;

  for (let i = 0; i < 30; i++) {
    const eventTemplate = pick(eventTypes);
    const startDate = i < 15 ? generateHistoricalDate(3) : generateFutureDate(45);
    const endDate = new Date(startDate.getTime() + eventTemplate.duration * 60000);

    let title = eventTemplate.title;
    const propertyIds: string[] = [];
    const clientIds: string[] = [];

    if (title.includes("{property}") && properties.length > 0) {
      const property = pick(properties);
      title = title.replace("{property}", property.property_name || "Property");
      propertyIds.push(property.id);
    }

    if (title.includes("{client}") && clients.length > 0) {
      const client = pick(clients);
      title = title.replace("{client}", client.client_name || "Client");
      clientIds.push(client.id);
    }

    await prismadb.calendarEvent.create({
      data: {
        id: crypto.randomUUID(),
        calendarEventId: nextEventId++,
        organizationId: ORG_ID,
        assignedUserId: USER_ID,
        title: title,
        description: `${eventTemplate.type === "PROPERTY_VIEWING" ? "Property showing appointment" : eventTemplate.type === "MEETING" ? "In-person meeting" : eventTemplate.type === "REMINDER" ? "Phone call scheduled" : "Scheduled appointment"}`,
        startTime: startDate,
        endTime: endDate,
        location: eventTemplate.type === "PROPERTY_VIEWING" ? "Property Location" : eventTemplate.type === "REMINDER" ? null : "Office",
        status: i < 15 ? "COMPLETED" : "SCHEDULED",
        eventType: eventTemplate.type as CalendarEventType,
        createdAt: new Date(startDate.getTime() - rand(1, 7) * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        Properties: propertyIds.length > 0 ? {
          connect: propertyIds.map(id => ({ id }))
        } : undefined,
        Clients: clientIds.length > 0 ? {
          connect: clientIds.map(id => ({ id }))
        } : undefined,
      },
    });
  }

  console.log(`✓ Created 30 calendar events`);
}

// ============================================
// SEED PROPERTY IMAGES METADATA
// ============================================

async function _seedPropertyImages() {
  console.log("\n🖼️  Adding property images metadata...");

  const properties = await prismadb.properties.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true },
  });

  let totalImages = 0;

  for (const property of properties) {
    const imageCount = rand(3, 12);
    const images: Record<string, unknown>[] = [];

    for (let i = 0; i < imageCount; i++) {
      images.push({
        id: crypto.randomUUID(),
        propertyId: property.id,
        url: `https://images.unsplash.com/photo-${rand(1500000000000, 1700000000000)}-${crypto.randomBytes(4).toString('hex')}?w=800&h=600&fit=crop`,
        order: i,
        caption: pick([
          "Living Room",
          "Kitchen",
          "Bedroom",
          "Bathroom",
          "Exterior View",
          "Balcony",
          "Dining Area",
          "Master Bedroom",
          "Garden",
          "Entrance",
          null,
        ]),
        isPrimary: i === 0,
        createdAt: generateHistoricalDate(6),
        updatedAt: new Date(),
      });
    }

    await prismadb.propertyImage.createMany({
      data: images,
      skipDuplicates: true,
    });

    totalImages += images.length;
  }

  console.log(`✓ Added ${totalImages} property images for ${properties.length} properties`);
}

// ============================================
// SEED CLIENT COMMENTS/NOTES
// ============================================

async function seedClientComments() {
  console.log("\n💬 Creating client comments/notes...");

  const clients = await prismadb.clients.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, client_name: true },
  });

  const commentTemplates = [
    "Initial contact made. Client is interested in {area} properties.",
    "Follow-up call completed. Budget confirmed at €{budget}.",
    "Sent property portfolio via email. Waiting for feedback.",
    "Client viewed property today. Very interested, considering offer.",
    "Discussed financing options. Client has pre-approval.",
    "Meeting scheduled for next week to discuss details.",
    "Client requested additional information about the neighborhood.",
    "Positive feedback on recent showing. Will schedule second viewing.",
    "Client is comparing multiple properties. Following up in 3 days.",
    "Contract negotiation in progress. Client counter-offered.",
    "Client confirmed interest. Moving forward with documentation.",
    "Excellent communication. Client is motivated buyer.",
    "Client needs more time to decide. Will check back next month.",
    "Referred client to mortgage broker. Awaiting pre-approval.",
    "Client visited property with family. Positive response.",
  ];

  const comments: Prisma.ClientCommentCreateManyInput[] = [];

  for (const client of clients) {
    const commentCount = rand(1, 5);
    
    for (let i = 0; i < commentCount; i++) {
      const template = pick(commentTemplates);
      const content = template
        .replace("{area}", pick(["Kolonaki", "Kifisia", "Glyfada", "Athens Center"]))
        .replace("{budget}", String(rand(100, 500)) + "k");

      comments.push({
        id: crypto.randomUUID(),
        clientId: client.id,
        userId: USER_ID,
        content: content,
        createdAt: generateHistoricalDate(6),
        updatedAt: new Date(),
      });
    }
  }

  await prismadb.clientComment.createMany({
    data: comments,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${comments.length} client comments`);
}

// ============================================
// SEED NOTIFICATIONS
// ============================================

async function seedNotifications() {
  console.log("\n🔔 Creating notifications...");

  const notificationTemplates = [
    { type: "ACCOUNT_TASK_CREATED", title: "New task assigned", message: "You have been assigned a new task" },
    { type: "ACCOUNT_TASK_UPDATED", title: "Task updated", message: "Task status has been updated" },
    { type: "CLIENT_CREATED", title: "New client added", message: "A new client has been added to your organization" },
    { type: "PROPERTY_UPDATED", title: "Property status changed", message: "Property status has been updated" },
    { type: "CALENDAR_REMINDER", title: "Upcoming appointment", message: "You have a showing scheduled tomorrow" },
    { type: "DOCUMENT_SHARED", title: "Document shared", message: "A new document has been shared with you" },
    { type: "SYSTEM", title: "System update", message: "New features available in the platform" },
  ];

  const notifications: Prisma.NotificationCreateManyInput[] = [];

  for (let i = 0; i < 25; i++) {
    const template = pick(notificationTemplates);
    const createdAt = generateHistoricalDate(2);

    notifications.push({
      id: crypto.randomUUID(),
      userId: USER_ID,
      type: template.type,
      title: template.title,
      message: template.message,
      read: i < 15, // Mark older ones as read
      createdAt: createdAt,
      updatedAt: createdAt,
    });
  }

  await prismadb.notification.createMany({
    data: notifications,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${notifications.length} notifications`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log("🚀 Enhancing Demo Data");
  console.log("========================\n");

  try {
    await seedCalendarEvents();
    // await seedPropertyImages(); // Skip - no PropertyImage model
    await seedClientComments();
    await seedNotifications();

    console.log("\n✨ Demo data enhancement complete!");
    console.log("\nSummary:");
    console.log("  - Calendar Events: 30");
    console.log("  - Client Comments: ~60-150");
    console.log("  - Notifications: 25");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prismadb.$disconnect();
  }
}

main();
