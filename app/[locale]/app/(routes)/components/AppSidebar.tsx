// app/[locale]/(routes)/components/AppSidebar.tsx
"use client"

import * as React from "react"
import Image from "next/image"
import { Link } from "@/navigation"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { useTheme } from "next-themes"

import { NavMain } from "@/components/nav-main"
import { updatePinnedNavUrls } from "@/actions/user/pin-nav"
import { NavUser } from "@/components/nav-user"
import { NavSecondary } from "@/components/nav-secondary"
import { ReferralPromoBox } from "@/components/referral/ReferralPromoBox"
import { TourTriggerButton } from "@/components/tour/DashboardTour"
import FeedbackSheet from "./FeedbackSheet"
import { WorkspaceToggle } from "@/components/workspace/WorkspaceToggle"
import { AgencyOrganizationSwitcher } from "@/components/workspace/AgencyOrganizationSwitcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getNavigationConfig } from "@/config/navigation"
import { normalizePath } from "@/lib/navigation/route-utils"
import { useWorkspaceContext } from "@/hooks/use-workspace-context"
import { type ModuleId } from "@/lib/permissions/types"
import { type ActionPermission } from "@/lib/permissions/action-permissions"
import { useNotificationCounts, useArchiveCounts } from "@/hooks/swr"

interface AppSidebarProps {
  modules: any
  dict: any
  user: {
    name: string
    email: string
    avatar: string
  }
  isPlatformAdmin?: boolean
  referralBoxDismissed?: boolean
  hasReferralCode?: boolean
  referralApplicationStatus?: "PENDING" | "APPROVED" | "DENIED" | null
  accessibleModules?: ModuleId[]
  accessibleActions?: ActionPermission[]
  pinnedNavUrls?: string[]
}

export function AppSidebar({
  modules,
  dict,
  user,
  isPlatformAdmin = false,
  referralBoxDismissed = false,
  hasReferralCode = false,
  referralApplicationStatus = null,
  accessibleModules,
  accessibleActions,
  pinnedNavUrls,
}: AppSidebarProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const [pinnedUrls, setPinnedUrls] = React.useState<string[]>(
    pinnedNavUrls ?? []
  )
  const { isPersonalWorkspace } = useWorkspaceContext()
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isDarkSidebar =
    mounted &&
    (theme === "dark" ||
      theme === "estate-dark" ||
      theme === "twilight-lavender" ||
      (theme === "system" && resolvedTheme === "dark"))

  const handleTogglePin = React.useCallback(
    async (url: string) => {
      const isCurrentlyPinned = pinnedUrls.includes(url)
      const next = isCurrentlyPinned
        ? pinnedUrls.filter((u) => u !== url)
        : [...pinnedUrls, url].slice(0, 5)
      const previous = pinnedUrls

      setPinnedUrls(next)

      const result = await updatePinnedNavUrls(next)
      if (!result.success) {
        setPinnedUrls(previous)
      }
    },
    [pinnedUrls]
  )

  // Fetch notification counts for sidebar badges (polls every 30 seconds)
  const { counts: notificationCounts } = useNotificationCounts({
    refreshInterval: 30000,
  })

  const canViewArchive = accessibleActions?.includes("archive:view" as any) ?? false
  const { counts: archiveCounts } = useArchiveCounts(canViewArchive)

  const { navGroups, navSecondaryItems } = React.useMemo(
    () =>
      getNavigationConfig({
        dict,
        modules,
        pathname,
        locale,
        onFeedbackClick: () => setFeedbackOpen(true),
        isPlatformAdmin,
        isPersonalWorkspace,
        accessibleModules,
        accessibleActions,
        archiveCounts,
      }),
    [pathname, locale, modules, dict, isPlatformAdmin, isPersonalWorkspace, accessibleModules, accessibleActions, archiveCounts]
  )

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="px-2 py-3">
          <Link href="/" className="inline-block">
            <Image
              src={
                isDarkSidebar
                  ? "/assets/logos/logo-white.svg"
                  : "/assets/logos/logo-dark.svg"
              }
              alt="Oikion"
              width={96}
              height={24}
              priority
            />
          </Link>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="w-full space-y-2">
              <WorkspaceToggle />
              <AgencyOrganizationSwitcher />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent data-tour="sidebar-nav">
        <NavMain
          groups={navGroups}
          pathname={normalizePath(pathname, locale)}
          notificationCounts={notificationCounts}
          pinnedUrls={pinnedUrls}
          onTogglePin={handleTogglePin}
          dict={dict}
        />
      </SidebarContent>
      <SidebarFooter>
        {/* Feedback link moved to footer, above referral box */}
        <NavSecondary items={navSecondaryItems} />
        {/* Referral promo box - between feedback and user profile */}
        <ReferralPromoBox
          initialDismissed={referralBoxDismissed}
          hasReferralCode={hasReferralCode}
          applicationStatus={referralApplicationStatus}
        />
        <TourTriggerButton />
        <NavUser user={user} />
      </SidebarFooter>
      <FeedbackSheet open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </Sidebar>
  )
}
