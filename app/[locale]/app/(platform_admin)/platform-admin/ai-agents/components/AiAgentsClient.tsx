"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AiAgent,
  AiAgentTool,
  AiTool,
  AiSystemPrompt,
} from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  Bot,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Cpu,
  Wrench,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { AiAgentDialog } from "./AiAgentDialog";
import { toggleAiAgent, deleteAiAgent } from "@/actions/platform-admin/ai-agents";
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

// ============================================
// Types
// ============================================

interface AiAgentWithRelations extends AiAgent {
  systemPrompt: AiSystemPrompt | null;
  tools: Array<AiAgentTool & { tool: AiTool }>;
}

interface ProviderInfo {
  value: string;
  label: string;
  models: Array<{ value: string; label: string }>;
}

interface AiAgentsClientProps {
  initialAgents: AiAgentWithRelations[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  providers: ProviderInfo[];
  availablePrompts: Array<{
    id: string;
    name: string;
    displayName: string;
    category: string;
  }>;
  availableTools: Array<{
    id: string;
    name: string;
    displayName: string;
    category: string;
  }>;
  stats: {
    total: number;
    enabled: number;
    system: number;
    custom: number;
    byProvider: Record<string, number>;
  };
  locale: string;
}

// ============================================
// Provider Badge Colors
// ============================================

const PROVIDER_COLORS: Record<string, string> = {
  OPENAI: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ANTHROPIC: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

// ============================================
// Component
// ============================================

export function AiAgentsClient({
  initialAgents,
  totalCount,
  currentPage,
  totalPages,
  providers,
  availablePrompts,
  availableTools,
  stats,
}: AiAgentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useAppToast();

  const [agents, setAgents] = useState<AiAgentWithRelations[]>(initialAgents);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgentWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState<AiAgentWithRelations | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const updateSearchParams = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    }
    router.push(`?${newParams.toString()}`);
  };

  const handleSearch = () => {
    updateSearchParams({ search: searchInput, page: "1" });
  };

  const handleProviderChange = (value: string) => {
    updateSearchParams({ provider: value === "all" ? null : value, page: "1" });
  };

  const handleStatusChange = (value: string) => {
    updateSearchParams({ status: value === "all" ? null : value, page: "1" });
  };

  const handleTypeChange = (value: string) => {
    updateSearchParams({ type: value === "all" ? null : value, page: "1" });
  };

  const handleToggle = async (agent: AiAgentWithRelations) => {
    setIsLoading(true);
    try {
      const result = await toggleAiAgent(agent.id, !agent.isEnabled);
      if (result.success && result.agent) {
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? result.agent! : a))
        );
        toast.success(
          `Agent "${agent.displayName}" ${result.agent.isEnabled ? "enabled" : "disabled"}`,
          { isTranslationKey: false }
        );
      } else {
        toast.error(result.error || "Failed to toggle agent", {
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error("Failed to toggle agent", { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;

    setIsLoading(true);
    try {
      const result = await deleteAiAgent(deletingAgent.id, deleteConfirmName);
      if (result.success) {
        setAgents((prev) => prev.filter((a) => a.id !== deletingAgent.id));
        toast.success(`Agent "${deletingAgent.displayName}" deleted`, {
          isTranslationKey: false,
        });
        setDeleteDialogOpen(false);
        setDeletingAgent(null);
        setDeleteConfirmName("");
      } else {
        toast.error(result.error || "Failed to delete agent", {
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error("Failed to delete agent", { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentSaved = (agent: AiAgentWithRelations, isNew: boolean) => {
    if (isNew) {
      setAgents((prev) => [agent, ...prev]);
    } else {
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
    }
    setCreateDialogOpen(false);
    setEditingAgent(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground">
            Configure and manage AI agents for the platform
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.enabled} enabled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Agents</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system}</div>
            <p className="text-xs text-muted-foreground">Built-in agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OpenAI</CardTitle>
            <Cpu className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.byProvider.OPENAI || 0}
            </div>
            <p className="text-xs text-muted-foreground">GPT models</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anthropic</CardTitle>
            <Cpu className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.byProvider.ANTHROPIC || 0}
            </div>
            <p className="text-xs text-muted-foreground">Claude models</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search and filter agents by provider, status, or type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search agents..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-sm"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select
              defaultValue={searchParams.get("provider") || "all"}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              defaultValue={searchParams.get("status") || "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              defaultValue={searchParams.get("type") || "all"}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => router.refresh()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agents ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead>Settings</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No agents found</p>
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{agent.displayName}</span>
                          {agent.isSystemAgent && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {agent.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={PROVIDER_COLORS[agent.modelProvider]}
                        >
                          {agent.modelProvider}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {agent.modelName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span>{agent.tools.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div>Temp: {agent.temperature}</div>
                        <div>Max Steps: {agent.maxSteps}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={agent.isEnabled}
                        onCheckedChange={() => handleToggle(agent)}
                        disabled={isLoading}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(agent.createdAt), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingAgent(agent)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setDeletingAgent(agent);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                            disabled={agent.isSystemAgent}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateSearchParams({ page: String(currentPage - 1) })
                  }
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateSearchParams({ page: String(currentPage + 1) })
                  }
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <AiAgentDialog
        open={createDialogOpen || !!editingAgent}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingAgent(null);
          }
        }}
        agent={editingAgent}
        providers={providers}
        availablePrompts={availablePrompts}
        availableTools={availableTools}
        onSaved={handleAgentSaved}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the agent &quot;{deletingAgent?.displayName}&quot;
              and all its configurations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Type <span className="font-mono font-bold">{deletingAgent?.name}</span> to
              confirm:
            </p>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Enter agent name"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmName("");
                setDeletingAgent(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={
                isLoading || deleteConfirmName !== deletingAgent?.name
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete Agent"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
