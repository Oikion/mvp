"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { OnboardingPrivacyPreferences, ProfileVisibility } from "@/types/onboarding";
import {
  Lock,
  Shield,
  Globe,
  BarChart3,
} from "lucide-react";

interface PrivacyStepDict {
  title: string;
  description: string;
  profileVisibility: {
    title: string;
    description: string;
    options: {
      personal: { title: string; description: string };
      secure: { title: string; description: string };
      public: { title: string; description: string };
    };
  };
  analytics: {
    title: string;
    description: string;
    label: string;
  };
}

interface PrivacyStepProps {
  dict: PrivacyStepDict;
  data: OnboardingPrivacyPreferences;
  onDataChange: (data: OnboardingPrivacyPreferences) => void;
}

const VISIBILITY_OPTIONS: Array<{
  value: ProfileVisibility;
  key: "personal" | "secure" | "public";
  icon: typeof Lock;
  color: string;
  bgColor: string;
}> = [
  {
    value: "PERSONAL",
    key: "personal",
    icon: Lock,
    color: "text-gray-600",
    bgColor: "bg-gray-500/10",
  },
  {
    value: "SECURE",
    key: "secure",
    icon: Shield,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  {
    value: "PUBLIC",
    key: "public",
    icon: Globe,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
  },
];

export function PrivacyStep({ dict, data, onDataChange }: PrivacyStepProps) {
  const handleVisibilityChange = (visibility: ProfileVisibility) => {
    onDataChange({ ...data, profileVisibility: visibility });
  };

  const handleAnalyticsToggle = () => {
    onDataChange({ ...data, analyticsConsent: !data.analyticsConsent });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-2">{dict.title}</h2>
        <p className="text-muted-foreground">{dict.description}</p>
      </motion.div>

      {/* Profile Visibility */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-3"
      >
        <Label className="text-base font-semibold">{dict.profileVisibility.title}</Label>
        <p className="text-sm text-muted-foreground">{dict.profileVisibility.description}</p>

        <div className="grid gap-2 px-1">
          {VISIBILITY_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isSelected = data.profileVisibility === option.value;
            const optionDict = dict.profileVisibility.options[option.key];

            return (
              <motion.div
                key={option.value}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
              >
                <Card
                  className={cn(
                    "p-3 cursor-pointer transition-all",
                    isSelected
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleVisibilityChange(option.value)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", option.bgColor)}>
                      <Icon className={cn("w-4 h-4", option.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{optionDict.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {optionDict.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Analytics Consent - Optional */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{dict.analytics.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {dict.analytics.description}
                  </p>
                </div>
                <Switch
                  checked={data.analyticsConsent}
                  onCheckedChange={handleAnalyticsToggle}
                />
              </div>
              <Label className="text-sm cursor-pointer" onClick={handleAnalyticsToggle}>
                {dict.analytics.label}
              </Label>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}






