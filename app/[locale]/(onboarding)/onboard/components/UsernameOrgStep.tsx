"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User, Building2, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { generateOrgSlug } from "@/types/onboarding";
import type { UsernameOrgStepData, UsernameAvailabilityResult } from "@/types/onboarding";

interface SlugAvailabilityResult {
  available: boolean;
  error?: string;
}

interface UsernameOrgStepProps {
  dict: {
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
  };
  data: UsernameOrgStepData;
  onDataChange: (data: UsernameOrgStepData) => void;
  onValidationChange: (isValid: boolean) => void;
  /** If true, the name field is hidden because it was already collected during registration */
  userHasName?: boolean;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";
type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function UsernameOrgStep({
  dict,
  data,
  onDataChange,
  onValidationChange,
  userHasName = false,
}: UsernameOrgStepProps) {
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const debouncedUsername = useDebounce(data.username, 500);
  const debouncedSlug = useDebounce(data.orgSlug, 500);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || debouncedUsername.length < 2) {
        setUsernameStatus("idle");
        return;
      }

      // Validate format
      const usernameRegex = /^[a-zA-Z0-9_]{2,50}$/;
      if (!usernameRegex.test(debouncedUsername)) {
        setUsernameStatus("invalid");
        return;
      }

      setUsernameStatus("checking");

      try {
        const response = await fetch(
          `/api/user/check-username?username=${encodeURIComponent(debouncedUsername)}`
        );
        const result: UsernameAvailabilityResult = await response.json();
        setUsernameStatus(result.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    };

    checkUsername();
  }, [debouncedUsername]);

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
    const isNameValid = userHasName || data.name.trim().length >= 2;
    const isUsernameValid = usernameStatus === "available";
    const isSlugValid = slugStatus === "available" || (slugStatus === "idle" && data.orgSlug.length >= 2);
    const isOrgNameValid = data.orgName.length >= 2;
    onValidationChange(isNameValid && isUsernameValid && isSlugValid && isOrgNameValid);
  }, [usernameStatus, slugStatus, data.name, data.orgName, data.orgSlug, onValidationChange, userHasName]);

  const handleNameChange = (value: string) => {
    onDataChange({ ...data, name: value });
  };

  const handleUsernameChange = (value: string) => {
    const cleanedValue = value.toLowerCase().replaceAll(/[^a-z0-9_]/g, "");
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

  const getStatusIcon = () => {
    switch (usernameStatus) {
      case "checking":
        return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
      case "available":
        return <Check className="w-4 h-4 text-green-500" />;
      case "taken":
      case "invalid":
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (usernameStatus) {
      case "checking":
        return dict.usernameChecking;
      case "available":
        return dict.usernameAvailable;
      case "taken":
        return dict.usernameTaken;
      case "invalid":
        return dict.usernameInvalid;
      default:
        return "";
    }
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
              <h3 className="font-semibold">{dict.usernameTitle}</h3>
              <p className="text-sm text-muted-foreground">{dict.usernameDescription}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Display Name - only show if not already collected during registration */}
            {!userHasName && (
              <div className="space-y-2">
                <Label htmlFor="name">{dict.nameLabel}</Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={dict.namePlaceholder}
                  className="px-4 h-11"
                />
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">{dict.usernameLabel}</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={data.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder={dict.usernamePlaceholder}
                  className={cn(
                    "px-4 h-11",
                    usernameStatus === "available" && "border-green-500 focus-visible:ring-green-500",
                    (usernameStatus === "taken" || usernameStatus === "invalid") &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {getStatusIcon()}
                </div>
              </div>
              
              {usernameStatus !== "idle" && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "text-sm",
                    usernameStatus === "available" && "text-green-600",
                    (usernameStatus === "taken" || usernameStatus === "invalid") && "text-destructive",
                    usernameStatus === "checking" && "text-muted-foreground"
                  )}
                >
                  {getStatusMessage()}
                </motion.p>
              )}
              
              {data.username && usernameStatus === "available" && (
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
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Building2 className="w-5 h-5 text-emerald-600" />
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
                    slugStatus === "available" && "border-green-500 focus-visible:ring-green-500",
                    (slugStatus === "taken" || slugStatus === "invalid") &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === "checking" && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {slugStatus === "available" && (
                    <Check className="w-4 h-4 text-green-500" />
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
                    slugStatus === "available" && "text-green-600",
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

