"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Trash2 } from "lucide-react"
import type { EmailBlock, BadgeColor } from "@/lib/communication/types"

interface BlockEditorPanelProps {
  block: EmailBlock
  onChange: (updated: EmailBlock) => void
  readOnly?: boolean
}

const BADGE_COLORS: BadgeColor[] = [
  "purple", "blue", "green", "emerald", "amber",
  "orange", "red", "pink", "indigo", "cyan",
]

const VARIABLES = [
  { label: "First Name", value: "{{firstName}}" },
  { label: "Last Name", value: "{{lastName}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Name", value: "{{name}}" },
]

function VariablePicker({
  onInsert,
  disabled,
}: {
  onInsert: (variable: string) => void
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground"
          disabled={disabled}
        >
          <Plus className="mr-1 h-3 w-3" />
          Insert variable
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {VARIABLES.map((v) => (
          <DropdownMenuItem key={v.value} onClick={() => onInsert(v.value)}>
            <code className="mr-2 text-xs">{v.value}</code>
            <span className="text-muted-foreground">{v.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function BlockEditorPanel({
  block,
  onChange,
  readOnly,
}: BlockEditorPanelProps) {
  switch (block.type) {
    case "header":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Header
          </label>
          <Input
            value={block.props.title}
            onChange={(e) =>
              onChange({ ...block, props: { ...block.props, title: e.target.value } })
            }
            placeholder="Title"
            readOnly={readOnly}
          />
          <Input
            value={block.props.subtitle ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                props: { ...block.props, subtitle: e.target.value || undefined },
              })
            }
            placeholder="Subtitle (optional)"
            readOnly={readOnly}
          />
        </div>
      )

    case "text":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Text
          </label>
          <Textarea
            value={block.props.content}
            onChange={(e) =>
              onChange({ ...block, props: { content: e.target.value } })
            }
            placeholder="Enter text content..."
            rows={4}
            readOnly={readOnly}
          />
          {!readOnly && (
            <VariablePicker
              onInsert={(v) =>
                onChange({
                  ...block,
                  props: { content: block.props.content + v },
                })
              }
            />
          )}
        </div>
      )

    case "button":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Button
          </label>
          <Input
            value={block.props.text}
            onChange={(e) =>
              onChange({ ...block, props: { ...block.props, text: e.target.value } })
            }
            placeholder="Button text"
            readOnly={readOnly}
          />
          {!readOnly && (
            <VariablePicker
              onInsert={(v) =>
                onChange({
                  ...block,
                  props: { ...block.props, text: block.props.text + v },
                })
              }
            />
          )}
          <Input
            value={block.props.href}
            onChange={(e) =>
              onChange({ ...block, props: { ...block.props, href: e.target.value } })
            }
            placeholder="https://example.com"
            readOnly={readOnly}
          />
          <Input
            value={block.props.altLinkText ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                props: { ...block.props, altLinkText: e.target.value || undefined },
              })
            }
            placeholder="Alternative link text (optional)"
            readOnly={readOnly}
          />
        </div>
      )

    case "card":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Card
          </label>
          <Input
            value={block.props.title ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                props: { ...block.props, title: e.target.value || undefined },
              })
            }
            placeholder="Card title (optional)"
            readOnly={readOnly}
          />
          <div className="space-y-1">
            {block.props.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <Input
                  value={item}
                  onChange={(e) => {
                    const newItems = [...block.props.items]
                    newItems[idx] = e.target.value
                    onChange({ ...block, props: { ...block.props, items: newItems } })
                  }}
                  placeholder={`Item ${idx + 1}`}
                  readOnly={readOnly}
                />
                {!readOnly && block.props.items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      const newItems = block.props.items.filter((_, i) => i !== idx)
                      onChange({ ...block, props: { ...block.props, items: newItems } })
                    }}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  const newItems = [...block.props.items, ""]
                  onChange({ ...block, props: { ...block.props, items: newItems } })
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add item
              </Button>
            )}
          </div>
        </div>
      )

    case "divider":
      return (
        <div className="flex items-center gap-2 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">Horizontal Divider</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )

    case "badge":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Badge
          </label>
          <Input
            value={block.props.text}
            onChange={(e) =>
              onChange({ ...block, props: { ...block.props, text: e.target.value } })
            }
            placeholder="Badge text"
            readOnly={readOnly}
          />
          <Input
            value={block.props.icon ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                props: { ...block.props, icon: e.target.value || undefined },
              })
            }
            placeholder="Icon emoji (optional)"
            readOnly={readOnly}
          />
          <Select
            value={block.props.color}
            onValueChange={(value: BadgeColor) =>
              onChange({ ...block, props: { ...block.props, color: value } })
            }
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              {BADGE_COLORS.map((color) => (
                <SelectItem key={color} value={color}>
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )

    case "image":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Image
          </label>
          <Input
            value={block.props.src}
            onChange={(e) =>
              onChange({ ...block, props: { ...block.props, src: e.target.value } })
            }
            placeholder="Image URL"
            readOnly={readOnly}
          />
          <Input
            value={block.props.alt}
            onChange={(e) =>
              onChange({ ...block, props: { ...block.props, alt: e.target.value } })
            }
            placeholder="Alt text"
            readOnly={readOnly}
          />
          <Input
            type="number"
            value={block.props.width ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                props: {
                  ...block.props,
                  width: e.target.value ? Number(e.target.value) : undefined,
                },
              })
            }
            placeholder="Width (optional)"
            readOnly={readOnly}
          />
        </div>
      )

    default:
      return null
  }
}
