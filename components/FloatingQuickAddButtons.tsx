"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickAddClient } from "@/app/[locale]/app/(routes)/crm/components/QuickAddClient";
import { QuickAddProperty } from "@/app/[locale]/app/(routes)/mls/components/QuickAddProperty";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import axios from "axios";

// Hook to detect if any dialog/modal is open
function useIsModalOpen() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkForOpenModals = () => {
      const openModalSelectors = [
        '[data-radix-dialog-overlay][data-state="open"]',
        '[data-radix-dialog-content][data-state="open"]',
        '[data-radix-alert-dialog-content][data-state="open"]',
        '[data-radix-drawer-content][data-state="open"]',
      ];

      const hasOpenModal = openModalSelectors.some(
        (selector) => document.querySelector(selector) !== null,
      );

      setIsModalOpen(hasOpenModal);
    };

    // Check initially
    checkForOpenModals();

    // Use MutationObserver to watch for changes
    const observer = new MutationObserver(checkForOpenModals);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'style', 'class'],
    });

    // Also check periodically as a fallback
    const interval = setInterval(checkForOpenModals, 100);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return isModalOpen;
}

export function FloatingQuickAddButtons() {
  const pathname = usePathname();
  const { toast } = useToast();
  const tCommon = useTranslations("common");
  const tCrm = useTranslations("crm");
  const tMls = useTranslations("mls");
  const [clientOpen, setClientOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const isModalOpen = useIsModalOpen();

  // Determine if we should show CRM or MLS buttons
  const isCrmRoute = pathname?.includes("/crm");
  const isMlsRoute = pathname?.includes("/mls");

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("/api/org/users");
        setUsers(response.data?.users || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
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
          {!isModalOpen && (
            <Button
              onClick={() => setClientOpen(true)}
              className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full shadow-lg"
              size="icon"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">{tCrm("QuickAdd.client.title")}</span>
            </Button>
          )}
          <QuickAddClient
            open={clientOpen}
            onOpenChange={setClientOpen}
            users={users}
            onContinueToFull={(clientId) => {
              toast({
                variant: "success",
                title: tCommon("success"),
                description: tCommon("clientCreated"),
              });
              // Could navigate to edit page here if needed
            }}
          />
        </>
      )}

      {isMlsRoute && (
        <>
          {!isModalOpen && (
            <Button
              onClick={() => setPropertyOpen(true)}
              className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full shadow-lg"
              size="icon"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">{tMls("QuickAdd.property.title")}</span>
            </Button>
          )}
          <QuickAddProperty
            open={propertyOpen}
            onOpenChange={setPropertyOpen}
            users={users}
            onContinueToFull={(propertyId) => {
              toast({
                variant: "success",
                title: tCommon("success"),
                description: tCommon("propertyCreated"),
              });
              // Could navigate to edit page here if needed
            }}
          />
        </>
      )}
    </>
  );
}

