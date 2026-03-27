"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  Globe,
  Users,
  Handshake,
  Ban,
  EyeOff,
  Eye,
  ScanEye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type NetworkMembership = "NONE" | "POOL" | "BILATERAL" | "BOTH";
type PrivacyLevel = "ANONYMIZED" | "AGENCY_IDENTIFIED" | "FULL";

export interface PolisSetupData {
  networkMembership: NetworkMembership;
  networkPrivacy: PrivacyLevel;
}

interface PolisSetupStepProps {
  data: PolisSetupData;
  onDataChange: (data: PolisSetupData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MEMBERSHIP_OPTIONS: {
  value: NetworkMembership;
  icon: React.ElementType;
}[] = [
  { value: "NONE", icon: Ban },
  { value: "POOL", icon: Globe },
  { value: "BILATERAL", icon: Handshake },
  { value: "BOTH", icon: Users },
];

const PRIVACY_OPTIONS: {
  value: PrivacyLevel;
  icon: React.ElementType;
}[] = [
  { value: "ANONYMIZED", icon: EyeOff },
  { value: "AGENCY_IDENTIFIED", icon: Eye },
  { value: "FULL", icon: ScanEye },
];

export function PolisSetupStep({
  data,
  onDataChange,
  onValidationChange,
}: PolisSetupStepProps) {
  const t = useTranslations("createOrganization");

  // Always valid — has defaults
  useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  const showPrivacy = data.networkMembership !== "NONE";

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center flex-shrink-0 mb-4"
      >
        <h2 className="text-2xl font-bold mb-2">{t("polis.title")}</h2>
        <p className="text-muted-foreground">{t("polis.description")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        {/* Network Membership */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">
              {t("polis.membershipTitle")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("polis.membershipDescription")}
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <RadioGroup
              value={data.networkMembership}
              onValueChange={(value: string) =>
                onDataChange({
                  ...data,
                  networkMembership: value as NetworkMembership,
                  // Reset privacy to ANONYMIZED if turning off
                  networkPrivacy:
                    value === "NONE" ? "ANONYMIZED" : data.networkPrivacy,
                })
              }
              className="space-y-2"
            >
              {MEMBERSHIP_OPTIONS.map(({ value, icon: Icon }) => (
                <Label
                  key={value}
                  htmlFor={`membership-${value}`}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    data.networkMembership === value &&
                      "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem
                    value={value}
                    id={`membership-${value}`}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-4 w-4 text-muted-foreground flex-shrink-0"
                        aria-hidden="true"
                      />
                      <span className="font-medium text-sm">
                        {t(`polis.membership.${value}.label`)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(`polis.membership.${value}.description`)}
                    </p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Privacy Level — only shown when membership is not NONE */}
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">
                  {t("polis.privacyTitle")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t("polis.privacyDescription")}
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <RadioGroup
                  value={data.networkPrivacy}
                  onValueChange={(value: string) =>
                    onDataChange({
                      ...data,
                      networkPrivacy: value as PrivacyLevel,
                    })
                  }
                  className="space-y-2"
                >
                  {PRIVACY_OPTIONS.map(({ value, icon: Icon }) => (
                    <Label
                      key={value}
                      htmlFor={`privacy-${value}`}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                        "hover:bg-muted/50",
                        data.networkPrivacy === value &&
                          "border-primary bg-primary/5"
                      )}
                    >
                      <RadioGroupItem
                        value={value}
                        id={`privacy-${value}`}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon
                            className="h-4 w-4 text-muted-foreground flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-medium text-sm">
                            {t(`polis.privacy.${value}.label`)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t(`polis.privacy.${value}.description`)}
                        </p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
