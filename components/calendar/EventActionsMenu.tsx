"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Edit, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { EventEditForm } from "./EventEditForm";

// Shared cache for event data across all EventActionsMenu instances
type EventCacheEntry = {
  data: any;
  timestamp: number;
  promise: Promise<any> | null;
};

const eventCache: Record<string, EventCacheEntry> = {};
const CACHE_DURATION = 60 * 1000; // 1 minute cache
const fetchRefs: Record<string, boolean> = {}; // Track ongoing fetches per eventId

interface EventActionsMenuProps {
  eventId: string;
  event?: any; // Optional event data for edit form
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

export function EventActionsMenu({
  eventId,
  event,
  onEventUpdated,
  onEventDeleted,
}: EventActionsMenuProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [eventData, setEventData] = useState<any>(event);
  const localFetchRef = useRef(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete event: ${response.status}`);
      }

      toast.success(t("eventDetail.eventDeleted"));
      setIsDeleteDialogOpen(false);
      onEventDeleted?.();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error(t("eventDetail.failedToDeleteEvent"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = async () => {
    if (!eventData) {
      // Check cache first
      const cached = eventCache[eventId];
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        // Use cached data
        setEventData(cached.data);
        setIsEditDialogOpen(true);
        return;
      }

      // Check if there's already a pending request for this event
      if (cached?.promise) {
        try {
          const data = await cached.promise;
          setEventData(data);
          setIsEditDialogOpen(true);
          return;
        } catch (error) {
          console.error("Failed to fetch event from pending promise:", error);
        }
      }

      // Prevent multiple simultaneous requests for the same event
      if (fetchRefs[eventId] || localFetchRef.current) {
        // Wait for existing request
        if (cached?.promise) {
          try {
            const data = await cached.promise;
            setEventData(data);
            setIsEditDialogOpen(true);
            return;
          } catch (error) {
            console.error("Failed to fetch event from pending promise:", error);
          }
        }
        return;
      }

      setIsLoadingEvent(true);
      fetchRefs[eventId] = true;
      localFetchRef.current = true;

      const fetchPromise = (async () => {
        try {
          const response = await fetch(`/api/calendar/events/${eventId}`);
          
          // Handle rate limiting gracefully
          if (response.status === 429) {
            console.warn("Rate limited, using cached data if available");
            const retryAfter = response.headers.get("Retry-After");
            const errorMessage = retryAfter 
              ? `Too many requests. Please try again in ${retryAfter} seconds.`
              : "Too many requests. Please try again later.";
            
            if (cached?.data) {
              toast.warning("Using cached data due to rate limit");
              return cached.data;
            }
            throw new Error(errorMessage);
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to fetch event: ${response.status}`);
          }

          const data = await response.json();
          
          // Update cache
          eventCache[eventId] = {
            data,
            timestamp: Date.now(),
            promise: null,
          };
          
          return data;
        } catch (error) {
          console.error("Failed to fetch event:", error);
          // Return cached data if available on error
          if (cached?.data) {
            return cached.data;
          }
          throw error;
        } finally {
          fetchRefs[eventId] = false;
          localFetchRef.current = false;
          if (eventCache[eventId]) {
            eventCache[eventId].promise = null;
          }
        }
      })();

      // Store promise in cache for other instances to use
      if (!eventCache[eventId]) {
        eventCache[eventId] = { data: null, timestamp: 0, promise: fetchPromise };
      } else {
        eventCache[eventId].promise = fetchPromise;
      }

      try {
        const data = await fetchPromise;
        setEventData(data);
        setIsEditDialogOpen(true);
      } catch (error: any) {
        console.error("Failed to fetch event:", error);
        if (error.message?.includes("Too many requests")) {
          toast.error(t("eventDetail.failedToLoad") + " - " + error.message);
        } else {
          toast.error(t("eventDetail.failedToLoad"));
        }
      } finally {
        setIsLoadingEvent(false);
      }
    } else {
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    onEventUpdated?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 data-[state=open]:bg-muted"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
            }}
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">{t("eventActions.openMenu")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (eventId) {
                router.push(`/calendar/events/${eventId}`);
              }
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            {t("eventActions.view")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick();
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            {t("eventActions.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteDialogOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("eventActions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("eventEditForm.editCalendarEvent")}</DialogTitle>
            <DialogDescription>
              {t("eventEditForm.updateEventDetails")}
            </DialogDescription>
          </DialogHeader>
          {isLoadingEvent ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("eventPage.loading")}
            </div>
          ) : eventData ? (
            <EventEditForm
              eventId={eventId}
              initialData={eventData}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("eventPage.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("eventPage.deleteConfirmationMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t("eventPage.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("eventPage.deleting") : t("eventPage.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

