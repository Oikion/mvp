"use client";

import { useRef, useState, useCallback } from "react";
import { Lock, Shield, Globe, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ItemVisibility } from "@prisma/client";

const OPTION_STYLES: {
  value: ItemVisibility;
  icon: React.ElementType;
  tKey: string;
  color: string;
  trackColor: string;
}[] = [
  {
    value: "HIDDEN",
    icon: EyeOff,
    tKey: "hidden",
    color: "text-muted-foreground",
    trackColor: "#9ca3af",
  },
  {
    value: "PRIVATE",
    icon: Lock,
    tKey: "private",
    color: "text-muted-foreground",
    trackColor: "#6b7280",
  },
  {
    value: "SECURE",
    icon: Shield,
    tKey: "secure",
    color: "text-blue-500",
    trackColor: "#3b82f6",
  },
  {
    value: "PUBLIC",
    icon: Globe,
    tKey: "public",
    color: "text-primary",
    trackColor: "hsl(var(--primary))",
  },
];

const INDEX: Record<ItemVisibility, number> = { HIDDEN: 0, PRIVATE: 1, SECURE: 2, PUBLIC: 3 };
const FROM_INDEX: ItemVisibility[] = ["HIDDEN", "PRIVATE", "SECURE", "PUBLIC"];

// Interpolate between two hex/rgb colors by t ∈ [0,1]
function lerpColor(a: string, b: string, t: number): string {
  // Parse simple #rrggbb or rgb(r,g,b)
  const parse = (c: string): [number, number, number] => {
    if (c.startsWith("#")) {
      const n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = c.match(/\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

// Resolve the thumb color at a continuous position 0–3
function thumbColorAt(pos: number): string {
  if (pos <= 1) return lerpColor("#9ca3af", "#6b7280", pos);
  if (pos <= 2) return lerpColor("#6b7280", "#3b82f6", pos - 1);
  return lerpColor("#3b82f6", "#22c55e", pos - 2);
}

interface ItemVisibilitySelectorProps {
  value: ItemVisibility;
  onChange: (value: ItemVisibility) => void;
  disabled?: boolean;
}

export function ItemVisibilitySelector({
  value,
  onChange,
  disabled = false,
}: ItemVisibilitySelectorProps) {
  const t = useTranslations("common");

  // Build translated options from static styles
  const OPTIONS = OPTION_STYLES.map((opt) => ({
    ...opt,
    label: t(`visibility.${opt.tKey}.label`),
    shortDescription: t(`visibility.${opt.tKey}.shortDescription`),
    description: t(`visibility.${opt.tKey}.description`),
  }));

  const committedIdx = INDEX[value];
  // dragPos: float 0–3 while dragging; null when idle (uses committedIdx)
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const pos = dragPos !== null ? dragPos : committedIdx;
  const pct = (pos / 3) * 100;

  // Snap index for live label highlighting during drag
  const liveIdx = Math.min(3, Math.max(0, Math.round(pos)));
  const active = OPTIONS[committedIdx]; // pill always shows committed value

  const getPosFromEvent = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return committedIdx;
    const { left, width } = el.getBoundingClientRect();
    const raw = (clientX - left) / width;
    return Math.min(3, Math.max(0, raw * 3));
  }, [committedIdx]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault(); // prevent text selection while dragging
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragPos(getPosFromEvent(e.clientX));
  }, [disabled, getPosFromEvent]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragPos(getPosFromEvent(e.clientX));
  }, [isDragging, getPosFromEvent]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const finalPos = getPosFromEvent(e.clientX);
    const snapped = Math.min(3, Math.max(0, Math.round(finalPos)));
    setIsDragging(false);
    setDragPos(null);
    onChange(FROM_INDEX[snapped]);
  }, [isDragging, getPosFromEvent, onChange]);

  // Thumb background: interpolated during drag, exact on commit
  const thumbBg = isDragging
    ? thumbColorAt(pos)
    : OPTIONS[committedIdx].trackColor;

  return (
    <div className={cn("space-y-3 select-none", disabled && "pointer-events-none opacity-50")}>
      {/* Track */}
      <div className="relative px-2.5 py-2 select-none">
        {/* Hit-area div is the single positioning root for all track elements */}
        <div
          ref={trackRef}
          className="relative h-8 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Ghost gradient track (full width, faint) */}
          <div
            className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(to right, #9ca3af 0%, #6b7280 33%, #3b82f6 67%, hsl(var(--primary)) 100%)",
              opacity: 0.2,
            }}
          />
          {/* Filled progress track — same coordinate space as thumb */}
          <div
            className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(to right, #9ca3af 0%, #6b7280 33%, #3b82f6 67%, hsl(var(--primary)) 100%)",
              transition: isDragging ? "none" : "width 300ms cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 h-5 w-5 rounded-full border-2 shadow-md pointer-events-none"
            style={{
              left: `${pct}%`,
              transform: `translate(-50%, -50%) scale(${isDragging ? 1.2 : 1})`,
              backgroundColor: thumbBg,
              borderColor: "hsl(var(--background))",
              transition: isDragging
                ? "transform 80ms ease, background-color 80ms ease"
                : "left 300ms cubic-bezier(0.34,1.56,0.64,1), background-color 200ms ease, transform 150ms ease",
            }}
          />
          {/* Snap tick marks */}
          {[0, 33.33, 66.67, 100].map((p, i) => (
            <div
              key={i}
              className="absolute top-1/2 h-1.5 w-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${p}%`,
                backgroundColor: i <= liveIdx ? "transparent" : "hsl(var(--muted-foreground) / 0.3)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Step labels */}
      <div className="flex justify-between px-0">
        {OPTIONS.map((opt, i) => {
          const Icon = opt.icon;
          const isActive = i === (isDragging ? liveIdx : committedIdx);
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1 w-16 rounded-md px-1 py-1 transition-colors",
                "hover:bg-muted/50",
                isActive ? opt.color : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform duration-150",
                  isActive ? opt.color : "text-muted-foreground",
                  isActive && "scale-110"
                )}
              />
              <span className={cn("text-xs font-medium", isActive ? opt.color : "text-muted-foreground")}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active description pill — always shows committed value */}
      <div
        className={cn(
          "rounded-lg border px-3 py-2.5 text-sm space-y-1",
          committedIdx === 0 && "border-border bg-muted/30",
          committedIdx === 1 && "border-border bg-muted/30",
          committedIdx === 2 && "border-blue-500/30 bg-blue-500/5",
          committedIdx === 3 && "border-primary/30 bg-primary/5",
        )}
        style={{ transition: "background-color 250ms ease, border-color 250ms ease" }}
      >
        <div className="flex items-center gap-2">
          <active.icon className={cn("h-4 w-4 shrink-0", active.color)} />
          <span className={cn("font-medium", active.color)}>{active.label}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground text-xs">{active.shortDescription}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed pl-6">
          {active.description}
        </p>
      </div>
    </div>
  );
}
