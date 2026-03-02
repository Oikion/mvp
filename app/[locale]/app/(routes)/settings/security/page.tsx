import { Metadata } from "next";
import { Shield } from "lucide-react";
import { ScreenshotProtectionSettings } from "@/components/security/ScreenshotProtectionSettings";

export const metadata: Metadata = {
  title: "Security Settings | Oikion",
  description: "Manage your security and privacy settings",
};

/**
 * Security Settings Page
 * 
 * Provides users with controls for security features including
 * screenshot protection, session management, and privacy settings.
 */

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
          <p className="text-muted-foreground">
            Manage security features and privacy controls
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <ScreenshotProtectionSettings />

        {/* Future security settings can be added here */}
        {/* Example:
        <SessionManagementSettings />
        <TwoFactorAuthSettings />
        <AuditLogSettings />
        */}
      </div>
    </div>
  );
}
