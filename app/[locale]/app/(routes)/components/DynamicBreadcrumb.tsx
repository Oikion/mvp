"use client";

import React from "react";
import { usePathname, useRouter } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft } from "lucide-react";

interface BreadcrumbSegment {
  label: string;
  href: string;
}

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("navigation");
  // Show back button if not on dashboard
  const cleanPath = pathname.startsWith(`/${locale}`)
    ? pathname.substring(`/${locale}`.length) || "/"
    : pathname;
  const canGoBack = cleanPath !== "/";

  // Parse pathname and create breadcrumb segments
  const getBreadcrumbs = (): BreadcrumbSegment[] => {
    const segments: BreadcrumbSegment[] = [];
    
    // Remove locale prefix if present
    const cleanPath = pathname.startsWith(`/${locale}`)
      ? pathname.substring(`/${locale}`.length) || "/"
      : pathname;
    
    // Split path into segments
    const pathSegments = cleanPath.split("/").filter(Boolean);
    
    // Always start with Dashboard (only if not already on dashboard)
    if (cleanPath !== "/") {
      segments.push({
        label: t("ModuleMenu.dashboard"),
        href: "/",
      });
    }

    // Build breadcrumbs from path segments
    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip if it's the last segment (will be shown as current page)
      if (index === pathSegments.length - 1) {
        return;
      }

      // Map segment to readable label
      const label = getSegmentLabel(segment, pathSegments, index);
      segments.push({
        label,
        href: currentPath,
      });
    });

    return segments;
  };

  // Map path segments to readable labels using dictionary
  const getSegmentLabel = (
    segment: string,
    allSegments: string[],
    index: number
  ): string => {
    // Handle common routes
    const routeMap: Record<string, string> = {
      crm: t("ModuleMenu.crm.title"),
      mls: t("ModuleMenu.mls.title"),
      properties: t("ModuleMenu.mls.properties"),
      clients: t("ModuleMenu.crm.accounts"),
      accounts: t("ModuleMenu.crm.accounts"),
      contacts: t("ModuleMenu.crm.contacts"),
      opportunities: t("ModuleMenu.crm.opportunities"),
      contracts: t("ModuleMenu.crm.contracts"),
      calendar: t("ModuleMenu.calendar"),
      documents: t("ModuleMenu.documents"),
      employees: t("ModuleMenu.employees"),
      reports: t("ModuleMenu.reports"),
      admin: t("ModuleMenu.settings"),
      emails: t("ModuleMenu.emails"),
      tasks: t("ModuleMenu.tasks"),
      invoices: t("ModuleMenu.invoices"),
    };

    // Check if segment is in route map
    if (routeMap[segment]) {
      return routeMap[segment];
    }

    // For dynamic segments like IDs, try to get context from previous segment
    if (index > 0) {
      const prevSegment = allSegments[index - 1];
      if (prevSegment === "properties" && /^[a-f0-9-]+$/i.test(segment)) {
        // Property ID - could fetch property name, but for now use generic
        return t("ModuleMenu.mls.properties");
      }
      if (prevSegment === "clients" && /^[a-f0-9-]+$/i.test(segment)) {
        // Client ID
        return t("ModuleMenu.crm.accounts");
      }
      if (prevSegment === "events" && /^[a-f0-9-]+$/i.test(segment)) {
        // Event ID
        return t("ModuleMenu.calendar");
      }
    }

    // Default: capitalize first letter
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  // Get current page label
  const getCurrentPageLabel = (): string => {
    const cleanPath = pathname.startsWith(`/${locale}`)
      ? pathname.substring(`/${locale}`.length) || "/"
      : pathname;
    
    const pathSegments = cleanPath.split("/").filter(Boolean);
    
    if (pathSegments.length === 0) {
      return t("ModuleMenu.dashboard");
    }

    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Map last segment to label
    const routeMap: Record<string, string> = {
      crm: t("ModuleMenu.crm.title"),
      mls: t("ModuleMenu.mls.title"),
      properties: t("ModuleMenu.mls.properties"),
      clients: t("ModuleMenu.crm.accounts"),
      accounts: t("ModuleMenu.crm.accounts"),
      contacts: t("ModuleMenu.crm.contacts"),
      opportunities: t("ModuleMenu.crm.opportunities"),
      contracts: t("ModuleMenu.crm.contracts"),
      calendar: t("ModuleMenu.calendar"),
      documents: t("ModuleMenu.documents"),
      employees: t("ModuleMenu.employees"),
      reports: t("ModuleMenu.reports"),
      admin: t("ModuleMenu.settings"),
      emails: t("ModuleMenu.emails"),
      tasks: t("ModuleMenu.tasks"),
      invoices: t("ModuleMenu.invoices"),
    };

    // Check if it's a UUID/ID - use parent context
    if (/^[a-f0-9-]{36}$/i.test(lastSegment) && pathSegments.length > 1) {
      const parentSegment = pathSegments[pathSegments.length - 2];
      if (routeMap[parentSegment]) {
        return routeMap[parentSegment];
      }
    }

    return routeMap[lastSegment] || lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  };

  const breadcrumbs = getBreadcrumbs();
  const currentPageLabel = getCurrentPageLabel();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex items-center gap-2">
      {canGoBack && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-4" />
        </>
      )}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && (
                <BreadcrumbSeparator className={index === 0 ? "hidden md:block" : ""} />
              )}
            </React.Fragment>
          ))}
          {breadcrumbs.length > 0 && (
            <BreadcrumbSeparator className="hidden md:block" />
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{currentPageLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

