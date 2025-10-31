// app/[locale]/(routes)/components/AppSidebar.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  Coins, 
  Building, 
  Users, 
  Mail, 
  Settings, 
  Bot, 
  FolderOpen,
  ServerIcon,
  FileCheck,
  FileBarChart,
  Wrench
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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

  // Transform your modules into the sidebar structure with proper active state detection
  const navMainItems = [
    {
      title: dict.ModuleMenu.dashboard,
      url: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    // Add CRM module if enabled
    ...(modules.some((m: any) => m.name === "crm" && m.enabled) ? [{
      title: dict.ModuleMenu.crm.title,
      url: "/crm/dashboard",
      icon: Coins,
      isActive: pathname.includes("/crm"),
      items: [
        { title: "Dashboard", url: "/crm/dashboard" },
        { title: dict.ModuleMenu.crm.accounts, url: "/crm/clients" },
      ]
    }] : []),
    // Add Properties module with sub-items
    {
      title: dict.ModuleMenu.mls.title,
      url: "/mls/properties",
      icon: Building,
      isActive: pathname.includes("/mls"),
      items: [
        { title: "Dashboard", url: "/mls/dashboard" },
        { title: dict.ModuleMenu.mls.properties, url: "/mls/properties" },
      ]
    },
    // Add Projects module if enabled
    ...(modules.some((m: any) => m.name === "projects" && m.enabled) ? [{
      title: dict.ModuleMenu.projects,
      url: "/projects",
      icon: ServerIcon,
      isActive: pathname.includes("/projects"),
    }] : []),
    // Add Emails module if enabled
    ...(modules.some((m: any) => m.name === "emails" && m.enabled) ? [{
      title: dict.ModuleMenu.emails,
      url: "/emails",
      icon: Mail,
      isActive: pathname.includes("/emails"),
    }] : []),
    // Add Employees module if enabled
    ...(modules.some((m: any) => m.name === "employee" && m.enabled) ? [{
      title: "Employees",
      url: "/employees",
      icon: Users,
      isActive: pathname.includes("/employees"),
    }] : []),
    // Add Invoices module if enabled
    ...(modules.some((m: any) => m.name === "invoice" && m.enabled) ? [{
      title: dict.ModuleMenu.invoices,
      url: "/invoice",
      icon: FileCheck,
      isActive: pathname.includes("/invoice"),
    }] : []),
    // Add Reports module if enabled
    ...(modules.some((m: any) => m.name === "reports" && m.enabled) ? [{
      title: dict.ModuleMenu.reports,
      url: "/reports",
      icon: FileBarChart,
      isActive: pathname.includes("/reports"),
    }] : []),
    // Add Documents module if enabled
    ...(modules.some((m: any) => m.name === "documents" && m.enabled) ? [{
      title: dict.ModuleMenu.documents,
      url: "/documents",
      icon: FolderOpen,
      isActive: pathname.includes("/documents"),
    }] : []),
    // Add ChatGPT module if enabled
    ...(modules.some((m: any) => m.name === "openai" && m.enabled) ? [{
      title: "ChatGPT",
      url: "/openAi",
      icon: Bot,
      isActive: pathname.includes("/openAi"),
    }] : []),
    // Add Administration
    {
      title: dict.ModuleMenu.settings,
      url: "/admin",
      icon: Wrench,
      isActive: pathname.includes("/admin"),
    },
  ]

  const navSecondaryItems = [
    {
      title: "Support",
      url: "#",
      icon: Settings,
    },
  ]

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <div className="size-4 font-bold">O</div>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{process.env.NEXT_PUBLIC_APP_NAME}</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </Link>
            </SidebarMenuButton>
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
    </Sidebar>
  )
}