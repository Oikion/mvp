"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { OnboardingNotificationPreferences } from "@/types/onboarding";
import {
  CheckSquare,
  Calendar,
  Handshake,
  Users,
  FileText,
} from "lucide-react";

interface NotificationsWhatStepProps {
  dict: {
    title: string;
    description: string;
    question: string;
    options: Record<string, { title: string; description: string }>;
  };
  data: OnboardingNotificationPreferences;
  onDataChange: (data: OnboardingNotificationPreferences) => void;
}

const NOTIFICATION_OPTIONS = [
  {
    id: "tasks",
    key: "remindAboutTasks" as const,
    icon: CheckSquare,
    color: "bg-warning/10 text-warning",
  },
  {
    id: "calendar",
    key: "remindAboutCalendar" as const,
    icon: Calendar,
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    id: "deals",
    key: "remindAboutDeals" as const,
    icon: Handshake,
    color: "bg-success/10 text-success",
  },
  {
    id: "team",
    key: "notifyAboutTeamActivity" as const,
    icon: Users,
    color: "bg-primary/10 text-primary",
  },
  {
    id: "documents",
    key: "notifyAboutDocuments" as const,
    icon: FileText,
    color: "bg-warning/10 text-warning",
  },
];

export function NotificationsWhatStep({
  dict,
  data,
  onDataChange,
}: NotificationsWhatStepProps) {
  const handleToggle = (key: keyof OnboardingNotificationPreferences) => {
    onDataChange({ ...data, [key]: !data[key] });
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-2">{dict.title}</h2>
        <p className="text-muted-foreground">{dict.description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <Label className="text-lg font-semibold">{dict.question}</Label>

        <div className="grid gap-3 px-1">
          {NOTIFICATION_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isEnabled = data[option.key];
            const optionDict = dict.options[option.id];

            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
              >
                <Card
                  className={cn(
                    "p-4 cursor-pointer transition-all",
                    isEnabled
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleToggle(option.key)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl", option.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{optionDict.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {optionDict.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                        isEnabled
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {isEnabled && <CheckSquare className="w-4 h-4" />}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

