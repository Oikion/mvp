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

function NavMainMenuItem({ item }: { readonly item: NavMainItem }) {
  const iconRef = React.useRef<any>(null)

  return (
    <Collapsible asChild defaultOpen={item.isActive}>
            <SidebarMenuItem>
        <SidebarMenuButton 
          asChild 
          tooltip={item.title}
          onMouseEnter={() => iconRef.current?.startAnimation?.()}
          onMouseLeave={() => iconRef.current?.stopAnimation?.()}
        >
                <Link href={item.url}>
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
                      {item.items?.map((subItem, subIndex) => (
                        <SidebarMenuSubItem key={subItem.url || `${subItem.title}-${subIndex}`}>
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
  )
}

export function NavMain({
  items,
}: {
  readonly items: NavMainItem[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => (
          <NavMainMenuItem key={item.url || `${item.title}-${index}`} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
