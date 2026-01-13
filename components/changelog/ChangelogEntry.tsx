"use client";

import { format } from "date-fns";
import { ChangelogCategoryBadge } from "./ChangelogCategoryBadge";
import type { ChangelogEntryData } from "@/actions/platform-admin/changelog-actions";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { parseContent } from "@/lib/markdown";

// Color styles for tags
const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
  gray: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", border: "border-gray-500/20" },
  red: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-500/20" },
  lime: { bg: "bg-lime-500/10", text: "text-lime-600 dark:text-lime-400", border: "border-lime-500/20" },
  green: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", border: "border-green-500/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/20" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/20" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  fuchsia: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-600 dark:text-fuchsia-400", border: "border-fuchsia-500/20" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
};

const getTagStyle = (color: string) => colorStyles[color] || colorStyles.gray;

interface ChangelogEntryProps {
  entry: ChangelogEntryData;
  index: number;
  categoryTranslations?: Record<string, string>;
}

export function ChangelogEntry({ entry, index, categoryTranslations }: ChangelogEntryProps) {
  // Get translated category name if available
  const translatedCategoryName = categoryTranslations && entry.customCategory 
    ? categoryTranslations[entry.customCategory.name] 
    : undefined;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="relative pl-8 pb-12 last:pb-0"
    >
      {/* Timeline line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
      
      {/* Timeline dot */}
      <div className="absolute left-0 top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-4 border-background" />

      {/* Content */}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted font-mono text-sm font-semibold">
            v{entry.version}
          </span>
          <ChangelogCategoryBadge 
            category={entry.customCategory} 
            translatedName={translatedCategoryName}
          />
          {entry.publishedAt && (
            <time
              dateTime={entry.publishedAt}
              className="text-sm text-muted-foreground"
            >
              {format(new Date(entry.publishedAt), "MMMM d, yyyy")}
            </time>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold tracking-tight">{entry.title}</h3>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag, idx) => {
              const style = getTagStyle(tag.color);
              return (
                <span
                  key={idx}
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                    style.bg,
                    style.text,
                    style.border
                  )}
                >
                  {tag.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Description - renders HTML from rich text editor or Markdown */}
        <div 
          className="prose prose-sm dark:prose-invert max-w-none changelog-content"
          dangerouslySetInnerHTML={{ 
            __html: parseContent(entry.description) 
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          .changelog-content {
            color: hsl(var(--muted-foreground));
          }
          .changelog-content h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 1rem 0 0.5rem 0;
            color: hsl(var(--foreground));
          }
          .changelog-content h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0.875rem 0 0.5rem 0;
            color: hsl(var(--foreground));
          }
          .changelog-content h3 {
            font-size: 1.125rem;
            font-weight: 500;
            margin: 0.75rem 0 0.5rem 0;
            color: hsl(var(--foreground));
          }
          .changelog-content h4, .changelog-content h5, .changelog-content h6 {
            font-size: 1rem;
            font-weight: 500;
            margin: 0.5rem 0;
            color: hsl(var(--foreground));
          }
          .changelog-content p {
            margin: 0.5rem 0;
            line-height: 1.7;
          }
          .changelog-content ul,
          .changelog-content ol {
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          .changelog-content li {
            margin: 0.25rem 0;
          }
          .changelog-content blockquote {
            border-left: 3px solid hsl(var(--border));
            margin: 0.5rem 0;
            padding-left: 1rem;
            font-style: italic;
          }
          .changelog-content hr {
            border: none;
            border-top: 1px solid hsl(var(--border));
            margin: 1rem 0;
          }
          .changelog-content strong {
            font-weight: 600;
            color: hsl(var(--foreground));
          }
          .changelog-content em {
            font-style: italic;
          }
          .changelog-content u {
            text-decoration: underline;
          }
          .changelog-content s {
            text-decoration: line-through;
          }
          .changelog-content a {
            color: hsl(var(--primary));
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          .changelog-content a:hover {
            opacity: 0.8;
          }
          .changelog-content code {
            background: hsl(var(--muted));
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-size: 0.875em;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          }
          .changelog-content pre {
            background: hsl(var(--muted));
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 0.75rem 0;
          }
          .changelog-content pre code {
            background: transparent;
            padding: 0;
            font-size: 0.875rem;
          }
          .changelog-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.75rem 0;
          }
          .changelog-content th,
          .changelog-content td {
            border: 1px solid hsl(var(--border));
            padding: 0.5rem 0.75rem;
            text-align: left;
          }
          .changelog-content th {
            background: hsl(var(--muted));
            font-weight: 600;
            color: hsl(var(--foreground));
          }
          .changelog-content img {
            max-width: 100%;
            border-radius: 0.5rem;
            margin: 0.5rem 0;
          }
        ` }} />
      </div>
    </motion.article>
  );
}
