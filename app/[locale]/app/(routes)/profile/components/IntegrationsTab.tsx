"use client";

import { useLocale } from "next-intl";
import { N8NWorkflowsSection } from "@/components/integrations/n8n-workflows-section";
import { XEAgentSettingsForm } from "@/components/integrations/xe-agent-settings-form";

export function IntegrationsTab() {
  const locale = useLocale() as "en" | "el";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          {locale === "el" ? "Ενσωματώσεις" : "Integrations"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {locale === "el"
            ? "Διαχείριση εξωτερικών υπηρεσιών και αυτοματισμών"
            : "Manage your external service integrations and automations"}
        </p>
      </div>

      {/* N8N Workflows Section */}
      <N8NWorkflowsSection />

      {/* XE.gr Settings Section */}
      <XEAgentSettingsForm />
    </div>
  );
}
