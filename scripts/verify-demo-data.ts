#!/usr/bin/env npx tsx

/**
 * Verify Demo Data for testopoulos account
 * Usage: npx tsx scripts/verify-demo-data.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prismadb = new PrismaClient();

async function verifyDemoData() {
  const orgId = "org_389EdbYuC70wfohj24wfNDdA2Cw"; // Demo Testopoulos org

  console.log("🔍 Verifying Demo Data for Demo Testopoulos");
  console.log("=".repeat(50));

  try {
    // Properties
    const properties = await prismadb.properties.count({
      where: { organizationId: orgId },
    });
    console.log(`✓ Properties: ${properties}`);

    const propertiesByStatus = await prismadb.properties.groupBy({
      by: ["property_status"],
      where: { organizationId: orgId },
      _count: true,
    });
    console.log("  Status breakdown:");
    propertiesByStatus.forEach(s => {
      console.log(`    - ${s.property_status}: ${s._count}`);
    });

    // Clients
    const clients = await prismadb.clients.count({
      where: { organizationId: orgId },
    });
    console.log(`\n✓ Clients: ${clients}`);

    const clientsByType = await prismadb.clients.groupBy({
      by: ["client_type"],
      where: { organizationId: orgId },
      _count: true,
    });
    console.log("  Type breakdown:");
    clientsByType.forEach(c => {
      console.log(`    - ${c.client_type}: ${c._count}`);
    });

    // Documents
    const documents = await prismadb.documents.count({
      where: { organizationId: orgId },
    });
    console.log(`\n✓ Documents: ${documents}`);

    const documentsByType = await prismadb.documents.groupBy({
      by: ["document_system_type"],
      where: { organizationId: orgId },
      _count: true,
    });
    console.log("  Type breakdown:");
    documentsByType.forEach(d => {
      console.log(`    - ${d.document_system_type}: ${d._count}`);
    });

    // Deals
    const deals = await prismadb.deal.count({
      where: { organizationId: orgId },
    });
    console.log(`\n✓ Deals: ${deals}`);

    const dealsByStatus = await prismadb.deal.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    });
    console.log("  Status breakdown:");
    dealsByStatus.forEach(d => {
      console.log(`    - ${d.status}: ${d._count}`);
    });

    const totalCommission = await prismadb.deal.aggregate({
      where: { 
        organizationId: orgId,
        status: "COMPLETED",
      },
      _sum: {
        totalCommission: true,
      },
    });
    console.log(`  Total commission (completed): €${totalCommission._sum.totalCommission?.toLocaleString() || 0}`);

    // Tasks
    const tasks = await prismadb.crm_Accounts_Tasks.count({
      where: { organizationId: orgId },
    });
    console.log(`\n✓ Tasks: ${tasks}`);

    // Social Posts
    const socialPosts = await prismadb.socialPost.count({
      where: { organizationId: orgId },
    });
    console.log(`\n✓ Social Posts: ${socialPosts}`);

    // Property Showings
    const showings = await prismadb.propertyShowing.count({
      where: { organizationId: orgId },
    });
    console.log(`\n✓ Property Showings: ${showings}`);

    const showingsByResult = await prismadb.propertyShowing.groupBy({
      by: ["result"],
      where: { organizationId: orgId },
      _count: true,
    });
    console.log("  Result breakdown:");
    showingsByResult.forEach(s => {
      console.log(`    - ${s.result}: ${s._count}`);
    });

    // Marketing Spend
    const marketingSpend = await prismadb.marketingSpend.count({
      where: { organizationId: orgId },
    });
    const totalSpend = await prismadb.marketingSpend.aggregate({
      where: { organizationId: orgId },
      _sum: {
        amount: true,
      },
    });
    console.log(`\n✓ Marketing Spend: ${marketingSpend} records`);
    console.log(`  Total spend: €${totalSpend._sum.amount?.toLocaleString() || 0}`);

    // Agent Hours
    const agentHours = await prismadb.agentHours.count({
      where: { organizationId: orgId },
    });
    const totalHours = await prismadb.agentHours.aggregate({
      where: { organizationId: orgId },
      _sum: {
        hoursWorked: true,
      },
    });
    console.log(`\n✓ Agent Hours: ${agentHours} records`);
    console.log(`  Total hours: ${totalHours._sum.hoursWorked?.toFixed(1) || 0}`);

    // Market Data
    const marketData = await prismadb.marketData.count({
      where: { organizationId: orgId },
    });
    console.log(`\n✓ Market Data: ${marketData} records`);

    // Export History
    const exportHistory = await prismadb.exportHistory.count({
      where: { organizationId: orgId },
    });
    console.log(`\n✓ Export History: ${exportHistory} records`);

    console.log("\n" + "=".repeat(50));
    console.log("✨ Demo data verification complete!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prismadb.$disconnect();
  }
}

verifyDemoData();
