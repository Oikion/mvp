"use client";

import { useState, useCallback, useEffect } from "react";
import { Users } from "@prisma/client";
import { motion, AnimatePresence } from "motion/react";
import { useOrganizationList, useUser } from "@clerk/nextjs";
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
import { useAppToast } from "@/hooks/use-app-toast";
import { completeOnboarding, validateOnboardingData } from "@/actions/user/complete-onboarding";
import { updateOrganizationMetadata } from "@/actions/organization/update-org-metadata";
import {
  getStoredReferralCode,
  clearStoredReferralCode,
} from "@/app/[locale]/app/(auth)/register/components/ReferralCodeCapture";
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
  firstNameLabel: string;
  firstNamePlaceholder: string;
  lastNameLabel: string;
  lastNamePlaceholder: string;
  usernameTitle: string;
  usernameDescription: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  usernameHint: string;
  usernameAvailable: string;
  usernameTaken: string;
  usernameChecking: string;
  usernameInvalid: string;
  usernameDisplay?: string;
  usernameNote?: string;
  usernameSetup?: string;
  usernameSetupDescription?: string;
  usernameRequired?: string;
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
  redirecting: string;
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
      completing: string;
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
      usernameTaken: string;
      profileUpdateFailed: string;
      orgSlugTaken: string;
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
  const { toast } = useAppToast();
  const { user: clerkUser } = useUser();
  const { createOrganization, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [usernameOrgValid, setUsernameOrgValid] = useState(false);

  // Track initial username to detect if user needs to set one during onboarding
  // Start with database username, but update to Clerk username once available (source of truth)
  const [initialUsername, setInitialUsername] = useState(user?.username || "");

  // Get firstName/lastName from user, falling back to splitting name
  const getInitialFirstName = (): string => {
    if (user && "firstName" in user && typeof user.firstName === "string" && user.firstName) {
      return user.firstName;
    }
    if (user?.name) return user.name.split(" ")[0] || "";
    return "";
  };
  
  const getInitialLastName = (): string => {
    if (user && "lastName" in user && typeof user.lastName === "string" && user.lastName) {
      return user.lastName;
    }
    if (user?.name) {
      const parts = user.name.split(" ");
      return parts.slice(1).join(" ") || "";
    }
    return "";
  };

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    email: user?.email || "",
    firstName: getInitialFirstName(),
    lastName: getInitialLastName(),
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

  // Pre-populate form data from Clerk user when available (for Google SSO users)
  // This ensures the form shows their Google-provided names that they can then edit
  useEffect(() => {
    if (clerkUser) {
      setOnboardingData((prev) => ({
        ...prev,
        email: clerkUser.primaryEmailAddress?.emailAddress || prev.email,
        firstName: prev.firstName || clerkUser.firstName || "",
        lastName: prev.lastName || clerkUser.lastName || "",
        username: prev.username || clerkUser.username || "",
      }));
      
      // Update initial username with Clerk's value (source of truth)
      // This handles the case where Clerk has a username but our webhook hasn't synced it to DB yet
      if (clerkUser.username && !initialUsername) {
        setInitialUsername(clerkUser.username);
      }
    }
  }, [clerkUser, initialUsername]);

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
      firstName: data.firstName,
      lastName: data.lastName,
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6745c257-993b-4bd4-bf13-5c5734e70e2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnboardingSteps.tsx:handleComplete:start',message:'Onboarding completion started',data:{currentStep,locale,hasClerkUser:!!clerkUser,usernameOrgValid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
      // Check if Clerk hooks are available
      if (!createOrganization || !setActive) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6745c257-993b-4bd4-bf13-5c5734e70e2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnboardingSteps.tsx:handleComplete:noClerkHooks',message:'Clerk hooks not available',data:{hasCreateOrg:!!createOrganization,hasSetActive:!!setActive},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        toast.error(dict.errors.orgCreationFailed, { description: dict.errors.generic, isTranslationKey: false });
        setIsCompleting(false);
        return;
      }

      // 1. FIRST: Validate user data BEFORE creating organization
      // This prevents orphaned orgs when validation fails
      const validation = await validateOnboardingData({
        username: onboardingData.username,
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        language: onboardingData.language,
      });

      if (!validation.success) {
        toast.error(dict.errors.completionFailed, { description: validation.error, isTranslationKey: false });
        setIsCompleting(false);
        return;
      }

      // 2. Update Clerk with user profile data (firstName, lastName, username if needed)
      // Use Clerk's client SDK directly - this is more reliable than going through our API
      // since the DB user might not exist yet (race condition with webhook)
      const usernameNeedsSetup = !initialUsername;
      
      if (clerkUser) {
        try {
          // Build update payload for Clerk
          const clerkUpdateData: {
            firstName?: string;
            lastName?: string;
            username?: string;
          } = {
            firstName: onboardingData.firstName.trim(),
            lastName: onboardingData.lastName.trim(),
          };
          
          // Only include username if it needs to be set (user didn't have one from registration)
          if (usernameNeedsSetup && onboardingData.username) {
            clerkUpdateData.username = onboardingData.username.toLowerCase();
          }
          
          // Update directly via Clerk's client SDK
          await clerkUser.update(clerkUpdateData);
        } catch (clerkError) {
          // Check for username taken error
          const error = clerkError as { errors?: Array<{ message?: string; code?: string }> };
          const firstError = error?.errors?.[0];
          
          if (firstError?.code === "form_identifier_exists" || 
              firstError?.message?.toLowerCase().includes("taken")) {
            toast.error(dict.errors.completionFailed, { description: dict.errors.usernameTaken, isTranslationKey: false });
          } else {
            toast.error(dict.errors.completionFailed, { description: dict.errors.profileUpdateFailed, isTranslationKey: false });
          }
          setIsCompleting(false);
          return;
        }
      }

      // 3. Create both Personal Workspace and Agency Organization
      const existingOrgs = userMemberships?.data ?? [];
      
      // Check if user already has organizations
      const hasPersonalOrg = existingOrgs.some(
        (membership) =>
          (membership.organization.publicMetadata as Record<string, unknown>)
            ?.type === "personal"
      );
      const hasAgencyOrg = existingOrgs.some(
        (membership) =>
          (membership.organization.publicMetadata as Record<string, unknown>)
            ?.type === "agency"
      );

      let personalOrgId: string | null = null;
      let agencyOrgId: string | null = null;

      // Create Personal Workspace if it doesn't exist
      if (!hasPersonalOrg) {
        try {
          const personalOrgName = `${onboardingData.username || clerkUser?.username || "User"}'s Workspace`;
          const personalOrgSlug = `${onboardingData.username || clerkUser?.username || "user"}-personal`;
          
          const personalOrg = await createOrganization({
            name: personalOrgName,
            slug: personalOrgSlug,
          });

          if (personalOrg?.id) {
            personalOrgId = personalOrg.id;
            // Set metadata to mark as personal workspace
            const metadataResult = await updateOrganizationMetadata(personalOrgId, {
              type: "personal",
            });
            if (metadataResult.error) {
              console.error("Failed to set personal org metadata:", metadataResult.error);
            }
          }
        } catch (personalOrgError: unknown) {
          console.error("Error creating personal workspace:", personalOrgError);
          // Continue - we'll try to create it later if needed
        }
      } else {
        // Find existing personal org
        const personalOrg = existingOrgs.find(
          (membership) =>
            (membership.organization.publicMetadata as Record<string, unknown>)
              ?.type === "personal"
        );
        personalOrgId = personalOrg?.organization.id ?? null;
      }

      // Create Agency Organization if it doesn't exist
      if (!hasAgencyOrg) {
        const orgSlug = onboardingData.organization.slug || generateOrgSlug(onboardingData.organization.name);
        
        try {
          const nameCheckResponse = await fetch(
            `/api/organization/check-name?name=${encodeURIComponent(onboardingData.organization.name)}`
          );
          if (nameCheckResponse.ok) {
            const nameCheck = await nameCheckResponse.json();
            if (!nameCheck.available) {
              const errorMessage =
                nameCheck.error === "RESERVED"
                  ? dict.errors.orgNameReserved
                  : dict.errors.generic;
              toast.error(dict.errors.orgCreationFailed, {
                description: errorMessage,
                isTranslationKey: false,
              });
              setIsCompleting(false);
              return;
            }
          }

          const agencyOrg = await createOrganization({
            name: onboardingData.organization.name,
            slug: orgSlug,
          });

          if (agencyOrg?.id) {
            agencyOrgId = agencyOrg.id;
            // Set metadata to mark as agency organization
            const metadataResult = await updateOrganizationMetadata(agencyOrgId, {
              type: "agency",
            });
            if (metadataResult.error) {
              console.error("Failed to set agency org metadata:", metadataResult.error);
            }
          }
        } catch (orgError: unknown) {
          // Check for slug conflict or other Clerk errors
          let errorMessage = dict.errors.generic;
          if (orgError instanceof Error) {
            const errorMsg = orgError.message.toLowerCase();
            if (errorMsg.includes("slug") || errorMsg.includes("already exists") || errorMsg.includes("taken")) {
              errorMessage = dict.errors.orgSlugTaken;
            } else {
              errorMessage = orgError.message;
            }
          }
          
          toast.error(dict.errors.orgCreationFailed, { description: errorMessage, isTranslationKey: false });
          setIsCompleting(false);
          return;
        }
      } else {
        // Find existing agency org
        const agencyOrg = existingOrgs.find(
          (membership) =>
            (membership.organization.publicMetadata as Record<string, unknown>)
              ?.type === "agency"
        );
        agencyOrgId = agencyOrg?.organization.id ?? null;
      }

      // 4. Set the Agency organization as active (default workspace)
      // This is required for auth() to return the orgId
      if (agencyOrgId && setActive) {
        try {
          await setActive({ organization: agencyOrgId });
        } catch {
          // Continue anyway - the org exists, user can select it manually
        }
      }

      // 5. Save user preferences (include username for DB update)
      const notificationSettings = convertPreferencesToSettings(
        onboardingData.notificationPreferences
      );

      // Get referral code from localStorage if present
      const referralCode = getStoredReferralCode();

      // Pass all data including username to completeOnboarding
      const result = await completeOnboarding({
        username: usernameNeedsSetup ? onboardingData.username : undefined,
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        language: onboardingData.language,
        notificationSettings,
        privacyPreferences: onboardingData.privacyPreferences,
        referralCode: referralCode || undefined,
      });

      // Clear the referral code from localStorage after processing
      if (referralCode) {
        clearStoredReferralCode();
      }

      if (!result.success) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6745c257-993b-4bd4-bf13-5c5734e70e2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnboardingSteps.tsx:handleComplete:resultFailed',message:'completeOnboarding returned failure',data:{error:result.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        // This shouldn't happen since we validated first, but handle it anyway
        const description =
          result.error === "USERNAME_RESERVED"
            ? dict.errors.usernameReserved
            : result.error;
        toast.error(dict.errors.completionFailed, { description, isTranslationKey: false });
        setIsCompleting(false);
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6745c257-993b-4bd4-bf13-5c5734e70e2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnboardingSteps.tsx:handleComplete:success',message:'Onboarding completed successfully, redirecting',data:{redirectTo:`/${locale}/app`,personalOrgId,agencyOrgId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // 6. Redirect to dashboard
      toast.success(dict.steps.complete.title, { description: dict.steps.complete.redirecting, isTranslationKey: false });

      // Small delay for toast to show, then hard redirect to ensure fresh session
      // Using globalThis.location.href instead of router.push to force a full page reload
      // This ensures Clerk's session is fully updated with the new orgId
      setTimeout(() => {
        globalThis.location.href = `/${locale}/app`;
      }, 500);
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6745c257-993b-4bd4-bf13-5c5734e70e2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnboardingSteps.tsx:handleComplete:catch',message:'Unexpected error in onboarding completion',data:{error:String(err)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      toast.error(dict.errors.completionFailed, { description: dict.errors.generic, isTranslationKey: false });
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
            userName={onboardingData.firstName || onboardingData.lastName 
              ? `${onboardingData.firstName} ${onboardingData.lastName}`.trim() 
              : ""}
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
              firstName: onboardingData.firstName,
              lastName: onboardingData.lastName,
              username: onboardingData.username,
              orgName: onboardingData.organization.name,
              orgSlug: onboardingData.organization.slug,
            }}
            onDataChange={handleUsernameOrgChange}
            onValidationChange={handleUsernameOrgValidation}
            userHasName={false}  // Always show name fields so users can edit/confirm their names
            initialUsername={initialUsername}
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
              {isCompleting ? dict.navigation.completing : dict.navigation.finish}
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
