// app/[locale]/(routes)/layout.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Link } from "@/navigation"
import { AppSidebar } from "./components/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import getAllCommits from "@/actions/github/get-repo-commits"
import { getModules } from "@/actions/get-modules"
import { getDictionary } from "@/dictionaries"
import Footer from "./components/Footer"
import { getCurrentUserSafe, getCurrentUser } from "@/lib/get-current-user"
import { syncClerkUser } from "@/lib/clerk-sync"

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId, orgId } = await auth();

  if (!userId) {
    const { locale } = await params;
    return redirect(`/${locale}/sign-in`);
  }

  const { locale } = await params;

  // Get or sync user from database
  let user = await getCurrentUserSafe();
  
  if (!user) {
    // Sync user if not found in database
    try {
      await syncClerkUser(userId);
      user = await getCurrentUser();
    } catch (error) {
      console.error("Error syncing user:", error);
      const { locale } = await params;
      return redirect(`/${locale}/sign-in`);
    }
  }

  // PENDING status check removed - users are automatically active
  // if (user?.userStatus === "PENDING") {
  //   return redirect(`/${locale}/pending`);
  // }

  if (user?.userStatus === "INACTIVE") {
    return redirect(`/${locale}/inactive`);
  }

  // Check if user has an organization - redirect to create if not
  // Allow organization routes to render without orgId
  if (!orgId) {
    return redirect(`/${locale}/create-organization`);
  }

  const build = await getAllCommits();
  const modules = await getModules();
  const dict = await getDictionary();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar 
          modules={modules} 
          dict={dict} 
          build={build}
          user={{
            name: user.name as string,
            email: user.email as string,
            avatar: user.avatar as string,
          }}
        />
        <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Current Page</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden min-h-0">
          {children}
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
    </div>
  );
}