"use client";

import { useState } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, CalendarPlus, Share2 } from "lucide-react";
import { EventCreateForm } from "@/components/calendar/EventCreateForm";
import { ShareModal } from "@/components/social/ShareModal";

export function DataTableRowActions<TData>({ row }: { row: Row<TData> }) {
  const router = useRouter();
  const t = useTranslations("crm");
  const data: any = row.original;
  
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleEventCreated = () => {
    setScheduleDialogOpen(false);
    window.location.reload();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={() => router.push(`/crm/clients/${data?.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            {t("CrmAccountsTable.details") || "View Details"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setScheduleDialogOpen(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t("CrmAccountsTable.scheduleEvent") || "Schedule Event"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            {t("CrmAccountsTable.share") || "Share"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Schedule Event Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("CrmAccountsTable.scheduleEventTitle") || "Schedule Event"}</DialogTitle>
            <DialogDescription>
              {t("CrmAccountsTable.scheduleEventDesc") || `Schedule an event for "${data?.name}"`}
            </DialogDescription>
          </DialogHeader>
          <EventCreateForm
            clientId={data?.id}
            onSuccess={handleEventCreated}
          />
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        entityType="CLIENT"
        entityId={data?.id}
        entityName={data?.name || "Client"}
      />
    </>
  );
}
