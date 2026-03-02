#!/usr/bin/env npx tsx

/**
 * Final touches for demo data
 * - Property comments
 * - Deal notes/updates
 * - Property contacts
 * 
 * Usage: npx tsx scripts/final-demo-touches.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { PrismaClient, type Prisma } from "@prisma/client";

const prismadb = new PrismaClient();

const ORG_ID = "org_389EdbYuC70wfohj24wfNDdA2Cw";
const USER_ID = "usr-000002";

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
    monthsAgo = rand(0, 1);
  } else if (r < 0.7) {
    monthsAgo = rand(1, 6);
  } else {
    monthsAgo = rand(6, monthsBack);
  }
  
  const date = new Date(now);
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(rand(1, 28));
  date.setHours(rand(8, 20), rand(0, 59), rand(0, 59));
  return date;
}

// ============================================
// SEED PROPERTY COMMENTS
// ============================================

async function seedPropertyComments() {
  console.log("\n💬 Creating property comments...");

  const properties = await prismadb.properties.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, property_name: true },
    take: 25,
  });

  const commentTemplates = [
    "Great location with high demand in the area.",
    "Property needs minor renovations but has excellent potential.",
    "Owner is motivated to sell. Good negotiation opportunity.",
    "Scheduled for professional photography next week.",
    "Received positive feedback from recent showing.",
    "Price adjusted based on market analysis.",
    "Added to featured listings on website.",
    "Multiple inquiries received this week.",
    "Property has excellent natural lighting.",
    "Close to schools and public transportation.",
    "Recently renovated kitchen and bathrooms.",
    "Owner prefers quick sale, flexible on terms.",
    "High interest from investors.",
    "Comparable properties in area sold quickly.",
    "Excellent investment opportunity.",
  ];

  const comments: Prisma.PropertyCommentCreateManyInput[] = [];

  for (const property of properties) {
    const commentCount = rand(1, 4);
    
    for (let i = 0; i < commentCount; i++) {
      comments.push({
        id: crypto.randomUUID(),
        propertyId: property.id,
        userId: USER_ID,
        content: pick(commentTemplates),
        createdAt: generateHistoricalDate(6),
        updatedAt: new Date(),
      });
    }
  }

  await prismadb.propertyComment.createMany({
    data: comments,
    skipDuplicates: true,
  });

  console.log(`✓ Created ${comments.length} property comments`);
}

// ============================================
// UPDATE DEAL NOTES
// ============================================

async function updateDealNotes() {
  console.log("\n📝 Updating deal notes...");

  const deals = await prismadb.deal.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, status: true },
  });

  const notesByStatus: Record<string, string[]> = {
    PROPOSED: [
      "Initial offer submitted. Waiting for seller response.",
      "Client very interested. Prepared competitive offer.",
      "Offer includes contingencies for inspection and financing.",
    ],
    NEGOTIATING: [
      "Counter-offer received. Discussing with client.",
      "Price negotiation ongoing. Client willing to increase offer.",
      "Working on closing date that works for both parties.",
      "Seller requested higher earnest money deposit.",
    ],
    ACCEPTED: [
      "Offer accepted! Moving to contract phase.",
      "All parties agreed on terms. Preparing paperwork.",
      "Inspection scheduled for next week.",
    ],
    IN_PROGRESS: [
      "Inspection completed. Minor repairs requested.",
      "Financing approved. Waiting for final documents.",
      "Title search in progress. No issues found so far.",
      "Coordinating with lawyer for contract finalization.",
    ],
    COMPLETED: [
      "Deal successfully closed! Commission received.",
      "Keys handed over. Client very satisfied.",
      "Smooth transaction from start to finish.",
      "Excellent collaboration with all parties involved.",
    ],
    CANCELLED: [
      "Deal fell through due to financing issues.",
      "Client decided to pursue different property.",
    ],
  };

  let updated = 0;

  for (const deal of deals) {
    const notes = notesByStatus[deal.status] || ["Deal in progress."];
    const note = pick(notes);

    await prismadb.deal.update({
      where: { id: deal.id },
      data: { notes: note },
    });

    updated++;
  }

  console.log(`✓ Updated ${updated} deal notes`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log("🚀 Final Demo Data Touches");
  console.log("========================\n");

  try {
    await seedPropertyComments();
    await updateDealNotes();

    console.log("\n✨ Final touches complete!");
    console.log("\nSummary:");
    console.log("  - Property Comments: ~25-100");
    console.log("  - Deal Notes: Updated all 20 deals");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prismadb.$disconnect();
  }
}

main();
