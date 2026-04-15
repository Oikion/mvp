import { Metadata } from "next";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { ScreenshotProtectionSettings } from "@/components/security/ScreenshotProtectionSettings";
import { E2EEPinSetup } from "./components/E2EEPinSetup";
import { SessionBackupStatus } from "./components/SessionBackupStatus";

export const metadata: Metadata = {
  title: "Security Settings | Oikion",
  description: "Manage your security and privacy settings",
};

export default function SecuritySettingsPage() {
  const t = useTranslations("common");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("security.title")}</h1>
          <p className="text-muted-foreground">
            {t("security.description")}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <E2EEPinSetup />
        <SessionBackupStatus />
        <ScreenshotProtectionSettings />
      </div>
    </div>
  );
}
