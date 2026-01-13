// Seed script for common changelog categories
// Run with: npx tsx scripts/seed-changelog-categories.ts

import * as dotenv from "dotenv";
// Load .env.local which contains DATABASE_URL
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  { name: "Feature", color: "purple", icon: "sparkles", sortOrder: 1 },
  { name: "Bug Fix", color: "red", icon: "bug", sortOrder: 2 },
  { name: "Improvement", color: "blue", icon: "zap", sortOrder: 3 },
  { name: "Security", color: "yellow", icon: "shield", sortOrder: 4 },
  { name: "Performance", color: "emerald", icon: "rocket", sortOrder: 5 },
  { name: "UI/UX", color: "pink", icon: "palette", sortOrder: 6 },
  { name: "API", color: "indigo", icon: "server", sortOrder: 7 },
  { name: "Documentation", color: "sky", icon: "layout", sortOrder: 8 },
  { name: "Maintenance", color: "gray", icon: "wrench", sortOrder: 9 },
  { name: "Breaking Change", color: "orange", icon: "bell", sortOrder: 10 },
];

async function main() {
  console.log("🌱 Seeding changelog categories...\n");

  for (const category of defaultCategories) {
    const existing = await prisma.changelogCustomCategory.findUnique({
      where: { name: category.name },
    });

    if (existing) {
      console.log(`  ⏭️  "${category.name}" already exists, skipping...`);
    } else {
      await prisma.changelogCustomCategory.create({
        data: category,
      });
      console.log(`  ✅ Created "${category.name}"`);
    }
  }

  console.log("\n✨ Done! Created default changelog categories.");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding categories:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
