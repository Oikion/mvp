"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SkipLink - Accessibility skip link for keyboard navigation
 *
 * Allows keyboard users to skip repetitive navigation and jump directly
 * to main content. Hidden until focused.
 *
 * @example
 * ```tsx
 * // In root layout
 * <body>
 *   <SkipLink />
 *   <Header />
 *   <main id="main-content">
 *     {children}
 *   </main>
 * </body>
 * ```
 *
 * @example
 * // With custom target
 * <SkipLink href="#content-area">Skip to content</SkipLink>
 * <div id="content-area">...</div>
 * ```
 */

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * Target element ID to skip to
   * @default "#main-content"
   */
  href?: string;
  /**
   * Link text
   * @default "Skip to main content"
   */
  children?: React.ReactNode;
}

export function SkipLink({
  href = "#main-content",
  children = "Skip to main content",
  className,
  ...props
}: Readonly<SkipLinkProps>) {
  return (
    <a
      href={href}
      className={cn(
        // Hidden by default, visible on focus
        "sr-only focus:not-sr-only",
        // Positioning
        "fixed left-4 top-4 z-[100]",
        // Styling when visible
        "focus:inline-flex focus:items-center focus:justify-center",
        "focus:rounded-md focus:bg-primary focus:px-4 focus:py-2",
        "focus:text-sm focus:font-medium focus:text-primary-foreground",
        "focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        // Transition
        "transition-all duration-150",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * SkipLinks - Multiple skip links for complex layouts
 *
 * @example
 * ```tsx
 * <SkipLinks
 *   links={[
 *     { href: "#main-content", label: "Skip to main content" },
 *     { href: "#navigation", label: "Skip to navigation" },
 *     { href: "#search", label: "Skip to search" },
 *   ]}
 * />
 * ```
 */
export interface SkipLinksProps {
  links: Array<{
    href: string;
    label: string;
  }>;
  className?: string;
}

export function SkipLinks({ links, className }: Readonly<SkipLinksProps>) {
  return (
    <div className={cn("skip-links", className)}>
      {links.map((link) => (
        <SkipLink key={link.href} href={link.href}>
          {link.label}
        </SkipLink>
      ))}
    </div>
  );
}

export default SkipLink;
