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
  Share2,
  ExternalLink,
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  Workflow,
  Linkedin,
  Instagram,
} from "lucide-react";
import { format } from "date-fns";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface SocialPost {
  id: string;
  platform: string;
  platformPostId: string | null;
  platformPostUrl: string | null;
  content: string | null;
  mediaUrls: string[];
  status: string;
  errorMessage: string | null;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  engagementRate: number | null;
  scheduledAt: string | null;
  postedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdVia: string | null;
  n8nWorkflowId: string | null;
  n8nExecutionId: string | null;
}

interface SocialClientProps {
  posts: SocialPost[];
  stats: {
    total: number;
    byPlatform: Record<string, { count: number; likes: number; comments: number; shares: number; impressions: number }>;
    byStatus: Record<string, number>;
    totalEngagement: {
      likes: number;
      comments: number;
      shares: number;
      impressions: number;
    };
  };
  currentPage: number;
  totalPages: number;
  currentPlatform: string;
  currentStatus: string;
  locale: string;
}

export function SocialClient({
  posts,
  stats,
  currentPage,
  totalPages,
  currentPlatform,
  currentStatus,
  locale,
}: SocialClientProps) {
  const router = useRouter();
  const [previewPost, setPreviewPost] = useState<SocialPost | null>(null);

  const handleFilterChange = (type: "platform" | "status", value: string) => {
    const params = new URLSearchParams();
    if (type === "platform") {
      if (value !== "all") params.set("platform", value);
      if (currentStatus !== "all") params.set("status", currentStatus);
    } else {
      if (currentPlatform !== "all") params.set("platform", currentPlatform);
      if (value !== "all") params.set("status", value);
    }
    params.set("page", "1");
    router.push(`/${locale}/app/platform-admin/social?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (currentPlatform !== "all") params.set("platform", currentPlatform);
    if (currentStatus !== "all") params.set("status", currentStatus);
    params.set("page", page.toString());
    router.push(`/${locale}/app/platform-admin/social?${params.toString()}`);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "LINKEDIN":
        return <Linkedin className="h-4 w-4 text-[#0077B5]" />;
      case "INSTAGRAM":
        return <Instagram className="h-4 w-4 text-[#E4405F]" />;
      case "TIKTOK":
        return <TikTokIcon className="h-4 w-4" />;
      default:
        return <Share2 className="h-4 w-4" />;
    }
  };

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      LINKEDIN: "bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5]/20",
      INSTAGRAM: "bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F]/20",
      TIKTOK: "bg-gray-800/10 text-foreground dark:text-gray-200 hover:bg-gray-800/20",
      TWITTER: "bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20",
      FACEBOOK: "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20",
    };

    return (
      <Badge className={colors[platform] || "bg-gray-500/10 text-muted-foreground"}>
        {getPlatformIcon(platform)}
        <span className="ml-1">{platform}</span>
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "POSTED":
        return (
          <Badge className="bg-success/10 text-success hover:bg-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Posted
          </Badge>
        );
      case "POSTING":
        return (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
            <Send className="h-3 w-3 mr-1 animate-pulse" />
            Posting
          </Badge>
        );
      case "SCHEDULED":
        return (
          <Badge className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Share2 className="h-8 w-8 text-primary" />
            Social Media Activity
          </h1>
          <p className="text-muted-foreground mt-1">
            Track social media posts across LinkedIn, Instagram, and TikTok
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
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.byStatus["POSTED"] || 0} published
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" />
              Total Likes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.totalEngagement.likes.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.totalEngagement.comments.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Repeat2 className="h-4 w-4 text-success" />
              Shares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.totalEngagement.shares.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {stats.totalEngagement.impressions.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {["LINKEDIN", "INSTAGRAM", "TIKTOK"].map((platform) => {
          const platformData = stats.byPlatform[platform] || {
            count: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            impressions: 0,
          };
          return (
            <Card key={platform}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getPlatformIcon(platform)}
                  {platform}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{platformData.count} posts</div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {platformData.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {platformData.comments}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat2 className="h-3 w-3" />
                    {platformData.shares}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={currentPlatform} onValueChange={(v) => handleFilterChange("platform", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currentStatus} onValueChange={(v) => handleFilterChange("status", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Social Media Posts</CardTitle>
          <CardDescription>{posts.length} posts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No social media posts yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create posts using n8n automation workflows
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>{getPlatformBadge(post.platform)}</TableCell>
                    <TableCell>
                      <p className="truncate max-w-xs text-sm">
                        {post.content || "No content"}
                      </p>
                      {post.mediaUrls.length > 0 && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {post.mediaUrls.length} media
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(post.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-destructive" />
                          {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3 text-primary" />
                          {post.comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 className="h-3 w-3 text-success" />
                          {post.shares}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.postedAt
                        ? format(new Date(post.postedAt), "MMM d, yyyy HH:mm")
                        : post.scheduledAt
                        ? `Scheduled: ${format(new Date(post.scheduledAt), "MMM d, HH:mm")}`
                        : "—"}
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
                        {post.platformPostUrl && (
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={post.platformPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
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

      {/* Post Preview Dialog */}
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewPost && getPlatformIcon(previewPost.platform)}
              {previewPost?.platform} Post
            </DialogTitle>
            <DialogDescription>
              {previewPost && getStatusBadge(previewPost.status)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewPost?.content && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Content</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {previewPost.content}
                </p>
              </div>
            )}
            {previewPost?.mediaUrls && previewPost.mediaUrls.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Media</h4>
                <div className="flex flex-wrap gap-2">
                  {previewPost.mediaUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      Media {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Posted:</span>{" "}
                {previewPost?.postedAt
                  ? format(new Date(previewPost.postedAt), "PPpp")
                  : "Not posted"}
              </div>
              <div>
                <span className="text-muted-foreground">Last synced:</span>{" "}
                {previewPost?.lastSyncedAt
                  ? format(new Date(previewPost.lastSyncedAt), "PPpp")
                  : "Never"}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Engagement</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Heart className="h-5 w-5 mx-auto text-destructive mb-1" />
                  <p className="text-lg font-bold">{previewPost?.likes}</p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <MessageCircle className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{previewPost?.comments}</p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Repeat2 className="h-5 w-5 mx-auto text-success mb-1" />
                  <p className="text-lg font-bold">{previewPost?.shares}</p>
                  <p className="text-xs text-muted-foreground">Shares</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Eye className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                  <p className="text-lg font-bold">{previewPost?.impressions}</p>
                  <p className="text-xs text-muted-foreground">Impressions</p>
                </div>
              </div>
            </div>
            {previewPost?.errorMessage && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <h4 className="font-semibold text-sm text-destructive mb-1">Error</h4>
                <p className="text-sm text-destructive">{previewPost.errorMessage}</p>
              </div>
            )}
            {previewPost?.platformPostUrl && (
              <Button asChild className="w-full">
                <a
                  href={previewPost.platformPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on {previewPost.platform}
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
