"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  DragMoveEvent,
} from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Clock, GripVertical } from "lucide-react";
import {
  format,
  eachHourOfInterval,
  startOfDay,
  setHours,
  addMinutes,
  isSameDay,
} from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EventActionsMenu } from "./EventActionsMenu";
import {
  HOUR_HEIGHT,
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  timeToPixels,
  snapPixelsToTime,
  getEventPosition,
  getCurrentTimePosition,
  createDateWithTime,
} from "./calendar-utils";
import { toast } from "sonner";

interface CalendarEvent {
  id: number;
  eventId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status?: string;
  eventType?: string;
}

interface DayHourViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect?: (date: Date) => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
  onCreateEvent?: (startTime: Date, endTime: Date) => void;
  onEventMove?: (eventId: string, newStartTime: Date, newEndTime: Date) => Promise<void>;
  onEventResize?: (eventId: string, newStartTime: Date, newEndTime: Date) => Promise<void>;
  startHour?: number;
  endHour?: number;
  draftStartTime?: Date | null;
  draftEndTime?: Date | null;
  onDraftSelectionChange?: (startTime: Date, endTime: Date) => void;
  onDraftSelectionClick?: () => void;
}

type DragType =
  | "create"
  | "move"
  | "resize-top"
  | "resize-bottom"
  | "draft-move"
  | "draft-resize-top"
  | "draft-resize-bottom"
  | null;

interface DragState {
  type: DragType;
  startY: number;
  startTime: Date;
  endTime: Date;
  eventId?: string;
}

function DraftEventBlock({
  startTime,
  endTime,
  startHour,
  endHour,
  onClick,
}: {
  startTime: Date;
  endTime: Date;
  startHour: number;
  endHour: number;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "draft-event",
    data: {
      type: "draft-move",
    },
  });

  const position = getEventPosition(startTime, endTime, startHour, endHour);
  if (!position) return null;
  
  const { top, height } = position;
  const style = transform
    ? {
        top: `${top + transform.y}px`,
        height: `${height}px`,
      }
    : {
        top: `${top}px`,
        height: `${height}px`,
      };

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "event-card absolute left-1 right-1 p-2 overflow-hidden cursor-grab hover:shadow-md transition-shadow z-20",
        "select-none touch-none",
        "bg-primary/10 border-primary/40 border-2 border-dashed",
        isDragging && "opacity-60"
      )}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-primary">
          {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
        </span>
        <div
          {...attributes}
          {...listeners}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-primary/10"
          title={format(startTime, "HH:mm")}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

function DraftResizeHandle({
  position,
  startTime,
  endTime,
  startHour,
  endHour,
}: {
  position: "top" | "bottom";
  startTime: Date;
  endTime: Date;
  startHour: number;
  endHour: number;
}) {
  const type = position === "top" ? "draft-resize-top" : "draft-resize-bottom";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `draft-resize-${position}`,
    data: {
      type,
    },
  });

  const eventPosition = getEventPosition(startTime, endTime, startHour, endHour);
  if (!eventPosition) return null;
  
  const { top, height } = eventPosition;
  const handleY = position === "top" ? top : top + height;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute left-1 right-1 h-2 z-30 cursor-ns-resize flex items-center justify-center",
        "hover:bg-primary/20 transition-colors",
        isDragging && "bg-primary/30"
      )}
      style={{
        top: `${handleY - 4}px`,
        transform: transform ? `translateY(${transform.y}px)` : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      <div className="w-8 h-0.5 bg-primary rounded-full" />
    </div>
  );
}

// Draggable event component
function DraggableEvent({
  event,
  onUpdate,
  onDelete,
  startHour,
  endHour,
}: {
  event: CalendarEvent;
  onUpdate?: () => void;
  onDelete?: () => void;
  startHour: number;
  endHour: number;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `event-${event.id}`,
    data: {
      type: "move",
      event,
    },
  });

  const position = getEventPosition(
    new Date(event.startTime),
    new Date(event.endTime),
    startHour,
    endHour
  );

  // Don't render if event is entirely outside visible range
  if (!position) return null;

  const { top, height } = position;
  const style = transform
    ? {
        top: `${top + transform.y}px`,
        height: `${height}px`,
      }
    : {
        top: `${top}px`,
        height: `${height}px`,
      };

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "event-card absolute left-1 right-1 p-2 overflow-hidden cursor-move hover:shadow-md transition-shadow z-20",
        "select-none touch-none",
        "bg-primary/10 border-primary/30 border-l-4 border-l-primary",
        isDragging && "opacity-50"
      )}
      style={style}
      onClick={() => {
        if (event.eventId) {
          router.push(`/app/calendar/events/${event.eventId}`);
        }
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between gap-1">
          <span className="text-xs font-medium truncate flex-1">{event.title}</span>
          {event.eventId && (
            <div onClick={(e) => e.stopPropagation()}>
              <EventActionsMenu
                eventId={event.eventId}
                event={event}
                onEventUpdated={onUpdate}
                onEventDeleted={onDelete}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
          <Clock className="h-2.5 w-2.5" />
          <span>{format(new Date(event.startTime), "HH:mm")}</span>
        </div>
      </div>
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 right-0 h-2 cursor-move flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
    </Card>
  );
}

// Resize handle component
function ResizeHandle({
  event,
  position,
  startHour,
  endHour,
}: {
  event: CalendarEvent;
  position: "top" | "bottom";
  startHour: number;
  endHour: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `resize-${position}-${event.id}`,
    data: {
      type: `resize-${position}`,
      event,
    },
  });

  const eventPosition = getEventPosition(
    new Date(event.startTime),
    new Date(event.endTime),
    startHour,
    endHour
  );

  // Don't render if event is entirely outside visible range
  if (!eventPosition) return null;

  const { top, height } = eventPosition;
  const handleY = position === "top" ? top : top + height;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute left-1 right-1 h-2 z-30 cursor-ns-resize flex items-center justify-center",
        "hover:bg-primary/20 transition-colors",
        isDragging && "bg-primary/30"
      )}
      style={{
        top: `${handleY - 4}px`,
        transform: transform ? `translateY(${transform.y}px)` : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      <div className="w-8 h-0.5 bg-primary rounded-full" />
    </div>
  );
}

export function DayHourView({
  events,
  selectedDate,
  onDateSelect,
  onEventUpdated,
  onEventDeleted,
  onCreateEvent,
  onEventMove,
  onEventResize,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
  draftStartTime,
  draftEndTime,
  onDraftSelectionChange,
  onDraftSelectionClick,
}: DayHourViewProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;
  const router = useRouter();

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [optimisticEvents, setOptimisticEvents] = useState<Map<string, CalendarEvent>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);
  const createPointerIdRef = useRef<number | null>(null);

  // Prevent browser text/element selection while dragging (create/move/resize).
  useEffect(() => {
    if (!isDragging) return;
    const body = document.body;
    const prevUserSelect = body.style.userSelect;
    const prevWebkitUserSelect = (body.style as unknown as { WebkitUserSelect?: string })
      .WebkitUserSelect;
    const prevCursor = body.style.cursor;

    body.style.userSelect = "none";
    (body.style as unknown as { WebkitUserSelect?: string }).WebkitUserSelect = "none";
    body.style.cursor = "grabbing";

    return () => {
      body.style.userSelect = prevUserSelect;
      (body.style as unknown as { WebkitUserSelect?: string }).WebkitUserSelect =
        prevWebkitUserSelect ?? "";
      body.style.cursor = prevCursor;
    };
  }, [isDragging]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const hours = useMemo(() => {
    return eachHourOfInterval({
      start: setHours(startOfDay(selectedDate), startHour),
      end: setHours(startOfDay(selectedDate), endHour),
    });
  }, [selectedDate, startHour, endHour]);

  const eventsForDay = useMemo(() => {
    const baseEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, selectedDate);
    });

    // Apply optimistic updates
    const updatedEvents = baseEvents.map((event) => {
      if (event.eventId && optimisticEvents.has(event.eventId)) {
        return optimisticEvents.get(event.eventId)!;
      }
      return event;
    });

    return updatedEvents;
  }, [events, selectedDate, optimisticEvents]);

  const currentTimePosition = getCurrentTimePosition(startHour, endHour);

  // Auto-scroll to current time or 6 AM on mount
  useEffect(() => {
    if (hasScrolledRef.current) return;
    
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    // Calculate scroll position: prefer current time, fallback to 6 AM
    const now = new Date();
    const currentHour = now.getHours();
    const targetHour = currentHour >= startHour && currentHour < endHour ? currentHour : 6;
    
    // Scroll to target hour minus 1 hour for context (so target is visible, not at top)
    const scrollToHour = Math.max(startHour, targetHour - 1);
    const scrollPosition = (scrollToHour - startHour) * HOUR_HEIGHT;
    
    scrollContainer.scrollTop = scrollPosition;
    hasScrolledRef.current = true;
  }, [startHour, endHour]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === "draft-move") {
      if (!draftStartTime || !draftEndTime) return;
      setIsDragging(true);
      setDragState({
        type: "draft-move",
        startY: 0,
        startTime: new Date(draftStartTime),
        endTime: new Date(draftEndTime),
      });
    } else if ((data?.type === "draft-resize-top" || data?.type === "draft-resize-bottom") && draftStartTime && draftEndTime) {
      setIsDragging(true);
      setDragState({
        type: data.type as DragType,
        startY: 0,
        startTime: new Date(draftStartTime),
        endTime: new Date(draftEndTime),
      });
    } else if (data?.type === "move" && data.event) {
      setIsDragging(true);
      const event = data.event as CalendarEvent;
      setDragState({
        type: "move",
        startY: 0,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        eventId: event.eventId,
      });
    } else if (data?.type?.startsWith("resize-") && data.event) {
      setIsDragging(true);
      const event = data.event as CalendarEvent;
      const position = data.type.includes("top") ? "resize-top" : "resize-bottom";
      setDragState({
        type: position,
        startY: 0,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        eventId: event.eventId,
      });
    }
  }, [draftEndTime, draftStartTime, selectedDate, startHour]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!dragState || !gridRef.current) return;

    const { active, delta } = event;
    const rect = gridRef.current.getBoundingClientRect();
    const translatedTop = active.rect.current.translated?.top;
    const currentY =
      typeof translatedTop === "number"
        ? translatedTop - rect.top
        : dragState.startY + (delta?.y ?? 0);

    if (dragState.type === "draft-move") {
      const duration = dragState.endTime.getTime() - dragState.startTime.getTime();
      const { hours, minutes } = snapPixelsToTime(currentY, startHour);
      const newStartTime = createDateWithTime(selectedDate, hours, minutes);
      const newEndTime = new Date(newStartTime.getTime() + duration);

      onDraftSelectionChange?.(newStartTime, newEndTime);
      setDragState({
        ...dragState,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    } else if (dragState.type === "draft-resize-top") {
      const { hours, minutes } = snapPixelsToTime(currentY, startHour);
      const newStartTime = createDateWithTime(selectedDate, hours, minutes);
      if (newStartTime < dragState.endTime) {
        onDraftSelectionChange?.(newStartTime, dragState.endTime);
        setDragState({
          ...dragState,
          startTime: newStartTime,
        });
      }
    } else if (dragState.type === "draft-resize-bottom") {
      const { hours, minutes } = snapPixelsToTime(currentY, startHour);
      const newEndTime = createDateWithTime(selectedDate, hours, minutes);
      if (newEndTime > dragState.startTime) {
        onDraftSelectionChange?.(dragState.startTime, newEndTime);
        setDragState({
          ...dragState,
          endTime: newEndTime,
        });
      }
    } else if (dragState.type === "move" && dragState.eventId) {
      const duration = dragState.endTime.getTime() - dragState.startTime.getTime();
      const { hours, minutes } = snapPixelsToTime(currentY, startHour);
      const newStartTime = createDateWithTime(selectedDate, hours, minutes);
      const newEndTime = new Date(newStartTime.getTime() + duration);

      // Update optimistic event position
      const event = eventsForDay.find((e) => e.eventId === dragState.eventId);
      if (event) {
        setOptimisticEvents((prev) => {
          const updated = new Map(prev);
          updated.set(event.eventId!, {
            ...event,
            startTime: newStartTime.toISOString(),
            endTime: newEndTime.toISOString(),
          });
          return updated;
        });
      }

      setDragState({
        ...dragState,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    } else if (dragState.type === "resize-top" && dragState.eventId) {
      const { hours, minutes } = snapPixelsToTime(currentY, startHour);
      const newStartTime = createDateWithTime(selectedDate, hours, minutes);
      if (newStartTime < dragState.endTime) {
        // Update optimistic event resize
        const event = eventsForDay.find((e) => e.eventId === dragState.eventId);
        if (event) {
          setOptimisticEvents((prev) => {
            const updated = new Map(prev);
            updated.set(event.eventId!, {
              ...event,
              startTime: newStartTime.toISOString(),
            });
            return updated;
          });
        }

        setDragState({
          ...dragState,
          startTime: newStartTime,
        });
      }
    } else if (dragState.type === "resize-bottom" && dragState.eventId) {
      const { hours, minutes } = snapPixelsToTime(currentY, startHour);
      const newEndTime = createDateWithTime(selectedDate, hours, minutes);
      if (newEndTime > dragState.startTime) {
        // Update optimistic event resize
        const event = eventsForDay.find((e) => e.eventId === dragState.eventId);
        if (event) {
          setOptimisticEvents((prev) => {
            const updated = new Map(prev);
            updated.set(event.eventId!, {
              ...event,
              endTime: newEndTime.toISOString(),
            });
            return updated;
          });
        }

        setDragState({
          ...dragState,
          endTime: newEndTime,
        });
      }
    }
  }, [dragState, onDraftSelectionChange, selectedDate, startHour]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (!dragState) {
      setIsDragging(false);
      return;
    }

    try {
      if (
        dragState.type === "draft-move" ||
        dragState.type === "draft-resize-top" ||
        dragState.type === "draft-resize-bottom"
      ) {
        // Draft selection updates are local-only (no API)
        return;
      } else if (dragState.type === "move" && dragState.eventId) {
        // Update event time via API
        if (onEventMove) {
          await onEventMove(
            dragState.eventId,
            dragState.startTime,
            dragState.endTime
          );
          toast.success(t("calendarView.eventMoved"));
        } else {
          toast.success(t("calendarView.eventMoved"));
          onEventUpdated?.();
        }
        // Clear optimistic update after successful API call
        setOptimisticEvents((prev) => {
          const updated = new Map(prev);
          updated.delete(dragState.eventId!);
          return updated;
        });
      } else if (
        (dragState.type === "resize-top" || dragState.type === "resize-bottom") &&
        dragState.eventId
      ) {
        // Update event duration via API
        if (onEventResize) {
          await onEventResize(
            dragState.eventId,
            dragState.startTime,
            dragState.endTime
          );
          toast.success(t("calendarView.eventResized"));
        } else {
          toast.success(t("calendarView.eventResized"));
          onEventUpdated?.();
        }
        // Clear optimistic update after successful API call
        setOptimisticEvents((prev) => {
          const updated = new Map(prev);
          updated.delete(dragState.eventId!);
          return updated;
        });
      }
    } catch (error) {
      console.error("Failed to update event:", error);
      // Revert optimistic update on error
      setOptimisticEvents((prev) => {
        const updated = new Map(prev);
        if (dragState.eventId) {
          updated.delete(dragState.eventId);
        }
        return updated;
      });
      toast.error(
        dragState.type === "move"
          ? t("calendarView.failedToMoveEvent")
          : t("calendarView.failedToResizeEvent")
      );
    } finally {
      setDragState(null);
      setIsDragging(false);
    }
  }, [dragState, onEventMove, onEventResize, onEventUpdated, t]);

  const handleCreatePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only left-click / primary pointer
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest(".event-card")) return;
      // Prevent browser selection/drag image behavior
      e.preventDefault();

      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Cancel any in-flight dnd drag state
      if (dragState && dragState.type !== "create") {
        setDragState(null);
        setIsDragging(false);
      }

      const rawY = e.clientY - rect.top;
      const y = Math.max(0, Math.min(rect.height, rawY));
      const { hours, minutes } = snapPixelsToTime(y, startHour);
      const startTime = createDateWithTime(selectedDate, hours, minutes);

      createPointerIdRef.current = e.pointerId;
      setDragState({
        type: "create",
        startY: y,
        startTime,
        endTime: addMinutes(startTime, 15),
      });
      setIsDragging(true);
    },
    [dragState, selectedDate, startHour]
  );

  useEffect(() => {
    if (!dragState || dragState.type !== "create") return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!gridRef.current) return;
      if (createPointerIdRef.current !== null && e.pointerId !== createPointerIdRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const rawY = e.clientY - rect.top;
      const y = Math.max(0, Math.min(rect.height, rawY));

      const startY = Math.min(dragState.startY, y);
      const endY = Math.max(dragState.startY, y);

      const { hours: startHours, minutes: startMinutes } = snapPixelsToTime(startY, startHour);
      const { hours: endHours, minutes: endMinutes } = snapPixelsToTime(endY, startHour);

      const startTime = createDateWithTime(selectedDate, startHours, startMinutes);
      let endTime = createDateWithTime(selectedDate, endHours, endMinutes);

      if (endTime <= startTime) {
        endTime = addMinutes(startTime, 15);
      }

      setDragState((prev) => {
        if (!prev || prev.type !== "create") return prev;
        return {
          ...prev,
          startTime,
          endTime,
        };
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (createPointerIdRef.current !== null && e.pointerId !== createPointerIdRef.current) return;

      // finalize create
      if (onCreateEvent) {
        onCreateEvent(dragState.startTime, dragState.endTime);
      }

      createPointerIdRef.current = null;
      setDragState(null);
      setIsDragging(false);
    };

    const handlePointerCancel = (e: PointerEvent) => {
      if (createPointerIdRef.current !== null && e.pointerId !== createPointerIdRef.current) return;
      createPointerIdRef.current = null;
      setDragState(null);
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [dragState, onCreateEvent, selectedDate, startHour]);

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: "hour-grid",
  });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-[400px]">
          <div
            ref={(node) => {
              setDroppableRef(node);
              if (node) {
                gridRef.current = node;
              }
            }}
            className="relative"
          >
            {/* Time labels */}
            <div className="absolute left-0 top-0 bottom-0 w-16 border-r">
              {hours.map((hour) => (
                <div
                  key={hour.toISOString()}
                  className="h-[60px] border-b text-xs text-muted-foreground p-1 text-right pr-2"
                >
                  {format(hour, "HH:mm")}
                </div>
              ))}
            </div>

            {/* Hour grid */}
            <div className="ml-16 relative select-none touch-none" onPointerDown={handleCreatePointerDown}>
              {hours.map((hour) => (
                <div
                  key={hour.toISOString()}
                  className="h-[60px] border-b border-r"
                />
              ))}

              {/* Current time indicator */}
              {currentTimePosition !== null && (
                <div
                  className="absolute left-0 right-0 z-10"
                  style={{ top: `${currentTimePosition}px` }}
                >
                  <div className="h-0.5 bg-primary relative">
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
                  </div>
                </div>
              )}

              {/* Events */}
              {eventsForDay.map((event) => (
                <div key={event.id}>
                  <DraggableEvent
                    event={event}
                    onUpdate={onEventUpdated}
                    onDelete={onEventDeleted}
                    startHour={startHour}
                    endHour={endHour}
                  />
                  {event.eventId && (
                    <>
                      <ResizeHandle
                        event={event}
                        position="top"
                        startHour={startHour}
                        endHour={endHour}
                      />
                      <ResizeHandle
                        event={event}
                        position="bottom"
                        startHour={startHour}
                        endHour={endHour}
                      />
                    </>
                  )}
                </div>
              ))}

              {/* Draft selection (persists after form closes) */}
              {draftStartTime &&
                draftEndTime &&
                isSameDay(draftStartTime, selectedDate) &&
                isSameDay(draftEndTime, selectedDate) && (
                  <>
                    <DraftEventBlock
                      startTime={draftStartTime}
                      endTime={draftEndTime}
                      startHour={startHour}
                      endHour={endHour}
                      onClick={onDraftSelectionClick}
                    />
                    <DraftResizeHandle
                      position="top"
                      startTime={draftStartTime}
                      endTime={draftEndTime}
                      startHour={startHour}
                      endHour={endHour}
                    />
                    <DraftResizeHandle
                      position="bottom"
                      startTime={draftStartTime}
                      endTime={draftEndTime}
                      startHour={startHour}
                      endHour={endHour}
                    />
                  </>
                )}

              {/* Drag preview for creating */}
              {dragState?.type === "create" && (
                <div
                  className="absolute left-1 right-1 bg-primary/20 border-2 border-dashed border-primary rounded z-30 transition-all duration-75"
                  style={{
                    top: `${timeToPixels(
                      dragState.startTime.getHours(),
                      dragState.startTime.getMinutes(),
                      startHour
                    )}px`,
                    height: `${Math.max(
                      30,
                      timeToPixels(
                        dragState.endTime.getHours(),
                        dragState.endTime.getMinutes(),
                        startHour
                      ) -
                        timeToPixels(
                          dragState.startTime.getHours(),
                          dragState.startTime.getMinutes(),
                          startHour
                        )
                    )}px`,
                  }}
                >
                  <div className="p-2 text-xs text-primary font-medium flex items-center justify-between">
                    <span>
                      {format(dragState.startTime, "HH:mm")} -{" "}
                      {format(dragState.endTime, "HH:mm")}
                    </span>
                    <span className="text-[10px] text-primary/70">
                      {Math.round((dragState.endTime.getTime() - dragState.startTime.getTime()) / (1000 * 60))} min
                    </span>
                  </div>
                </div>
              )}

              {/* Drag preview for moving/resizing */}
              {dragState &&
                dragState.type !== "create" &&
                (dragState.eventId || (dragState.type && dragState.type.startsWith("draft-"))) && (
                <div
                  className="absolute left-1 right-1 bg-primary/30 border-2 border-primary rounded z-30 opacity-75 transition-all duration-75"
                  style={{
                    top: `${timeToPixels(
                      dragState.startTime.getHours(),
                      dragState.startTime.getMinutes(),
                      startHour
                    )}px`,
                    height: `${Math.max(
                      30,
                      timeToPixels(
                        dragState.endTime.getHours(),
                        dragState.endTime.getMinutes(),
                        startHour
                      ) -
                        timeToPixels(
                          dragState.startTime.getHours(),
                          dragState.startTime.getMinutes(),
                          startHour
                        )
                    )}px`,
                  }}
                >
                  <div className="p-2 text-xs text-primary font-medium">
                    {format(dragState.startTime, "HH:mm")} -{" "}
                    {format(dragState.endTime, "HH:mm")}
                  </div>
                </div>
              )}
            </div>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </DndContext>
  );
}

