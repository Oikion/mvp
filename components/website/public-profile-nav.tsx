"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/website/button";
import { Logo } from "@/components/website/logo";
import { ThemeAndLanguageToggle } from "@/components/website/theme-language-toggle";

interface PublicProfileNavProps {
  locale: string;
}

export function PublicProfileNav({ locale }: PublicProfileNavProps) {
  const t = useTranslations("profile");
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href={`/${locale}`} aria-label="Oikion Home">
            <Logo size="default" />
          </Link>
          <div className="flex items-center gap-2">
            {isLoaded && isSignedIn ? (
              <>
                {/* Dashboard button */}
                <Button size="sm" variant="outline" asChild>
                  <Link
                    href={`/${locale}/app`}
                    className="flex items-center gap-1.5"
                  >
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">
                      {t("publicProfile.nav.dashboard")}
                    </span>
                  </Link>
                </Button>

                {/* Account menu — mirrors sidebar NavUser pattern */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="h-7 w-7">
                        <AvatarImage
                          src={user?.imageUrl || ""}
                          alt={user?.fullName || ""}
                        />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                          {user?.fullName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium leading-none text-foreground truncate max-w-[120px]">
                          {user?.fullName || user?.username}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate max-w-[120px]">
                          {user?.primaryEmailAddress?.emailAddress}
                        </p>
                      </div>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Mobile-only: show name/email in menu */}
                    <DropdownMenuLabel className="sm:hidden p-0 font-normal">
                      <div className="flex items-center gap-2 px-2 py-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user?.imageUrl || ""}
                            alt={user?.fullName || ""}
                          />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {user?.fullName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {user?.fullName || user?.username}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user?.primaryEmailAddress?.emailAddress}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="sm:hidden" />
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link href={`/${locale}/app/profile`} className="flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                          Account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/${locale}/app/notifications`} className="flex items-center gap-2">
                          <Bell className="h-4 w-4" aria-hidden="true" />
                          Notifications
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut()}
                      className="flex items-center gap-2 text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : isLoaded ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/${locale}/app/sign-in`}>
                  {t("publicProfile.nav.signIn")}
                </Link>
              </Button>
            ) : (
              <div className="h-9 w-20 rounded-md bg-muted animate-pulse" />
            )}
            <ThemeAndLanguageToggle />
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
