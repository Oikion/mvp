"use client";

import { useState } from "react";
import { useRouter } from "@/navigation";
import { 
  Bell, 
  Calendar, 
  FileText, 
  Clock, 
  Heart, 
  MessageCircle, 
  Share2, 
  UserPlus, 
  CheckCircle2,
  Handshake,
  ListTodo,
  Users,
  Home,
  MessageSquareText,
  Building2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type Notification,
} from "@/hooks/swr";

interface NotificationPopoverProps {
  children: React.ReactNode;
  onNotificationRead?: () => void;
}

const getNotificationIcon = (type: string) => {
  // Organization invite notifications
  if (type === "ORGANIZATION_INVITE") {
    return Building2;
  }
  // Calendar notifications
  if (type.includes("CALENDAR") || type.includes("REMINDER") || type === "CALENDAR_EVENT_INVITED") {
    return Calendar;
  }
  // Social notifications
  if (type === "SOCIAL_POST_LIKED") {
    return Heart;
  }
  if (type === "SOCIAL_POST_COMMENTED" || type === "SOCIAL_POST_MENTIONED") {
    return MessageCircle;
  }
  // Sharing notifications
  if (type === "ENTITY_SHARED_WITH_YOU" || type === "ENTITY_SHARE_ACCEPTED" || type === "DOCUMENT_SHARED") {
    return Share2;
  }
  // Connection notifications
  if (type === "CONNECTION_REQUEST" || type === "CONNECTION_ACCEPTED") {
    return UserPlus;
  }
  // Deal notifications
  if (type.includes("DEAL")) {
    return Handshake;
  }
  // Task notifications
  if (type.includes("TASK")) {
    return ListTodo;
  }
  // Client/Account notifications
  if (type.includes("CLIENT") || type.includes("ACCOUNT")) {
    return Users;
  }
  // Property notifications
  if (type.includes("PROPERTY")) {
    return Home;
  }
  // Document notifications
  if (type.includes("DOCUMENT")) {
    return FileText;
  }
  // Feedback notifications
  if (type.includes("FEEDBACK")) {
    return MessageSquareText;
  }
  // System/Welcome
  if (type === "WELCOME" || type === "SYSTEM") {
    return CheckCircle2;
  }
  return Bell;
};

const getNotificationColor = (type: string) => {
  if (type === "ORGANIZATION_INVITE") {
    return "text-accent-foreground";
  }
  if (type === "SOCIAL_POST_LIKED") {
    return "text-destructive";
  }
  if (type === "SOCIAL_POST_COMMENTED" || type === "SOCIAL_POST_MENTIONED") {
    return "text-primary";
  }
  if (type.includes("DEAL_COMPLETED") || type === "CONNECTION_ACCEPTED") {
    return "text-success";
  }
  if (type.includes("DEAL_PROPOSED") || type === "CONNECTION_REQUEST") {
    return "text-warning";
  }
  if (type.includes("CALENDAR") || type.includes("REMINDER")) {
    return "text-info";
  }
  if (type.includes("FEEDBACK")) {
    return "text-primary";
  }
  return "text-muted-foreground";
};

export function NotificationPopover({ children, onNotificationRead }: NotificationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations();
  const tNavigation = useTranslations("Navigation");
  const tNotifications = useTranslations("Notifications");

  // SWR hooks - only fetch when popover is open
  const { notifications, unreadCount, isLoading, mutate } = useNotifications({
    limit: 10,
    enabled: isOpen,
  });

  const { markAllRead, isMutating: isMarkingAllRead } = useMarkAllNotificationsRead();
  const { markRead } = useMarkNotificationRead();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      // Optimistically update local state
      mutate(
        (currentData) => ({
          notifications: (currentData?.notifications ?? []).map((n) =>
            n.id === notification.id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, (currentData?.unreadCount ?? 0) - 1),
        }),
        { revalidate: false }
      );

      // Mark as read on server
      try {
        await markRead(notification.id);
        onNotificationRead?.();
      } catch (error) {
        // Revalidate on error to restore state
        mutate();
      }
    }

    navigateToEntity(notification);
  };

  const navigateToEntity = (notification: Notification) => {
    if (!notification.entityType || !notification.entityId) {
      // For notifications without specific entities, navigate to appropriate sections
      if (notification.type === "ORGANIZATION_INVITE") {
        // Organization invites - navigate to organization settings where they can accept
        router.push("/app/organization");
      } else if (notification.type.includes("CONNECTION")) {
        router.push("/app/connections");
      } else if (notification.type.includes("SOCIAL")) {
        router.push("/app/social-feed");
      } else {
        router.push("/app/notifications");
      }
      setIsOpen(false);
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
        if (notification.metadata?.accountId) {
          router.push(`/app/crm/clients/${notification.metadata.accountId}`);
        } else {
          router.push("/app/crm/tasks");
        }
        break;
      case "DOCUMENT":
        router.push(`/app/documents/${notification.entityId}`);
        break;
      case "SOCIAL_POST":
        router.push(`/app/social-feed?postId=${notification.entityId}`);
        break;
      case "DEAL":
        router.push(`/app/deals/${notification.entityId}`);
        break;
      case "CONNECTION":
        router.push("/app/connections");
        break;
      case "USER":
        if (notification.metadata?.slug) {
          router.push(`/agent/${notification.metadata.slug}`);
        } else {
          router.push("/app/connections");
        }
        break;
      case "FEEDBACK":
        router.push(`/app/feedback/${notification.entityId}`);
        break;
      case "ORGANIZATION":
        // Organization invites - navigate to organization settings
        router.push("/app/organization");
        break;
      default:
        router.push("/app/notifications");
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    // Optimistically update local state
    mutate(
      (currentData) => ({
        notifications: (currentData?.notifications ?? []).map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }),
      { revalidate: false }
    );

    try {
      await markAllRead();
      onNotificationRead?.();
    } catch (error) {
      // Revalidate on error to restore state
      mutate();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-sm">
            {tNavigation("notifications")}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
              disabled={isMarkingAllRead}
            >
              {tNotifications("markAllRead")}
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <div className="text-sm text-muted-foreground text-center">
                {tNotifications("noNotifications")}
              </div>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      !notification.read ? "bg-accent/50" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mt-0.5">
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium ${
                            !notification.read ? "font-semibold" : ""
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <Badge variant="default" className="h-5 shrink-0">
                            {tNotifications("new")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm"
            onClick={() => {
              router.push("/app/notifications");
              setIsOpen(false);
            }}
          >
            {tNotifications("viewAll")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
