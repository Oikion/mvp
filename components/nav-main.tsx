"use client"

import { 
  ChevronDown, 
  ChevronRight, 
  LayoutGrid, 
  Briefcase, 
  Wrench, 
  Globe2, 
  Building2,
  type LucideIcon
} from "lucide-react"
import { Link } from "@/navigation"
import * as React from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface NavMainItem {
  title: string
  url: string
  icon: any
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
  badge?: string
  badgeClassName?: string // Custom className for badge styling (e.g., gradients)
  labelClassName?: string // Custom className for label text (e.g., gradient text)
  iconClassName?: string // Custom className for icon color (separate from gradient text)
  notificationKey?: string // Key to match notification counts for sidebar badges
}

interface NavGroup {
  label: string
  items: NavMainItem[]
}

// Type for notification counts by page
type NotificationCounts = Record<string, number>

// Category styling configuration (icon + color)
interface CategoryStyle {
  icon: LucideIcon
  iconColor: string      // Icon color class
  hoverBg: string        // Hover background color
  activeBorder: string   // Left border accent when items are active
}

const getCategoryStyle = (label: string): CategoryStyle => {
  const styleMap: Record<string, CategoryStyle> = {
    // English
    "Overview": {
      icon: LayoutGrid,
      iconColor: "text-sky-500 dark:text-sky-400",
      hoverBg: "hover:bg-sky-500/10",
      activeBorder: "border-l-sky-500",
    },
    "Core Business": {
      icon: Briefcase,
      iconColor: "text-success dark:text-emerald-400",
      hoverBg: "hover:bg-success/10",
      activeBorder: "border-l-emerald-500",
    },
    "Tools": {
      icon: Wrench,
      iconColor: "text-warning dark:text-amber-400",
      hoverBg: "hover:bg-warning/10",
      activeBorder: "border-l-amber-500",
    },
    "Network": {
      icon: Globe2,
      iconColor: "text-violet-500 dark:text-violet-400",
      hoverBg: "hover:bg-violet-500/10",
      activeBorder: "border-l-violet-500",
    },
    "Organization": {
      icon: Building2,
      iconColor: "text-muted-foreground dark:text-muted-foreground",
      hoverBg: "hover:bg-slate-500/10",
      activeBorder: "border-l-slate-500",
    },
    // Greek
    "Επισκόπηση": {
      icon: LayoutGrid,
      iconColor: "text-sky-500 dark:text-sky-400",
      hoverBg: "hover:bg-sky-500/10",
      activeBorder: "border-l-sky-500",
    },
    "Βασική Επιχείρηση": {
      icon: Briefcase,
      iconColor: "text-success dark:text-emerald-400",
      hoverBg: "hover:bg-success/10",
      activeBorder: "border-l-emerald-500",
    },
    "Εργαλεία": {
      icon: Wrench,
      iconColor: "text-warning dark:text-amber-400",
      hoverBg: "hover:bg-warning/10",
      activeBorder: "border-l-amber-500",
    },
    "Δίκτυο": {
      icon: Globe2,
      iconColor: "text-violet-500 dark:text-violet-400",
      hoverBg: "hover:bg-violet-500/10",
      activeBorder: "border-l-violet-500",
    },
    "Οργανισμός": {
      icon: Building2,
      iconColor: "text-muted-foreground dark:text-muted-foreground",
      hoverBg: "hover:bg-slate-500/10",
      activeBorder: "border-l-slate-500",
    },
  }
  
  return styleMap[label] || {
    icon: LayoutGrid,
    iconColor: "text-sidebar-foreground/70",
    hoverBg: "hover:bg-sidebar-accent/50",
    activeBorder: "border-l-sidebar-foreground",
  }
}

function NavMainMenuItem({ 
  item, 
  pathname = "",
  notificationCounts = {},
}: { 
  readonly item: NavMainItem
  readonly pathname?: string
  readonly notificationCounts?: NotificationCounts
}) {
  const iconRef = React.useRef<any>(null)
  const currentPath = pathname || ""
  
  // Get notification count for this item
  const notificationCount = item.notificationKey ? notificationCounts[item.notificationKey] ?? 0 : 0

  return (
    <Collapsible asChild defaultOpen={item.isActive}>
      <SidebarMenuItem>
        <SidebarMenuButton 
          asChild 
          tooltip={item.title}
          isActive={item.isActive}
          onMouseEnter={() => iconRef.current?.startAnimation?.()}
          onMouseLeave={() => iconRef.current?.stopAnimation?.()}
        >
          {/* prefetch=true enables eager prefetching for faster navigation */}
          <Link href={item.url} prefetch={true}>
            <item.icon 
              ref={iconRef} 
              size={16} 
              className={cn("mr-1", item.iconClassName || item.labelClassName)} 
            />
            <span className={item.labelClassName}>{item.title}</span>
            {/* Notification badge takes priority over static badge */}
            {notificationCount > 0 ? (
              <Badge 
                variant="destructive" 
                className="ml-auto text-[10px] py-0 px-1.5 h-4 min-w-4 flex items-center justify-center animate-pulse"
              >
                {notificationCount > 99 ? "99+" : notificationCount}
              </Badge>
            ) : item.badge ? (
              <Badge 
                variant={item.badgeClassName ? "outline" : "secondary"} 
                className={cn(
                  "ml-auto text-[10px] py-0 px-1.5 h-4 font-semibold",
                  item.badgeClassName
                )}
              >
                {item.badge}
              </Badge>
            ) : null}
          </Link>
        </SidebarMenuButton>
        {item.items?.length ? (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="data-[state=open]:rotate-90">
                <ChevronRight />
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items.map((subItem, subIndex) => {
                  // Check if sub-item is active by exact pathname matching
                  // Remove query params and hash, normalize trailing slashes
                  const normalizedCurrentPath = currentPath.split('?')[0].split('#')[0].replace(/\/$/, '')
                  const normalizedSubItemUrl = subItem.url.replace(/\/$/, '')
                  const isSubItemActive = normalizedCurrentPath === normalizedSubItemUrl
                  return (
                    <SidebarMenuSubItem key={subItem.url || `${subItem.title}-${subIndex}`}>
                      <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                        <Link href={subItem.url} prefetch={true}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  )
}

// Collapsible category group component
function CollapsibleNavGroup({ 
  group, 
  pathname,
  defaultOpen = true,
  showAlphaBadge = false,
  notificationCounts = {},
}: { 
  readonly group: NavGroup
  readonly pathname: string
  readonly defaultOpen?: boolean
  readonly showAlphaBadge?: boolean
  readonly notificationCounts?: NotificationCounts
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  
  // Check if any item in this group is active
  const hasActiveItem = React.useMemo(() => {
    return group.items.some(item => item.isActive)
  }, [group.items])

  // Check if any item in this group has notifications
  const groupNotificationCount = React.useMemo(() => {
    return group.items.reduce((total, item) => {
      if (item.notificationKey) {
        return total + (notificationCounts[item.notificationKey] ?? 0)
      }
      return total
    }, 0)
  }, [group.items, notificationCounts])

  // Auto-expand if there's an active item
  React.useEffect(() => {
    if (hasActiveItem && !isOpen) {
      setIsOpen(true)
    }
  }, [hasActiveItem, isOpen])

  const categoryStyle = getCategoryStyle(group.label)
  const CategoryIcon = categoryStyle.icon

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarGroup className="py-0">
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between px-2 py-1.5 rounded-md",
              "text-[13px] font-bold tracking-normal",
              "text-sidebar-foreground hover:text-sidebar-foreground",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              "group-data-[collapsible=icon]:hidden",
              categoryStyle.hoverBg
            )}
          >
            <span className="flex items-center gap-2">
              <CategoryIcon className={cn("h-4 w-4", categoryStyle.iconColor)} />
              {group.label}
              {showAlphaBadge && (
                <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                  Alpha
                </Badge>
              )}
              {/* Show total notification count for collapsed group */}
              {!isOpen && groupNotificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="text-[10px] py-0 px-1.5 h-4 min-w-4 flex items-center justify-center"
                >
                  {groupNotificationCount > 99 ? "99+" : groupNotificationCount}
                </Badge>
              )}
            </span>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-sidebar-foreground/60 transition-transform duration-200",
                !isOpen && "-rotate-90"
              )} 
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className={cn(
          "transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
          isOpen && "mb-2"
        )}>
          <SidebarMenu className={cn(
            "mt-0.5 border-l-2 ml-2 pl-1",
            categoryStyle.activeBorder
          )}>
            {group.items.map((item, index) => (
              <NavMainMenuItem 
                key={item.url || `${item.title}-${index}`} 
                item={item} 
                pathname={pathname}
                notificationCounts={notificationCounts}
              />
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

export function NavMain({
  groups,
  pathname = "",
  notificationCounts = {},
}: {
  readonly groups: NavGroup[]
  readonly pathname?: string
  readonly notificationCounts?: NotificationCounts
}) {
  const currentPath = pathname || ""
  
  // Check if label should have Alpha badge (Tools/Network in English or Greek)
  const shouldShowAlphaBadge = (label: string) => {
    const alphaLabels = ["Tools", "Network", "Εργαλεία", "Δίκτυο"]
    return alphaLabels.includes(label)
  }
  
  return (
    <>
      {groups.map((group, groupIndex) => (
        <CollapsibleNavGroup 
          key={group.label || `group-${groupIndex}`}
          group={group}
          pathname={currentPath}
          defaultOpen={true}
          showAlphaBadge={shouldShowAlphaBadge(group.label)}
          notificationCounts={notificationCounts}
        />
      ))}
    </>
  )
}
