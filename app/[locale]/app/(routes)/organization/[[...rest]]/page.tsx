"use client";

import { OrganizationProfile } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useClerkTheme } from "@/lib/clerk-theme";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, RotateCcw } from "lucide-react";
import { ResetWorkspaceDialog } from "@/components/workspace/ResetWorkspaceDialog";

export default function OrganizationProfilePage() {
  const params = useParams();
  const locale = params.locale as string || "en";
  const { appearance } = useClerkTheme();
  const { isPersonalWorkspace } = useWorkspaceContext();
  const t = useTranslations("workspace");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-2">
            {isPersonalWorkspace ? t("personalWorkspace") : "Organization Settings"}
          </h1>
          <p className="text-muted-foreground">
            {isPersonalWorkspace 
              ? t("personalWorkspaceDescription") 
              : "Manage your organization settings, members, and invitations."}
          </p>
        </div>

        {isPersonalWorkspace && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400">
              {t("protectedWorkspace")}
            </AlertTitle>
            <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
              {t("protectedWorkspaceDescription")}
            </AlertDescription>
          </Alert>
        )}

        <div className={isPersonalWorkspace ? "personal-org-profile" : ""}>
          <OrganizationProfile
            routing="path"
            path={`/${locale}/app/organization`}
            appearance={{
              ...appearance,
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg",
                // Hide members/invitations sections for personal workspace
                ...(isPersonalWorkspace && {
                  membersPageInviteButton: "hidden",
                  organizationProfilePage__membersPage: "hidden",
                  navbarButton__members: "hidden",
                }),
              },
            }}
          />
        </div>

        {/* CSS to blur danger zone for personal workspaces */}
        {isPersonalWorkspace && (
          <style dangerouslySetInnerHTML={{ __html: `
            .personal-org-profile [class*="organizationProfilePage__danger"],
            .personal-org-profile [class*="profileSection__danger"],
            .personal-org-profile [data-localization-key*="leave"],
            .personal-org-profile [data-localization-key*="delete"],
            .personal-org-profile button[class*="destructive"],
            .personal-org-profile .cl-profileSection__danger {
              filter: blur(4px);
              pointer-events: none;
              user-select: none;
              opacity: 0.3;
            }
          ` }} />
        )}

        {/* Reset Workspace Card - shown for personal workspaces as alternative to delete/leave */}
        {isPersonalWorkspace && (
          <Card className="mt-6 border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <RotateCcw className="h-5 w-5" />
                {t("resetInsteadOfDelete")}
              </CardTitle>
              <CardDescription>
                {t("protectedWorkspaceDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResetWorkspaceDialog />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

