"use client";

import { useRef, useCallback, ReactNode, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface VirtualizedGridProps<T> {
  /** Array of items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Extract unique key from item */
  getItemKey: (item: T) => string;
  /** Height of each row in pixels */
  rowHeight?: number;
  /** Gap between items in pixels */
  gap?: number;
  /** Number of extra rows to render outside viewport (for smooth scrolling) */
  overscan?: number;
  /** Maximum height of the grid container */
  maxHeight?: number | string;
  /** CSS class for the container */
  className?: string;
  /** Responsive column counts */
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Show scroll to top button */
  showScrollToTop?: boolean;
}

/**
 * Virtualized grid component for rendering large lists of cards efficiently.
 * 
 * Only renders visible items plus a configurable overscan buffer,
 * dramatically reducing DOM nodes and improving scroll performance.
 */
export function VirtualizedGrid<T>({
  items,
  renderItem,
  getItemKey,
  rowHeight = 320,
  gap = 16,
  overscan = 3,
  maxHeight = "calc(100vh - 300px)",
  className = "",
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  showScrollToTop = true,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Calculate column count based on viewport width
  const getColumnCount = useCallback(() => {
    if (typeof globalThis.window === "undefined") return columns.lg || 3;
    
    const width = globalThis.window.innerWidth;
    if (width >= 1280) return columns.xl || 4;
    if (width >= 1024) return columns.lg || 3;
    if (width >= 768) return columns.md || 2;
    return columns.sm || 1;
  }, [columns]);

  const [columnCount, setColumnCount] = useState(() => columns.lg || 3);

  // Handle client-side mounting and resize
  useEffect(() => {
    setIsMounted(true);
    setColumnCount(getColumnCount());

    const handleResize = () => {
      setColumnCount(getColumnCount());
    };

    globalThis.window?.addEventListener("resize", handleResize);
    return () => globalThis.window?.removeEventListener("resize", handleResize);
  }, [getColumnCount]);

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollButton(container.scrollTop > 200);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isMounted]);

  // Calculate total rows needed
  const rowCount = Math.ceil(items.length / columnCount);

  // Setup virtualizer
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + gap,
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    parentRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  // If no items, return null
  if (items.length === 0) {
    return null;
  }

  // During SSR or before mount, show a simple grid (fallback)
  if (!isMounted) {
    return (
      <div
        className={`overflow-auto ${className}`}
        style={{ maxHeight }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.slice(0, 8).map((item, index) => (
            <div key={getItemKey(item)}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={parentRef}
        className={`overflow-auto ${className}`}
        style={{
          maxHeight,
          height: maxHeight,
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualRows.map((virtualRow) => {
            const rowStartIndex = virtualRow.index * columnCount;
            const rowItems = items.slice(rowStartIndex, rowStartIndex + columnCount);

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    gap: `${gap}px`,
                  }}
                >
                  {rowItems.map((item, colIndex) => {
                    const globalIndex = rowStartIndex + colIndex;
                    return (
                      <div key={getItemKey(item)}>
                        {renderItem(item, globalIndex)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to top button */}
      {showScrollToTop && (
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "absolute top-4 right-4 z-10 shadow-lg transition-all duration-200",
            showScrollButton
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
          )}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Hook to get responsive column count
 */
export function useResponsiveColumns(columns: {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}) {
  const getColumnCount = useCallback(() => {
    if (typeof globalThis.window === "undefined") return columns.lg || 3;
    
    const width = globalThis.window.innerWidth;
    if (width >= 1280) return columns.xl || 4;
    if (width >= 1024) return columns.lg || 3;
    if (width >= 768) return columns.md || 2;
    return columns.sm || 1;
  }, [columns]);

  return getColumnCount();
}

