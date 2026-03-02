import type { AchievementCategory, AchievementScope } from "@prisma/client";

export interface AchievementDefinition {
  code: string;
  category: AchievementCategory;
  scope: AchievementScope;
  organizationId?: string | null;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  tier: number;
  threshold: number;
  isEnabled: boolean;
  isPredefined: boolean;
}

export const REFERRAL_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    code: "REFERRAL_1",
    category: "REFERRAL",
    scope: "GLOBAL",
    nameKey: "achievements.referral_1.name",
    descriptionKey: "achievements.referral_1.description",
    icon: "UserPlus",
    tier: 1,
    threshold: 1,
    isEnabled: true,
    isPredefined: true,
  },
  {
    code: "REFERRAL_3",
    category: "REFERRAL",
    scope: "GLOBAL",
    nameKey: "achievements.referral_3.name",
    descriptionKey: "achievements.referral_3.description",
    icon: "Users",
    tier: 1,
    threshold: 3,
    isEnabled: true,
    isPredefined: true,
  },
  {
    code: "REFERRAL_5",
    category: "REFERRAL",
    scope: "GLOBAL",
    nameKey: "achievements.referral_5.name",
    descriptionKey: "achievements.referral_5.description",
    icon: "Award",
    tier: 2,
    threshold: 5,
    isEnabled: true,
    isPredefined: true,
  },
  {
    code: "REFERRAL_10",
    category: "REFERRAL",
    scope: "GLOBAL",
    nameKey: "achievements.referral_10.name",
    descriptionKey: "achievements.referral_10.description",
    icon: "Trophy",
    tier: 2,
    threshold: 10,
    isEnabled: true,
    isPredefined: true,
  },
  {
    code: "REFERRAL_25",
    category: "REFERRAL",
    scope: "GLOBAL",
    nameKey: "achievements.referral_25.name",
    descriptionKey: "achievements.referral_25.description",
    icon: "Crown",
    tier: 3,
    threshold: 25,
    isEnabled: true,
    isPredefined: true,
  },
  {
    code: "REFERRAL_50",
    category: "REFERRAL",
    scope: "GLOBAL",
    nameKey: "achievements.referral_50.name",
    descriptionKey: "achievements.referral_50.description",
    icon: "Star",
    tier: 3,
    threshold: 50,
    isEnabled: true,
    isPredefined: true,
  },
  {
    code: "REFERRAL_100",
    category: "REFERRAL",
    scope: "GLOBAL",
    nameKey: "achievements.referral_100.name",
    descriptionKey: "achievements.referral_100.description",
    icon: "Sparkles",
    tier: 4,
    threshold: 100,
    isEnabled: true,
    isPredefined: true,
  },
];

export const ALL_PREDEFINED_ACHIEVEMENTS: AchievementDefinition[] = [
  ...REFERRAL_ACHIEVEMENTS,
];
