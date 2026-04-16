"use client";

import React, { useCallback } from "react";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import { DealCard, type DealCardData } from "./DealCard";

interface DealsGridProps {
  deals: DealCardData[];
}

/**
 * DealsGrid — virtualized grid view of deals.
 *
 * Wraps `VirtualizedGrid` so the deals page can swap between list and
 * grid views without re-implementing the same prop plumbing each time.
 *
 * The grid intentionally caps the rendered range at the viewport plus a
 * small overscan, which keeps the page responsive even when an org has
 * thousands of deals on file.
 */
export function DealsGrid({ deals }: DealsGridProps) {
  // useCallback so VirtualizedGrid does not re-mount its virtualizer
  // every parent re-render.
  const renderItem = useCallback(
    (deal: DealCardData, index: number) => (
      <DealCard deal={deal} index={index} />
    ),
    []
  );

  const getItemKey = useCallback((deal: DealCardData) => deal.id, []);

  return (
    <VirtualizedGrid
      items={deals}
      renderItem={renderItem}
      getItemKey={getItemKey}
      rowHeight={300}
      gap={16}
      columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
      maxHeight="calc(100vh - 400px)"
      showScrollToTop
    />
  );
}

export default DealsGrid;
