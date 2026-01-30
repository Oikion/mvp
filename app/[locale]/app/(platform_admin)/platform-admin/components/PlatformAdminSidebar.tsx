"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  LogOut,
  MessageSquare,
  Key,
  ScrollText,
  Gift,
  ArrowLeft,
  BookOpen,
  ChevronsUpDown,
  Check,
  Sun,
  Moon,
  Palette,
  Newspaper,
  Mail,
  Share2,
  Zap,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlatformAdminUser {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
}

interface PlatformAdminSidebarProps {
  adminUser: PlatformAdminUser | null;
  locale: string;
}

export function PlatformAdminSidebar({ adminUser, locale }: PlatformAdminSidebarProps) {
  const t = useTranslations("platformAdmin");
  const { signOut } = useClerk();
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { setTheme, theme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = `/${locale}/app/sign-in`;
  };

  // Main navigation items
  const mainNavItems = [
    {
      href: `/${locale}/app/platform-admin`,
      label: t("nav.dashboard"),
      icon: LayoutDashboard,
      active: pathname === `/${locale}/app/platform-admin`,
    },
    {
      href: `/${locale}/app/platform-admin/users`,
      label: t("nav.users"),
      icon: Users,
      active: pathname.includes("/platform-admin/users"),
    },
    {
      href: `/${locale}/app/platform-admin/organizations`,
      label: t("nav.organizations"),
      icon: Building2,
      active: pathname.includes("/platform-admin/organizations"),
    },
    {
      href: `/${locale}/app/platform-admin/referrals`,
      label: t("nav.referrals"),
      icon: Gift,
      active: pathname.includes("/platform-admin/referrals"),
    },
    {
      href: `/${locale}/app/platform-admin/feedback`,
      label: t("nav.feedback"),
      icon: MessageSquare,
      active: pathname.includes("/platform-admin/feedback"),
    },
  ];

  // Content & Automation items
  const contentNavItems = [
    {
      href: `/${locale}/app/platform-admin/blog`,
      label: "Blog",
      icon: Newspaper,
      active: pathname.includes("/platform-admin/blog"),
    },
    {
      href: `/${locale}/app/platform-admin/newsletter`,
      label: "Newsletter",
      icon: Mail,
      active: pathname.includes("/platform-admin/newsletter"),
    },
    {
      href: `/${locale}/app/platform-admin/social`,
      label: "Social",
      icon: Share2,
      active: pathname.includes("/platform-admin/social"),
    },
    {
      href: `/${locale}/app/platform-admin/automation`,
      label: "Automation",
      icon: Zap,
      active: pathname.includes("/platform-admin/automation"),
    },
    {
      href: `/${locale}/app/platform-admin/changelog`,
      label: t("nav.changelog"),
      icon: ScrollText,
      active: pathname.includes("/platform-admin/changelog"),
    },
  ];

  // System items
  const systemNavItems = [
    {
      href: `/${locale}/app/platform-admin/settings`,
      label: "Settings",
      icon: Settings,
      active: pathname.includes("/platform-admin/settings"),
    },
    {
      href: `/${locale}/app/platform-admin/api-keys`,
      label: t("nav.apiKeys"),
      icon: Key,
      active: pathname.includes("/platform-admin/api-keys"),
    },
    {
      href: `/${locale}/app/platform-admin/logbook`,
      label: t("nav.logbook"),
      icon: BookOpen,
      active: pathname.includes("/platform-admin/logbook"),
    },
  ];

  const initials = adminUser
    ? `${adminUser.firstName?.[0] || ""}${adminUser.lastName?.[0] || ""}`.toUpperCase() || "PA"
    : "PA";

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "pearl-sand", label: "Pearl Sand", icon: Palette },
    { value: "twilight-lavender", label: "Twilight Lavender", icon: Palette },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={`/${locale}/app/platform-admin`}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Oikion</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t("header.platformAdmin")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.active}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content & Automation */}
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.active}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.active}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Back to App */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t("header.backToApp")}>
                  <Link href={`/${locale}/app`}>
                    <ArrowLeft className="size-4" />
                    <span>{t("header.backToApp")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={adminUser?.avatar || undefined}
                      alt={adminUser?.email || "Admin"}
                    />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {adminUser?.firstName} {adminUser?.lastName}
                    </span>
                    <span className="truncate text-xs">{adminUser?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={adminUser?.avatar || undefined}
                        alt={adminUser?.email || "Admin"}
                      />
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {adminUser?.firstName} {adminUser?.lastName}
                      </span>
                      <span className="truncate text-xs">{adminUser?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Palette className="mr-2 h-4 w-4" />
                      Theme
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {themes.map((themeOption) => {
                        const ThemeIcon = themeOption.icon;
                        return (
                          <DropdownMenuItem
                            key={themeOption.value}
                            onClick={() => setTheme(themeOption.value)}
                            className="flex items-center gap-2"
                          >
                            <ThemeIcon className="h-4 w-4" />
                            <span>{themeOption.label}</span>
                            {theme === themeOption.value && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setTheme("system")}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>System</span>
                        {theme === "system" && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("header.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
