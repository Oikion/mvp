import { HouseIcon } from "@/components/ui/HouseIcon"
import { UsersRoundIcon } from "@/components/ui/UsersRoundIcon"
import { SettingsIcon } from "@/components/ui/SettingsIcon"
import { ChartBarIcon } from "@/components/ui/ChartBarIcon"
import { DashboardIcon } from "@/components/ui/DashboardIcon"
import { ContactRoundIcon } from "@/components/ui/ContactRoundIcon"
import { FeedbackIcon } from "@/components/ui/FeedbackIcon"
import { CalendarIcon } from "@/components/ui/CalendarIcon"
import { FileTextIcon } from "@/components/ui/FileTextIcon"
import { HandCoinsIcon } from "@/components/ui/HandCoinsIcon"
import { NetworkIcon } from "@/components/ui/NetworkIcon"
import { InboxIcon } from "@/components/ui/InboxIcon"
import { UserCogIcon } from "@/components/ui/UserCogIcon"
import { FeedIcon } from "@/components/ui/FeedIcon"
import { SocialFeedIcon } from "@/components/ui/SocialFeedIcon"
import { UsersIcon } from "@/components/ui/UsersIcon"
import { ShieldIcon } from "@/components/ui/ShieldIcon"
import { type ModuleId } from "@/lib/permissions/types"

export interface NavItem {
  title: string
  url: string
  icon: any
  isActive?: boolean
  items?: { title: string; url: string }[]
  moduleId?: ModuleId // For permission-based filtering
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface NavSecondaryItem {
  title: string
  icon: any
  url?: string
  onClick?: () => void
}

interface NavigationConfigProps {
  dict: any
  modules: any[]
  pathname: string
  locale: string
  onFeedbackClick?: () => void
  isPlatformAdmin?: boolean
  isPersonalWorkspace?: boolean
  accessibleModules?: ModuleId[] // Modules the user can access
}

export function getNavigationConfig({
  dict,
  modules,
  pathname,
  locale,
  onFeedbackClick,
  isPlatformAdmin = false,
  isPersonalWorkspace = false,
  accessibleModules,
}: NavigationConfigProps) {
  const categories = dict.navigation.ModuleMenu.categories || {
    overview: "Overview",
    coreBusiness: "Core Business",
    network: "Network",
    tools: "Tools",
    organization: "Organization",
  }

  // Helper to check if user can access a module
  const canAccess = (moduleId: ModuleId): boolean => {
    // If no accessibleModules provided, allow all (for non-viewers)
    if (!accessibleModules) return true
    return accessibleModules.includes(moduleId)
  }

  // Overview - Dashboard & Feed
  const overviewItems: NavItem[] = [
    ...(canAccess("dashboard") ? [{
      title: dict.navigation.ModuleMenu.dashboard,
      url: "/app",
      icon: DashboardIcon,
      isActive: pathname === `/${locale}/app` || pathname === `/${locale}/app/`,
      moduleId: "dashboard" as ModuleId,
    }] : []),
    ...(canAccess("feed") ? [{
      title: dict.navigation.ModuleMenu.feed || "Feed",
      url: "/app/feed",
      icon: FeedIcon,
      isActive: pathname.includes("/app/feed"),
      moduleId: "feed" as ModuleId,
    }] : []),
  ]

  // Core Business - Properties & Clients
  const coreBusinessItems: NavItem[] = [
    ...(canAccess("mls") ? [{
      title: dict.navigation.ModuleMenu.mls.title,
      url: "/app/mls",
      icon: HouseIcon,
      isActive: pathname.includes("/app/mls"),
      moduleId: "mls" as ModuleId,
    }] : []),
    // Add CRM module if enabled and accessible
    ...(modules.some((m: any) => m.name === "crm" && m.enabled) && canAccess("crm") ? [{
      title: dict.navigation.ModuleMenu.crm.title,
      url: "/app/crm",
      icon: ContactRoundIcon,
      isActive: pathname.includes("/app/crm"),
      moduleId: "crm" as ModuleId,
    }] : []),
  ]

  // Network - Social Feed, Connections, Audiences, Shared, Deals, Public Profile
  const networkItems: NavItem[] = [
    ...(canAccess("social") ? [{
      title: dict.navigation.ModuleMenu.social?.socialFeed || "Social Feed",
      url: "/app/social-feed",
      icon: SocialFeedIcon,
      isActive: pathname.includes("/app/social-feed"),
      moduleId: "social" as ModuleId,
    }] : []),
    ...(canAccess("social") ? [{
      title: dict.navigation.ModuleMenu.social?.publicProfile || "Public Profile",
      url: "/app/profile/public",
      icon: UserCogIcon,
      isActive: pathname.includes("/app/profile/public"),
      moduleId: "social" as ModuleId,
    }] : []),
    ...(canAccess("social") ? [{
      title: dict.navigation.ModuleMenu.social?.connections || "Connections",
      url: "/app/connections",
      icon: NetworkIcon,
      isActive: pathname.includes("/app/connections"),
      moduleId: "social" as ModuleId,
    }] : []),
    ...(canAccess("audiences") ? [{
      title: dict.navigation.ModuleMenu.social?.audiences || "Audiences",
      url: "/app/audiences",
      icon: UsersIcon,
      isActive: pathname.includes("/app/audiences"),
      moduleId: "audiences" as ModuleId,
    }] : []),
    ...(canAccess("social") ? [{
      title: dict.navigation.ModuleMenu.social?.sharedWithMe || "Shared With Me",
      url: "/app/shared-with-me",
      icon: InboxIcon,
      isActive: pathname.includes("/app/shared-with-me"),
      moduleId: "social" as ModuleId,
    }] : []),
    ...(canAccess("deals") ? [{
      title: dict.navigation.ModuleMenu.social?.deals || "Deals",
      url: "/app/deals",
      icon: HandCoinsIcon,
      isActive: pathname.includes("/app/deals"),
      moduleId: "deals" as ModuleId,
    }] : []),
  ]

  // Tools - Calendar, Documents, Reports
  const toolsItems: NavItem[] = [
    ...(canAccess("calendar") ? [{
      title: dict.navigation.ModuleMenu.calendar,
      url: "/app/calendar",
      icon: CalendarIcon,
      isActive: pathname.includes("/app/calendar"),
      moduleId: "calendar" as ModuleId,
    }] : []),
    ...(canAccess("documents") ? [{
      title: dict.navigation.ModuleMenu.documents,
      url: "/app/documents",
      icon: FileTextIcon,
      isActive: pathname.includes("/app/documents"),
      moduleId: "documents" as ModuleId,
      items: [
        {
          title: dict.navigation.ModuleMenu.documentsAll || "All Documents",
          url: "/app/documents",
        },
        {
          title: dict.navigation.ModuleMenu.documentsTemplates || "Templates",
          url: "/app/documents/templates",
        },
      ],
    }] : []),
    // Add Reports module if enabled and accessible
    ...(modules.some((m: any) => m.name === "reports" && m.enabled) && canAccess("reports") ? [{
      title: dict.navigation.ModuleMenu.reports,
      url: "/app/reports",
      icon: ChartBarIcon,
      isActive: pathname.includes("/app/reports"),
      moduleId: "reports" as ModuleId,
    }] : []),
  ]

  // Organization - Employees, Admin, Platform Admin (if applicable)
  // Hide Employees and Admin Settings for personal workspaces
  const organizationItems: NavItem[] = [
    // Only show these when NOT in personal workspace and user has access
    ...(isPersonalWorkspace ? [] : [
      ...(canAccess("employees") ? [{
        title: dict.navigation.ModuleMenu.employees,
        url: "/app/employees",
        icon: UsersRoundIcon,
        isActive: pathname.includes("/app/employees"),
        moduleId: "employees" as ModuleId,
      }] : []),
      ...(canAccess("admin") ? [{
        title: dict.navigation.ModuleMenu.settings,
        url: "/app/admin",
        icon: SettingsIcon,
        isActive: pathname.includes("/app/admin") && !pathname.includes("/platform-admin"),
        moduleId: "admin" as ModuleId,
      }] : []),
    ]),
    // Platform Admin - only visible to platform admins
    ...(isPlatformAdmin ? [{
      title: dict.navigation.ModuleMenu.platformAdmin || "Platform Admin",
      url: "/app/platform-admin",
      icon: ShieldIcon,
      isActive: pathname.includes("/app/platform-admin"),
    }] : []),
  ]

  // Filter out empty groups
  const navGroups: NavGroup[] = [
    { label: categories.overview, items: overviewItems },
    { label: categories.coreBusiness, items: coreBusinessItems },
    { label: categories.tools, items: toolsItems },
    { label: categories.network, items: networkItems },
    // Only include Organization group if it has items
    ...(organizationItems.length > 0 ? [{ label: categories.organization, items: organizationItems }] : []),
  ].filter(group => group.items.length > 0)

  const navSecondaryItems: NavSecondaryItem[] = [
    {
      title: dict.navigation.ModuleMenu.feedback,
      icon: FeedbackIcon,
      onClick: onFeedbackClick,
    },
  ]

  return { navGroups, navSecondaryItems }
}





