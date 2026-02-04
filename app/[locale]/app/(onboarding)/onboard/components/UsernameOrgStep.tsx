"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User, Building2, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { generateOrgSlug } from "@/types/onboarding";
import { checkUsernameAvailability } from "@/actions/user/check-username";
import type { UsernameOrgStepData } from "@/types/onboarding";

interface SlugAvailabilityResult {
  available: boolean;
  error?: string;
}

interface UsernameOrgStepProps {
  dict: {
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
    orgTitle: string;
    orgDescription: string;
    orgNameLabel: string;
    orgNamePlaceholder: string;
    orgSlugLabel: string;
    orgSlugPlaceholder: string;
    orgSlugHint: string;
  };
  data: UsernameOrgStepData;
  onDataChange: (data: UsernameOrgStepData) => void;
  onValidationChange: (isValid: boolean) => void;
  /** If true, the name fields are hidden because they were already collected during registration */
  userHasName?: boolean;
  /** The initial username from Clerk (to detect if user needs to set one) */
  initialUsername?: string;
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function UsernameOrgStep({
  dict,
  data,
  onDataChange,
  onValidationChange,
  userHasName = false,
  initialUsername = "",
}: UsernameOrgStepProps) {
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debouncedSlug = useDebounce(data.orgSlug, 500);
  const debouncedUsername = useDebounce(data.username, 500);
  
  // Track if username was originally empty (needs to be set)
  // This is reactive now to handle Clerk user loading after component mount
  const usernameNeedsSetup = useMemo(() => !initialUsername, [initialUsername]);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      // Skip check if username was already set from Clerk and hasn't changed
      if (!usernameNeedsSetup && debouncedUsername === initialUsername) {
        setUsernameStatus("available");
        return;
      }

      if (!debouncedUsername || debouncedUsername.length < 2) {
        setUsernameStatus("idle");
        return;
      }

      // Validate format: alphanumeric and underscores only
      const usernameRegex = /^\w+$/;
      if (!usernameRegex.test(debouncedUsername)) {
        setUsernameStatus("invalid");
        return;
      }

      if (debouncedUsername.length > 50) {
        setUsernameStatus("invalid");
        return;
      }

      setUsernameStatus("checking");

      try {
        // Pass excludeCurrentUser=true so that if the username belongs to the current user
        // (e.g., set during Clerk registration but not yet synced to our DB), it's considered available
        const result = await checkUsernameAvailability(debouncedUsername, true);
        setUsernameStatus(result.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    };

    checkUsername();
  }, [debouncedUsername, initialUsername]);

  // Check slug availability
  useEffect(() => {
    const checkSlug = async () => {
      if (!debouncedSlug || debouncedSlug.length < 2) {
        setSlugStatus("idle");
        return;
      }

      // Validate format: lowercase letters, numbers, and hyphens only
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(debouncedSlug)) {
        setSlugStatus("invalid");
        return;
      }

      setSlugStatus("checking");

      try {
        const response = await fetch(
          `/api/organization/check-slug?slug=${encodeURIComponent(debouncedSlug)}`
        );
        const result: SlugAvailabilityResult = await response.json();
        setSlugStatus(result.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    };

    checkSlug();
  }, [debouncedSlug]);

  // Update validation status
  useEffect(() => {
    // If user already has a name from registration, skip name validation
    const isFirstNameValid = userHasName || data.firstName.trim().length >= 1;
    const isLastNameValid = userHasName || data.lastName.trim().length >= 1;
    
    // Username validation depends on whether it needs to be set
    let isUsernameValid: boolean;
    if (usernameNeedsSetup) {
      // Username needs to be set - must be available
      isUsernameValid = usernameStatus === "available" && data.username.length >= 2;
    } else {
      // Username already exists from Clerk
      isUsernameValid = !!data.username && data.username.length >= 2;
    }
    
    const isSlugValid = slugStatus === "available" || (slugStatus === "idle" && data.orgSlug.length >= 2);
    const isOrgNameValid = data.orgName.length >= 2;
    onValidationChange(isFirstNameValid && isLastNameValid && isUsernameValid && isSlugValid && isOrgNameValid);
  }, [slugStatus, usernameStatus, usernameNeedsSetup, data.firstName, data.lastName, data.username, data.orgName, data.orgSlug, onValidationChange, userHasName]);

  const handleFirstNameChange = (value: string) => {
    onDataChange({ ...data, firstName: value });
  };

  const handleLastNameChange = (value: string) => {
    onDataChange({ ...data, lastName: value });
  };

  const handleUsernameChange = (value: string) => {
    // Clean username: lowercase, alphanumeric and underscores only
    const cleanedValue = value.toLowerCase().replaceAll(/[^\w]/g, "");
    onDataChange({ ...data, username: cleanedValue });
  };

  const handleOrgNameChange = (value: string) => {
    const newSlug = generateOrgSlug(value);
    onDataChange({
      ...data,
      orgName: value,
      orgSlug: data.orgSlug === generateOrgSlug(data.orgName) ? newSlug : data.orgSlug,
    });
  };

  const handleOrgSlugChange = (value: string) => {
    const cleanedValue = value.toLowerCase().replaceAll(/[^a-z0-9-]/g, "");
    onDataChange({ ...data, orgSlug: cleanedValue });
  };

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center flex-shrink-0 mb-4"
      >
        <h2 className="text-2xl font-bold mb-2">{dict.title}</h2>
        <p className="text-muted-foreground">{dict.description}</p>
      </motion.div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {/* Username Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">
                {usernameNeedsSetup 
                  ? (dict.usernameSetup || "Create Your Username")
                  : (dict.usernameDisplay || dict.usernameTitle)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {usernameNeedsSetup
                  ? (dict.usernameSetupDescription || "Choose a unique username for your profile")
                  : dict.usernameDescription}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* First and Last Name - only show if not already collected during registration */}
            {!userHasName && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{dict.firstNameLabel}</Label>
                  <Input
                    id="firstName"
                    value={data.firstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    placeholder={dict.firstNamePlaceholder}
                    className="px-4 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{dict.lastNameLabel}</Label>
                  <Input
                    id="lastName"
                    value={data.lastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    placeholder={dict.lastNamePlaceholder}
                    className="px-4 h-11"
                  />
                </div>
              </div>
            )}

            {/* Username - Editable if needs setup, Read Only if already set */}
            <div className="space-y-2">
              <Label htmlFor="username">{dict.usernameLabel}</Label>
              {usernameNeedsSetup ? (
                <>
                  {/* Editable Username Input */}
                  <div className="relative">
                    <Input
                      id="username"
                      value={data.username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder={dict.usernamePlaceholder}
                      className={cn(
                        "px-4 h-11 pr-10",
                        usernameStatus === "available" && "border-success focus-visible:ring-green-500",
                        (usernameStatus === "taken" || usernameStatus === "invalid") &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {usernameStatus === "available" && (
                        <Check className="w-4 h-4 text-success" />
                      )}
                      {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                        <X className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  {usernameStatus !== "idle" && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "text-sm",
                        usernameStatus === "available" && "text-success",
                        usernameStatus === "taken" && "text-destructive",
                        usernameStatus === "invalid" && "text-destructive",
                        usernameStatus === "checking" && "text-muted-foreground"
                      )}
                    >
                      {usernameStatus === "checking" && dict.usernameChecking}
                      {usernameStatus === "available" && dict.usernameAvailable}
                      {usernameStatus === "taken" && dict.usernameTaken}
                      {usernameStatus === "invalid" && dict.usernameInvalid}
                    </motion.p>
                  )}
                  {usernameStatus === "idle" && (
                    <p className="text-sm text-muted-foreground">{dict.usernameInvalid}</p>
                  )}
                </>
              ) : (
                <>
                  {/* Read Only Username Display */}
                  <div className="relative">
                    <Input
                      id="username"
                      value={data.username}
                      readOnly
                      disabled
                      className={cn(
                        "px-4 h-11 bg-muted/50 border-success/50 cursor-not-allowed"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="w-4 h-4 text-success" />
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {dict.usernameNote || "Username set during registration. Change it in profile settings."}
                  </p>
                </>
              )}
              
              {data.username && (
                <p className="text-sm text-muted-foreground">
                  {dict.usernameHint.replace("{username}", data.username)}
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Organization Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-success/10">
              <Building2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">{dict.orgTitle}</h3>
              <p className="text-sm text-muted-foreground">{dict.orgDescription}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">{dict.orgNameLabel}</Label>
              <Input
                id="orgName"
                value={data.orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                placeholder={dict.orgNamePlaceholder}
                className="px-4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgSlug">{dict.orgSlugLabel}</Label>
              <div className="relative">
                <Input
                  id="orgSlug"
                  value={data.orgSlug}
                  onChange={(e) => handleOrgSlugChange(e.target.value)}
                  placeholder={dict.orgSlugPlaceholder}
                  className={cn(
                    "px-4 pr-10",
                    slugStatus === "available" && "border-success focus-visible:ring-green-500",
                    (slugStatus === "taken" || slugStatus === "invalid") &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === "checking" && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {slugStatus === "available" && (
                    <Check className="w-4 h-4 text-success" />
                  )}
                  {(slugStatus === "taken" || slugStatus === "invalid") && (
                    <X className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
              {slugStatus !== "idle" && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "text-sm",
                    slugStatus === "available" && "text-success",
                    (slugStatus === "taken" || slugStatus === "invalid") && "text-destructive",
                    slugStatus === "checking" && "text-muted-foreground"
                  )}
                >
                  {slugStatus === "checking" && "Checking availability..."}
                  {slugStatus === "available" && "Slug is available!"}
                  {slugStatus === "taken" && "This slug is already taken"}
                  {slugStatus === "invalid" && "Slug can only contain lowercase letters, numbers, and hyphens"}
                </motion.p>
              )}
              {slugStatus === "idle" && (
                <p className="text-sm text-muted-foreground">{dict.orgSlugHint}</p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
      </div>
    </div>
  );
}
