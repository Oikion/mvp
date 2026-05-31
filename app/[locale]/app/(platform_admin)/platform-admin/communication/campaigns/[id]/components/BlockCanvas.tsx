"use client"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BlockEditorPanel } from "./BlockEditorPanel"
import type { EmailBlock } from "@/lib/communication/types"
import { useCallback } from "react"

interface BlockCanvasProps {
  blocks: EmailBlock[]
  onChange: (blocks: EmailBlock[]) => void
  onDelete: (id: string) => void
  readOnly?: boolean
}

function SortableItem({
  block,
  onUpdate,
  onDelete,
  readOnly,
}: {
  block: EmailBlock
  onUpdate: (updated: EmailBlock) => void
  onDelete: () => void
  readOnly?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: readOnly })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 rounded-lg border bg-card p-3 mb-2"
    >
      {!readOnly && (
        <button
          aria-label="Drag to reorder block"
          className="mt-1 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <BlockEditorPanel
          block={block}
          onChange={onUpdate}
          readOnly={readOnly}
        />
      </div>

      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          className="mt-1 h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          onClick={onDelete}
          aria-label="Delete block"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

export function BlockCanvas({
  blocks,
  onChange,
  onDelete,
  readOnly,
}: BlockCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = blocks.findIndex((b) => b.id === active.id)
        const newIndex = blocks.findIndex((b) => b.id === over.id)
        onChange(arrayMove(blocks, oldIndex, newIndex))
      }
    },
    [blocks, onChange]
  )

  const handleBlockUpdate = useCallback(
    (updated: EmailBlock) => {
      onChange(blocks.map((b) => (b.id === updated.id ? updated : b)))
    },
    [blocks, onChange]
  )

  if (blocks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
        Add blocks from the palette above to start building your email
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        {blocks.map((block) => (
          <SortableItem
            key={block.id}
            block={block}
            onUpdate={handleBlockUpdate}
            onDelete={() => onDelete(block.id)}
            readOnly={readOnly}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}
