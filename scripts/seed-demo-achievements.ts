/**
 * Seed Achievements for Demo User
 *
 * Awards several achievements to Demo Testopoulos to showcase the achievement system.
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-demo-achievements.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USER_ID = "usr-000001"; // Demo Testopoulos

async function seedDemoAchievements() {
  console.log("🏆 Seeding Achievements for Demo Testopoulos");
  console.log("================================================\n");

  // Check if user exists
  const user = await prisma.users.findUnique({
    where: { id: DEMO_USER_ID },
    select: { id: true, name: true, username: true },
  });

  if (!user) {
    console.error(`❌ User ${DEMO_USER_ID} not found`);
    return;
  }

  console.log(`✅ Found user: ${user.name} (@${user.username})\n`);

  // Get available achievements
  const achievements = await prisma.achievement.findMany({
    where: {
      category: "REFERRAL",
      isEnabled: true,
    },
    orderBy: { threshold: "asc" },
  });

  console.log(`📋 Found ${achievements.length} referral achievements\n`);

  // Award achievements up to REFERRAL_10 (to show progression)
  const achievementsToAward = achievements.filter((a) => a.threshold <= 10);

  let awarded = 0;
  let skipped = 0;

  for (const achievement of achievementsToAward) {
    // Check if user already has this achievement
    const existing = await prisma.userAchievement.findFirst({
      where: {
        userId: DEMO_USER_ID,
        achievementId: achievement.id,
      },
    });

    if (existing) {
      console.log(`⏭️  Skipping ${achievement.code} - already awarded`);
      skipped++;
      continue;
    }

    // Award the achievement
    await prisma.userAchievement.create({
      data: {
        userId: DEMO_USER_ID,
        achievementId: achievement.id,
        isHidden: false,
        earnedAt: new Date(),
      },
    });

    console.log(`✅ Awarded ${achievement.code} (threshold: ${achievement.threshold})`);
    awarded++;
  }

  console.log(`\n📊 Summary: ${awarded} awarded, ${skipped} skipped`);
  console.log("\n🎉 Demo achievements seeded successfully!");
  console.log("\n💡 Tip: View the profile at /el/agent/testopoulos to see achievements");
}

async function main() {
  console.log("=".repeat(50));
  console.log("Demo Achievements Seeding");
  console.log("=".repeat(50) + "\n");

  await seedDemoAchievements();
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
