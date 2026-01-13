"use client"

import { ChevronRight } from "lucide-react"
import { Link } from "@/navigation"
import * as React from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"

interface NavMainItem {
  title: string
  url: string
  icon: any
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}

interface NavGroup {
  label: string
  items: NavMainItem[]
}

function NavMainMenuItem({ item, pathname = "" }: { readonly item: NavMainItem; readonly pathname?: string }) {
  const iconRef = React.useRef<any>(null)
  const currentPath = pathname || ""

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
            <item.icon ref={iconRef} size={16} className="mr-1" />
            <span>{item.title}</span>
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
                  // Check if sub-item is active by matching the pathname
                  const isSubItemActive = currentPath.endsWith(subItem.url) || currentPath.includes(subItem.url)
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

export function NavMain({
  groups,
  pathname = "",
}: {
  readonly groups: NavGroup[]
  readonly pathname?: string
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
        <SidebarGroup key={group.label || `group-${groupIndex}`}>
          <SidebarGroupLabel className="flex items-center gap-2">
            {group.label}
            {shouldShowAlphaBadge(group.label) && (
              <Badge variant="warning" className="text-xs">
                Alpha
              </Badge>
            )}
          </SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item, index) => (
              <NavMainMenuItem key={item.url || `${item.title}-${index}`} item={item} pathname={currentPath} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
