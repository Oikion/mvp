"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export function AgencyOrganizationSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const { organization: currentOrg } = useOrganization();
  const { setActive, userMemberships, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [isSwitching, setIsSwitching] = useState(false);

  // Filter out personal organizations
  const agencyOrgs = userMemberships?.data?.filter(
    (membership) =>
      (membership.organization.publicMetadata as Record<string, unknown>)
        ?.type !== "personal"
  ) ?? [];

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
    router.push(`/${locale}/create-organization`);
  };

  const handleManageOrg = () => {
    router.push(`/${locale}/app/organization`);
  };

  if (!isLoaded) {
    return (
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    );
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-2 py-1.5 h-auto hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={currentOrg?.imageUrl} alt={currentOrg?.name} />
              <AvatarFallback className="text-xs">
                {currentOrg?.name ? getInitials(currentOrg.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">
              {currentOrg?.name ?? "Select Organization"}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px]"
      >
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
              <span className="truncate text-sm">{membership.organization.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {membership.role?.replace("org:", "")}
              </span>
            </div>
            {currentOrg?.id === membership.organization.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleManageOrg}
          className="flex items-center gap-2 cursor-pointer text-muted-foreground"
        >
          <Settings className="h-4 w-4" />
          <span className="text-sm">Manage Organization</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleCreateOrg}
          className="flex items-center gap-2 cursor-pointer bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-950 dark:hover:bg-violet-900 dark:text-violet-300"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Create Organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
