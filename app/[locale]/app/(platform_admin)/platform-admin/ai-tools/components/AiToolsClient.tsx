"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AiTool } from "@prisma/client";
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
  Play,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  Globe,
  Server,
} from "lucide-react";
import { format } from "date-fns";
import { AiToolDialog } from "./AiToolDialog";
import { AiToolTestDialog } from "./AiToolTestDialog";
import { toggleAiTool, deleteAiTool } from "@/actions/platform-admin/ai-tools";
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

interface AiToolsClientProps {
  initialTools: AiTool[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  categories: string[];
  locale: string;
}

const ENDPOINT_TYPE_ICONS: Record<string, React.ReactNode> = {
  INTERNAL_ACTION: <Zap className="h-4 w-4 text-blue-500" />,
  API_ROUTE: <Server className="h-4 w-4 text-green-500" />,
  EXTERNAL_URL: <Globe className="h-4 w-4 text-purple-500" />,
};

const ENDPOINT_TYPE_LABELS: Record<string, string> = {
  INTERNAL_ACTION: "Server Action",
  API_ROUTE: "API Route",
  EXTERNAL_URL: "External URL",
};

export function AiToolsClient({
  initialTools,
  totalCount,
  currentPage,
  totalPages,
  categories,
  locale,
}: AiToolsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useAppToast();

  const [tools, setTools] = useState<AiTool[]>(initialTools);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<AiTool | null>(null);
  const [testingTool, setTestingTool] = useState<AiTool | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTool, setDeletingTool] = useState<AiTool | null>(null);
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

  const handleCategoryChange = (value: string) => {
    updateSearchParams({ category: value === "all" ? null : value, page: "1" });
  };

  const handleStatusChange = (value: string) => {
    updateSearchParams({ status: value === "all" ? null : value, page: "1" });
  };

  const handleToggle = async (tool: AiTool) => {
    setIsLoading(true);
    try {
      const result = await toggleAiTool(tool.id, !tool.isEnabled);
      if (result.success && result.tool) {
        setTools((prev) =>
          prev.map((t) => (t.id === tool.id ? result.tool! : t))
        );
        toast.success(
          `Tool "${tool.displayName}" ${result.tool.isEnabled ? "enabled" : "disabled"}`,
          { isTranslationKey: false }
        );
      } else {
        toast.error(result.error || "Failed to toggle tool", { isTranslationKey: false });
      }
    } catch (error) {
      toast.error("Failed to toggle tool", { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTool) return;

    setIsLoading(true);
    try {
      const result = await deleteAiTool(deletingTool.id, deleteConfirmName);
      if (result.success) {
        setTools((prev) => prev.filter((t) => t.id !== deletingTool.id));
        toast.success(`Tool "${deletingTool.displayName}" deleted`, { isTranslationKey: false });
        setDeleteDialogOpen(false);
        setDeletingTool(null);
        setDeleteConfirmName("");
      } else {
        toast.error(result.error || "Failed to delete tool", { isTranslationKey: false });
      }
    } catch (error) {
      toast.error("Failed to delete tool", { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogClose = (refreshData?: boolean) => {
    setCreateDialogOpen(false);
    setEditingTool(null);
    if (refreshData) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Tools</h1>
            <p className="text-muted-foreground">
              Manage tools available to AI assistants and external agents
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tool
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Total Tools</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {tools.filter((t) => t.isEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {tools.filter((t) => !t.isEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Disabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {tools.filter((t) => t.isSystemTool).length}
            </div>
            <p className="text-xs text-muted-foreground">System Tools</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>
            Configure and manage AI tools that can be called by assistants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search tools..."
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
              value={searchParams.get("category") || "all"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={searchParams.get("status") || "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No tools found</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first AI tool to get started
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                tools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tool.displayName}</span>
                          {tool.isSystemTool && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground">
                          {tool.name}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tool.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {ENDPOINT_TYPE_ICONS[tool.endpointType]}
                        <span className="text-sm">
                          {ENDPOINT_TYPE_LABELS[tool.endpointType]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {tool.requiredScopes.slice(0, 2).map((scope) => (
                          <Badge
                            key={scope}
                            variant="secondary"
                            className="text-xs"
                          >
                            {scope}
                          </Badge>
                        ))}
                        {tool.requiredScopes.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{tool.requiredScopes.length - 2}
                          </Badge>
                        )}
                        {tool.requiredScopes.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            None required
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={tool.isEnabled}
                        onCheckedChange={() => handleToggle(tool)}
                        disabled={isLoading}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setTestingTool(tool)}>
                            <Play className="h-4 w-4 mr-2" />
                            Test Tool
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingTool(tool)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!tool.isSystemTool && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeletingTool(tool);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * 20 + 1} to{" "}
                {Math.min(currentPage * 20, totalCount)} of {totalCount} tools
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateSearchParams({ page: String(currentPage - 1) })
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateSearchParams({ page: String(currentPage + 1) })
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AiToolDialog
        open={createDialogOpen || !!editingTool}
        onClose={handleDialogClose}
        tool={editingTool}
        categories={categories}
      />

      {testingTool && (
        <AiToolTestDialog
          open={!!testingTool}
          onClose={() => setTestingTool(null)}
          tool={testingTool}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tool</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tool
              and all its execution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Type <strong>{deletingTool?.name}</strong> to confirm:
            </p>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Enter tool name"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmName("");
                setDeletingTool(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmName !== deletingTool?.name || isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete Tool
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
