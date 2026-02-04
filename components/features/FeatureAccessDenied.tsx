"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, Send } from "lucide-react";
import { FeatureAccessRequestForm } from "./FeatureAccessRequestForm";

export type FeatureType = "market_intel" | "ai_assistant";

interface FeatureAccessDeniedProps {
  /**
   * The feature that access is denied for
   */
  readonly feature: FeatureType;
  /**
   * The title of the feature (for display)
   */
  readonly featureTitle: string;
  /**
   * The description shown to the user
   */
  readonly description: string;
  /**
   * Whether to show the "Apply for Test Access" button
   */
  readonly showApplyButton?: boolean;
  /**
   * Custom class name for the container
   */
  readonly className?: string;
}

/**
 * Reusable component for displaying access denied state for premium features.
 * Optionally shows an "Apply for Test Access" button that opens the request form.
 */
export function FeatureAccessDenied({
  feature,
  featureTitle,
  description,
  showApplyButton = true,
  className = ""
}: FeatureAccessDeniedProps) {
  const t = useTranslations("common");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleSuccess = () => {
    setRequestSubmitted(true);
    setShowRequestForm(false);
  };

  if (requestSubmitted) {
    return (
      <Card className={`p-8 border-success/30 bg-success/10 ${className}`}>
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <Send className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-2xl font-semibold text-success">
            {t("featureAccess.successTitle")}
          </h2>
          <p className="text-success/80 max-w-md mx-auto">
            {t("featureAccess.successDescription")}
          </p>
        </div>
      </Card>
    );
  }

  if (showRequestForm) {
    return (
      <FeatureAccessRequestForm
        feature={feature}
        featureTitle={featureTitle}
        onSuccess={handleSuccess}
        onCancel={() => setShowRequestForm(false)}
        className={className}
      />
    );
  }

  return (
    <Card className={`p-8 border-destructive/30 bg-destructive/10 ${className}`}>
      <div className="text-center space-y-4">
        <Ban className="h-16 w-16 text-destructive mx-auto" />
        <h2 className="text-2xl font-semibold text-destructive">
          {t("featureAccess.accessDeniedTitle")}
        </h2>
        <p className="text-destructive/80 max-w-md mx-auto">
          {description}
        </p>
        {showApplyButton && (
          <Button
            onClick={() => setShowRequestForm(true)}
            variant="outline"
            className="mt-4"
            leftIcon={<Send className="h-4 w-4" />}
          >
            {t("featureAccess.applyButton")}
          </Button>
        )}
      </div>
    </Card>
  );
}
