"use client";

import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SupportedTheme } from "@/types/onboarding";

interface ThemeStepProps {
  dict: {
    title: string;
    description: string;
    themes: Record<string, string>;
    themeDescriptions: Record<string, string>;
  };
  currentTheme: SupportedTheme;
  onThemeChange: (theme: SupportedTheme) => void;
}

// Each theme has a preview background color (explicit hex where requested)
const THEMES: {
  value: SupportedTheme;
  previewClass?: string;
  previewColor?: string;
}[] = [
  {
    value: "light",
    previewColor: "#FDFDFD",
  },
  {
    value: "dark",
    previewColor: "#0B0B0C",
  },
  {
    value: "pearl-sand",
    previewColor: "#F0EFEB",
  },
  {
    value: "twilight-lavender",
    previewColor: "#9862E2",
  },
  {
    value: "system",
    previewClass: "bg-gradient-to-r from-white to-slate-900 border-gray-300",
  },
];

export function ThemeStep({
  dict,
  currentTheme,
  onThemeChange,
}: ThemeStepProps) {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (theme: SupportedTheme) => {
    onThemeChange(theme);
    setTheme(theme);
  };

  if (!mounted) {
    return null;
  }

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

      {/* Theme Selection Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch px-1 pb-4"
      >
        {THEMES.map((theme, index) => {
          const isSelected = currentTheme === theme.value;

          return (
            <motion.div
              key={theme.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              className="h-full"
            >
              <Card
                className={cn(
                  "flex h-full flex-col justify-between p-4 cursor-pointer transition-all relative overflow-hidden",
                  isSelected
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-muted/50 hover:shadow-md"
                )}
                onClick={() => handleThemeChange(theme.value)}
              >
                {/* Theme Preview */}
                <div
                  className={cn(
                    "h-20 rounded-lg mb-4 border-2 transition-all",
                    theme.previewClass
                  )}
                  style={
                    theme.previewColor
                      ? { backgroundColor: theme.previewColor, borderColor: "#d1d5db" }
                      : undefined
                  }
                />

                {/* Text content - no icons, no swatches */}
                <div className="space-y-1">
                  <p className="font-medium leading-tight">
                    {dict.themes[theme.value]}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {dict.themeDescriptions[theme.value]}
                  </p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
