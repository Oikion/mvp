"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickAddClient } from "@/app/[locale]/(routes)/crm/components/QuickAddClient";
import { QuickAddProperty } from "@/app/[locale]/(routes)/mls/components/QuickAddProperty";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import axios from "axios";

export function FloatingQuickAddButtons() {
  const pathname = usePathname();
  const { toast } = useToast();
  const t = useTranslations();
  const [clientOpen, setClientOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Determine if we should show CRM or MLS buttons
  const isCrmRoute = pathname?.includes("/crm");
  const isMlsRoute = pathname?.includes("/mls");

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("/api/user");
        setUsers(response.data || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  if (!isCrmRoute && !isMlsRoute) {
    return null;
  }

  return (
    <>
      {isCrmRoute && (
        <>
          <Button
            onClick={() => setClientOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
            size="icon"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">{t("QuickAdd.client.title")}</span>
          </Button>
          <QuickAddClient
            open={clientOpen}
            onOpenChange={setClientOpen}
            users={users}
            onContinueToFull={(clientId) => {
              toast({
                variant: "success",
                title: t("common.success"),
                description: t("common.clientCreated"),
              });
              // Could navigate to edit page here if needed
            }}
          />
        </>
      )}

      {isMlsRoute && (
        <>
          <Button
            onClick={() => setPropertyOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
            size="icon"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">{t("QuickAdd.property.title")}</span>
          </Button>
          <QuickAddProperty
            open={propertyOpen}
            onOpenChange={setPropertyOpen}
            users={users}
            onContinueToFull={(propertyId) => {
              toast({
                variant: "success",
                title: t("common.success"),
                description: t("common.propertyCreated"),
              });
              // Could navigate to edit page here if needed
            }}
          />
        </>
      )}
    </>
  );
}

