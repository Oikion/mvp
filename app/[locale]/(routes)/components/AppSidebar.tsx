// app/[locale]/(routes)/components/AppSidebar.tsx
"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"

import { HouseIcon } from "@/components/ui/HouseIcon"
import { UsersRoundIcon } from "@/components/ui/UsersRoundIcon"
import { SettingsIcon } from "@/components/ui/SettingsIcon"
import { SparklesIcon } from "@/components/ui/SparklesIcon"
import { ChartBarIcon } from "@/components/ui/ChartBarIcon"
import { DashboardIcon } from "@/components/ui/DashboardIcon"
import { ContactRoundIcon } from "@/components/ui/ContactRoundIcon"
import { FeedbackIcon } from "@/components/ui/FeedbackIcon"
import { Calendar as CalendarIcon, FileText } from "lucide-react"

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

interface AppSidebarProps {
  modules: any
  dict: any
  build: number
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function AppSidebar({ modules, dict, build, user }: AppSidebarProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const { appearance } = useClerkTheme()
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)

  // Transform your modules into the sidebar structure with proper active state detection
  const navMainItems = React.useMemo(() => [
    {
      title: dict.navigation.ModuleMenu.dashboard,
      url: "/",
      icon: DashboardIcon,
      isActive: pathname === `/${locale}` || pathname === `/${locale}/`,
    },
    // Add CRM module if enabled
    ...(modules.some((m: any) => m.name === "crm" && m.enabled) ? [{
      title: dict.navigation.ModuleMenu.crm.title,
      url: "/crm/clients",
      icon: ContactRoundIcon,
      isActive: pathname.includes("/crm"),
      items: [
        { title: dict.navigation.ModuleMenu.crm.accounts, url: "/crm/clients" },
      ]
    }] : []),
    // Add Properties module with sub-items
    {
      title: dict.navigation.ModuleMenu.mls.title,
      url: "/mls/properties",
      icon: HouseIcon,
      isActive: pathname.includes("/mls"),
      items: [
        { title: dict.navigation.ModuleMenu.mls.properties, url: "/mls/properties" },
      ]
    },
    // Add Employees module if enabled
    ...(modules.some((m: any) => m.name === "employee" && m.enabled) ? [{
      title: dict.navigation.ModuleMenu.employees,
      url: "/employees",
      icon: UsersRoundIcon,
      isActive: pathname.includes("/employees"),
    }] : []),
    // Add Reports module if enabled
    ...(modules.some((m: any) => m.name === "reports" && m.enabled) ? [{
      title: dict.navigation.ModuleMenu.reports,
      url: "/reports",
      icon: ChartBarIcon,
      isActive: pathname.includes("/reports"),
    }] : []),
    // Add ChatGPT module if enabled
    ...(modules.some((m: any) => m.name === "openai" && m.enabled) ? [{
      title: dict.navigation.ModuleMenu.chatGPT,
      url: "/openAi",
      icon: SparklesIcon,
      isActive: pathname.includes("/openAi"),
    }] : []),
    // Add Calendar
    {
      title: dict.navigation.ModuleMenu.calendar,
      url: `/calendar`,
      icon: CalendarIcon,
      isActive: pathname.includes("/calendar"),
    },
    // Add Documents
    {
      title: dict.navigation.ModuleMenu.documents,
      url: `/documents`,
      icon: FileText,
      isActive: pathname.includes("/documents"),
    },
    // Add Administration
    {
      title: dict.navigation.ModuleMenu.settings,
      url: "/admin",
      icon: SettingsIcon,
      isActive: pathname.includes("/admin"),
    },
  ], [pathname, locale, modules, dict])

  const navSecondaryItems = React.useMemo(() => [
    {
      title: dict.navigation.ModuleMenu.feedback,
      icon: FeedbackIcon,
      onClick: () => setFeedbackOpen(true),
    },
  ], [dict, setFeedbackOpen])

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
        <NavMain items={navMainItems} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <FeedbackSheet open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </Sidebar>
  )
}