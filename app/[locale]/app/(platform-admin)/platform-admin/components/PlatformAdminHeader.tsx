"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PlatformAdminUser {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
}

interface PlatformAdminHeaderProps {
  adminUser: PlatformAdminUser | null;
  locale: string;
}

export function PlatformAdminHeader({ adminUser, locale }: PlatformAdminHeaderProps) {
  const t = useTranslations("platformAdmin");
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push(`/${locale}/app/sign-in`);
  };

  const navItems = [
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
    {
      href: `/${locale}/app/platform-admin/api-keys`,
      label: t("nav.apiKeys"),
      icon: Key,
      active: pathname.includes("/platform-admin/api-keys"),
    },
    {
      href: `/${locale}/app/platform-admin/changelog`,
      label: t("nav.changelog"),
      icon: ScrollText,
      active: pathname.includes("/platform-admin/changelog"),
    },
  ];

  const initials = adminUser
    ? `${adminUser.firstName?.[0] || ""}${adminUser.lastName?.[0] || ""}`.toUpperCase() || "PA"
    : "PA";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/app/platform-admin`}
              className="flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="font-semibold">Oikion</span>
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  {t("header.platformAdmin")}
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant={item.active ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(
                    "gap-2",
                    item.active && "bg-secondary"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Back to App Link */}
            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <Link href={`/${locale}/app`}>
                {t("header.backToApp")}
              </Link>
            </Button>

            {/* Admin User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={adminUser?.avatar || undefined}
                      alt={adminUser?.email || "Admin"}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {adminUser?.firstName} {adminUser?.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {adminUser?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href={`/${locale}/app/platform-admin`}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t("nav.dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href={`/${locale}/app/platform-admin/users`}>
                    <Users className="mr-2 h-4 w-4" />
                    {t("nav.users")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href={`/${locale}/app/platform-admin/organizations`}>
                    <Building2 className="mr-2 h-4 w-4" />
                    {t("nav.organizations")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href={`/${locale}/app/platform-admin/referrals`}>
                    <Gift className="mr-2 h-4 w-4" />
                    {t("nav.referrals")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href={`/${locale}/app/platform-admin/feedback`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t("nav.feedback")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href={`/${locale}/app/platform-admin/api-keys`}>
                    <Key className="mr-2 h-4 w-4" />
                    {t("nav.apiKeys")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href={`/${locale}/app/platform-admin/changelog`}>
                    <ScrollText className="mr-2 h-4 w-4" />
                    {t("nav.changelog")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem asChild className="sm:hidden">
                  <Link href={`/${locale}/app`}>
                    {t("header.backToApp")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("header.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}






