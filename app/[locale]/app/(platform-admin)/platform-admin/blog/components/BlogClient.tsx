"use client";

import { useState } from "react";
import Link from "next/link";
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
  FileText,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  Archive,
  FileEdit,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Workflow,
} from "lucide-react";
import { format } from "date-fns";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  tags: string[];
  categories: string[];
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdVia: string | null;
}

interface BlogClientProps {
  posts: BlogPost[];
  stats: {
    total: number;
    byStatus: Record<string, number>;
  };
  currentPage: number;
  totalPages: number;
  currentStatus: string;
  locale: string;
}

export function BlogClient({
  posts,
  stats,
  currentPage,
  totalPages,
  currentStatus,
  locale,
}: BlogClientProps) {
  const router = useRouter();
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    params.set("page", "1");
    router.push(`/${locale}/app/platform-admin/blog?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (currentStatus !== "all") params.set("status", currentStatus);
    params.set("page", page.toString());
    router.push(`/${locale}/app/platform-admin/blog?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Published
          </Badge>
        );
      case "SCHEDULED":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "ARCHIVED":
        return (
          <Badge variant="secondary">
            <Archive className="h-3 w-3 mr-1" />
            Archived
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <FileEdit className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Blog Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage blog posts created via n8n workflows
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/app/platform-admin/automation`}>
            <Workflow className="h-4 w-4 mr-2" />
            Create via n8n
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
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
            <div className="text-2xl font-bold text-green-500">
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
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats.byStatus["SCHEDULED"] || 0}
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
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Blog Posts</CardTitle>
          <CardDescription>
            {posts.length} posts {currentStatus !== "all" ? `(${currentStatus})` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No blog posts yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create posts using n8n automation workflows
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{post.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          /{post.slug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(post.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {post.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {post.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{post.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.publishedAt ? (
                        <span className="text-sm">
                          {format(new Date(post.publishedAt), "MMM d, yyyy")}
                        </span>
                      ) : post.scheduledAt ? (
                        <span className="text-sm text-blue-500">
                          {format(new Date(post.scheduledAt), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {post.createdVia === "n8n" ? (
                        <Badge variant="outline" className="text-xs">
                          <Workflow className="h-3 w-3 mr-1" />
                          n8n
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewPost(post)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled>
                          <Edit className="h-4 w-4" />
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
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewPost?.title}</DialogTitle>
            <DialogDescription>
              /{previewPost?.slug} • {previewPost && getStatusBadge(previewPost.status)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewPost?.excerpt && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Excerpt</h4>
                <p className="text-muted-foreground">{previewPost.excerpt}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>{" "}
                {previewPost && format(new Date(previewPost.createdAt), "PPpp")}
              </div>
              <div>
                <span className="text-muted-foreground">Updated:</span>{" "}
                {previewPost && format(new Date(previewPost.updatedAt), "PPpp")}
              </div>
              {previewPost?.publishedAt && (
                <div>
                  <span className="text-muted-foreground">Published:</span>{" "}
                  {format(new Date(previewPost.publishedAt), "PPpp")}
                </div>
              )}
              {previewPost?.scheduledAt && (
                <div>
                  <span className="text-muted-foreground">Scheduled for:</span>{" "}
                  {format(new Date(previewPost.scheduledAt), "PPpp")}
                </div>
              )}
            </div>
            {previewPost?.tags && previewPost.tags.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {previewPost.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {previewPost?.categories && previewPost.categories.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Categories</h4>
                <div className="flex flex-wrap gap-1">
                  {previewPost.categories.map((cat) => (
                    <Badge key={cat} variant="outline">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
