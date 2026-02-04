import { setHours, setMinutes, startOfDay, format } from "date-fns";

export const HOUR_HEIGHT = 60; // pixels per hour
export const MINUTE_HEIGHT = HOUR_HEIGHT / 60; // pixels per minute
export const SNAP_INTERVAL = 15; // minutes
export const DEFAULT_START_HOUR = 0; // 12:00 AM (midnight)
export const DEFAULT_END_HOUR = 24; // 12:00 AM next day (full 24-hour view)

/**
 * Convert a time (hours + minutes) to pixel position
 */
export function timeToPixels(
  hours: number,
  minutes: number,
  startHour: number = DEFAULT_START_HOUR
): number {
  const totalMinutes = (hours - startHour) * 60 + minutes;
  return totalMinutes * MINUTE_HEIGHT;
}

/**
 * Convert pixel position to time (hours + minutes)
 */
export function pixelsToTime(
  pixels: number,
  startHour: number = DEFAULT_START_HOUR
): { hours: number; minutes: number } {
  const totalMinutes = pixels / MINUTE_HEIGHT;
  const hours = Math.floor(totalMinutes / 60) + startHour;
  const minutes = totalMinutes % 60;
  return { hours: Math.max(startHour, hours), minutes: Math.max(0, minutes) };
}

/**
 * Snap time to nearest interval (default 15 minutes)
 */
export function snapToInterval(
  hours: number,
  minutes: number,
  interval: number = SNAP_INTERVAL
): { hours: number; minutes: number } {
  const totalMinutes = hours * 60 + minutes;
  const snappedMinutes = Math.round(totalMinutes / interval) * interval;
  return {
    hours: Math.floor(snappedMinutes / 60),
    minutes: snappedMinutes % 60,
  };
}

/**
 * Snap pixel position to nearest time interval
 */
export function snapPixelsToTime(
  pixels: number,
  startHour: number = DEFAULT_START_HOUR,
  interval: number = SNAP_INTERVAL
): { hours: number; minutes: number } {
  const { hours, minutes } = pixelsToTime(pixels, startHour);
  return snapToInterval(hours, minutes, interval);
}

/**
 * Create a date with specific time
 */
export function createDateWithTime(
  baseDate: Date,
  hours: number,
  minutes: number
): Date {
  return setMinutes(setHours(startOfDay(baseDate), hours), minutes);
}

/**
 * Calculate event position and dimensions
 * Clamps events to the visible time range so events outside the range are still visible
 * Returns null if the event is entirely outside the visible range
 */
export function getEventPosition(
  startTime: Date,
  endTime: Date,
  startHour: number = DEFAULT_START_HOUR,
  endHour: number = DEFAULT_END_HOUR
): { top: number; height: number } | null {
  const startHours = startTime.getHours();
  const startMinutes = startTime.getMinutes();
  const endHours = endTime.getHours();
  const endMinutes = endTime.getMinutes();

  // Handle midnight (hour 0) events - if end is 0:00 and start is before, treat end as 24:00
  let effectiveEndHours = endHours;
  let effectiveEndMinutes = endMinutes;
  if (endHours === 0 && endMinutes === 0 && startHours > 0) {
    effectiveEndHours = 24;
    effectiveEndMinutes = 0;
  }

  // Check if event is entirely outside visible range
  if (effectiveEndHours <= startHour || startHours >= endHour) {
    return null;
  }

  // Clamp start time to visible range (events before startHour appear at top)
  const clampedStartHours = Math.max(startHours, startHour);
  const clampedStartMinutes = startHours < startHour ? 0 : startMinutes;
  
  // Clamp end time to visible range (events after endHour appear at bottom)
  const clampedEndHours = Math.min(effectiveEndHours, endHour);
  const clampedEndMinutes = effectiveEndHours > endHour ? 0 : effectiveEndMinutes;

  const top = timeToPixels(clampedStartHours, clampedStartMinutes, startHour);
  const endPixels = timeToPixels(clampedEndHours, clampedEndMinutes, startHour);
  const height = Math.max(30, endPixels - top);

  return { top, height };
}

/**
 * Calculate duration in minutes from pixel height
 */
export function pixelsToDuration(pixels: number): number {
  return pixels / MINUTE_HEIGHT;
}

/**
 * Calculate pixel height from duration in minutes
 */
export function durationToPixels(minutes: number): number {
  return minutes * MINUTE_HEIGHT;
}

/**
 * Format time for display
 */
export function formatTime(hours: number, minutes: number): string {
  const date = createDateWithTime(new Date(), hours, minutes);
  return format(date, "HH:mm");
}

/**
 * Check if two events overlap
 */
export function eventsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Calculate overlapping event positions for layout
 * Returns array of { event, left, width } for positioning side-by-side
 */
export function calculateOverlappingLayout<T extends { startTime: Date; endTime: Date }>(
  events: T[]
): Array<{ event: T; left: number; width: number }> {
  if (events.length === 0) return [];

  // Sort events by start time
  const sorted = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  // Group overlapping events
  const groups: T[][] = [];
  let currentGroup: T[] = [];

  sorted.forEach((event) => {
    if (currentGroup.length === 0) {
      currentGroup.push(event);
    } else {
      // Check if event overlaps with any event in current group
      const overlaps = currentGroup.some((e) =>
        eventsOverlap(e.startTime, e.endTime, event.startTime, event.endTime)
      );

      if (overlaps) {
        currentGroup.push(event);
      } else {
        groups.push(currentGroup);
        currentGroup = [event];
      }
    }
  });
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Calculate positions for each event
  const result: Array<{ event: T; left: number; width: number }> = [];

  groups.forEach((group) => {
    if (group.length === 1) {
      result.push({ event: group[0], left: 0, width: 100 });
    } else {
      // Distribute overlapping events side by side
      const width = 100 / group.length;
      group.forEach((event, idx) => {
        result.push({ event, left: idx * width, width });
      });
    }
  });

  return result;
}

/**
 * Get current time indicator position
 */
export function getCurrentTimePosition(
  startHour: number = DEFAULT_START_HOUR,
  endHour: number = DEFAULT_END_HOUR
): number | null {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Only show if within visible range
  if (currentHour < startHour || currentHour >= endHour) {
    return null;
  }

  return timeToPixels(currentHour, currentMinute, startHour);
}
