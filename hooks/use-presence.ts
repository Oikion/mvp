import { useContext } from "react";
import { PresenceContext } from "@/components/providers/PresenceProvider";

/**
 * Hook to access presence state for any user.
 *
 * @example
 * ```tsx
 * const { getUserStatus, isUserOnline } = usePresence();
 *
 * <UserAvatar
 *   name={user.name}
 *   imageUrl={user.avatar}
 *   status={getUserStatus(user.id).toLowerCase() as "online" | "away" | "busy" | "offline"}
 * />
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
