"use client";

import { AnimatedSpinner } from "@/components/ui/animated-spinner";
import { motion } from "motion/react";

interface LoadingComponentProps {
  variant?: "dots" | "pulse" | "orbit" | "wave" | "bars";
  message?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showMessage?: boolean;
}

const LoadingComponent = ({
  variant = "dots",
  message = "Loading...",
  size = "xl",
  showMessage = true,
}: LoadingComponentProps) => {
  return (
    <div className="flex w-full h-full flex-col items-center justify-center gap-6 min-h-[200px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <AnimatedSpinner size={size} variant={variant} />
      </motion.div>
      
      {showMessage && (
        <motion.p
          className="text-muted-foreground text-sm font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
        >
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {message}
          </motion.span>
        </motion.p>
      )}
    </div>
  );
};

export default LoadingComponent;
