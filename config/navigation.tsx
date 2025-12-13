import { HouseIcon } from "@/components/ui/HouseIcon"
import { UsersRoundIcon } from "@/components/ui/UsersRoundIcon"
import { SettingsIcon } from "@/components/ui/SettingsIcon"
import { SparklesIcon } from "@/components/ui/SparklesIcon"
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

export interface NavItem {
  title: string
  url: string
  icon: any
  isActive?: boolean
  items?: { title: string; url: string }[]
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
}

export function getNavigationConfig({
  dict,
  modules,
  pathname,
  locale,
  onFeedbackClick,
  isPlatformAdmin = false,
}: NavigationConfigProps) {
  const categories = dict.navigation.ModuleMenu.categories || {
    overview: "Overview",
    coreBusiness: "Core Business",
    network: "Network",
    tools: "Tools",
    organization: "Organization",
  }

  // Overview - Dashboard & Feed
  const overviewItems: NavItem[] = [
    {
      title: dict.navigation.ModuleMenu.dashboard,
      url: "/",
      icon: DashboardIcon,
      isActive: pathname === `/${locale}` || pathname === `/${locale}/`,
    },
    {
      title: dict.navigation.ModuleMenu.feed || "Feed",
      url: "/feed",
      icon: FeedIcon,
      isActive: pathname.includes("/feed"),
    },
  ]

  // Core Business - Properties & Clients
  const coreBusinessItems: NavItem[] = [
    {
      title: dict.navigation.ModuleMenu.mls.title,
      url: "/mls/properties",
      icon: HouseIcon,
      isActive: pathname.includes("/mls"),
    },
    // Add CRM module if enabled
    ...(modules.some((m: any) => m.name === "crm" && m.enabled) ? [{
      title: dict.navigation.ModuleMenu.crm.title,
      url: "/crm/clients",
      icon: ContactRoundIcon,
      isActive: pathname.includes("/crm"),
    }] : []),
  ]

  // Network - Social Feed, Connections, Audiences, Shared, Deals, Public Profile
  const networkItems: NavItem[] = [
    {
      title: dict.navigation.ModuleMenu.social?.socialFeed || "Social Feed",
      url: "/social-feed",
      icon: SocialFeedIcon,
      isActive: pathname.includes("/social-feed"),
    },
    {
      title: dict.navigation.ModuleMenu.social?.publicProfile || "Public Profile",
      url: "/profile/public",
      icon: UserCogIcon,
      isActive: pathname.includes("/profile/public"),
    },
    {
      title: dict.navigation.ModuleMenu.social?.connections || "Connections",
      url: "/connections",
      icon: NetworkIcon,
      isActive: pathname.includes("/connections"),
    },
    {
      title: dict.navigation.ModuleMenu.social?.audiences || "Audiences",
      url: "/audiences",
      icon: UsersIcon,
      isActive: pathname.includes("/audiences"),
    },
    {
      title: dict.navigation.ModuleMenu.social?.sharedWithMe || "Shared With Me",
      url: "/shared-with-me",
      icon: InboxIcon,
      isActive: pathname.includes("/shared-with-me"),
    },
    {
      title: dict.navigation.ModuleMenu.social?.deals || "Deals",
      url: "/deals",
      icon: HandCoinsIcon,
      isActive: pathname.includes("/deals"),
    },
  ]

  // Tools - Calendar, Documents, ChatGPT, Reports
  const toolsItems: NavItem[] = [
    {
      title: dict.navigation.ModuleMenu.calendar,
      url: "/calendar",
      icon: CalendarIcon,
      isActive: pathname.includes("/calendar"),
    },
    {
      title: dict.navigation.ModuleMenu.documents,
      url: "/documents",
      icon: FileTextIcon,
      isActive: pathname.includes("/documents"),
      items: [
        {
          title: dict.navigation.ModuleMenu.documentsAll || "All Documents",
          url: "/documents",
        },
        {
          title: dict.navigation.ModuleMenu.documentsTemplates || "Templates",
          url: "/documents/templates",
        },
      ],
    },
    // Add ChatGPT module if enabled
    ...(modules.some((m: any) => m.name === "openai" && m.enabled) ? [{
      title: dict.navigation.ModuleMenu.chatGPT,
      url: "/openAi",
      icon: SparklesIcon,
      isActive: pathname.includes("/openAi"),
    }] : []),
    // Add Reports module if enabled
    ...(modules.some((m: any) => m.name === "reports" && m.enabled) ? [{
      title: dict.navigation.ModuleMenu.reports,
      url: "/reports",
      icon: ChartBarIcon,
      isActive: pathname.includes("/reports"),
    }] : []),
  ]

  // Organization - Employees, Admin, Platform Admin (if applicable)
  const organizationItems: NavItem[] = [
    {
      title: dict.navigation.ModuleMenu.employees,
      url: "/employees",
      icon: UsersRoundIcon,
      isActive: pathname.includes("/employees"),
    },
    {
      title: dict.navigation.ModuleMenu.settings,
      url: "/admin",
      icon: SettingsIcon,
      isActive: pathname.includes("/admin") && !pathname.includes("/platform-admin"),
    },
    // Platform Admin - only visible to platform admins
    ...(isPlatformAdmin ? [{
      title: dict.navigation.ModuleMenu.platformAdmin || "Platform Admin",
      url: "/platform-admin",
      icon: ShieldIcon,
      isActive: pathname.includes("/platform-admin"),
    }] : []),
  ]

  const navGroups: NavGroup[] = [
    { label: categories.overview, items: overviewItems },
    { label: categories.coreBusiness, items: coreBusinessItems },
    { label: categories.tools, items: toolsItems },
    { label: categories.network, items: networkItems },
    { label: categories.organization, items: organizationItems },
  ]

  const navSecondaryItems: NavSecondaryItem[] = [
    {
      title: dict.navigation.ModuleMenu.feedback,
      icon: FeedbackIcon,
      onClick: onFeedbackClick,
    },
  ]

  return { navGroups, navSecondaryItems }
}





