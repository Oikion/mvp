"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * SidebarLayout Component - Oikion Design System
 * 
 * Sidebar + content layout (collapsible, responsive)
 * 
 * @example
 * <SidebarLayout>
 *   <Sidebar>Navigation</Sidebar>
 *   <SidebarContent>Main content</SidebarContent>
 * </SidebarLayout>
 */
export interface SidebarLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsible?: boolean
  defaultCollapsed?: boolean
}

const SidebarLayout = React.forwardRef<HTMLDivElement, SidebarLayoutProps>(
  ({ className, collapsible, defaultCollapsed, children, ...props }, ref) => {
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed ?? false)

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-screen w-full overflow-hidden",
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            if (child.type === Sidebar) {
              return React.cloneElement(child as React.ReactElement<any>, {
                collapsed,
                onToggle: collapsible ? () => setCollapsed(!collapsed) : undefined,
              })
            }
          }
          return child
        })}
      </div>
    )
  }
)
SidebarLayout.displayName = "SidebarLayout"

export interface SidebarProps extends React.HTMLAttributes<HTMLAsideElement> {
  collapsed?: boolean
  onToggle?: () => void
}

const Sidebar = React.forwardRef<HTMLAsideElement, SidebarProps>(
  ({ className, collapsed, children, ...props }, ref) => {
    return (
      <aside
        ref={ref}
        className={cn(
          "flex flex-col border-r border-border bg-surface-2 transition-all duration-default ease-in-out",
          collapsed ? "w-16" : "w-64",
          className
        )}
        {...props}
      >
        {children}
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex-1 overflow-y-auto bg-surface-1",
      className
    )}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

export { SidebarLayout, Sidebar, SidebarContent }

