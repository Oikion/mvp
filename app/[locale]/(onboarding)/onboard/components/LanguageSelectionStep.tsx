"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Globe, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportedLanguage } from "@/types/onboarding";

interface LanguageSelectionStepProps {
  currentLocale: string;
  dict: {
    title: string;
    description: string;
    proceed: string;
  };
  onLanguageSelect: (language: SupportedLanguage) => void;
}

// Greek first as default, then English
const LANGUAGES: { value: SupportedLanguage; flag: string; nativeName: string }[] = [
  { value: "el", flag: "🇬🇷", nativeName: "Ελληνικά" },
  { value: "en", flag: "🇬🇧", nativeName: "English" },
];

export function LanguageSelectionStep({
  currentLocale,
  dict,
  onLanguageSelect,
}: LanguageSelectionStepProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    currentLocale as SupportedLanguage
  );
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageClick = (language: SupportedLanguage) => {
    if (isChanging) return;

    // If clicking the current locale, just select it visually
    if (language === currentLocale) {
      setSelectedLanguage(language);
      return;
    }

    // If switching to a different locale, immediately navigate
    setIsChanging(true);
    const newUrl = `/${language}/onboard`;
    globalThis.location.href = newUrl;
  };

  const handleProceed = () => {
    if (isChanging) return;

    // Proceed within the current locale to the next onboarding step
    onLanguageSelect(selectedLanguage);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] text-center px-4">
      {/* Animated Globe Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Globe className="w-10 h-10 text-primary" />
        </div>
      </motion.div>

      {/* Title - localized */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
      >
        {dict.title}
      </motion.h1>

      {/* Description - localized */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-muted-foreground mb-10"
      >
        {dict.description}
      </motion.p>

      {/* Language Cards - Greek first */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md mb-8 px-2"
      >
        {LANGUAGES.map((lang, index) => {
          const isSelected = selectedLanguage === lang.value;

          return (
            <motion.div
              key={lang.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
            >
              <Card
                className={cn(
                  "p-6 cursor-pointer transition-all relative overflow-hidden",
                  isSelected
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-muted/50 hover:shadow-md",
                  isChanging && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleLanguageClick(lang.value)}
              >
                <div className="flex flex-col items-center gap-3">
                  <span className="text-5xl">{lang.flag}</span>
                  <p className="font-semibold text-lg">{lang.nativeName}</p>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Proceed Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <Button
          size="lg"
          onClick={handleProceed}
          disabled={isChanging}
          className="gap-2 text-lg px-8 py-6"
        >
          {isChanging ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              {dict.proceed}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </motion.div>

      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </motion.div>
    </div>
  );
}
