"use client";

import { useState, useCallback } from "react";
import { Users } from "@prisma/client";
import { motion, AnimatePresence } from "motion/react";
import { useOrganizationList } from "@clerk/nextjs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LanguageSelectionStep } from "./LanguageSelectionStep";
import { WelcomeStep } from "./WelcomeStep";
import { ThemeStep } from "./ThemeStep";
import { UsernameOrgStep } from "./UsernameOrgStep";
import { NotificationsWhatStep } from "./NotificationsWhatStep";
import { NotificationsHowStep } from "./NotificationsHowStep";
import { PrivacyStep } from "./PrivacyStep";
import { ReviewStep } from "./ReviewStep";
import { useToast } from "@/components/ui/use-toast";
import { completeOnboarding, validateOnboardingData } from "@/actions/user/complete-onboarding";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PRIVACY_PREFERENCES,
  convertPreferencesToSettings,
  generateOrgSlug,
} from "@/types/onboarding";
import type {
  OnboardingData,
  OnboardingNotificationPreferences,
  OnboardingPrivacyPreferences,
  SupportedLanguage,
  SupportedTheme,
  UsernameOrgStepData,
} from "@/types/onboarding";

// Dictionary type definitions for type safety
interface LanguageStepDict {
  title: string;
  description: string;
  proceed: string;
}

interface WelcomeStepDict {
  greeting: string;
  personalGreeting: string;
  tagline: string;
  description: string;
  getStarted: string;
}

interface LanguageThemeStepDict {
  themeTitle: string;
  themeDescription: string;
  themes: Record<string, string>;
  themeDescriptions: Record<string, string>;
}

interface UsernameOrgStepDict {
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  usernameTitle: string;
  usernameDescription: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  usernameHint: string;
  usernameAvailable: string;
  usernameTaken: string;
  usernameChecking: string;
  usernameInvalid: string;
  orgTitle: string;
  orgDescription: string;
  orgNameLabel: string;
  orgNamePlaceholder: string;
  orgSlugLabel: string;
  orgSlugPlaceholder: string;
  orgSlugHint: string;
}

interface NotificationOptionDict {
  title: string;
  description: string;
}

interface NotificationsStepDict {
  title: string;
  description: string;
  question: string;
  options: Record<string, NotificationOptionDict>;
  deliveryTitle: string;
  deliveryOptions: Record<string, NotificationOptionDict>;
}

interface ReviewStepDict {
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
}

interface CompleteStepDict {
  title: string;
  description: string;
  getStarted: string;
}

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

interface OnboardingStepsProps {
  user: Users | null;
  dict: {
    progress: string;
    navigation: {
      back: string;
      next: string;
      skip: string;
      finish: string;
    };
    steps: {
      language: LanguageStepDict;
      welcome: WelcomeStepDict;
      languageTheme: LanguageThemeStepDict;
      usernameOrg: UsernameOrgStepDict;
      notifications: NotificationsStepDict;
      privacy: PrivacyStepDict;
      review: ReviewStepDict;
      complete: CompleteStepDict;
    };
    errors: {
      generic: string;
      completionFailed: string;
      orgCreationFailed: string;
    };
  };
  locale: string;
}

// Steps: 0=Language, 1=Welcome, 2=Theme, 3=UsernameOrg, 4=NotificationsWhat, 5=NotificationsHow, 6=Privacy, 7=Review
const TOTAL_STEPS = 8;

// Animation variants for step transitions
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export function OnboardingSteps({ user, dict, locale }: OnboardingStepsProps) {
  const { toast } = useToast();
  const { createOrganization, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [usernameOrgValid, setUsernameOrgValid] = useState(false);

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    email: user?.email || "",
    name: user?.name || "",
    username: user?.username || "",
    language: (locale as SupportedLanguage) || "en",
    theme: "system" as SupportedTheme,
    organization: {
      name: "",
      slug: "",
    },
    notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    privacyPreferences: { ...DEFAULT_PRIVACY_PREFERENCES },
  });

  // Calculate progress (excluding language selection step from progress display)
  const progressSteps = TOTAL_STEPS - 1; // 5 steps after language
  const displayStep = currentStep > 0 ? currentStep - 1 : 0;
  const progress = currentStep <= 1 ? 0 : ((displayStep) / (progressSteps - 1)) * 100;

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) { // Can't go back to language selection
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle language selection - this step works differently
  const handleLanguageSelect = useCallback((language: SupportedLanguage) => {
    setOnboardingData((prev) => ({ ...prev, language }));
    // Move to welcome step
    setDirection(1);
    setCurrentStep(1);
  }, []);

  // Callbacks for step data changes
  const handleThemeChange = useCallback((theme: SupportedTheme) => {
    setOnboardingData((prev) => ({ ...prev, theme }));
  }, []);

  const handleUsernameOrgChange = useCallback((data: UsernameOrgStepData) => {
    setOnboardingData((prev) => ({
      ...prev,
      name: data.name,
      username: data.username,
      organization: {
        name: data.orgName,
        slug: data.orgSlug,
      },
    }));
  }, []);

  const handleUsernameOrgValidation = useCallback((isValid: boolean) => {
    setUsernameOrgValid(isValid);
  }, []);

  const handleNotificationsChange = useCallback(
    (prefs: OnboardingNotificationPreferences) => {
      setOnboardingData((prev) => ({
        ...prev,
        notificationPreferences: prefs,
      }));
    },
    []
  );

  const handlePrivacyChange = useCallback(
    (prefs: OnboardingPrivacyPreferences) => {
      setOnboardingData((prev) => ({
        ...prev,
        privacyPreferences: prefs,
      }));
    },
    []
  );

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // Check if Clerk hooks are available
      if (!createOrganization || !setActive) {
        toast({
          variant: "destructive",
          title: dict.errors.orgCreationFailed,
          description: dict.errors.generic,
        });
        setIsCompleting(false);
        return;
      }

      // 1. FIRST: Validate user data BEFORE creating organization
      // This prevents orphaned orgs when validation fails
      const validation = await validateOnboardingData({
        username: onboardingData.username,
        name: onboardingData.name,
        language: onboardingData.language,
      });

      if (!validation.success) {
        toast({
          variant: "destructive",
          title: dict.errors.completionFailed,
          description: validation.error || dict.errors.generic,
        });
        setIsCompleting(false);
        return;
      }

      // 2. THEN: Create or use existing organization (only after validation passes)
      // Check if user already has an organization (from a previous failed onboarding attempt)
      const existingOrgs = userMemberships?.data ?? [];
      let orgToUse: { id: string } | null = null;

      if (existingOrgs.length > 0) {
        // User already has an organization, use the first one
        orgToUse = { id: existingOrgs[0].organization.id };
      } else {
        // Create new organization
        const orgSlug = onboardingData.organization.slug || generateOrgSlug(onboardingData.organization.name);
        
        try {
          orgToUse = await createOrganization({
            name: onboardingData.organization.name,
            slug: orgSlug,
          });
        } catch (orgError: unknown) {
          // Check for slug conflict or other Clerk errors
          let errorMessage = dict.errors.generic;
          if (orgError instanceof Error) {
            const errorMsg = orgError.message.toLowerCase();
            if (errorMsg.includes("slug") || errorMsg.includes("already exists") || errorMsg.includes("taken")) {
              errorMessage = "This organization slug is already taken. Please choose a different one.";
            } else {
              errorMessage = orgError.message;
            }
          }
          
          toast({
            variant: "destructive",
            title: dict.errors.orgCreationFailed,
            description: errorMessage,
          });
          setIsCompleting(false);
          return;
        }
      }

      // 3. Set the organization as active
      // This is required for auth() to return the orgId
      if (orgToUse?.id) {
        try {
          await setActive({ organization: orgToUse.id });
        } catch {
          // Continue anyway - the org exists, user can select it manually
        }
      }

      // 4. Save user preferences (validation already passed in step 1)
      const notificationSettings = convertPreferencesToSettings(
        onboardingData.notificationPreferences
      );

      const result = await completeOnboarding({
        username: onboardingData.username,
        name: onboardingData.name,
        language: onboardingData.language,
        notificationSettings,
        privacyPreferences: onboardingData.privacyPreferences,
      });

      if (!result.success) {
        // This shouldn't happen since we validated first, but handle it anyway
        toast({
          variant: "destructive",
          title: dict.errors.completionFailed,
          description: result.error || dict.errors.generic,
        });
        setIsCompleting(false);
        return;
      }

      // 5. Redirect to dashboard
      toast({
        variant: "success",
        title: dict.steps.complete.title,
        description: "Redirecting to your dashboard...",
      });

      // Small delay for toast to show, then hard redirect to ensure fresh session
      // Using globalThis.location.href instead of router.push to force a full page reload
      // This ensures Clerk's session is fully updated with the new orgId
      setTimeout(() => {
        globalThis.location.href = `/${locale}`;
      }, 500);
    } catch {
      toast({
        variant: "destructive",
        title: dict.errors.completionFailed,
        description: dict.errors.generic,
      });
      setIsCompleting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Language - handled by click
        return false;
      case 1: // Welcome
        return true;
      case 2: // Theme
        return !!onboardingData.theme;
      case 3: // Username & Org
        return usernameOrgValid;
      case 4: // Notifications what
        return true; // Optional
      case 5: // Notifications how
        return true; // Optional
      case 6: // Privacy
        return true;
      case 7: // Review
        return true;
      default:
        return false;
    }
  };

  // Extract theme dictionary
  const themeDict = {
    title: dict.steps.languageTheme.themeTitle,
    description: dict.steps.languageTheme.themeDescription,
    themes: dict.steps.languageTheme.themes,
    themeDescriptions: dict.steps.languageTheme.themeDescriptions,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <LanguageSelectionStep
            key="language"
            currentLocale={locale}
            dict={dict.steps.language}
            onLanguageSelect={handleLanguageSelect}
          />
        );
      case 1:
        return (
          <WelcomeStep
            key="welcome"
            userName={onboardingData.name}
            dict={dict.steps.welcome}
            onContinue={handleNext}
          />
        );
      case 2:
        return (
          <ThemeStep
            key="theme"
            dict={themeDict}
            currentTheme={onboardingData.theme}
            onThemeChange={handleThemeChange}
          />
        );
      case 3:
        return (
          <UsernameOrgStep
            key="username-org"
            dict={dict.steps.usernameOrg}
            data={{
              name: onboardingData.name,
              username: onboardingData.username,
              orgName: onboardingData.organization.name,
              orgSlug: onboardingData.organization.slug,
            }}
            onDataChange={handleUsernameOrgChange}
            onValidationChange={handleUsernameOrgValidation}
            userHasName={Boolean(user?.name && user.name.trim().length >= 2)}
          />
        );
      case 4:
        return (
          <NotificationsWhatStep
            key="notifications-what"
            dict={dict.steps.notifications}
            data={onboardingData.notificationPreferences}
            onDataChange={handleNotificationsChange}
          />
        );
      case 5:
        return (
          <NotificationsHowStep
            key="notifications-how"
            dict={dict.steps.notifications}
            data={onboardingData.notificationPreferences}
            onDataChange={handleNotificationsChange}
          />
        );
      case 6:
        return (
          <PrivacyStep
            key="privacy"
            dict={dict.steps.privacy}
            data={onboardingData.privacyPreferences}
            onDataChange={handlePrivacyChange}
          />
        );
      case 7:
        return (
          <ReviewStep
            key="review"
            dict={dict.steps.review}
            completeDict={dict.steps.complete}
            data={onboardingData}
            onComplete={handleComplete}
            isCompleting={isCompleting}
          />
        );
      default:
        return null;
    }
  };

  // Show navigation for steps 2-7 (Theme, UsernameOrg, Notifications, Privacy, Review)
  const showNavigation = currentStep >= 2 && currentStep <= 7;

  return (
    <div className="flex flex-col gap-6 min-h-[720px]">
      {/* Progress Bar - shown after language and welcome steps */}
      {currentStep >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {dict.progress
                .replace("{current}", displayStep.toString())
                .replace("{total}", (progressSteps - 1).toString())}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </motion.div>
      )}

      {/* Step Content with Animation */}
      <div className="relative h-[620px] overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full h-full px-1 sm:px-2"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      {showNavigation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end gap-2 pt-4 border-t"
        >
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep <= 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {dict.navigation.back}
          </Button>
          {currentStep === TOTAL_STEPS - 1 ? (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || isCompleting}
              className="gap-2"
            >
              {isCompleting ? "Completing..." : dict.navigation.finish}
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              {dict.navigation.next}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
