// app/[locale]/(routes)/components/AppSidebar.tsx
"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"

import { OrganizationSwitcher } from "@clerk/nextjs"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavSecondary } from "@/components/nav-secondary"
import FeedbackSheet from "./FeedbackSheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useClerkTheme } from "@/lib/clerk-theme"
import { getNavigationConfig } from "@/config/navigation"

interface AppSidebarProps {
  modules: any
  dict: any
  build: number
  user: {
    name: string
    email: string
    avatar: string
  }
  isPlatformAdmin?: boolean
}

export function AppSidebar({ modules, dict, build, user, isPlatformAdmin = false }: AppSidebarProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const { appearance } = useClerkTheme()
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)

  const { navGroups, navSecondaryItems } = React.useMemo(() => 
    getNavigationConfig({
      dict,
      modules,
      pathname,
      locale,
      onFeedbackClick: () => setFeedbackOpen(true),
      isPlatformAdmin
    }), 
    [pathname, locale, modules, dict, isPlatformAdmin]
  )

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="w-full">
              <OrganizationSwitcher
                appearance={{
                  ...appearance,
                  elements: {
                    ...appearance?.elements,
                    organizationSwitcherTrigger: "w-full justify-start px-2 py-1.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors",
                    organizationSwitcherPopoverCard: "shadow-lg",
                    organizationSwitcherPopoverActionButton: "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                    organizationSwitcherPopoverActionButton__manageOrganization: "text-muted-foreground hover:text-foreground hover:bg-accent border-0 font-normal",
                    organizationPreviewMainIdentifier: "font-medium",
                    organizationSwitcherPreviewButton: "hover:bg-accent/50 transition-colors rounded-md border border-border !bg-transparent !text-foreground",
                    organizationPreview: "!bg-transparent",
                    organizationPreviewAvatarBox: "!bg-transparent",
                    organizationPreviewAvatarImage: "!bg-transparent",
                    organizationPreviewTextContainer: "!bg-transparent",
                    organizationSwitcherPopoverActionButton__createOrganization: "gap-1 bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-950 dark:hover:bg-violet-900 dark:text-violet-300 border-violet-200 dark:border-violet-800 font-medium",
                    organizationSwitcherPopoverActionButtonIcon: "mr-0 -ml-1",
                    organizationSwitcherPopoverActionButtonText: "",
                    badge: "bg-orange-600/90 text-white font-semibold",
                  },
                  variables: {
                    ...appearance?.variables,
                    colorBackground: "transparent",
                    colorPrimary: "transparent",
                  },
                }}
                hidePersonal
                createOrganizationMode="navigation"
                createOrganizationUrl={`/${locale}/create-organization`}
                organizationProfileMode="navigation"
                organizationProfileUrl={`/${locale}/organization`}
                afterCreateOrganizationUrl={`/${locale}`}
                afterSelectOrganizationUrl={`/${locale}`}
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <FeedbackSheet open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </Sidebar>
  )
}