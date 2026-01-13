"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChangelogRichEditor } from "@/components/changelog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChangelogStatus } from "@prisma/client";
import {
  createChangelogEntry,
  updateChangelogEntry,
  createCustomCategory,
  getCustomCategories,
  type ChangelogEntryData,
} from "@/actions/platform-admin/changelog-actions";
import {
  TAG_COLORS,
  CATEGORY_ICONS,
  type ChangelogTag,
  type ChangelogCategoryData,
} from "@/lib/changelog-constants";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Send,
  X,
  Plus,
  Tag,
  Sparkles,
  Bug,
  Zap,
  Shield,
  Rocket,
  Wrench,
  Bell,
  Globe,
  Lock,
  Database,
  Layout,
  Palette,
  Server,
  Smartphone,
  Settings,
  Star,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  version: z.string().min(1, "Version is required").max(50),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  customCategoryId: z.string().min(1, "Category is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface ChangelogFormProps {
  entry?: ChangelogEntryData;
  categories: ChangelogCategoryData[];
  onSuccess: () => void;
  onCancel: () => void;
}

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

// Color swatch component for picker
const colorSwatchStyles: Record<string, string> = {
  gray: "bg-gray-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
};

// Icon component map
const iconComponents: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  bug: Bug,
  zap: Zap,
  shield: Shield,
  rocket: Rocket,
  wrench: Wrench,
  bell: Bell,
  globe: Globe,
  lock: Lock,
  database: Database,
  layout: Layout,
  palette: Palette,
  server: Server,
  smartphone: Smartphone,
  settings: Settings,
  star: Star,
};

function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const IconComponent = iconComponents[icon] || Sparkles;
  return <IconComponent className={className} />;
}

export function ChangelogForm({ entry, categories: initialCategories, onSuccess, onCancel }: ChangelogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<"draft" | "publish">("draft");
  const [tags, setTags] = useState<ChangelogTag[]>(entry?.tags || []);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [categories, setCategories] = useState<ChangelogCategoryData[]>(initialCategories);

  // New category dialog state
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("blue");
  const [newCategoryIcon, setNewCategoryIcon] = useState("sparkles");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      version: entry?.version || "",
      title: entry?.title || "",
      description: entry?.description || "",
      customCategoryId: entry?.customCategory?.id || "",
    },
  });

  // Refresh categories when dialog closes
  const refreshCategories = async () => {
    const cats = await getCustomCategories();
    setCategories(cats);
  };

  const addTag = () => {
    if (!newTagName.trim()) return;
    if (tags.length >= 10) {
      toast.error("Maximum 10 tags allowed");
      return;
    }
    if (tags.some((t) => t.name.toLowerCase() === newTagName.trim().toLowerCase())) {
      toast.error("Tag already exists");
      return;
    }
    setTags([...tags, { name: newTagName.trim(), color: newTagColor }]);
    setNewTagName("");
    setTagPopoverOpen(false);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsCreatingCategory(true);
    try {
      const result = await createCustomCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: newCategoryIcon,
      });

      if (result.success) {
        toast.success("Category created!");
        await refreshCategories();
        // Select the newly created category
        const newCat = result.data as ChangelogCategoryData;
        form.setValue("customCategoryId", newCat.id);
        setShowNewCategoryDialog(false);
        setNewCategoryName("");
        setNewCategoryColor("blue");
        setNewCategoryIcon("sparkles");
      } else {
        toast.error(result.error || "Failed to create category");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (entry) {
        // Update existing entry
        const result = await updateChangelogEntry({
          id: entry.id,
          ...values,
          tags,
          status: submitAction === "publish" ? ChangelogStatus.PUBLISHED : undefined,
        });
        if (result.success) {
          toast.success(
            submitAction === "publish"
              ? "Entry updated and published"
              : "Entry updated successfully"
          );
          onSuccess();
        } else {
          toast.error(result.error || "Failed to update entry");
        }
      } else {
        // Create new entry
        const result = await createChangelogEntry({
          ...values,
          tags,
          status: submitAction === "publish" ? ChangelogStatus.PUBLISHED : ChangelogStatus.DRAFT,
        });
        if (result.success) {
          toast.success(
            submitAction === "publish"
              ? "Entry created and published"
              : "Entry saved as draft"
          );
          onSuccess();
        } else {
          toast.error(result.error || "Failed to create entry");
        }
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTagStyle = (color: string) => {
    return colorStyles[color] || colorStyles.gray;
  };

  const selectedCategory = categories.find((c) => c.id === form.watch("customCategoryId"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Version</FormLabel>
                <FormControl>
                  <Input placeholder="1.2.3" {...field} />
                </FormControl>
                <FormDescription>
                  Semantic version (e.g., 1.2.3 or 2.0.0-beta)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customCategoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <div className="flex gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select category">
                          {selectedCategory && (
                            <div className="flex items-center gap-2">
                              <CategoryIcon icon={selectedCategory.icon} className="h-4 w-4" />
                              {selectedCategory.name}
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No categories yet. Create one first.
                        </div>
                      ) : (
                        categories.map((cat) => {
                          const style = getTagStyle(cat.color);
                          return (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "p-1 rounded",
                                    style.bg
                                  )}
                                >
                                  <CategoryIcon
                                    icon={cat.icon}
                                    className={cn("h-4 w-4", style.text)}
                                  />
                                </div>
                                {cat.name}
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Category</DialogTitle>
                        <DialogDescription>
                          Create a new category with a custom name, color, and icon.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Name</label>
                          <Input
                            placeholder="e.g., Performance, API, Mobile"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            maxLength={50}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Color</label>
                          <div className="grid grid-cols-9 gap-2">
                            {TAG_COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => setNewCategoryColor(color.value)}
                                className={cn(
                                  "w-7 h-7 rounded-md transition-all",
                                  colorSwatchStyles[color.value],
                                  newCategoryColor === color.value
                                    ? "ring-2 ring-offset-2 ring-offset-background ring-primary"
                                    : "hover:scale-110"
                                )}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Icon</label>
                          <div className="grid grid-cols-8 gap-2">
                            {CATEGORY_ICONS.map((icon) => {
                              const style = getTagStyle(newCategoryColor);
                              return (
                                <button
                                  key={icon.value}
                                  type="button"
                                  onClick={() => setNewCategoryIcon(icon.value)}
                                  className={cn(
                                    "p-2 rounded-md border transition-all flex items-center justify-center",
                                    newCategoryIcon === icon.value
                                      ? cn(style.bg, style.border, "ring-2 ring-primary")
                                      : "border-transparent hover:bg-muted"
                                  )}
                                  title={icon.name}
                                >
                                  <CategoryIcon
                                    icon={icon.value}
                                    className={cn(
                                      "h-5 w-5",
                                      newCategoryIcon === icon.value ? style.text : "text-muted-foreground"
                                    )}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {newCategoryName && (
                          <div className="pt-4 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1.5",
                                getTagStyle(newCategoryColor).bg,
                                getTagStyle(newCategoryColor).text,
                                getTagStyle(newCategoryColor).border
                              )}
                            >
                              <CategoryIcon icon={newCategoryIcon} className="h-3.5 w-3.5" />
                              {newCategoryName}
                            </Badge>
                          </div>
                        )}

                        <Button
                          type="button"
                          className="w-full"
                          onClick={handleCreateCategory}
                          disabled={!newCategoryName.trim() || isCreatingCategory}
                        >
                          {isCreatingCategory ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Create Category
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="What's new in this version?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags Section */}
        <div className="space-y-2">
          <FormLabel>Tags</FormLabel>
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {tags.map((tag, index) => {
              const style = getTagStyle(tag.color);
              return (
                <Badge
                  key={index}
                  variant="outline"
                  className={cn(
                    "gap-1 pr-1",
                    style.bg,
                    style.text,
                    style.border
                  )}
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1"
                  disabled={tags.length >= 10}
                >
                  <Plus className="h-3 w-3" />
                  Add Tag
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="start">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tag Name</label>
                    <Input
                      placeholder="Enter tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      maxLength={30}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <div className="grid grid-cols-6 gap-2">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setNewTagColor(color.value)}
                          className={cn(
                            "w-7 h-7 rounded-md transition-all",
                            colorSwatchStyles[color.value],
                            newTagColor === color.value
                              ? "ring-2 ring-offset-2 ring-offset-background ring-primary"
                              : "hover:scale-110"
                          )}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  {newTagName && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          getTagStyle(newTagColor).bg,
                          getTagStyle(newTagColor).text,
                          getTagStyle(newTagColor).border
                        )}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {newTagName}
                      </Badge>
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={addTag}
                    disabled={!newTagName.trim()}
                  >
                    Add Tag
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground">
            Add up to 10 custom tags. Click to add, X to remove.
          </p>
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <ChangelogRichEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Describe the changes in detail..."
                />
              </FormControl>
              <FormDescription>
                Use the toolbar above to format your text with headings, lists, and more.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => setSubmitAction("draft")}
          >
            {isSubmitting && submitAction === "draft" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save as Draft
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => setSubmitAction("publish")}
          >
            {isSubmitting && submitAction === "publish" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {entry ? "Update & Publish" : "Publish Now"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
