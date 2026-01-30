"use client";

import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { useLayoutPreference } from "@/lib/layout-preference";
import { cn } from "@/lib/utils";

interface LayoutWrapperProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

/**
 * LayoutWrapper
 * 
 * Wraps page content and applies width constraints based on user's layout preference.
 * - DEFAULT: Centered with max-w-7xl constraint
 * - WIDE: Full width (no constraint)
 * 
 * Uses GSAP FLIP-like animation for smooth layout transitions.
 * Hydration-safe: renders consistently on server and client.
 * 
 * @example
 * <LayoutWrapper>
 *   <YourPageContent />
 * </LayoutWrapper>
 */
export function LayoutWrapper({ children, className }: LayoutWrapperProps) {
  const { layout, isHydrated } = useLayoutPreference();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const previousLayoutRef = useRef(layout);
  const hasAnimatedRef = useRef(false);

  // FLIP animation function
  const animateLayoutChange = useCallback(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    
    if (!wrapper || !inner) {
      return;
    }

    // Skip animation if this is the initial hydration sync
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      return;
    }

    // FLIP Step 1: First - capture initial state
    const firstState = {
      width: inner.offsetWidth,
      left: inner.getBoundingClientRect().left,
    };

    // FLIP Step 2: Last - apply the new layout (done via className change)
    // Force layout recalculation by reading offsetHeight
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    wrapper.offsetHeight;

    // FLIP Step 3: Invert - calculate the difference
    const lastState = {
      width: inner.offsetWidth,
      left: inner.getBoundingClientRect().left,
    };

    const deltaX = firstState.left - lastState.left;
    const scaleX = firstState.width / lastState.width;

    // Only animate if there's actually a change
    if (Math.abs(deltaX) < 1 && Math.abs(scaleX - 1) < 0.01) {
      return;
    }

    // FLIP Step 4: Play - animate from inverted state to final state
    gsap.fromTo(
      inner,
      {
        x: deltaX,
        scaleX: scaleX,
        transformOrigin: "left center",
      },
      {
        x: 0,
        scaleX: 1,
        duration: 0.5,
        ease: "power3.out",
        clearProps: "transform",
      }
    );

    // Subtle fade effect on children for polish
    const childElements = inner.querySelectorAll(":scope > *");
    if (childElements.length > 0) {
      gsap.fromTo(
        childElements,
        { opacity: 0.8 },
        {
          opacity: 1,
          duration: 0.3,
          stagger: 0.02,
          ease: "power2.out",
        }
      );
    }
  }, []);

  // Trigger animation when layout changes (only after hydration)
  useEffect(() => {
    // Only animate after hydration is complete and layout actually changed
    if (isHydrated && previousLayoutRef.current !== layout) {
      // Use requestAnimationFrame to ensure the DOM has updated
      requestAnimationFrame(() => {
        animateLayoutChange();
      });
      previousLayoutRef.current = layout;
    }
  }, [layout, isHydrated, animateLayoutChange]);

  // Determine classes based on layout
  const isWide = layout === "WIDE";

  return (
    <div
      ref={wrapperRef}
      className={cn(
        // Base styles - always full width container
        "w-full",
        className
      )}
    >
      <div
        ref={innerRef}
        className={cn(
          // Base inner styles
          "w-full",
          // Layout-specific classes
          isWide ? "max-w-full" : "max-w-7xl mx-auto"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default LayoutWrapper;
