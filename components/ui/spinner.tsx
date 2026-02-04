/**
 * @deprecated Use `Loading` from `@/components/ui/loading` instead.
 *
 * Migration:
 * ```tsx
 * // Before
 * <Spinner size="md" />
 *
 * // After
 * <Loading variant="spinner" size="md" />
 *
 * // Or for inline button spinners
 * <LoadingSpinner size="sm" />
 *
 * // Or use Button's built-in loading:
 * <Button isLoading={true}>Submit</Button>
 * ```
 */

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * @deprecated Use `Loading` with `variant="spinner"` instead.
 */
export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * @deprecated Use `Loading` with `variant="spinner"` instead.
 */
export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
    </div>
  );
}




















