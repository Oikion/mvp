"use client";

import { useTranslations } from "next-intl";
import { N8NWorkflowsSection } from "@/components/integrations/n8n-workflows-section";
import { XEAgentSettingsForm } from "@/components/integrations/xe-agent-settings-form";
import { GoogleCalendarSection } from "@/components/integrations/google-calendar-section";

export function IntegrationsTab() {
  const t = useTranslations("profile.integrations");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          {t("title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Google Calendar Section */}
      <GoogleCalendarSection />

      {/* N8N Workflows Section */}
      <N8NWorkflowsSection />

      {/* XE.gr Settings Section */}
      <XEAgentSettingsForm />
    </div>
  );
}
