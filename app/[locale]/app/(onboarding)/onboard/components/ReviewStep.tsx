"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Building2,
  Palette,
  Bell,
  Check,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import type {
  OnboardingData,
  OnboardingNotificationPreferences,
  SupportedLanguage,
  SupportedTheme,
} from "@/types/onboarding";

interface ReviewStepProps {
  dict: {
    title: string;
    description: string;
    sections: Record<string, string>;
    fields: Record<string, string>;
    values: {
      enabledItems: string;
      emailAndInApp: string;
      emailOnly: string;
      inAppOnly: string;
      none: string;
    };
  };
  completeDict: {
    getStarted: string;
  };
  data: OnboardingData;
  onComplete: () => void;
  isCompleting: boolean;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  el: "Ελληνικά",
  cz: "Čeština",
  de: "Deutsch",
  uk: "Українська",
};

const THEME_LABELS: Record<SupportedTheme, string> = {
  light: "Light",
  dark: "Dark",
  "pearl-sand": "Pearl Sand",
  "twilight-lavender": "Twilight Lavender",
  system: "System",
};

function countEnabledNotifications(prefs: OnboardingNotificationPreferences): number {
  let count = 0;
  if (prefs.remindAboutTasks) count++;
  if (prefs.remindAboutCalendar) count++;
  if (prefs.remindAboutDeals) count++;
  if (prefs.notifyAboutTeamActivity) count++;
  if (prefs.notifyAboutDocuments) count++;
  return count;
}

function getDeliveryMethod(
  prefs: OnboardingNotificationPreferences,
  values: ReviewStepProps["dict"]["values"]
): string {
  if (prefs.preferEmail && prefs.preferInApp) return values.emailAndInApp;
  if (prefs.preferEmail) return values.emailOnly;
  if (prefs.preferInApp) return values.inAppOnly;
  return values.none;
}

export function ReviewStep({
  dict,
  completeDict,
  data,
  onComplete,
  isCompleting,
}: ReviewStepProps) {
  const enabledCount = countEnabledNotifications(data.notificationPreferences);
  const deliveryMethod = getDeliveryMethod(data.notificationPreferences, dict.values);

  // Construct full name from firstName and lastName
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  const sections = [
    {
      id: "profile",
      icon: User,
      color: "bg-indigo-600/20 text-indigo-100",
      items: [
        { label: dict.fields.name, value: fullName },
        { label: dict.fields.email, value: data.email },
        { label: dict.fields.username, value: `@${data.username}` },
      ],
    },
    {
      id: "organization",
      icon: Building2,
      color: "bg-success/20 text-emerald-100",
      items: [
        { label: dict.fields.orgName, value: data.organization.name },
      ],
    },
    {
      id: "preferences",
      icon: Palette,
      color: "bg-purple-600/20 text-purple-100",
      items: [
        { label: dict.fields.language, value: LANGUAGE_LABELS[data.language] },
        { label: dict.fields.theme, value: THEME_LABELS[data.theme] },
      ],
    },
    {
      id: "notifications",
      icon: Bell,
      color: "bg-warning/25 text-amber-50",
      items: [
        {
          label: dict.fields.reminders,
          value: dict.values.enabledItems.replace("{count}", enabledCount.toString()),
        },
        { label: dict.fields.delivery, value: deliveryMethod },
      ],
    },
  ];

  return (
    <div className="space-y-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4"
        >
          <Sparkles className="w-8 h-8 text-success" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{dict.title}</h2>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-2 px-1 overflow-y-auto pr-2">
        {sections.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + sectionIndex * 0.1 }}
            >
              <Card className="p-4 md:p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg ${section.color}`}>
                    <Icon className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold">
                      {dict.sections[section.id]}
                    </h3>
                    <div className="grid gap-1">
                      {section.items.map((item) => (
                        <div
                          key={`${section.id}-${item.label}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-emerald-300 mt-2" aria-hidden />
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}

