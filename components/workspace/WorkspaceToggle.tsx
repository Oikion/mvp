"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";
import { Building2, User, Settings } from "lucide-react";
import Link from "next/link";

export function WorkspaceToggle() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("workspace");
  const { organization } = useOrganization();
  const { setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { isPersonalWorkspace, personalOrgId } = useWorkspaceContext();
  const { toast } = useAppToast();
  const [isSwitching, setIsSwitching] = useState(false);

  // Find the first agency org (non-personal)
  const agencyOrg = userMemberships?.data?.find(
    (membership) =>
      (membership.organization.publicMetadata as Record<string, unknown>)
        ?.type !== "personal"
  );

  const handleToggle = async (checked: boolean) => {
    if (isSwitching || !setActive) return;

    setIsSwitching(true);
    try {
      if (checked) {
        // Switching to Personal Workspace
        if (!personalOrgId) {
          toast.error(t, { description: t, isTranslationKey: false });
          return;
        }
        await setActive({ organization: personalOrgId });
        router.refresh();
      } else {
        // Switching to Agency
        if (!agencyOrg?.organization.id) {
          toast.error(t, { description: t, isTranslationKey: false });
          return;
        }
        await setActive({ organization: agencyOrg.organization.id });
        router.refresh();
      }
    } catch (error) {
      console.error("Error switching workspace:", error);
      toast.error(t, { description: t, isTranslationKey: false });
    } finally {
      setIsSwitching(false);
    }
  };

  // Don't render if user doesn't have both orgs
  if (!personalOrgId || !agencyOrg) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <Label
          htmlFor="workspace-toggle"
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium cursor-pointer whitespace-nowrap transition-colors",
            !isPersonalWorkspace && "text-foreground",
            isPersonalWorkspace && "text-muted-foreground"
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          {t("agency")}
        </Label>
        <Switch
          id="workspace-toggle"
          checked={isPersonalWorkspace}
          onCheckedChange={handleToggle}
          disabled={isSwitching || !organization}
          aria-label={t("switchTo", { type: isPersonalWorkspace ? t("agency") : t("personal") })}
        />
        <Label
          htmlFor="workspace-toggle"
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium cursor-pointer whitespace-nowrap transition-colors",
            isPersonalWorkspace && "text-foreground",
            !isPersonalWorkspace && "text-muted-foreground"
          )}
        >
          {t("personal")}
          <User className="h-3.5 w-3.5" />
        </Label>
      </div>
      <Link
        href={`/${locale}/app/admin`}
        className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
      >
        <Settings className="h-3.5 w-3.5" />
        {t("workspaceSettings")}
      </Link>
    </div>
  );
}
