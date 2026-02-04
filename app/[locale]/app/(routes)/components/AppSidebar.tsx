// app/[locale]/(routes)/components/AppSidebar.tsx
"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavSecondary } from "@/components/nav-secondary"
import { ReferralPromoBox } from "@/components/referral/ReferralPromoBox"
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
import { useWorkspaceContext } from "@/hooks/use-workspace-context"
import { type ModuleId } from "@/lib/permissions/types"
import { useNotificationCounts } from "@/hooks/swr"

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
}: AppSidebarProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const { isPersonalWorkspace } = useWorkspaceContext()

  // Fetch notification counts for sidebar badges (polls every 30 seconds)
  const { counts: notificationCounts } = useNotificationCounts({
    refreshInterval: 30000,
  })

  const { navGroups, navSecondaryItems } = React.useMemo(() => 
    getNavigationConfig({
      dict,
      modules,
      pathname,
      locale,
      onFeedbackClick: () => setFeedbackOpen(true),
      isPlatformAdmin,
      isPersonalWorkspace,
      accessibleModules,
    }), 
    [pathname, locale, modules, dict, isPlatformAdmin, isPersonalWorkspace, accessibleModules]
  )

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="w-full space-y-2">
              <WorkspaceToggle />
              {!isPersonalWorkspace && <AgencyOrganizationSwitcher />}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain 
          groups={navGroups} 
          pathname={pathname} 
          notificationCounts={notificationCounts}
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
        <NavUser user={user} />
      </SidebarFooter>
      <FeedbackSheet open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </Sidebar>
  )
}