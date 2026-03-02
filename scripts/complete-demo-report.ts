#!/usr/bin/env npx tsx

/**
 * Complete Demo Data Report
 * Comprehensive overview of all data in the Demo Testopoulos account
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prismadb = new PrismaClient();
const ORG_ID = "org_389EdbYuC70wfohj24wfNDdA2Cw";

async function generateCompleteReport() {
  console.log("=" .repeat(70));
  console.log("COMPLETE DEMO DATA REPORT - Demo Testopoulos Account");
  console.log("=" .repeat(70));
  console.log(`Organization ID: ${ORG_ID}`);
  console.log(`Generated: ${new Date().toLocaleString()}`);
  console.log("=" .repeat(70));

  try {
    // Properties
    const properties = await prismadb.properties.count({ where: { organizationId: ORG_ID } });
    const propertiesByStatus = await prismadb.properties.groupBy({
      by: ["property_status"],
      where: { organizationId: ORG_ID },
      _count: true,
    });
    const propertiesByType = await prismadb.properties.groupBy({
      by: ["property_type"],
      where: { organizationId: ORG_ID },
      _count: true,
    });

    console.log("\n📦 PROPERTIES");
    console.log("-".repeat(70));
    console.log(`Total: ${properties}`);
    console.log("\nBy Status:");
    propertiesByStatus.forEach(s => console.log(`  ${s.property_status}: ${s._count}`));
    console.log("\nBy Type:");
    propertiesByType.slice(0, 5).forEach(t => console.log(`  ${t.property_type}: ${t._count}`));

    // Clients
    const clients = await prismadb.clients.count({ where: { organizationId: ORG_ID } });
    const clientsByType = await prismadb.clients.groupBy({
      by: ["client_type"],
      where: { organizationId: ORG_ID },
      _count: true,
    });

    console.log("\n\n👥 CLIENTS");
    console.log("-".repeat(70));
    console.log(`Total: ${clients}`);
    console.log("\nBy Type:");
    clientsByType.forEach(c => console.log(`  ${c.client_type || "Other"}: ${c._count}`));

    // Deals
    const deals = await prismadb.deal.count({ where: { organizationId: ORG_ID } });
    const dealsByStatus = await prismadb.deal.groupBy({
      by: ["status"],
      where: { organizationId: ORG_ID },
      _count: true,
    });
    const totalCommission = await prismadb.deal.aggregate({
      where: { organizationId: ORG_ID, status: "COMPLETED" },
      _sum: { totalCommission: true },
    });

    console.log("\n\n💰 DEALS");
    console.log("-".repeat(70));
    console.log(`Total: ${deals}`);
    console.log("\nBy Status:");
    dealsByStatus.forEach(d => console.log(`  ${d.status}: ${d._count}`));
    console.log(`\nTotal Commission (Completed): €${totalCommission._sum.totalCommission?.toLocaleString() || 0}`);

    // Documents
    const documents = await prismadb.documents.count({ where: { organizationId: ORG_ID } });
    const documentsByType = await prismadb.documents.groupBy({
      by: ["document_system_type"],
      where: { organizationId: ORG_ID },
      _count: true,
    });

    console.log("\n\n📄 DOCUMENTS");
    console.log("-".repeat(70));
    console.log(`Total: ${documents}`);
    console.log("\nBy Type:");
    documentsByType.forEach(d => console.log(`  ${d.document_system_type}: ${d._count}`));

    // Calendar Events
    const calendarEvents = await prismadb.calendarEvent.count({ where: { organizationId: ORG_ID } });
    const eventsByType = await prismadb.calendarEvent.groupBy({
      by: ["eventType"],
      where: { organizationId: ORG_ID },
      _count: true,
    });

    console.log("\n\n📅 CALENDAR EVENTS");
    console.log("-".repeat(70));
    console.log(`Total: ${calendarEvents}`);
    console.log("\nBy Type:");
    eventsByType.forEach(e => console.log(`  ${e.eventType || "Other"}: ${e._count}`));

    // Tasks
    const tasks = await prismadb.crm_Accounts_Tasks.count({ where: { organizationId: ORG_ID } });
    const tasksByPriority = await prismadb.crm_Accounts_Tasks.groupBy({
      by: ["priority"],
      where: { organizationId: ORG_ID },
      _count: true,
    });

    console.log("\n\n✅ TASKS");
    console.log("-".repeat(70));
    console.log(`Total: ${tasks}`);
    console.log("\nBy Priority:");
    tasksByPriority.forEach(t => console.log(`  ${t.priority}: ${t._count}`));

    // Social Posts
    const socialPosts = await prismadb.socialPost.count({ where: { organizationId: ORG_ID } });
    const postsByType = await prismadb.socialPost.groupBy({
      by: ["postType"],
      where: { organizationId: ORG_ID },
      _count: true,
    });

    console.log("\n\n📱 SOCIAL POSTS");
    console.log("-".repeat(70));
    console.log(`Total: ${socialPosts}`);
    console.log("\nBy Type:");
    postsByType.forEach(p => console.log(`  ${p.postType}: ${p._count}`));

    // Property Showings
    const showings = await prismadb.propertyShowing.count({ where: { organizationId: ORG_ID } });
    const showingsByResult = await prismadb.propertyShowing.groupBy({
      by: ["result"],
      where: { organizationId: ORG_ID },
      _count: true,
    });

    console.log("\n\n🏠 PROPERTY SHOWINGS");
    console.log("-".repeat(70));
    console.log(`Total: ${showings}`);
    console.log("\nBy Result:");
    showingsByResult.forEach(s => console.log(`  ${s.result}: ${s._count}`));

    // Marketing Spend
    const marketingSpend = await prismadb.marketingSpend.count({ where: { organizationId: ORG_ID } });
    const totalSpend = await prismadb.marketingSpend.aggregate({
      where: { organizationId: ORG_ID },
      _sum: { amount: true },
    });

    console.log("\n\n📊 MARKETING SPEND");
    console.log("-".repeat(70));
    console.log(`Total Records: ${marketingSpend}`);
    console.log(`Total Amount: €${totalSpend._sum.amount?.toLocaleString() || 0}`);

    // Agent Hours
    const agentHours = await prismadb.agentHours.count({ where: { organizationId: ORG_ID } });
    const totalHours = await prismadb.agentHours.aggregate({
      where: { organizationId: ORG_ID },
      _sum: { hoursWorked: true },
    });

    console.log("\n\n⏱️  AGENT HOURS");
    console.log("-".repeat(70));
    console.log(`Total Records: ${agentHours}`);
    console.log(`Total Hours: ${totalHours._sum.hoursWorked?.toFixed(1) || 0}`);

    // Market Data
    const marketData = await prismadb.marketData.count({ where: { organizationId: ORG_ID } });

    console.log("\n\n📈 MARKET DATA");
    console.log("-".repeat(70));
    console.log(`Total Records: ${marketData}`);

    // Export History
    const exportHistory = await prismadb.exportHistory.count({ where: { organizationId: ORG_ID } });

    console.log("\n\n📤 EXPORT HISTORY");
    console.log("-".repeat(70));
    console.log(`Total Records: ${exportHistory}`);

    // Client Comments
    const clientComments = await prismadb.clientComment.count({
      where: {
        Clients: { organizationId: ORG_ID }
      }
    });

    console.log("\n\n💬 CLIENT COMMENTS");
    console.log("-".repeat(70));
    console.log(`Total: ${clientComments}`);

    // Property Comments
    const propertyComments = await prismadb.propertyComment.count({
      where: {
        Properties: { organizationId: ORG_ID }
      }
    });

    console.log("\n\n💬 PROPERTY COMMENTS");
    console.log("-".repeat(70));
    console.log(`Total: ${propertyComments}`);

    // Notifications
    const notifications = await prismadb.notification.count({
      where: { userId: "usr-000002" }
    });
    const unreadNotifications = await prismadb.notification.count({
      where: { userId: "usr-000002", read: false }
    });

    console.log("\n\n🔔 NOTIFICATIONS");
    console.log("-".repeat(70));
    console.log(`Total: ${notifications}`);
    console.log(`Unread: ${unreadNotifications}`);
    console.log(`Read: ${notifications - unreadNotifications}`);

    // Summary
    console.log("\n\n" + "=".repeat(70));
    console.log("SUMMARY");
    console.log("=".repeat(70));
    console.log(`
Core Data:
  - Properties: ${properties}
  - Clients: ${clients}
  - Deals: ${deals}
  - Documents: ${documents}

Activity:
  - Calendar Events: ${calendarEvents}
  - Tasks: ${tasks}
  - Property Showings: ${showings}
  - Social Posts: ${socialPosts}

Engagement:
  - Client Comments: ${clientComments}
  - Property Comments: ${propertyComments}
  - Notifications: ${notifications}

Analytics:
  - Marketing Spend: ${marketingSpend} records (€${totalSpend._sum.amount?.toLocaleString() || 0})
  - Agent Hours: ${agentHours} records (${totalHours._sum.hoursWorked?.toFixed(1) || 0} hours)
  - Market Data: ${marketData} records
  - Export History: ${exportHistory} records

Financial:
  - Completed Deals: ${dealsByStatus.find(d => d.status === "COMPLETED")?._count || 0}
  - Total Commission: €${totalCommission._sum.totalCommission?.toLocaleString() || 0}
    `);

    console.log("=".repeat(70));
    console.log("✨ Demo account is fully populated and ready for showcase!");
    console.log("=".repeat(70));

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prismadb.$disconnect();
  }
}

generateCompleteReport();
