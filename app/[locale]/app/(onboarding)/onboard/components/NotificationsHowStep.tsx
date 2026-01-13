"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { OnboardingNotificationPreferences } from "@/types/onboarding";
import { Mail, Bell } from "lucide-react";

interface NotificationsHowStepProps {
  dict: {
    title: string;
    description: string;
    deliveryTitle: string;
    deliveryOptions: Record<string, { title: string; description: string }>;
  };
  data: OnboardingNotificationPreferences;
  onDataChange: (data: OnboardingNotificationPreferences) => void;
}

const DELIVERY_OPTIONS = [
  {
    id: "email",
    key: "preferEmail" as const,
    icon: Mail,
    color: "bg-rose-500/10 text-rose-600",
  },
  {
    id: "inApp",
    key: "preferInApp" as const,
    icon: Bell,
    color: "bg-indigo-500/10 text-indigo-600",
  },
];

export function NotificationsHowStep({
  dict,
  data,
  onDataChange,
}: NotificationsHowStepProps) {
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
        <p className="text-lg font-semibold">{dict.deliveryTitle}</p>

        <div className="grid grid-cols-2 gap-3 px-1">
          {DELIVERY_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isEnabled = data[option.key];
            const optionDict = dict.deliveryOptions[option.id];

            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
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
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className={cn("p-3 rounded-xl", option.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium">{optionDict.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {optionDict.description}
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(option.key)}
                      onClick={(e) => e.stopPropagation()}
                    />
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

