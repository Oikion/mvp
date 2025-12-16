"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users, X, Check, UserPlus, Building2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrgUsers, useConnections } from "@/hooks/swr";

export type InviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";

export interface Invitee {
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
  type: "organization" | "connection";
  status?: InviteStatus;
}

interface InviteeSelectorProps {
  value: Invitee[];
  onChange: (invitees: Invitee[]) => void;
  disabled?: boolean;
  className?: string;
  showStatus?: boolean;
}

const statusColors: Record<InviteStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ACCEPTED: "bg-green-500/15 text-green-600 dark:text-green-400",
  DECLINED: "bg-red-500/15 text-red-600 dark:text-red-400",
  TENTATIVE: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

export function InviteeSelector({
  value,
  onChange,
  disabled = false,
  className,
  showStatus = false,
}: InviteeSelectorProps) {
  const t = useTranslations("calendar.invitees");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch organization users
  const { users: orgUsers, isLoading: loadingOrg } = useOrgUsers();

  // Fetch connections
  const { connections, isLoading: loadingConnections } = useConnections();

  // Transform org users to invitee format
  const orgInvitees: Invitee[] = (orgUsers || []).map((user) => ({
    userId: user.id,
    name: user.name || user.email,
    email: user.email,
    avatar: user.avatar,
    type: "organization" as const,
  }));

  // Transform connections to invitee format
  const connectionInvitees: Invitee[] = (connections || [])
    .filter((conn) => conn.status === "ACCEPTED")
    .map((conn) => ({
      userId: conn.user.id,
      name: conn.user.name || conn.user.email,
      email: conn.user.email,
      avatar: conn.user.avatar,
      type: "connection" as const,
    }));

  // Filter out already selected invitees and apply search
  const filteredOrgInvitees = orgInvitees.filter((invitee) => {
    const isSelected = value.some((v) => v.userId === invitee.userId);
    const matchesSearch =
      !searchQuery ||
      invitee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invitee.email.toLowerCase().includes(searchQuery.toLowerCase());
    return !isSelected && matchesSearch;
  });

  const filteredConnectionInvitees = connectionInvitees.filter((invitee) => {
    const isSelected = value.some((v) => v.userId === invitee.userId);
    // Also filter out org users that are already in the org list
    const isOrgUser = orgInvitees.some((org) => org.userId === invitee.userId);
    const matchesSearch =
      !searchQuery ||
      invitee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invitee.email.toLowerCase().includes(searchQuery.toLowerCase());
    return !isSelected && !isOrgUser && matchesSearch;
  });

  const handleSelect = (invitee: Invitee) => {
    onChange([...value, invitee]);
    setSearchQuery("");
  };

  const handleRemove = (userId: string) => {
    onChange(value.filter((v) => v.userId !== userId));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected Invitees */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((invitee) => (
            <Badge
              key={invitee.userId}
              variant="secondary"
              className="pl-1 pr-1 py-1 flex items-center gap-1"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={invitee.avatar || undefined} alt={invitee.name} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(invitee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="px-1 text-xs">{invitee.name}</span>
              {showStatus && invitee.status && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    statusColors[invitee.status]
                  )}
                >
                  {t(`status.${invitee.status.toLowerCase()}`)}
                </span>
              )}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-destructive/20"
                  onClick={() => handleRemove(invitee.userId)}
                  aria-label={t("remove")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Selector */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              aria-expanded={open}
              aria-haspopup="listbox"
            >
              <UserPlus className="h-4 w-4" />
              {t("addInvitees")}
              {value.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {value.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {loadingOrg || loadingConnections ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : filteredOrgInvitees.length === 0 &&
                  filteredConnectionInvitees.length === 0 ? (
                  <CommandEmpty>{t("noResults")}</CommandEmpty>
                ) : (
                  <>
                    {/* Organization Members */}
                    {filteredOrgInvitees.length > 0 && (
                      <CommandGroup heading={t("organizationMembers")}>
                        {filteredOrgInvitees.map((invitee) => (
                          <CommandItem
                            key={invitee.userId}
                            value={invitee.userId}
                            onSelect={() => handleSelect(invitee)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={invitee.avatar || undefined}
                                  alt={invitee.name}
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(invitee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">
                                  {invitee.name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {invitee.email}
                                </span>
                              </div>
                              <Building2 className="h-4 w-4 text-muted-foreground ml-auto" />
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {filteredOrgInvitees.length > 0 &&
                      filteredConnectionInvitees.length > 0 && (
                        <CommandSeparator />
                      )}

                    {/* Connections */}
                    {filteredConnectionInvitees.length > 0 && (
                      <CommandGroup heading={t("connections")}>
                        {filteredConnectionInvitees.map((invitee) => (
                          <CommandItem
                            key={invitee.userId}
                            value={invitee.userId}
                            onSelect={() => handleSelect(invitee)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={invitee.avatar || undefined}
                                  alt={invitee.name}
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(invitee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">
                                  {invitee.name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {invitee.email}
                                </span>
                              </div>
                              <Link2 className="h-4 w-4 text-muted-foreground ml-auto" />
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

