"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationPopover } from "./NotificationPopover";
import { useNotifications } from "@/hooks/swr";

export function NotificationBell() {
  // Use SWR with 30-second polling for unread count
  const { unreadCount, isLoading, mutate } = useNotifications({
    limit: 0,
    unreadOnly: true,
    refreshInterval: 30000, // Poll every 30 seconds
  });

  return (
    <NotificationPopover onNotificationRead={() => mutate()}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {!isLoading && unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>
    </NotificationPopover>
  );
}
