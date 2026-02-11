import { cn } from "@/lib/utils";

type PlatformStatus = "connected" | "disconnected" | "error";

const STATUS_STYLES: Record<PlatformStatus, string> = {
  connected: "bg-success/10 text-success",
  disconnected: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
};

export function PlatformStatusBadge({
  status,
  label,
}: {
  status: PlatformStatus;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        STATUS_STYLES[status]
      )}
    >
      {label}
    </span>
  );
}
