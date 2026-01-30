import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Heading Component - Standardized page/section headings
 *
 * Uses semantic typography classes from the design system:
 * - text-h1: Page titles (3rem, bold)
 * - text-h2: Section headings (2.25rem, semibold)
 * - text-h3: Card/subsection titles (1.875rem, semibold)
 * - text-h4: Small headings (1.5rem, semibold)
 *
 * @example
 * ```tsx
 * // Page heading (default)
 * <Heading title="Dashboard" description="Welcome to your dashboard" />
 *
 * // Section heading
 * <Heading title="Recent Activity" description="Your latest updates" level="h3" />
 *
 * // With private visibility indicator
 * <Heading title="My Documents" description="Personal files" visibility="private" />
 * ```
 */

export type HeadingLevel = "h1" | "h2" | "h3" | "h4";

interface HeadingProps {
  /**
   * The heading title text
   */
  title: string;
  /**
   * Optional description text below the heading
   */
  description?: string;
  /**
   * Shows a lock icon if set to "private"
   */
  visibility?: "public" | "private";
  /**
   * Heading level for semantic HTML and styling.
   * Default: "h2" (most common for page titles within app layout)
   */
  level?: HeadingLevel;
  /**
   * Additional class name for the container
   */
  className?: string;
}

/**
 * Maps heading levels to semantic typography classes
 */
const headingStyles: Record<HeadingLevel, string> = {
  h1: "text-h1 tracking-tight", // 3rem, bold
  h2: "text-h2 tracking-tight", // 2.25rem, semibold
  h3: "text-h3 tracking-tight", // 1.875rem, semibold
  h4: "text-h4", // 1.5rem, semibold
};

const Heading = ({
  title,
  description,
  visibility,
  level = "h2",
  className,
}: Readonly<HeadingProps>) => {
  const Tag = level;

  return (
    <div className={cn("mb-4", className)}>
      <Tag className={cn("flex items-center gap-2", headingStyles[level])}>
        {title}
        {visibility === "private" && (
          <Lock className="h-5 w-5 text-muted-foreground" aria-label="Private" />
        )}
      </Tag>
      {description && (
        <p className="text-caption text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
};

export default Heading;
