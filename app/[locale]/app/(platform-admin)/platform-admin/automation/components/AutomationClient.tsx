"use client";

import { useState } from "react";
import Link from "next/link";
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
  AlertCircle,
  ExternalLink,
  Workflow,
  FileText,
  Mail,
  Share2,
  Play,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AutomationClientProps {
  n8nBaseUrl: string;
  locale: string;
  hasConfig: boolean;
}

export function AutomationClient({ n8nBaseUrl, locale, hasConfig }: AutomationClientProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const workflowTemplates = [
    {
      id: "blog",
      title: "Blog Post Workflow",
      description: "AI-assisted blog post creation with scheduling",
      icon: FileText,
      features: ["AI content generation", "SEO optimization", "Scheduled publishing"],
    },
    {
      id: "social",
      title: "Social Media Posting",
      description: "Post to LinkedIn, Instagram, and TikTok",
      icon: Share2,
      features: ["Multi-platform posting", "Content scheduling", "Engagement tracking"],
    },
    {
      id: "newsletter",
      title: "Newsletter Campaign",
      description: "Create and send newsletters via Resend",
      icon: Mail,
      features: ["Template composition", "Subscriber segmentation", "Analytics"],
    },
  ];

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Workflow className="h-8 w-8 text-primary" />
            Automation Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage automated workflows for content creation and publishing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${locale}/app/platform-admin/api-keys`}>
              <Settings className="h-4 w-4 mr-2" />
              API Keys
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={n8nBaseUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open n8n
            </a>
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {!hasConfig && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>n8n Not Configured</AlertTitle>
          <AlertDescription>
            Using default n8n URL ({n8nBaseUrl}). Configure n8n in the database for production use.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor">
            <Workflow className="h-4 w-4 mr-2" />
            Workflow Editor
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="guide">
            <Play className="h-4 w-4 mr-2" />
            Quick Start
          </TabsTrigger>
        </TabsList>

        {/* Workflow Editor Tab */}
        <TabsContent value="editor" className="space-y-4">
          <Card className={isFullscreen ? "fixed inset-4 z-50 rounded-lg" : ""}>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div>
                <CardTitle className="text-lg">n8n Workflow Editor</CardTitle>
                <CardDescription>Create and edit automation workflows</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isLoading && (
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!isLoading && !hasError && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {hasError && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {hasError ? (
                <div className="flex flex-col items-center justify-center h-[600px] bg-muted/50">
                  <XCircle className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="font-semibold text-lg">Unable to connect to n8n</h3>
                  <p className="text-muted-foreground text-center max-w-md mt-2">
                    Make sure n8n is running at {n8nBaseUrl} and accessible from this domain.
                  </p>
                  <p className="text-muted-foreground text-center max-w-md mt-2 text-sm">
                    <strong>Note:</strong> If you&apos;re on HTTPS and n8n is on HTTP, browsers block mixed content.
                    Use the &quot;Open n8n&quot; button to access it directly.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsLoading(true);
                        setHasError(false);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                    <Button asChild>
                      <a href={n8nBaseUrl} target="_blank" rel="noopener noreferrer">
                        Open n8n Directly
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <iframe
                  src={n8nBaseUrl}
                  className={`w-full border-0 rounded-b-lg ${isFullscreen ? "h-[calc(100vh-8rem)]" : "h-[600px]"}`}
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  allow="clipboard-write; clipboard-read"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {workflowTemplates.map((template) => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <template.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {template.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full" disabled>
                    Import Template (Coming Soon)
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Quick Start Tab */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
              <CardDescription>
                Get started with n8n automation in a few simple steps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Create an API Key</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Go to{" "}
                      <Link
                        href={`/${locale}/app/platform-admin/api-keys`}
                        className="text-primary hover:underline"
                      >
                        API Keys
                      </Link>{" "}
                      and create a new key with the required scopes (blog, newsletter, social).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">Configure n8n Credentials</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      In n8n, add a new HTTP Request credential with your API key as Bearer token.
                    </p>
                    <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
{`Authorization: Bearer oik_your_api_key_here
Content-Type: application/json`}
                    </pre>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold">Create Your Workflow</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use the HTTP Request node to call Oikion APIs:
                    </p>
                    <div className="mt-2 space-y-2">
                      <div className="p-2 bg-muted rounded text-xs">
                        <code>POST /api/v1/blog/posts</code> - Create blog posts
                      </div>
                      <div className="p-2 bg-muted rounded text-xs">
                        <code>POST /api/v1/newsletter/send</code> - Send newsletters
                      </div>
                      <div className="p-2 bg-muted rounded text-xs">
                        <code>POST /api/v1/social/log</code> - Log social posts
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold">Add Social Media Nodes</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure LinkedIn, Instagram, and TikTok credentials in n8n for direct posting.
                      After posting, log the results using the social log API.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    5
                  </div>
                  <div>
                    <h4 className="font-semibold">Set Up Webhook Callbacks</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use n8n&apos;s HTTP Request node to send workflow status updates:
                    </p>
                    <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
{`POST /api/v1/n8n/webhook
{
  "event": "workflow.completed",
  "workflowId": "{{$workflow.id}}",
  "executionId": "{{$execution.id}}",
  "data": { ... }
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Available API Endpoints</h4>
                <div className="grid gap-2 md:grid-cols-2 text-sm">
                  <div className="p-2 bg-muted rounded">
                    <code className="text-primary">GET/POST /api/v1/blog/posts</code>
                    <p className="text-muted-foreground text-xs mt-1">Blog management</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <code className="text-primary">GET/POST /api/v1/newsletter/campaigns</code>
                    <p className="text-muted-foreground text-xs mt-1">Campaign management</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <code className="text-primary">POST /api/v1/newsletter/send</code>
                    <p className="text-muted-foreground text-xs mt-1">Send newsletters</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <code className="text-primary">GET/POST /api/v1/social/log</code>
                    <p className="text-muted-foreground text-xs mt-1">Social media logging</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <code className="text-primary">POST /api/v1/n8n/webhook</code>
                    <p className="text-muted-foreground text-xs mt-1">Workflow callbacks</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <code className="text-primary">GET/POST /api/v1/newsletter/subscribers</code>
                    <p className="text-muted-foreground text-xs mt-1">Subscriber management</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
