"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { EmailBlock } from "@/lib/communication/types"

const BLOCK_TYPES: { type: EmailBlock["type"]; label: string; icon: string }[] = [
  { type: "header", label: "Header", icon: "H1" },
  { type: "text", label: "Text", icon: "T" },
  { type: "button", label: "Button", icon: "CTA" },
  { type: "card", label: "Card", icon: "\u25A1" },
  { type: "divider", label: "Divider", icon: "\u2014" },
  { type: "badge", label: "Badge", icon: "\u25C9" },
  { type: "image", label: "Image", icon: "\uD83D\uDDBC" },
]

interface BlockPaletteProps {
  onAddBlock: (type: EmailBlock["type"]) => void
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground mr-1">
        <Plus className="inline h-3 w-3" /> Add block:
      </span>
      {BLOCK_TYPES.map((bt) => (
        <Button
          key={bt.type}
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => onAddBlock(bt.type)}
        >
          <span className="font-mono text-[10px]">{bt.icon}</span>
          {bt.label}
        </Button>
      ))}
    </div>
  )
}
