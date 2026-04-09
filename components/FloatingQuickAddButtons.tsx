// @ts-nocheck
// TODO: Fix type errors
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickAddContact } from "@/app/[locale]/app/(routes)/crm/contacts/components/QuickAddContact";
import { QuickAddProperty } from "@/app/[locale]/app/(routes)/mls/components/QuickAddProperty";
import { QuickAddRequest } from "@/app/[locale]/app/(routes)/requests/components/QuickAddRequest";
import { QuickAddDeal } from "@/app/[locale]/app/(routes)/deals/components/QuickAddDeal";
import { PermissionGate } from "@/lib/permissions/components";
import { useAppToast } from "@/hooks/use-app-toast";
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
  const { toast } = useAppToast();
  const tCommon = useTranslations("common");
  const tCrm = useTranslations("crm");
  const tMls = useTranslations("mls");
  const tRequests = useTranslations("requests");
  const tDeals = useTranslations("deals");
  const [contactOpen, setContactOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const isModalOpen = useIsModalOpen();

  // Determine which quick-add to show based on route
  // Contacts is the primary CRM entity (v2.0) — shows on all /crm routes
  const isCrmRoute = pathname?.includes("/crm");
  const isMlsRoute = pathname?.includes("/mls");
  const isRequestsRoute = pathname?.includes("/requests");
  const isDealsRoute = pathname?.includes("/app/deals");

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

  if (!isCrmRoute && !isMlsRoute && !isRequestsRoute && !isDealsRoute) {
    return null;
  }

  return (
    <>
      {isCrmRoute && (
        <>
          {!isModalOpen && (
            <Button
              onClick={() => setContactOpen(true)}
              className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full shadow-lg"
              size="icon"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">{tCrm("contacts.quickAdd.title")}</span>
            </Button>
          )}
          <QuickAddContact
            open={contactOpen}
            onOpenChange={setContactOpen}
            organizationUsers={users}
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
              toast.success(tCommon, { description: tCommon, isTranslationKey: false });
              // Could navigate to edit page here if needed
            }}
          />
        </>
      )}

      {isRequestsRoute && (
        <>
          {!isModalOpen && (
            <Button
              onClick={() => setRequestOpen(true)}
              className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full shadow-lg"
              size="icon"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">{tRequests("quickAdd.title")}</span>
            </Button>
          )}
          <QuickAddRequest
            open={requestOpen}
            onOpenChange={setRequestOpen}
            organizationUsers={users}
            onContinueToFull={() => setRequestOpen(false)}
          />
        </>
      )}

      {isDealsRoute && (
        <PermissionGate action="deal:create">
          {!isModalOpen && (
            <Button
              onClick={() => setDealOpen(true)}
              className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full shadow-lg"
              size="icon"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">{tDeals("create.quickAdd")}</span>
            </Button>
          )}
          <QuickAddDeal
            open={dealOpen}
            onOpenChange={setDealOpen}
          />
        </PermissionGate>
      )}
    </>
  );
}

