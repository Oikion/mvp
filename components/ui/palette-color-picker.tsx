"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PALETTE_COLORS,
  type PaletteColor,
  getPaletteColorLabel,
} from "@/lib/theme/color-tokens";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/**
 * Props for the PaletteColorPicker component
 */
export interface PaletteColorPickerProps {
  /** Currently selected color */
  value?: PaletteColor;
  /** Callback when a color is selected */
  onChange?: (color: PaletteColor) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom trigger element (defaults to color swatch button) */
  children?: React.ReactNode;
  /** Additional classes for the trigger */
  className?: string;
  /** Alignment of the popover */
  align?: "start" | "center" | "end";
  /** Side of the popover */
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * A color picker component for selecting palette colors.
 * Similar to Notion's color picker, providing a grid of theme-aware colors.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PaletteColorPicker
 *   value={selectedColor}
 *   onChange={setSelectedColor}
 * />
 *
 * // With custom trigger
 * <PaletteColorPicker value={color} onChange={setColor}>
 *   <Button variant="outline">Choose Color</Button>
 * </PaletteColorPicker>
 * ```
 */
export function PaletteColorPicker({
  value,
  onChange,
  disabled = false,
  children,
  className,
  align = "start",
  side = "bottom",
}: Readonly<PaletteColorPickerProps>) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (color: PaletteColor) => {
    onChange?.(color);
    setOpen(false);
  };

  // Default trigger: a color swatch button
  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      className={cn(
        "h-8 w-8 p-0 rounded-md border-2",
        value ? `bg-palette-${value}-solid` : "bg-muted",
        className
      )}
      aria-label={value ? `Selected color: ${getPaletteColorLabel(value)}` : "Select a color"}
    >
      <span className="sr-only">
        {value ? getPaletteColorLabel(value) : "Select color"}
      </span>
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3"
        align={align}
        side={side}
      >
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Select a color
          </p>
          <div className="grid grid-cols-8 gap-1.5">
            {PALETTE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleSelect(color)}
                className={cn(
                  "relative h-6 w-6 rounded-md transition-all",
                  "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  `bg-palette-${color}-solid`,
                  value === color && "ring-2 ring-offset-2 ring-primary"
                )}
                title={getPaletteColorLabel(color)}
                aria-label={getPaletteColorLabel(color)}
                aria-pressed={value === color}
              >
                {value === color && (
                  <Check
                    className={cn(
                      "absolute inset-0 m-auto h-3.5 w-3.5",
                      `text-palette-${color}-solid-fg`
                    )}
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Props for the PaletteColorGrid component
 */
export interface PaletteColorGridProps {
  /** Currently selected color */
  value?: PaletteColor;
  /** Callback when a color is selected */
  onChange?: (color: PaletteColor) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Number of columns in the grid */
  columns?: 4 | 8 | 16;
  /** Size of color swatches */
  size?: "sm" | "md" | "lg";
  /** Additional classes */
  className?: string;
}

/**
 * A standalone color grid for inline color selection.
 * Use this when you don't need a popover wrapper.
 *
 * @example
 * ```tsx
 * <PaletteColorGrid
 *   value={selectedColor}
 *   onChange={setSelectedColor}
 *   columns={8}
 *   size="md"
 * />
 * ```
 */
export function PaletteColorGrid({
  value,
  onChange,
  disabled = false,
  columns = 8,
  size = "md",
  className,
}: Readonly<PaletteColorGridProps>) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const checkSizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div
      className={cn(
        "grid gap-1.5",
        columns === 4 && "grid-cols-4",
        columns === 8 && "grid-cols-8",
        columns === 16 && "grid-cols-16",
        className
      )}
      role="listbox"
      aria-label="Color options"
    >
      {PALETTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(color)}
          className={cn(
            "relative rounded-md transition-all",
            "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
            `bg-palette-${color}-solid`,
            sizeClasses[size],
            value === color && "ring-2 ring-offset-2 ring-primary"
          )}
          title={getPaletteColorLabel(color)}
          aria-label={getPaletteColorLabel(color)}
          aria-selected={value === color}
          role="option"
        >
          {value === color && (
            <Check
              className={cn(
                "absolute inset-0 m-auto",
                `text-palette-${color}-solid-fg`,
                checkSizeClasses[size]
              )}
              aria-hidden="true"
            />
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Props for the PaletteColorSwatch component
 */
export interface PaletteColorSwatchProps {
  /** The palette color to display */
  color: PaletteColor;
  /** Size of the swatch */
  size?: "xs" | "sm" | "md" | "lg";
  /** Whether to show a border */
  bordered?: boolean;
  /** Additional classes */
  className?: string;
}

/**
 * A simple color swatch display component.
 * Use this for showing a color preview without interaction.
 *
 * @example
 * ```tsx
 * <PaletteColorSwatch color="blue" size="md" />
 * ```
 */
export function PaletteColorSwatch({
  color,
  size = "md",
  bordered = false,
  className,
}: Readonly<PaletteColorSwatchProps>) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        `bg-palette-${color}-solid`,
        sizeClasses[size],
        bordered && "ring-1 ring-inset ring-black/10",
        className
      )}
      title={getPaletteColorLabel(color)}
      aria-label={getPaletteColorLabel(color)}
    />
  );
}
