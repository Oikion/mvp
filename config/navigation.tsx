import { HouseIcon } from "@/components/ui/HouseIcon"
import { UsersRoundIcon } from "@/components/ui/UsersRoundIcon"
import { SettingsIcon } from "@/components/ui/SettingsIcon"
import { ChartBarIcon } from "@/components/ui/ChartBarIcon"
import { DashboardIcon } from "@/components/ui/DashboardIcon"
import { ContactRoundIcon } from "@/components/ui/ContactRoundIcon"
import { ClipboardListIcon } from "@/components/ui/ClipboardListIcon"
import { FeedbackIcon } from "@/components/ui/FeedbackIcon"
import { CalendarIcon } from "@/components/ui/CalendarIcon"
import { FileTextIcon } from "@/components/ui/FileTextIcon"
// HandCoinsIcon import removed - was used for Deals navigation (retained for future use)
// import { HandCoinsIcon } from "@/components/ui/HandCoinsIcon"
// NetworkIcon import removed - was used for Connections standalone nav item (merged into Profile)
// import { NetworkIcon } from "@/components/ui/NetworkIcon"
import { InboxIcon } from "@/components/ui/InboxIcon"
import { UserCogIcon } from "@/components/ui/UserCogIcon"
import { FeedIcon } from "@/components/ui/FeedIcon"
import { SocialFeedIcon } from "@/components/ui/SocialFeedIcon"
import { UsersIcon } from "@/components/ui/UsersIcon"
import { ShieldIcon } from "@/components/ui/ShieldIcon"
import { MessageCircleIcon } from "@/components/ui/MessageCircleIcon"
import { Target } from "lucide-react"
import { type ModuleId } from "@/lib/permissions/types"
import { isRouteActive } from "@/lib/navigation/route-utils"

export interface NavItem {
  title: string
  url: string
  icon: any
  isActive?: boolean
  items?: { title: string; url: string }[]
  moduleId?: ModuleId // For permission-based filtering
  badge?: string // Optional badge text (e.g., "1.0", "New", "Beta")
  badgeClassName?: string // Custom className for badge styling (e.g., gradients)
  labelClassName?: string // Custom className for label text (e.g., gradient text)
  iconClassName?: string // Custom className for icon color (separate from gradient text)
  notificationKey?: string // Key to match notification counts for sidebar badges
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

  // Overview - Dashboard & Upcoming
  const overviewItems: NavItem[] = [
    ...(canAccess("dashboard") ? [{
      title: dict.navigation.ModuleMenu.dashboard,
      url: "/app",
      icon: DashboardIcon,
      isActive: isRouteActive(pathname, "/app", locale, { exact: true }),
      moduleId: "dashboard" as ModuleId,
    }] : []),
    ...(canAccess("feed") ? [{
      title: dict.navigation.ModuleMenu.feed || "Upcoming",
      url: "/app/upcoming",
      icon: FeedIcon,
      isActive: isRouteActive(pathname, "/app/upcoming", locale),
      moduleId: "feed" as ModuleId,
    }] : []),
  ]

  // Core Business - Properties & Clients
  const coreBusinessItems: NavItem[] = [
    ...(canAccess("mls") ? [{
      title: dict.navigation.ModuleMenu.mls.title,
      url: "/app/mls",
      icon: HouseIcon,
      isActive: isRouteActive(pathname, "/app/mls", locale),
      moduleId: "mls" as ModuleId,
      notificationKey: "mls",
      items: [
        {
          title: dict.navigation.ModuleMenu.mls.properties || "All Properties",
          url: "/app/mls",
        },
        {
          title: dict.navigation.ModuleMenu.mls.listings || "Listings",
          url: "/app/mls/listings",
        },
      ],
    }] : []),
    // CRM module - always available based on user permissions
    ...(canAccess("crm") ? [{
      title: dict.navigation.ModuleMenu.crm.title,
      url: "/app/crm",
      icon: ContactRoundIcon,
      isActive: isRouteActive(pathname, "/app/crm", locale),
      moduleId: "crm" as ModuleId,
      notificationKey: "crm",
    }] : []),
    // Mandates module - buyer/renter briefs (shares CRM permission)
    ...(canAccess("crm") ? [{
      title: dict.navigation.ModuleMenu.mandates?.title || "Mandates",
      url: "/app/mandates",
      icon: ClipboardListIcon,
      isActive: isRouteActive(pathname, "/app/mandates", locale),
      moduleId: "crm" as ModuleId,
      notificationKey: "mandates",
    }] : []),
  ]

  // Network - Feed, Profile, Messages, Shared
  // Outer gate: org must have the "network" feature enabled.
  // Inner gates: per-user/per-role module access within an enabled org.
  const networkItems: NavItem[] = canAccess("network") ? [
    ...(canAccess("social") ? [{
      title: dict.navigation.ModuleMenu.social?.feed || "Feed",
      url: "/app/network/feed",
      icon: SocialFeedIcon,
      isActive: isRouteActive(pathname, "/app/network/feed", locale),
      moduleId: "social" as ModuleId,
      notificationKey: "socialFeed",
    }] : []),
    ...(canAccess("social") ? [{
      title: dict.navigation.ModuleMenu.social?.messages || "Messages",
      url: "/app/network/messages",
      icon: MessageCircleIcon,
      isActive: isRouteActive(pathname, "/app/network/messages", locale),
      moduleId: "social" as ModuleId,
      notificationKey: "messages",
    }] : []),
    ...(canAccess("social") ? [{
      title: dict.navigation.ModuleMenu.social?.sharingHub || "Sharing Hub",
      url: "/app/network/sharing-hub",
      icon: InboxIcon,
      isActive: isRouteActive(pathname, "/app/network/sharing-hub", locale) || isRouteActive(pathname, "/app/network/shared", locale),
      moduleId: "social" as ModuleId,
      notificationKey: "sharedWithMe",
    }] : []),
    ...(canAccess("social") ? [{
      title: dict.navigation.ModuleMenu.social?.profile || "Profile",
      url: "/app/network/profile",
      icon: UserCogIcon,
      isActive: isRouteActive(pathname, "/app/network/profile", locale),
      moduleId: "social" as ModuleId,
      notificationKey: "connections",
    }] : []),
  ] : []

  // Tools - Calendar, Messages, Documents, Reports
  const toolsItems: NavItem[] = [
    ...(canAccess("calendar") ? [{
      title: dict.navigation.ModuleMenu.calendar,
      url: "/app/calendar",
      icon: CalendarIcon,
      isActive: isRouteActive(pathname, "/app/calendar", locale),
      moduleId: "calendar" as ModuleId,
      notificationKey: "calendar",
    }] : []),
    ...(canAccess("documents") ? [{
      title: dict.navigation.ModuleMenu.documents,
      url: "/app/documents",
      icon: FileTextIcon,
      isActive: isRouteActive(pathname, "/app/documents", locale),
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
    // Reports module - always available based on user permissions
    ...(canAccess("reports") ? [{
      title: dict.navigation.ModuleMenu.reports,
      url: "/app/reports",
      icon: ChartBarIcon,
      isActive: isRouteActive(pathname, "/app/reports", locale),
      moduleId: "reports" as ModuleId,
    }] : []),
    // Matchmaking - client-property matching analytics
    ...(canAccess("mls") && canAccess("crm") ? [{
      title: dict.navigation.ModuleMenu.matchmaking || "Matchmaking",
      url: "/app/matchmaking",
      icon: Target,
      isActive: isRouteActive(pathname, "/app/matchmaking", locale),
      badge: "1.0",
      badgeClassName: "bg-rose-400/15 text-rose-400 dark:text-rose-400/70 border-0 shadow-sm hover:bg-rose-400/25",
      iconClassName: "text-rose-400 dark:text-rose-400/70",
      labelClassName: "text-rose-400 dark:text-rose-400/70 font-semibold",
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
        isActive: isRouteActive(pathname, "/app/employees", locale),
        moduleId: "employees" as ModuleId,
      }] : []),
      ...(canAccess("admin") ? [{
        title: dict.navigation.ModuleMenu.settings,
        url: "/app/admin",
        icon: SettingsIcon,
        isActive: isRouteActive(pathname, "/app/admin", locale) && !isRouteActive(pathname, "/app/platform-admin", locale),
        moduleId: "admin" as ModuleId,
      }] : []),
    ]),
    // Platform Admin - only visible to platform admins
    ...(isPlatformAdmin ? [{
      title: dict.navigation.ModuleMenu.platformAdmin || "Platform Admin",
      url: "/app/platform-admin",
      icon: ShieldIcon,
      isActive: isRouteActive(pathname, "/app/platform-admin", locale),
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





