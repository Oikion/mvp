"use client"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebarSkeleton } from "./AppSidebarSkeleton"
import { Skeleton } from "@/components/ui/skeleton"

export function AppSkeletonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SidebarProvider defaultOpen={true}>
        <AppSidebarSkeleton />
        <SidebarInset className="flex flex-col h-screen overflow-hidden bg-surface-2">
            <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1 pointer-events-none" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div className="flex items-center gap-2">
                     <Skeleton className="h-4 w-16" />
                     <span className="text-muted-foreground">/</span>
                     <Skeleton className="h-4 w-24" />
                </div>
            </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden min-h-0">
            {children}
            </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}











