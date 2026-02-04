"use client";

import { useTranslations } from "next-intl";
import { FeatureAccessDenied } from "@/components/features";

interface AiAccessDeniedProps {
  locale: string;
}

/**
 * Access denied component for AI Assistant.
 * Shows informational message and option to apply for test access.
 */
export function AiAccessDenied({ locale }: AiAccessDeniedProps) {
  const t = useTranslations("ai");

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <FeatureAccessDenied
          feature="ai_assistant"
          featureTitle={t("pageTitle")}
          description={t("accessDenied.description")}
          showApplyButton={true}
        />
      </div>
    </div>
  );
}
