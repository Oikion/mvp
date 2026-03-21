"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { checkUsernameAvailability } from "@/actions/user/check-username";
import type { UsernameStepData } from "@/types/onboarding";

interface UsernameStepProps {
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
    usernameReserved: string;
    usernameDisplay?: string;
    usernameNote?: string;
    usernameSetup?: string;
    usernameSetupDescription?: string;
  };
  data: UsernameStepData;
  onDataChange: (data: UsernameStepData) => void;
  onValidationChange: (isValid: boolean) => void;
  /** If true, the name fields are hidden because they were already collected during registration */
  userHasName?: boolean;
  /** The initial username from Clerk (to detect if user needs to set one) */
  initialUsername?: string;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "reserved";

export function UsernameStep({
  dict,
  data,
  onDataChange,
  onValidationChange,
  userHasName = false,
  initialUsername = "",
}: UsernameStepProps) {
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debouncedUsername = useDebounce(data.username, 500);

  // Track if username was originally empty (needs to be set)
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
        const result = await checkUsernameAvailability(debouncedUsername, true);
        if (result.available) {
          setUsernameStatus("available");
        } else if (result.error === "RESERVED") {
          setUsernameStatus("reserved");
        } else {
          setUsernameStatus("taken");
        }
      } catch {
        setUsernameStatus("idle");
      }
    };

    checkUsername();
  }, [debouncedUsername, initialUsername, usernameNeedsSetup]);

  // Update validation status
  useEffect(() => {
    const isFirstNameValid = userHasName || data.firstName.trim().length >= 1;
    const isLastNameValid = userHasName || data.lastName.trim().length >= 1;

    let isUsernameValid: boolean;
    if (usernameNeedsSetup) {
      isUsernameValid = usernameStatus === "available" && data.username.length >= 2;
    } else {
      isUsernameValid = !!data.username && data.username.length >= 2;
    }

    onValidationChange(isFirstNameValid && isLastNameValid && isUsernameValid);
  }, [usernameStatus, usernameNeedsSetup, data.firstName, data.lastName, data.username, onValidationChange, userHasName]);

  const handleFirstNameChange = (value: string) => {
    onDataChange({ ...data, firstName: value });
  };

  const handleLastNameChange = (value: string) => {
    onDataChange({ ...data, lastName: value });
  };

  const handleUsernameChange = (value: string) => {
    const cleanedValue = value.toLowerCase().replaceAll(/[^\w]/g, "");
    onDataChange({ ...data, username: cleanedValue });
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
                          (usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "reserved") &&
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
                        {(usernameStatus === "taken" ||
                          usernameStatus === "invalid" ||
                          usernameStatus === "reserved") && (
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
                          usernameStatus === "reserved" && "text-destructive",
                          usernameStatus === "checking" && "text-muted-foreground"
                        )}
                      >
                        {usernameStatus === "checking" && dict.usernameChecking}
                        {usernameStatus === "available" && dict.usernameAvailable}
                        {usernameStatus === "taken" && dict.usernameTaken}
                        {usernameStatus === "invalid" && dict.usernameInvalid}
                        {usernameStatus === "reserved" && dict.usernameReserved}
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
      </div>
    </div>
  );
}
