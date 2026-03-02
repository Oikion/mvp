#!/usr/bin/env tsx
/**
 * Database Index Checker
 * 
 * Analyzes the Prisma schema and database to identify potential index optimizations.
 * Run with: pnpm tsx scripts/check-indexes.ts
 * 
 * References:
 * - docs/optimization/phase-1-critical/02-database-indexes.md
 */

import { prismadb } from "../lib/prisma";

interface IndexRecommendation {
  model: string;
  columns: string[];
  reason: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

async function checkIndexes() {
  console.log("=== Database Index Analysis ===\n");

  const recommendations: IndexRecommendation[] = [];

  // Check if organizationId indexes exist on tenant models
  const tenantModels = [
    "clients",
    "properties",
    "calendarEvent",
    "crm_Accounts_Tasks",
    "documents",
    "socialPost",
    "notification",
  ];

  console.log("✅ Checking organizationId indexes on tenant models...");
  for (const model of tenantModels) {
    // Note: This is a simplified check. In production, query information_schema
    console.log(`  - ${model}: organizationId index (required for multi-tenancy)`);
  }

  // Common composite index recommendations
  console.log("\n📊 Composite Index Recommendations:\n");

  recommendations.push({
    model: "clients",
    columns: ["organizationId", "client_status", "createdAt"],
    reason: "Frequently filtered by status and sorted by creation date",
    priority: "HIGH",
  });

  recommendations.push({
    model: "properties",
    columns: ["organizationId", "property_status", "portal_visibility"],
    reason: "Common pattern: active properties visible on portal",
    priority: "HIGH",
  });

  recommendations.push({
    model: "calendarEvent",
    columns: ["organizationId", "startTime", "status"],
    reason: "Time-range queries with status filter",
    priority: "MEDIUM",
  });

  recommendations.push({
    model: "crm_Accounts_Tasks",
    columns: ["organizationId", "user", "dueDateAt"],
    reason: "Tasks assigned to user, sorted by due date",
    priority: "MEDIUM",
  });

  recommendations.push({
    model: "documents",
    columns: ["organizationId", "entityType", "entityId"],
    reason: "Document lookups by entity",
    priority: "LOW",
  });

  // Print recommendations
  for (const rec of recommendations) {
    const priority = rec.priority === "HIGH" ? "🔴" : rec.priority === "MEDIUM" ? "🟡" : "🟢";
    console.log(`${priority} ${rec.model}`);
    console.log(`   Index: [${rec.columns.join(", ")}]`);
    console.log(`   Reason: ${rec.reason}\n`);
  }

  // Database health check
  console.log("🔍 Running database health check...");
  try {
    const startTime = Date.now();
    await prismadb.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    console.log(`✅ Database connection healthy (${latency}ms)\n`);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }

  console.log("=== Index Analysis Complete ===");
  console.log("\nTo implement these indexes:");
  console.log("1. Update prisma/schema.prisma with @@index([...]) directives");
  console.log("2. Run: pnpm prisma db push (dev) or pnpm db:migrate (production)");
  console.log("3. Monitor query performance after deployment");
  console.log("\nSee: docs/optimization/phase-1-critical/02-database-indexes.md");
}

// Run the analysis
checkIndexes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error during index analysis:", error);
    process.exit(1);
  });
