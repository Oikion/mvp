"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Building2, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { generateOrgSlug } from "@/types/onboarding";
import { useTranslations } from "next-intl";

interface OrgInfoStepProps {
  data: { orgName: string; orgSlug: string };
  onDataChange: (data: { orgName: string; orgSlug: string }) => void;
  onValidationChange: (isValid: boolean) => void;
}

type AvailabilityStatus = "idle" | "checking" | "available" | "taken" | "reserved" | "error";

interface AvailabilityResult {
  available: boolean;
  error?: string;
}

export function OrgInfoStep({
  data,
  onDataChange,
  onValidationChange,
}: OrgInfoStepProps) {
  const t = useTranslations("createOrganization");

  const [nameStatus, setNameStatus] = useState<AvailabilityStatus>("idle");
  const [slugStatus, setSlugStatus] = useState<AvailabilityStatus>("idle");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const debouncedName = useDebounce(data.orgName, 500);
  const debouncedSlug = useDebounce(data.orgSlug, 500);

  // Check name availability
  useEffect(() => {
    const checkName = async () => {
      if (!debouncedName || debouncedName.trim().length < 2) {
        setNameStatus("idle");
        return;
      }

      if (debouncedName.length > 50) {
        setNameStatus("error");
        return;
      }

      setNameStatus("checking");

      try {
        const response = await fetch(
          `/api/organization/check-name?name=${encodeURIComponent(debouncedName)}`
        );
        const result: AvailabilityResult = await response.json();
        if (result.available) {
          setNameStatus("available");
        } else if (result.error === "RESERVED") {
          setNameStatus("reserved");
        } else {
          setNameStatus("taken");
        }
      } catch {
        setNameStatus("error");
      }
    };

    checkName();
  }, [debouncedName]);

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
        setSlugStatus("error");
        return;
      }

      setSlugStatus("checking");

      try {
        const response = await fetch(
          `/api/organization/check-slug?slug=${encodeURIComponent(debouncedSlug)}`
        );
        const result: AvailabilityResult = await response.json();
        if (result.available) {
          setSlugStatus("available");
        } else if (result.error === "RESERVED") {
          setSlugStatus("reserved");
        } else {
          setSlugStatus("taken");
        }
      } catch {
        setSlugStatus("error");
      }
    };

    checkSlug();
  }, [debouncedSlug]);

  // Update validation status
  useEffect(() => {
    const isNameValid =
      data.orgName.trim().length >= 2 &&
      data.orgName.length <= 50 &&
      nameStatus === "available";
    const isSlugValid =
      data.orgSlug.length >= 2 &&
      data.orgSlug.length <= 50 &&
      slugStatus === "available";
    onValidationChange(isNameValid && isSlugValid);
  }, [nameStatus, slugStatus, data.orgName, data.orgSlug, onValidationChange]);

  const handleNameChange = (value: string) => {
    const newSlug = generateOrgSlug(value);
    onDataChange({
      orgName: value,
      // Only auto-update slug if it hasn't been manually edited
      orgSlug: isSlugManuallyEdited ? data.orgSlug : newSlug,
    });
  };

  const handleSlugChange = (value: string) => {
    const cleanedValue = value.toLowerCase().replaceAll(/[^a-z0-9-]/g, "");
    setIsSlugManuallyEdited(true);
    onDataChange({ ...data, orgSlug: cleanedValue });
  };

  const isNameError =
    nameStatus === "taken" || nameStatus === "reserved" || nameStatus === "error";
  const isSlugError =
    slugStatus === "taken" || slugStatus === "reserved" || slugStatus === "error";

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center flex-shrink-0 mb-4"
      >
        <h2 className="text-2xl font-bold mb-2">{t("orgInfo.title")}</h2>
        <p className="text-muted-foreground">{t("orgInfo.description")}</p>
      </motion.div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{t("orgInfo.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("orgInfo.description")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Organization Name */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="space-y-2"
              >
                <Label htmlFor="orgName">{t("orgInfo.nameLabel")}</Label>
                <div className="relative">
                  <Input
                    id="orgName"
                    value={data.orgName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={t("orgInfo.namePlaceholder")}
                    className={cn(
                      "px-4 h-11 pr-10",
                      nameStatus === "available" &&
                        "border-success focus-visible:ring-green-500",
                      isNameError &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {nameStatus === "checking" && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {nameStatus === "available" && (
                      <Check className="w-4 h-4 text-success" />
                    )}
                    {isNameError && <X className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
                {nameStatus !== "idle" && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-sm",
                      nameStatus === "available" && "text-success",
                      isNameError && "text-destructive",
                      nameStatus === "checking" && "text-muted-foreground"
                    )}
                  >
                    {nameStatus === "checking" && t("orgInfo.checking")}
                    {nameStatus === "available" && t("orgInfo.available")}
                    {nameStatus === "taken" && t("orgInfo.taken")}
                    {nameStatus === "reserved" && t("orgInfo.reserved")}
                    {nameStatus === "error" && t("orgInfo.taken")}
                  </motion.p>
                )}
              </motion.div>

              {/* Organization Slug */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="orgSlug">{t("orgInfo.slugLabel")}</Label>
                <div className="relative">
                  <Input
                    id="orgSlug"
                    value={data.orgSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder={t("orgInfo.slugPlaceholder")}
                    className={cn(
                      "px-4 h-11 pr-10",
                      slugStatus === "available" &&
                        "border-success focus-visible:ring-green-500",
                      isSlugError &&
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
                    {isSlugError && <X className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
                {slugStatus !== "idle" ? (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-sm",
                      slugStatus === "available" && "text-success",
                      isSlugError && "text-destructive",
                      slugStatus === "checking" && "text-muted-foreground"
                    )}
                  >
                    {slugStatus === "checking" && t("orgInfo.checking")}
                    {slugStatus === "available" && t("orgInfo.available")}
                    {slugStatus === "taken" && t("orgInfo.taken")}
                    {slugStatus === "reserved" && t("orgInfo.reserved")}
                    {slugStatus === "error" && t("orgInfo.taken")}
                  </motion.p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("orgInfo.slugHint")}
                  </p>
                )}
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
