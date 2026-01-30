"use client";

import { useState } from "react";
import { useRouter } from "@/navigation";
import {
  Bell,
  Calendar,
  Building2,
  FileText,
  Clock,
  Check,
  CheckCheck,
  Filter,
  Loader2,
  ChevronDown,
  MessageSquareText,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
  useInfiniteNotifications,
  type Notification,
} from "@/hooks/swr";

interface NotificationCenterProps {
  initialNotifications: Notification[];
  dict: Record<string, Record<string, string>>;
}

const getNotificationIcon = (type: string) => {
  if (type.includes("CALENDAR") || type.includes("REMINDER")) {
    return Calendar;
  }
  if (type.includes("ORGANIZATION_INVITE")) {
    return Users;
  }
  if (type.includes("ACCOUNT")) {
    return Building2;
  }
  if (type.includes("PROPERTY")) {
    return Building2;
  }
  if (type.includes("DOCUMENT")) {
    return FileText;
  }
  if (type.includes("FEEDBACK")) {
    return MessageSquareText;
  }
  return Bell;
};

export function NotificationCenter({ initialNotifications, dict }: NotificationCenterProps) {
  const [filter, setFilter] = useState<"all" | "unread" | string>("all");
  const router = useRouter();

  // Use infinite scroll hook with filter support
  const {
    notifications,
    unreadCount,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useInfiniteNotifications({
    unreadOnly: filter === "unread",
    type: filter !== "all" && filter !== "unread" ? filter : undefined,
    pageSize: 20,
  });

  // Use SWR data, falling back to initial data only during initial load
  const displayNotifications = isLoading && notifications.length === 0 
    ? initialNotifications 
    : notifications;
  const displayUnreadCount = isLoading && notifications.length === 0
    ? initialNotifications.filter((n) => !n.read).length
    : unreadCount;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    navigateToEntity(notification);
  };

  const navigateToEntity = (notification: Notification) => {
    if (!notification.entityType || !notification.entityId) {
      return;
    }

    switch (notification.entityType) {
      case "ACCOUNT":
        router.push(`/app/crm/clients/${notification.entityId}`);
        break;
      case "PROPERTY":
        router.push(`/app/mls/properties/${notification.entityId}`);
        break;
      case "CALENDAR_EVENT":
        router.push(`/app/calendar?eventId=${notification.entityId}`);
        break;
      case "TASK":
        router.push(`/app/crm/clients/${notification.metadata?.accountId || ""}`);
        break;
      case "FEEDBACK":
        router.push(`/app/feedback/${notification.entityId}`);
        break;
      case "ORGANIZATION":
        // Navigate to organization settings where user can manage organizations
        router.push(`/app/organization`);
        break;
      default:
        break;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Filter notifications locally only for type filter (not "all" or "unread" which are handled by API)
  const filteredNotifications = filter === "all" || filter === "unread"
    ? displayNotifications
    : displayNotifications.filter((n) => n.type === filter);

  const notificationTypes = Array.from(
    new Set(displayNotifications.map((n) => n.type))
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">
            {dict?.Navigation?.notifications || "Notifications"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {displayUnreadCount > 0
              ? `${displayUnreadCount} ${dict?.Notifications?.unread || "unread"}`
              : dict?.Notifications?.allRead || "All caught up"}
            {totalCount > 0 && (
              <span className="ml-2">
                ({notifications.length} of {totalCount} loaded)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {dict?.Notifications?.all || "All"}
              </SelectItem>
              <SelectItem value="unread">
                {dict?.Notifications?.unread || "Unread"}
              </SelectItem>
              {notificationTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {displayUnreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              disabled={isLoading}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              {dict?.Notifications?.markAllRead || "Mark all as read"}
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && displayNotifications.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <div className="text-sm text-muted-foreground">
              {dict?.common?.loading || "Loading..."}
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {dict?.Notifications?.noNotifications || "No notifications"}
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              {filter === "unread"
                ? dict?.Notifications?.noUnread || "You're all caught up!"
                : dict?.Notifications?.noNotificationsDesc ||
                  "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                    !notification.read ? "bg-accent/50 border-primary/20" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-0.5">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium ${
                              !notification.read ? "font-semibold" : ""
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <Badge variant="default" className="h-5">
                              {dict?.Notifications?.new || "New"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      {notification.read && (
                        <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {notification.entityType && (
                        <Badge variant="outline" className="text-xs">
                          {notification.entityType.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4 pb-2">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="w-full max-w-xs"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {dict?.common?.loading || "Loading..."}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      {dict?.Notifications?.loadMore || "Load More"}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && filteredNotifications.length > 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {dict?.Notifications?.endOfList || "You've reached the end"}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
