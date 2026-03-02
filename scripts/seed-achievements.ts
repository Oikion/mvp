/**
 * Seed Achievements
 *
 * This script seeds predefined achievements into the database.
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-achievements.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { ALL_PREDEFINED_ACHIEVEMENTS } from "../lib/achievements/definitions";

const prisma = new PrismaClient();

async function seedAchievements() {
  console.log("Seeding achievements...\n");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const achievement of ALL_PREDEFINED_ACHIEVEMENTS) {
    const existing = await prisma.achievement.findUnique({
      where: { code: achievement.code },
    });

    if (existing) {
      if (
        existing.nameKey !== achievement.nameKey ||
        existing.descriptionKey !== achievement.descriptionKey ||
        existing.icon !== achievement.icon ||
        existing.tier !== achievement.tier ||
        existing.threshold !== achievement.threshold
      ) {
        await prisma.achievement.update({
          where: { code: achievement.code },
          data: {
            nameKey: achievement.nameKey,
            descriptionKey: achievement.descriptionKey,
            icon: achievement.icon,
            tier: achievement.tier,
            threshold: achievement.threshold,
            category: achievement.category,
            scope: achievement.scope,
          },
        });
        console.log(`🔄 Updated "${achievement.code}"`);
        updated++;
      } else {
        console.log(`⏭️  Skipping "${achievement.code}" - unchanged`);
        skipped++;
      }
      continue;
    }

    await prisma.achievement.create({
      data: {
        code: achievement.code,
        category: achievement.category,
        scope: achievement.scope,
        organizationId: achievement.organizationId || null,
        nameKey: achievement.nameKey,
        descriptionKey: achievement.descriptionKey,
        icon: achievement.icon,
        tier: achievement.tier,
        threshold: achievement.threshold,
        isEnabled: achievement.isEnabled,
        isPredefined: achievement.isPredefined,
      },
    });

    console.log(`✅ Created "${achievement.code}" (${achievement.category})`);
    created++;
  }

  console.log(`\n📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
}

async function main() {
  console.log("=".repeat(50));
  console.log("Achievement Seeding Script");
  console.log("=".repeat(50) + "\n");

  await seedAchievements();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ Error:", error.message || error);
    await prisma.$disconnect();
    process.exit(1);
  });
