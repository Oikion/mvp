import { useContext } from "react";
import { PresenceContext } from "@/components/providers/PresenceProvider";

/**
 * Hook to access presence state for any user.
 *
 * @example
 * ```tsx
 * const { getUserStatus } = usePresence();
 * const borderClass = toPresenceBorder(getUserStatus(user.id));
 * <Avatar className={`border-2 ${borderClass}`}>...</Avatar>
 * ```
 */
export function usePresence() {
  return useContext(PresenceContext);
}

/**
 * Maps DB/Ably presence status to UserAvatar status prop.
 * UserAvatar expects lowercase; Ably/DB uses uppercase.
 */
export function toAvatarStatus(
  status: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE" | string
): "online" | "away" | "busy" | "offline" {
  switch (status) {
    case "ONLINE": return "online";
    case "AWAY": return "away";
    case "BUSY": return "busy";
    default: return "offline";
  }
}

/**
 * Maps presence status to a Tailwind border color class.
 * The project convention is to show presence via avatar border color:
 * green = online, orange = away, gray = offline.
 */
export function toPresenceBorder(
  status: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE" | string
): string {
  switch (status) {
    case "ONLINE": return "border-success";
    case "AWAY": return "border-warning";
    case "BUSY": return "border-destructive";
    default: return "border-muted-foreground/30";
  }
}
