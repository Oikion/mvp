"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  PlayCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AutomationClientProps {
  n8nBaseUrl: string;
  locale: string;
  hasConfig: boolean;
}

type N8nWorkflow = {
  id: string;
  name: string;
  active: boolean;
};

export function AutomationClient({ n8nBaseUrl, locale, hasConfig }: AutomationClientProps) {
  const [activeTab, setActiveTab] = useState("workflows");

  const [wfLoading, setWfLoading] = useState(false);
  const [wfError, setWfError] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [wfBusyId, setWfBusyId] = useState<string | null>(null);

  const normalizedN8nBaseUrl = useMemo(() => n8nBaseUrl.trim().replace(/\/+$/, ""), [n8nBaseUrl]);
  const workflowEditUrl = useMemo(() => {
    return (workflowId: string) => `${normalizedN8nBaseUrl}/#/workflow/${workflowId}`;
  }, [normalizedN8nBaseUrl]);

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

  async function refreshWorkflows() {
    setWfLoading(true);
    setWfError(null);
    try {
      const res = await fetch("/api/platform-admin/n8n/workflows", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as
        | { workflows?: N8nWorkflow[]; error?: string }
        | undefined;

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load workflows (${res.status})`);
      }

      setWorkflows(Array.isArray(json?.workflows) ? json!.workflows! : []);
    } catch (e: unknown) {
      setWfError(e instanceof Error ? e.message : "Failed to load workflows");
    } finally {
      setWfLoading(false);
    }
  }

  async function setWorkflowActive(workflowId: string, active: boolean) {
    setWfBusyId(workflowId);
    setWfError(null);
    try {
      const res = await fetch(`/api/platform-admin/n8n/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json?.error || `Failed to update workflow (${res.status})`);
      await refreshWorkflows();
    } catch (e: unknown) {
      setWfError(e instanceof Error ? e.message : "Failed to update workflow");
    } finally {
      setWfBusyId(null);
    }
  }

  async function runWorkflow(workflowId: string) {
    setWfBusyId(workflowId);
    setWfError(null);
    try {
      const res = await fetch(`/api/platform-admin/n8n/workflows/${workflowId}/run`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json?.error || `Failed to run workflow (${res.status})`);
    } catch (e: unknown) {
      setWfError(e instanceof Error ? e.message : "Failed to run workflow");
    } finally {
      setWfBusyId(null);
    }
  }

  useEffect(() => {
    if (activeTab === "workflows" && workflows.length === 0 && !wfLoading) {
      void refreshWorkflows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
        <TabsList className="inline-grid grid-cols-3">
          <TabsTrigger value="workflows">
            <PlayCircle className="h-4 w-4 shrink-0" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 shrink-0" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="guide">
            <Play className="h-4 w-4 shrink-0" />
            Quick Start
          </TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Workflows</CardTitle>
                <CardDescription>
                  Manage workflows from Oikion (edit opens in n8n, execute/activate uses n8n API)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={refreshWorkflows} disabled={wfLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${wfLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {wfError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Workflow API error</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <div>{wfError}</div>
                    <div className="text-xs text-muted-foreground">
                      Ensure you set <code>N8N_API_KEY</code> on the server and that your n8n base URL is reachable.
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {wfLoading && workflows.length === 0 ? (
                <div className="text-sm text-muted-foreground">Loading workflows…</div>
              ) : workflows.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No workflows found (or n8n API not enabled). Use “Open n8n” to create workflows.
                </div>
              ) : (
                <div className="space-y-2">
                  {workflows.map((wf) => (
                    <div
                      key={wf.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{wf.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: <code>{wf.id}</code> • Status:{" "}
                          <span className={wf.active ? "text-success" : "text-muted-foreground"}>
                            {wf.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                          <a href={workflowEditUrl(wf.id)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Edit
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => runWorkflow(wf.id)}
                          disabled={wfBusyId === wf.id}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Execute
                        </Button>
                        {wf.active ? (
                          <Button
                            variant="destructive"
                            onClick={() => setWorkflowActive(wf.id, false)}
                            disabled={wfBusyId === wf.id}
                          >
                            Pause
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setWorkflowActive(wf.id, true)}
                            disabled={wfBusyId === wf.id}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                        <CheckCircle className="h-4 w-4 text-success" />
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
