"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ScrollText,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
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
} from "lucide-react";
import { format } from "date-fns";
import { ChangelogStatus } from "@prisma/client";
import { ChangelogForm } from "./ChangelogForm";
import {
  deleteChangelogEntry,
  publishChangelogEntry,
  type ChangelogEntryData,
} from "@/actions/platform-admin/changelog-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseContent } from "@/lib/markdown";
import type { ChangelogTag, ChangelogCategoryData } from "@/lib/changelog-constants";

// Color styles for tags and categories
const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
  gray: { bg: "bg-gray-500/10", text: "text-muted-foreground dark:text-muted-foreground", border: "border-gray-500/20" },
  red: { bg: "bg-destructive/10", text: "text-destructive dark:text-red-400", border: "border-destructive/20" },
  orange: { bg: "bg-warning/10", text: "text-warning dark:text-orange-400", border: "border-orange-500/20" },
  amber: { bg: "bg-warning/10", text: "text-warning dark:text-amber-400", border: "border-warning/20" },
  yellow: { bg: "bg-warning/10", text: "text-warning dark:text-yellow-400", border: "border-warning/20" },
  lime: { bg: "bg-lime-500/10", text: "text-lime-600 dark:text-lime-400", border: "border-lime-500/20" },
  green: { bg: "bg-success/10", text: "text-success dark:text-green-400", border: "border-success/20" },
  emerald: { bg: "bg-success/10", text: "text-success dark:text-emerald-400", border: "border-success/20" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/20" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/20" },
  blue: { bg: "bg-primary/10", text: "text-primary dark:text-blue-400", border: "border-primary/20" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  fuchsia: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-600 dark:text-fuchsia-400", border: "border-fuchsia-500/20" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
};

const getTagStyle = (color: string) => colorStyles[color] || colorStyles.gray;

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

interface ChangelogClientProps {
  entries: ChangelogEntryData[];
  stats: {
    total: number;
    byStatus: Record<string, number>;
  };
  categories: ChangelogCategoryData[];
  currentPage: number;
  totalPages: number;
  currentStatus: string;
  locale: string;
}

export function ChangelogClient({
  entries,
  stats,
  categories,
  currentPage,
  totalPages,
  currentStatus,
  locale,
}: ChangelogClientProps) {
  const router = useRouter();
  const [previewEntry, setPreviewEntry] = useState<ChangelogEntryData | null>(null);
  const [editEntry, setEditEntry] = useState<ChangelogEntryData | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ChangelogEntryData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    params.set("page", "1");
    router.push(`/${locale}/app/platform-admin/changelog?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (currentStatus !== "all") params.set("status", currentStatus);
    params.set("page", page.toString());
    router.push(`/${locale}/app/platform-admin/changelog?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const result = await deleteChangelogEntry(deleteConfirm.id);
      if (result.success) {
        toast.success("Changelog entry archived successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to archive entry");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handlePublish = async (id: string) => {
    setIsPublishing(id);
    try {
      const result = await publishChangelogEntry(id);
      if (result.success) {
        toast.success("Entry published successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to publish entry");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsPublishing(null);
    }
  };

  const getStatusBadge = (status: ChangelogStatus) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Draft
          </Badge>
        );
      case "PUBLISHED":
        return (
          <Badge variant="default" className="gap-1 bg-success/10 text-success border-success/20 hover:bg-success/20">
            <CheckCircle className="h-3 w-3" />
            Published
          </Badge>
        );
      case "ARCHIVED":
        return (
          <Badge variant="secondary" className="gap-1">
            <Archive className="h-3 w-3" />
            Archived
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: ChangelogCategoryData | null) => {
    if (!category) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          No Category
        </Badge>
      );
    }
    const style = getTagStyle(category.color);
    return (
      <Badge
        variant="outline"
        className={cn("gap-1.5", style.bg, style.text, style.border)}
      >
        <CategoryIcon icon={category.icon} className="h-3.5 w-3.5" />
        {category.name}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ScrollText className="h-8 w-8 text-primary" />
            Changelog Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage changelog entries for the public website
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.byStatus["PUBLISHED"] || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {stats.byStatus["DRAFT"] || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats.byStatus["ARCHIVED"] || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={currentStatus} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entries</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Changelog Entries</CardTitle>
          <CardDescription>
            {entries.length} entries {currentStatus !== "all" ? `(${currentStatus})` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No changelog entries yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first entry to get started
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        v{entry.version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {entry.description.replace(/<[^>]*>/g, "").substring(0, 80)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(entry.customCategory)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {entry.tags.slice(0, 2).map((tag, idx) => {
                          const style = getTagStyle(tag.color);
                          return (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={cn("text-xs", style.bg, style.text, style.border)}
                            >
                              {tag.name}
                            </Badge>
                          );
                        })}
                        {entry.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{entry.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
                      {entry.publishedAt ? (
                        <span className="text-sm">
                          {format(new Date(entry.publishedAt), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewEntry(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditEntry(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {entry.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePublish(entry.id)}
                            disabled={isPublishing === entry.id}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(entry)}
                          disabled={entry.status === "ARCHIVED"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewEntry} onOpenChange={() => setPreviewEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                v{previewEntry?.version}
              </Badge>
              {previewEntry?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {previewEntry && getCategoryBadge(previewEntry.customCategory)}
              {previewEntry && getStatusBadge(previewEntry.status)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewEntry?.tags && previewEntry.tags.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {previewEntry.tags.map((tag, idx) => {
                    const style = getTagStyle(tag.color);
                    return (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={cn(style.bg, style.text, style.border)}
                      >
                        {tag.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-sm mb-2">Description</h4>
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: parseContent(previewEntry?.description || "") }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>{" "}
                {previewEntry && format(new Date(previewEntry.createdAt), "PPpp")}
              </div>
              <div>
                <span className="text-muted-foreground">Updated:</span>{" "}
                {previewEntry && format(new Date(previewEntry.updatedAt), "PPpp")}
              </div>
              {previewEntry?.publishedAt && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Published:</span>{" "}
                  {format(new Date(previewEntry.publishedAt), "PPpp")}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Changelog Entry</DialogTitle>
            <DialogDescription>
              Add a new entry to the changelog. You can save as draft or publish immediately.
            </DialogDescription>
          </DialogHeader>
          <ChangelogForm
            categories={categories}
            onSuccess={() => {
              setShowCreateDialog(false);
              router.refresh();
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editEntry} onOpenChange={() => setEditEntry(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Changelog Entry</DialogTitle>
            <DialogDescription>
              Update the changelog entry details.
            </DialogDescription>
          </DialogHeader>
          {editEntry && (
            <ChangelogForm
              entry={editEntry}
              categories={categories}
              onSuccess={() => {
                setEditEntry(null);
                router.refresh();
              }}
              onCancel={() => setEditEntry(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Changelog Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the changelog entry &quot;{deleteConfirm?.title}&quot;.
              Archived entries are hidden from the public page but can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
