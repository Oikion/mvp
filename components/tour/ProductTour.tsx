"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ProductTour - Lightweight product tour system
 *
 * Provides a simple way to create interactive product tours
 * for onboarding and feature discovery.
 *
 * @example
 * ```tsx
 * const steps: TourStep[] = [
 *   {
 *     target: "#sidebar-trigger",
 *     title: "Toggle Sidebar",
 *     content: "Click here to show or hide the sidebar navigation.",
 *     placement: "right",
 *   },
 *   {
 *     target: "#global-search",
 *     title: "Global Search",
 *     content: "Use CMD+K to quickly search across all your data.",
 *     placement: "bottom",
 *   },
 * ];
 *
 * <ProductTour
 *   steps={steps}
 *   isOpen={showTour}
 *   onComplete={() => setShowTour(false)}
 * />
 * ```
 */

export type TourPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end";

export interface TourStep {
  /**
   * CSS selector for the target element
   */
  target: string;
  /**
   * Title of the step
   */
  title: string;
  /**
   * Content/description of the step
   */
  content: string;
  /**
   * Placement of the tooltip relative to target
   */
  placement?: TourPlacement;
  /**
   * Action button configuration
   */
  action?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Whether to highlight the target element
   */
  spotlight?: boolean;
}

export interface ProductTourProps {
  /**
   * Array of tour steps
   */
  steps: TourStep[];
  /**
   * Whether the tour is currently open
   */
  isOpen: boolean;
  /**
   * Called when tour is completed or skipped
   */
  onComplete: () => void;
  /**
   * Called when a specific step is reached
   */
  onStepChange?: (stepIndex: number) => void;
  /**
   * Starting step index
   */
  initialStep?: number;
  /**
   * Custom labels for buttons
   */
  labels?: {
    skip?: string;
    next?: string;
    previous?: string;
    finish?: string;
  };
}

/**
 * Calculate tooltip position based on target element and placement
 */
function getTooltipPosition(
  targetRect: DOMRect,
  placement: TourPlacement,
  tooltipSize: { width: number; height: number }
): { top: number; left: number } {
  const OFFSET = 12;
  const { width: tw, height: th } = tooltipSize;

  switch (placement) {
    case "top":
      return {
        top: targetRect.top - th - OFFSET,
        left: targetRect.left + targetRect.width / 2 - tw / 2,
      };
    case "top-start":
      return {
        top: targetRect.top - th - OFFSET,
        left: targetRect.left,
      };
    case "top-end":
      return {
        top: targetRect.top - th - OFFSET,
        left: targetRect.right - tw,
      };
    case "bottom":
      return {
        top: targetRect.bottom + OFFSET,
        left: targetRect.left + targetRect.width / 2 - tw / 2,
      };
    case "bottom-start":
      return {
        top: targetRect.bottom + OFFSET,
        left: targetRect.left,
      };
    case "bottom-end":
      return {
        top: targetRect.bottom + OFFSET,
        left: targetRect.right - tw,
      };
    case "left":
      return {
        top: targetRect.top + targetRect.height / 2 - th / 2,
        left: targetRect.left - tw - OFFSET,
      };
    case "right":
      return {
        top: targetRect.top + targetRect.height / 2 - th / 2,
        left: targetRect.right + OFFSET,
      };
  }
}

export function ProductTour({
  steps,
  isOpen,
  onComplete,
  onStepChange,
  initialStep = 0,
  labels = {},
}: Readonly<ProductTourProps>) {
  const [currentStep, setCurrentStep] = React.useState(initialStep);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const {
    skip = "Skip tour",
    next = "Next",
    previous = "Previous",
    finish = "Got it!",
  } = labels;

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Update position when step changes
  React.useEffect(() => {
    if (!isOpen || !step) return;

    const updatePosition = () => {
      const target = document.querySelector(step.target);
      if (!target) {
        console.warn(`Tour target not found: ${step.target}`);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      // Wait for tooltip to render to get its size
      requestAnimationFrame(() => {
        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const pos = getTooltipPosition(rect, step.placement ?? "bottom", {
            width: tooltipRect.width,
            height: tooltipRect.height,
          });

          // Keep tooltip within viewport
          const clampedPos = {
            top: Math.max(10, Math.min(pos.top, globalThis.innerHeight - tooltipRect.height - 10)),
            left: Math.max(10, Math.min(pos.left, globalThis.innerWidth - tooltipRect.width - 10)),
          };

          setPosition(clampedPos);
        }
      });

      // Scroll target into view if needed
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    updatePosition();

    // Update on resize/scroll
    globalThis.addEventListener("resize", updatePosition);
    globalThis.addEventListener("scroll", updatePosition, true);

    return () => {
      globalThis.removeEventListener("resize", updatePosition);
      globalThis.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, step, currentStep]);

  // Notify step change
  React.useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onComplete();
      } else if (e.key === "ArrowRight" && !isLastStep) {
        setCurrentStep((prev) => prev + 1);
      } else if (e.key === "ArrowLeft" && !isFirstStep) {
        setCurrentStep((prev) => prev - 1);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFirstStep, isLastStep, onComplete]);

  if (!isOpen || !step) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/50 transition-opacity" />

      {/* Spotlight on target element */}
      {targetRect && step.spotlight !== false && (
        <div
          className="fixed z-[9998] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        aria-label={`Tour step ${currentStep + 1} of ${steps.length}: ${step.title}`}
        className={cn(
          "fixed z-[9999] w-80 max-w-[calc(100vw-20px)]",
          "bg-popover text-popover-foreground rounded-lg shadow-lg",
          "border animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-semibold text-base">{step.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-2"
            onClick={onComplete}
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">{step.content}</p>
          {step.action && (
            <Button
              variant="link"
              className="px-0 mt-2"
              onClick={step.action.onClick}
            >
              {step.action.label}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 pt-0 border-t mt-2">
          {/* Progress indicator */}
          <div className="flex items-center gap-1">
            {steps.map((stepItem, index) => {
              let dotClass = "bg-muted";
              if (index === currentStep) {
                dotClass = "bg-primary";
              } else if (index < currentStep) {
                dotClass = "bg-primary/40";
              }
              return (
                <div
                  key={stepItem.target}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    dotClass
                  )}
                />
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {isFirstStep ? (
              <Button variant="ghost" size="sm" onClick={onComplete}>
                {skip}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {previous}
              </Button>
            )}

            {isLastStep ? (
              <Button size="sm" onClick={onComplete}>
                {finish}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
              >
                {next}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * useTour - Hook for managing tour state
 *
 * Provides a simple API for controlling the tour.
 *
 * @example
 * ```tsx
 * const { isOpen, start, complete, currentStep } = useTour("dashboard-tour");
 *
 * // Start the tour
 * <Button onClick={start}>Start Tour</Button>
 *
 * // The tour component
 * <ProductTour steps={steps} isOpen={isOpen} onComplete={complete} />
 * ```
 */
export function useTour(tourId: string) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hasCompleted, setHasCompleted] = React.useState(false);

  // Check if tour has been completed before (from localStorage)
  React.useEffect(() => {
    const completed = localStorage.getItem(`tour-${tourId}-completed`);
    setHasCompleted(completed === "true");
  }, [tourId]);

  const start = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const complete = React.useCallback(() => {
    setIsOpen(false);
    setHasCompleted(true);
    localStorage.setItem(`tour-${tourId}-completed`, "true");
  }, [tourId]);

  const reset = React.useCallback(() => {
    setHasCompleted(false);
    localStorage.removeItem(`tour-${tourId}-completed`);
  }, [tourId]);

  return {
    isOpen,
    hasCompleted,
    start,
    complete,
    reset,
  };
}
