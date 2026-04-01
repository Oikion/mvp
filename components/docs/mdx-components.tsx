import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

/**
 * Custom MDX components for Oikion documentation.
 * Extends Fumadocs defaults (Callout, Steps, Tabs, Cards, etc.)
 * with Oikion-specific components.
 */
export function getDocsComponents(): MDXComponents {
  return {
    ...defaultComponents,
  } as MDXComponents;
}
