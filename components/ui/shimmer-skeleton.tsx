"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface ShimmerSkeletonProps {
  className?: string;
  variant?: "default" | "circular" | "text" | "card";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function ShimmerSkeleton({
  className,
  variant = "default",
  width,
  height,
  lines = 1,
}: ShimmerSkeletonProps) {
  const baseClasses = "relative overflow-hidden bg-muted/60";
  
  const variantClasses = {
    default: "rounded-md",
    circular: "rounded-full",
    text: "rounded h-4",
    card: "rounded-xl",
  };

  const shimmerOverlay = (
    <motion.div
      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
      animate={{ x: ["0%", "200%"] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );

  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, variantClasses.text, "h-4")}
            style={{
              width: i === lines - 1 ? "75%" : "100%",
            }}
          >
            {shimmerOverlay}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
    >
      {shimmerOverlay}
    </div>
  );
}

// Pre-built skeleton compositions
export function ShimmerCard({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("rounded-xl border bg-card p-6 space-y-4", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        <ShimmerSkeleton variant="circular" className="h-12 w-12" />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton className="h-4 w-3/4" />
          <ShimmerSkeleton className="h-3 w-1/2" />
        </div>
      </div>
      <ShimmerSkeleton className="h-32 w-full" variant="card" />
      <div className="flex gap-2">
        <ShimmerSkeleton className="h-9 w-24" />
        <ShimmerSkeleton className="h-9 w-24" />
      </div>
    </motion.div>
  );
}

export function ShimmerTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <motion.div
      className="flex items-center gap-4 px-4 py-4 border-b last:border-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <ShimmerSkeleton variant="circular" className="h-8 w-8 flex-shrink-0" />
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <ShimmerSkeleton
          key={i}
          className={cn("h-4", i === 0 ? "w-32" : "flex-1")}
        />
      ))}
      <ShimmerSkeleton className="h-8 w-20 flex-shrink-0" />
    </motion.div>
  );
}

export function ShimmerTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-4 py-3 border-b">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <ShimmerSkeleton key={i} className={cn("h-4", i === 0 ? "w-8" : "flex-1")} />
          ))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <ShimmerTableRow key={i} columns={columns} />
      ))}
    </div>
  );
}

export function ShimmerForm() {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, staggerChildren: 0.1 }}
    >
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <ShimmerSkeleton className="h-4 w-20" />
            <ShimmerSkeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <ShimmerSkeleton className="h-4 w-28" />
        <ShimmerSkeleton className="h-32 w-full" />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <ShimmerSkeleton className="h-10 w-24" />
        <ShimmerSkeleton className="h-10 w-32" />
      </div>
    </motion.div>
  );
}

export function ShimmerPageHeader() {
  return (
    <motion.div
      className="space-y-3 pb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ShimmerSkeleton className="h-10 w-72" />
      <ShimmerSkeleton className="h-5 w-96" />
    </motion.div>
  );
}









