"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useKeyboardShortcuts,
  formatSequenceShortcut,
  CATEGORY_LABELS,
  type ShortcutCategory,
} from "@/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";

/**
 * A single keyboard shortcut item display
 */
function ShortcutItem({
  label,
  keys,
  description,
}: {
  label: string;
  keys: string;
  description?: string;
}) {
  const formattedKeys = formatSequenceShortcut(keys);
  const keyParts = formattedKeys.includes(" then ")
    ? formattedKeys.split(" then ")
    : [formattedKeys];

  return (
    <div className="flex items-center justify-between py-2 group">
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-4">
        {keyParts.map((part, index) => (
          <React.Fragment key={part}>
            <kbd
              className={cn(
                "inline-flex h-6 min-w-[24px] items-center justify-center rounded border",
                "bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground",
                "border-border shadow-sm"
              )}
            >
              {part}
            </kbd>
            {index < keyParts.length - 1 && (
              <span className="text-xs text-muted-foreground">then</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * A category section with its shortcuts
 */
function ShortcutSection({
  category,
  shortcuts,
}: {
  category: ShortcutCategory;
  shortcuts: { label: string; keys: string; description?: string }[];
}) {
  if (shortcuts.length === 0) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {CATEGORY_LABELS[category]}
      </h3>
      <div className="space-y-0.5">
        {shortcuts.map((shortcut) => (
          <ShortcutItem
            key={shortcut.keys}
            label={shortcut.label}
            keys={shortcut.keys}
            description={shortcut.description}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Modal displaying all available keyboard shortcuts
 */
export function KeyboardShortcutsModal() {
  const { helpModalOpen, closeHelpModal, getShortcutsByCategory } =
    useKeyboardShortcuts();

  const shortcutsByCategory = getShortcutsByCategory();

  // Order of categories to display
  const categoryOrder: ShortcutCategory[] = [
    "general",
    "navigation",
    "search",
    "actions",
    "table",
  ];

  return (
    <Dialog open={helpModalOpen} onOpenChange={(open) => !open && closeHelpModal()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Press <kbd className="inline-flex h-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">?</kbd> to toggle this dialog
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-4 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left column */}
              <div className="space-y-6">
                {categoryOrder
                  .filter((_, i) => i % 2 === 0)
                  .map((category) => (
                    <ShortcutSection
                      key={category}
                      category={category}
                      shortcuts={shortcutsByCategory[category]}
                    />
                  ))}
              </div>
              {/* Right column */}
              <div className="space-y-6">
                {categoryOrder
                  .filter((_, i) => i % 2 === 1)
                  .map((category) => (
                    <ShortcutSection
                      key={category}
                      category={category}
                      shortcuts={shortcutsByCategory[category]}
                    />
                  ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <div className="px-6 py-3 bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Shortcuts are context-aware and may change based on the current view
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
