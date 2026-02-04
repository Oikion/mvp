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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Users,
  Send,
  Eye,
  MousePointer,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  Workflow,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { format } from "date-fns";

interface Campaign {
  id: string;
  subject: string;
  previewText: string | null;
  content: string;
  fromName: string | null;
  fromEmail: string | null;
  status: string;
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  tags: string[];
  scheduledAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdVia: string | null;
}

interface Subscriber {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  source: string | null;
  tags: string[];
  emailsSentCount: number;
  emailsOpenedCount: number;
  emailsClickedCount: number;
  subscribedAt: string;
  unsubscribedAt: string | null;
  lastEmailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NewsletterClientProps {
  campaigns: Campaign[];
  subscribers: Subscriber[];
  stats: {
    totalSubscribers: number;
    activeSubscribers: number;
    totalCampaigns: number;
    sentCampaigns: number;
    totalOpens: number;
    totalClicks: number;
  };
  currentPage: number;
  totalCampaignPages: number;
  totalSubscriberPages: number;
  currentTab: string;
  locale: string;
}

export function NewsletterClient({
  campaigns,
  subscribers,
  stats,
  currentPage,
  totalCampaignPages,
  totalSubscriberPages,
  currentTab,
  locale,
}: NewsletterClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(currentTab);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/${locale}/app/platform-admin/newsletter?tab=${tab}&page=1`);
  };

  const handlePageChange = (page: number) => {
    router.push(`/${locale}/app/platform-admin/newsletter?tab=${activeTab}&page=${page}`);
  };

  const getCampaignStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <Badge className="bg-success/10 text-success hover:bg-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case "SENDING":
        return (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
            <Send className="h-3 w-3 mr-1 animate-pulse" />
            Sending
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
      case "CANCELLED":
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cancelled
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

  const getSubscriberStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-success/10 text-success">
            <UserPlus className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "UNSUBSCRIBED":
        return (
          <Badge variant="secondary">
            <UserMinus className="h-3 w-3 mr-1" />
            Unsubscribed
          </Badge>
        );
      case "BOUNCED":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Bounced
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = activeTab === "campaigns" ? totalCampaignPages : totalSubscriberPages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
            Newsletter Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage newsletter campaigns and subscribers
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/app/platform-admin/automation`}>
            <Workflow className="h-4 w-4 mr-2" />
            Create Campaign via n8n
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSubscribers} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.sentCampaigns} sent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Opens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalOpens}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.totalClicks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.sentCampaigns > 0
                ? ((stats.totalOpens / (stats.sentCampaigns * stats.activeSubscribers)) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOpens > 0
                ? ((stats.totalClicks / stats.totalOpens) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="inline-grid grid-cols-2">
          <TabsTrigger value="campaigns">
            <Mail className="h-4 w-4 shrink-0" />
            Campaigns ({stats.totalCampaigns})
          </TabsTrigger>
          <TabsTrigger value="subscribers">
            <Users className="h-4 w-4 shrink-0" />
            Subscribers ({stats.totalSubscribers})
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Newsletter Campaigns</CardTitle>
              <CardDescription>
                View and manage your newsletter campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Opens</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No campaigns yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.subject}</p>
                            {campaign.previewText && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {campaign.previewText}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getCampaignStatusBadge(campaign.status)}</TableCell>
                        <TableCell>{campaign.recipientCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            {campaign.openCount}
                            {campaign.sentCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({((campaign.openCount / campaign.sentCount) * 100).toFixed(0)}%)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3 text-muted-foreground" />
                            {campaign.clickCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          {campaign.sentAt
                            ? format(new Date(campaign.sentAt), "MMM d, yyyy")
                            : campaign.scheduledAt
                            ? `Scheduled: ${format(new Date(campaign.scheduledAt), "MMM d")}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewCampaign(campaign)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle>Newsletter Subscribers</CardTitle>
              <CardDescription>
                View and manage your subscriber list
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Emails Sent</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Subscribed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No subscribers yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscribers.map((subscriber) => (
                      <TableRow key={subscriber.id}>
                        <TableCell className="font-medium">{subscriber.email}</TableCell>
                        <TableCell>
                          {subscriber.firstName || subscriber.lastName
                            ? `${subscriber.firstName || ""} ${subscriber.lastName || ""}`.trim()
                            : "—"}
                        </TableCell>
                        <TableCell>{getSubscriberStatusBadge(subscriber.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {subscriber.source || "unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>{subscriber.emailsSentCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {subscriber.emailsOpenedCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <MousePointer className="h-3 w-3" />
                              {subscriber.emailsClickedCount}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(subscriber.subscribedAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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

      {/* Campaign Preview Dialog */}
      <Dialog open={!!previewCampaign} onOpenChange={() => setPreviewCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewCampaign?.subject}</DialogTitle>
            <DialogDescription>
              {previewCampaign && getCampaignStatusBadge(previewCampaign.status)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewCampaign?.previewText && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Preview Text</h4>
                <p className="text-muted-foreground">{previewCampaign.previewText}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">From:</span>{" "}
                {previewCampaign?.fromName} &lt;{previewCampaign?.fromEmail}&gt;
              </div>
              <div>
                <span className="text-muted-foreground">Recipients:</span>{" "}
                {previewCampaign?.recipientCount}
              </div>
              <div>
                <span className="text-muted-foreground">Opens:</span>{" "}
                {previewCampaign?.openCount} (
                {previewCampaign && previewCampaign.sentCount > 0
                  ? ((previewCampaign.openCount / previewCampaign.sentCount) * 100).toFixed(1)
                  : 0}
                %)
              </div>
              <div>
                <span className="text-muted-foreground">Clicks:</span>{" "}
                {previewCampaign?.clickCount}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Content Preview</h4>
              <div
                className="border rounded-md p-4 bg-muted/50 max-h-64 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: previewCampaign?.content || "" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
