// @ts-nocheck
// TODO: Fix type errors
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Settings,
  Mail,
  Building2,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useInvitationAcceptance } from "@/hooks/useInvitationAcceptance";
import { DataPolicyConsentModal } from "@/components/data-ownership/DataPolicyConsentModal";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

export function AgencyOrganizationSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("common");
  const { organization: currentOrg } = useOrganization();
  const { setActive, userMemberships, userInvitations, isLoaded } =
    useOrganizationList({
      userMemberships: { infinite: true },
      userInvitations: { infinite: true },
    });
  const [isSwitching, setIsSwitching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isPersonalWorkspace } = useWorkspaceContext();

  const {
    initiateAcceptance,
    handleConsentAccept,
    handleConsentDecline,
    consentModalOpen,
    consentTarget,
    consentMode,
    isPolicyLoading,
    isProcessing,
  } = useInvitationAcceptance();

  // Close dropdown when consent modal opens
  useEffect(() => {
    if (consentModalOpen) {
      setDropdownOpen(false);
    }
  }, [consentModalOpen]);

  const pendingInvitations = userInvitations?.data || [];

  const allOrgs = userMemberships?.data ?? [];

  const agencyOrgs = allOrgs.filter(
    (membership) =>
      (membership.organization.publicMetadata as Record<string, unknown>)
        ?.type !== "personal"
  );

  const personalOrg = allOrgs.find(
    (membership) =>
      (membership.organization.publicMetadata as Record<string, unknown>)
        ?.type === "personal"
  );

  const handleOrgSwitch = async (orgId: string) => {
    if (isSwitching || !setActive || orgId === currentOrg?.id) return;

    setIsSwitching(true);
    try {
      await setActive({ organization: orgId });
      router.refresh();
    } catch (error) {
      console.error("Error switching organization:", error);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCreateOrg = () => {
    router.push(`/${locale}/app/create-organization`);
  };

  const handleManageOrg = () => {
    router.push(`/${locale}/app/organization`);
  };

  const formatRole = (role: string) => {
    return (
      role.replace("org:", "").charAt(0).toUpperCase() +
      role.replace("org:", "").slice(1)
    );
  };

  if (!isLoaded) {
    return (
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // The invitation currently being processed
  const processingInviteId = consentTarget?.invitationId ?? null;

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-2 py-1.5 h-auto hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            disabled={isSwitching}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage
                  src={currentOrg?.imageUrl}
                  alt={currentOrg?.name}
                />
                <AvatarFallback className="text-xs">
                  {currentOrg?.name ? getInitials(currentOrg.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">
                {currentOrg?.name ?? "Select Organization"}
              </span>
              {pendingInvitations.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-auto text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center"
                >
                  {pendingInvitations.length}
                </Badge>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[280px]"
        >
          {/* Pending Invitations Section */}
          {pendingInvitations.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {t("organizationInvites.pendingInvites")}
                <Badge
                  variant="secondary"
                  className="ml-auto text-[10px] px-1.5 py-0 h-4"
                >
                  {pendingInvitations.length}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {pendingInvitations.map((invitation) => (
                  <DropdownMenuItem
                    key={invitation.id}
                    className="flex items-center gap-2 cursor-pointer p-2"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={invitation.publicOrganizationData.imageUrl}
                        alt={invitation.publicOrganizationData.name}
                      />
                      <AvatarFallback className="text-xs">
                        <Building2 className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-sm font-medium">
                        {invitation.publicOrganizationData.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("organizationInvites.role")}:{" "}
                        {formatRole(invitation.role)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs px-2"
                      onClick={() => initiateAcceptance(invitation)}
                      disabled={processingInviteId !== null}
                    >
                      {processingInviteId === invitation.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          {t("organizationInvites.accept")}
                        </>
                      )}
                    </Button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Personal Workspace */}
          {personalOrg && (
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Personal
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleOrgSwitch(personalOrg.organization.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage
                    src={personalOrg.organization.imageUrl}
                    alt={personalOrg.organization.name}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(personalOrg.organization.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">
                  {personalOrg.organization.name}
                </span>
                {currentOrg?.id === personalOrg.organization.id && (
                  <Check className="h-4 w-4 shrink-0 text-primary ml-auto" />
                )}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}

          {personalOrg && agencyOrgs.length > 0 && <DropdownMenuSeparator />}

          {/* Agency Organizations */}
          {agencyOrgs.length > 0 && (
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Agencies
              </DropdownMenuLabel>
              {agencyOrgs.map((membership) => (
                <DropdownMenuItem
                  key={membership.organization.id}
                  onClick={() => handleOrgSwitch(membership.organization.id)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage
                      src={membership.organization.imageUrl}
                      alt={membership.organization.name}
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(membership.organization.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-sm">
                      {membership.organization.name}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {membership.role?.replace("org:", "")}
                    </span>
                  </div>
                  {currentOrg?.id === membership.organization.id && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}

          {agencyOrgs.length > 0 && <DropdownMenuSeparator />}

          {!isPersonalWorkspace && (
            <DropdownMenuItem
              onClick={handleManageOrg}
              className="flex items-center gap-2 cursor-pointer text-muted-foreground"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">Manage Organization</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={handleCreateOrg}
            className="flex items-center gap-2 cursor-pointer bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-950 dark:hover:bg-violet-900 dark:text-violet-300"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Create Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {consentModalOpen && consentTarget && consentMode && (
        <DataPolicyConsentModal
          open={consentModalOpen}
          orgName={consentTarget.orgName}
          mode={consentMode}
          variant="invitation"
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
          loading={isProcessing}
        />
      )}
    </>
  );
}
