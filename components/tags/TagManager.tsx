"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X, Tag as TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TagBadge } from "./TagBadge";

interface Tag {
  id: string;
  name: string;
  color: string;
  category: string | null;
  description: string | null;
  usageCount?: number;
}

interface TagManagerProps {
  tags: Tag[];
  categories: string[];
  onCreateTag: (data: {
    name: string;
    color: string;
    category?: string;
    description?: string;
  }) => Promise<boolean>;
  onUpdateTag: (
    id: string,
    data: {
      name?: string;
      color?: string;
      category?: string | null;
      description?: string | null;
    }
  ) => Promise<boolean>;
  onDeleteTag: (id: string) => Promise<boolean>;
  isLoading?: boolean;
  className?: string;
}

// Predefined color palette
const COLOR_PALETTE = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#22c55e", // Green
  "#10b981", // Emerald
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#0ea5e9", // Sky
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#64748b", // Slate
];

/**
 * TagManager - Full tag management interface
 * 
 * @example
 * <TagManager
 *   tags={tags}
 *   categories={categories}
 *   onCreateTag={handleCreate}
 *   onUpdateTag={handleUpdate}
 *   onDeleteTag={handleDelete}
 * />
 */
export function TagManager({
  tags,
  categories,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  isLoading = false,
  className,
}: TagManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(COLOR_PALETTE[10]); // Default to blue
  const [formCategory, setFormCategory] = useState<string>("");
  const [formDescription, setFormDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const resetForm = useCallback(() => {
    setFormName("");
    setFormColor(COLOR_PALETTE[10]);
    setFormCategory("");
    setFormDescription("");
    setNewCategory("");
  }, []);

  const openEditDialog = useCallback((tag: Tag) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color);
    setFormCategory(tag.category || "");
    setFormDescription(tag.description || "");
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingTag(null);
    resetForm();
  }, [resetForm]);

  const handleCreate = useCallback(async () => {
    if (!formName.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await onCreateTag({
        name: formName.trim(),
        color: formColor,
        category: newCategory.trim() || formCategory || undefined,
        description: formDescription.trim() || undefined,
      });

      if (success) {
        setShowCreateDialog(false);
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formName, formColor, formCategory, formDescription, newCategory, onCreateTag, resetForm]);

  const handleUpdate = useCallback(async () => {
    if (!editingTag || !formName.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await onUpdateTag(editingTag.id, {
        name: formName.trim(),
        color: formColor,
        category: newCategory.trim() || formCategory || null,
        description: formDescription.trim() || null,
      });

      if (success) {
        closeEditDialog();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [editingTag, formName, formColor, formCategory, formDescription, newCategory, onUpdateTag, closeEditDialog]);

  const handleDelete = useCallback(async () => {
    if (!deletingTag) return;

    setIsSubmitting(true);
    try {
      await onDeleteTag(deletingTag.id);
      setDeletingTag(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [deletingTag, onDeleteTag]);

  // Group tags by category for display
  const tagsByCategory = tags.reduce((acc, tag) => {
    const category = tag.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const allCategories = [...new Set([...categories, ...Object.keys(tagsByCategory)])].filter(
    (c) => c !== "Uncategorized"
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Tags</h3>
          <p className="text-sm text-muted-foreground">
            Manage tags for organizing your entities
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tag
        </Button>
      </div>

      {/* Tags Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Loading tags...
        </div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TagIcon className="h-12 w-12 text-muted-foreground/50" />
          <h4 className="mt-4 text-lg font-medium">No tags yet</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first tag to start organizing your entities.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create Tag
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Usage</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>
                  <TagBadge name={tag.name} color={tag.color} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tag.category || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                  {tag.description || "—"}
                </TableCell>
                <TableCell className="text-right">
                  {tag.usageCount ?? 0}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(tag)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingTag(tag)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingTag}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            closeEditDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? "Edit Tag" : "Create Tag"}
            </DialogTitle>
            <DialogDescription>
              {editingTag
                ? "Update the tag details below."
                : "Fill in the details to create a new tag."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Urgent, VIP, Follow-up"
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      formColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {formColor === color && (
                      <Check className="h-4 w-4 text-white m-auto" />
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Label htmlFor="customColor" className="text-sm">
                  Custom:
                </Label>
                <Input
                  id="customColor"
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="h-8 w-14 p-1"
                />
                <Input
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="#000000"
                  className="h-8 w-24"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2">
                <Select
                  value={formCategory}
                  onValueChange={(value) => {
                    setFormCategory(value);
                    setNewCategory("");
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select or create category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No category</SelectItem>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={newCategory}
                  onChange={(e) => {
                    setNewCategory(e.target.value);
                    if (e.target.value) setFormCategory("");
                  }}
                  placeholder="New category"
                  className="w-32"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-md border bg-muted/50 p-4">
                <TagBadge
                  name={formName || "Tag Name"}
                  color={formColor}
                  size="lg"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                closeEditDialog();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingTag ? handleUpdate : handleCreate}
              disabled={!formName.trim() || isSubmitting}
            >
              {isSubmitting ? "Saving..." : editingTag ? "Save Changes" : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingTag}
        onOpenChange={(open) => !open && setDeletingTag(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tag{" "}
              <span className="font-medium">&quot;{deletingTag?.name}&quot;</span>{" "}
              from all entities. This action cannot be undone.
              {deletingTag?.usageCount && deletingTag.usageCount > 0 && (
                <span className="mt-2 block text-destructive">
                  This tag is currently used by {deletingTag.usageCount} entities.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
