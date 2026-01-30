"use client";

import React, { useEffect, useState } from "react";

import ReportsModuleMenu from "./menu-items/Reports";
import EmployeesModuleMenu from "./menu-items/Employees";
import CrmModuleMenu from "./menu-items/Crm";
import MlsModuleMenu from "./menu-items/Mls";
import DocumentsMenu from "./menu-items/Documents";

import AdministrationMenu from "./menu-items/Administration";
import DashboardMenu from "./menu-items/Dashboard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronsLeft } from "lucide-react";

type Props = {
  modules: any;
  dict: any;
  build: number;
};

const ModuleMenu = ({ modules, dict, build }: Props) => {
  const [open, setOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
      <div
      className={cn(
        "relative h-screen p-4 pt-8 duration-300",
        open ? "w-72" : "w-20"
      )}
      >
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute -right-3 top-9 size-8 rounded-full",
          !open && "rotate-180"
        )}
            onClick={() => setOpen(!open)}
          >
        <ChevronsLeft className="size-4" />
      </Button>
      <div className="flex items-center gap-x-4">
          <h1
          className={cn(
            "origin-left text-xl font-medium duration-200",
              !open && "scale-0"
          )}
          >
            {process.env.NEXT_PUBLIC_APP_NAME}
          </h1>
        </div>
      <div className="space-y-1 pt-6">
          <DashboardMenu open={open} title={dict.navigation.ModuleMenu.dashboard} />
          {modules.find(
            (menuItem: any) => menuItem.name === "crm" && menuItem.enabled
          ) ? (
            <CrmModuleMenu open={open} localizations={dict.navigation.ModuleMenu.crm} />
          ) : null}
        <MlsModuleMenu
          open={open}
          localizations={
            dict.navigation.ModuleMenu.mls ?? { title: "Properties", properties: "Properties" }
          }
        />
          <EmployeesModuleMenu open={open} />
          {modules.find(
            (menuItem: any) => menuItem.name === "reports" && menuItem.enabled
          ) ? (
            <ReportsModuleMenu open={open} title={dict.navigation.ModuleMenu.reports} />
          ) : null}
          <DocumentsMenu open={open} title={dict.navigation.ModuleMenu.documents} />
          <AdministrationMenu open={open} title={dict.navigation.ModuleMenu.settings} />
      </div>
      <div
        className={cn("flex w-full items-center justify-center", {
          hidden: !open,
        })}
      >
        <span className="pb-2 text-xs text-muted-foreground">
          build: 0.0.3-beta-{build}
        </span>
      </div>
    </div>
  );
};

export default ModuleMenu;
