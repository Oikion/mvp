// components/nav-secondary.tsx
"use client"

import * as React from "react"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavSecondaryItem {
  title: string
  url?: string
  icon: any
  onClick?: () => void
}

function NavSecondaryMenuItem({ item }: { readonly item: NavSecondaryItem }) {
  const iconRef = React.useRef<any>(null)

  return (
    <SidebarMenuItem>
      {item.url ? (
      <SidebarMenuButton 
        asChild 
        size="sm"
        onMouseEnter={() => iconRef.current?.startAnimation?.()}
        onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      >
        <Link href={item.url}>
          <item.icon ref={iconRef} size={16} className="mr-1" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      ) : (
        <SidebarMenuButton 
          size="sm"
          onMouseEnter={() => iconRef.current?.startAnimation?.()}
          onMouseLeave={() => iconRef.current?.stopAnimation?.()}
          onClick={item.onClick}
        >
          <item.icon ref={iconRef} size={16} className="mr-1" />
          <span>{item.title}</span>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}

export function NavSecondary({
  items,
  ...props
}: {
  readonly items: NavSecondaryItem[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item, index) => (
            <NavSecondaryMenuItem key={item.url || `${item.title}-${index}`} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}