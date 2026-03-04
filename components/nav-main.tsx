"use client"

import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Briefcase,
  Wrench,
  Globe2,
  Building2,
  Pin,
  PinOff,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
      iconColor: "text-success dark:text-success",
      hoverBg: "hover:bg-success/10",
      activeBorder: "border-l-emerald-500",
    },
    "Tools": {
      icon: Wrench,
      iconColor: "text-warning dark:text-warning",
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
      iconColor: "text-success dark:text-success",
      hoverBg: "hover:bg-success/10",
      activeBorder: "border-l-emerald-500",
    },
    "Εργαλεία": {
      icon: Wrench,
      iconColor: "text-warning dark:text-warning",
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

  const normalizedCurrentPath = currentPath.split('?')[0].split('#')[0].replace(/\/$/, '')

  // Derive parent button active state:
  // When a sub-item exactly matches the current path, suppress parent highlight.
  // The Collapsible defaultOpen still uses item.isActive (prefix match) for auto-expand.
  const hasActiveSubItem =
    (item.items ?? []).some(
      (sub) => normalizedCurrentPath === sub.url.replace(/\/$/, '')
    )
  const isParentButtonActive = item.items?.length
    ? !hasActiveSubItem && !!item.isActive
    : !!item.isActive

  return (
    <Collapsible asChild defaultOpen={item.isActive}>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip={item.title}
          isActive={isParentButtonActive}
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

function PinnableNavItem({
  item,
  pathname,
  notificationCounts = {},
  isPinned,
  pinsCount,
  onTogglePin,
  dict,
}: {
  readonly item: NavMainItem
  readonly pathname: string
  readonly notificationCounts?: NotificationCounts
  readonly isPinned: boolean
  readonly pinsCount: number
  readonly onTogglePin: (url: string) => void
  readonly dict?: any
}) {
  const MAX_PINS = 5
  const canPin = !isPinned && pinsCount < MAX_PINS

  const pinLabel = dict?.navigation?.ModuleMenu?.pinToTop ?? "Pin to top"
  const unpinLabel = dict?.navigation?.ModuleMenu?.unpin ?? "Unpin"
  const limitLabel = dict?.navigation?.ModuleMenu?.pinLimitReached ?? "Maximum 5 pins"

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <NavMainMenuItem
            item={item}
            pathname={pathname}
            notificationCounts={notificationCounts}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {isPinned ? (
          <ContextMenuItem
            onSelect={() => onTogglePin(item.url)}
            className="gap-2"
          >
            <PinOff className="h-4 w-4 text-muted-foreground" />
            {unpinLabel}
          </ContextMenuItem>
        ) : canPin ? (
          <ContextMenuItem
            onSelect={() => onTogglePin(item.url)}
            className="gap-2"
          >
            <Pin className="h-4 w-4 text-muted-foreground" />
            {pinLabel}
          </ContextMenuItem>
        ) : (
          <ContextMenuItem disabled className="gap-2">
            <Pin className="h-4 w-4 text-muted-foreground" />
            {limitLabel}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

function NavPinnedSection({
  items,
  pathname,
  notificationCounts = {},
  pinnedCount,
  onTogglePin,
  dict,
}: {
  readonly items: NavMainItem[]
  readonly pathname: string
  readonly notificationCounts?: NotificationCounts
  readonly pinnedCount?: number
  readonly onTogglePin: (url: string) => void
  readonly dict?: any
}) {
  const label = dict?.navigation?.ModuleMenu?.pinnedSection ?? "Pinned"

  return (
    <SidebarGroup className="py-0 mb-1">
      <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
        <Pin className="h-4 w-4 text-sidebar-foreground/50" />
        <span className="text-[13px] font-bold tracking-normal text-sidebar-foreground">
          {label}
        </span>
      </div>
      <SidebarMenu className="mt-0.5 border-l-2 ml-2 pl-1 border-l-sidebar-foreground/20">
        {items.map((item, index) => (
          <PinnableNavItem
            key={item.url || `pinned-${index}`}
            item={item}
            pathname={pathname}
            notificationCounts={notificationCounts}
            isPinned={true}
            pinsCount={pinnedCount ?? items.length}
            onTogglePin={onTogglePin}
            dict={dict}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

// Collapsible category group component
function CollapsibleNavGroup({
  group,
  pathname,
  defaultOpen = true,
  showAlphaBadge = false,
  notificationCounts = {},
  pinnedUrls,
  onTogglePin,
  dict,
}: {
  readonly group: NavGroup
  readonly pathname: string
  readonly defaultOpen?: boolean
  readonly showAlphaBadge?: boolean
  readonly notificationCounts?: NotificationCounts
  readonly pinnedUrls?: string[]
  readonly onTogglePin?: (url: string) => void
  readonly dict?: any
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
              <PinnableNavItem
                key={item.url || `${item.title}-${index}`}
                item={item}
                pathname={pathname}
                notificationCounts={notificationCounts}
                isPinned={pinnedUrls?.includes(item.url) ?? false}
                pinsCount={pinnedUrls?.length ?? 0}
                onTogglePin={onTogglePin ?? (() => { if (process.env.NODE_ENV === 'development') console.warn('[NavMain] onTogglePin not provided') })}
                dict={dict}
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
  pinnedUrls = [],
  onTogglePin,
  dict,
}: {
  readonly groups: NavGroup[]
  readonly pathname?: string
  readonly notificationCounts?: NotificationCounts
  readonly pinnedUrls?: string[]
  readonly onTogglePin?: (url: string) => void
  readonly dict?: any
}) {
  const currentPath = pathname || ""

  const pinnedItems = React.useMemo(() => {
    if (!pinnedUrls.length) return []
    const allItems = groups.flatMap((g) => g.items)
    return pinnedUrls
      .map((url) => allItems.find((item) => item.url === url))
      .filter((item): item is NavMainItem => item !== undefined)
  }, [pinnedUrls, groups])

  // Check if label should have Alpha badge (Tools/Network in English or Greek)
  const shouldShowAlphaBadge = (label: string) => {
    const alphaLabels = ["Tools", "Network", "Εργαλεία", "Δίκτυο"]
    return alphaLabels.includes(label)
  }

  return (
    <>
      {pinnedItems.length > 0 && (
        <NavPinnedSection
          items={pinnedItems}
          pathname={currentPath}
          notificationCounts={notificationCounts}
          pinnedCount={pinnedUrls.length}
          onTogglePin={onTogglePin ?? (() => { if (process.env.NODE_ENV === 'development') console.warn('[NavMain] onTogglePin not provided') })}
          dict={dict}
        />
      )}
      {groups.map((group, groupIndex) => (
        <CollapsibleNavGroup
          key={group.label || `group-${groupIndex}`}
          group={group}
          pathname={currentPath}
          defaultOpen={true}
          showAlphaBadge={shouldShowAlphaBadge(group.label)}
          notificationCounts={notificationCounts}
          pinnedUrls={pinnedUrls}
          onTogglePin={onTogglePin}
          dict={dict}
        />
      ))}
    </>
  )
}
