"use client";

import { ShimmerCard, ShimmerPageHeader } from "@/components/ui/shimmer-skeleton";
import { motion } from "motion/react";

interface PageLoaderProps {
  variant?: "cards" | "list" | "form" | "dashboard";
  cardCount?: number;
}

export function PageLoader({ variant = "cards", cardCount = 6 }: PageLoaderProps) {
  if (variant === "dashboard") {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <ShimmerPageHeader />
        
        {/* Stats row */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="rounded-xl border bg-card p-6 space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <div className="h-4 w-24 rounded bg-muted/60 shimmer" />
              <div className="h-8 w-20 rounded bg-muted/60 shimmer" />
              <div className="h-3 w-32 rounded bg-muted/60 shimmer" />
            </motion.div>
          ))}
        </motion.div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[0, 1, 2].map((i) => (
              <ShimmerCard key={i} />
            ))}
          </div>
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <motion.div
                key={i}
                className="rounded-xl border bg-card p-6 space-y-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
              >
                <div className="h-5 w-32 rounded bg-muted/60 shimmer" />
                <div className="space-y-2">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted/60 shimmer" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-3/4 rounded bg-muted/60 shimmer" />
                        <div className="h-2 w-1/2 rounded bg-muted/60 shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <ShimmerPageHeader />
        <motion.div
          className="rounded-lg border overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Table header */}
          <div className="bg-muted/30 px-4 py-3 border-b">
            <div className="flex gap-4">
              <div className="h-4 w-4 rounded bg-muted/60 shimmer" />
              <div className="h-4 w-32 rounded bg-muted/60 shimmer" />
              <div className="h-4 flex-1 rounded bg-muted/60 shimmer" />
              <div className="h-4 w-24 rounded bg-muted/60 shimmer" />
            </div>
          </div>
          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4 px-4 py-4 border-b last:border-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <div className="h-4 w-4 rounded bg-muted/60 shimmer" />
              <div className="h-10 w-10 rounded-full bg-muted/60 shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-muted/60 shimmer" />
                <div className="h-3 w-32 rounded bg-muted/60 shimmer" />
              </div>
              <div className="h-8 w-20 rounded bg-muted/60 shimmer" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="container mx-auto py-6 max-w-2xl space-y-8">
        <ShimmerPageHeader />
        <motion.div
          className="rounded-xl border bg-card p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted/60 shimmer" />
              <div className="h-10 w-full rounded bg-muted/60 shimmer" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 rounded bg-muted/60 shimmer" />
                <div className="h-10 w-full rounded bg-muted/60 shimmer" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-muted/60 shimmer" />
            <div className="h-32 w-full rounded bg-muted/60 shimmer" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <div className="h-10 w-24 rounded bg-muted/60 shimmer" />
            <div className="h-10 w-32 rounded bg-muted/60 shimmer" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Default: cards variant
  return (
    <div className="container mx-auto py-6 space-y-8">
      <ShimmerPageHeader />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: cardCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <ShimmerCard />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
