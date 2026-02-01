"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AiSystemPrompt } from "@prisma/client";
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
  MessageSquare,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Copy,
  History,
  Sparkles,
} from "lucide-react";
import { AiPromptDialog } from "./AiPromptDialog";
import { toggleAiSystemPrompt, deleteAiSystemPrompt, seedDefaultPrompts } from "@/actions/platform-admin/ai-prompts";
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

interface AiPromptsClientProps {
  initialPrompts: AiSystemPrompt[];
  categories: string[];
  locale: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  assistant: <MessageSquare className="h-4 w-4 text-blue-500" />,
  voice: <Sparkles className="h-4 w-4 text-purple-500" />,
  document: <History className="h-4 w-4 text-green-500" />,
  mls: <Copy className="h-4 w-4 text-orange-500" />,
  matchmaking: <Sparkles className="h-4 w-4 text-pink-500" />,
  messaging: <MessageSquare className="h-4 w-4 text-cyan-500" />,
};

const LOCALE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  el: "🇬🇷",
};

export function AiPromptsClient({
  initialPrompts,
  categories,
  locale: pageLocale,
}: AiPromptsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useAppToast();

  const [prompts, setPrompts] = useState<AiSystemPrompt[]>(initialPrompts);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AiSystemPrompt | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPrompt, setDeletingPrompt] = useState<AiSystemPrompt | null>(null);
  const [isSeedingDefaults, setIsSeedingDefaults] = useState(false);

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
    updateSearchParams({ search: searchInput });
  };

  const handleCategoryChange = (value: string) => {
    updateSearchParams({ category: value === "all" ? null : value });
  };

  const handleLocaleChange = (value: string) => {
    updateSearchParams({ locale: value === "all" ? null : value });
  };

  const handleStatusChange = (value: string) => {
    updateSearchParams({ status: value === "all" ? null : value });
  };

  const handleToggle = async (prompt: AiSystemPrompt) => {
    setIsLoading(true);
    try {
      const result = await toggleAiSystemPrompt(prompt.id);
      setPrompts((prev) =>
        prev.map((p) => (p.id === prompt.id ? result : p))
      );
      toast.success(
        `Prompt "${prompt.displayName}" ${result.isEnabled ? "enabled" : "disabled"}`,
        { isTranslationKey: false }
      );
    } catch (error) {
      toast.error("Failed to toggle prompt", { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPrompt) return;

    setIsLoading(true);
    try {
      await deleteAiSystemPrompt(deletingPrompt.id);
      setPrompts((prev) => prev.filter((p) => p.id !== deletingPrompt.id));
      toast.success(`Prompt "${deletingPrompt.displayName}" deleted`, { isTranslationKey: false });
      setDeleteDialogOpen(false);
      setDeletingPrompt(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete prompt";
      toast.error(message, { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    setIsSeedingDefaults(true);
    try {
      const result = await seedDefaultPrompts();
      if (result.created > 0) {
        toast.success(`Created ${result.created} default prompts`, { isTranslationKey: false });
        router.refresh();
      } else {
        toast.info("All default prompts already exist", { isTranslationKey: false });
      }
    } catch (error) {
      toast.error("Failed to seed default prompts", { isTranslationKey: false });
    } finally {
      setIsSeedingDefaults(false);
    }
  };

  const handleDialogClose = (refreshData?: boolean) => {
    setCreateDialogOpen(false);
    setEditingPrompt(null);
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
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI System Prompts</h1>
            <p className="text-muted-foreground">
              Manage system prompts for AI assistants and agents
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSeedDefaults}
            disabled={isSeedingDefaults}
          >
            {isSeedingDefaults ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Seed Defaults
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Prompt
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{prompts.length}</div>
            <p className="text-xs text-muted-foreground">Total Prompts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {prompts.filter((p) => p.isEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {prompts.filter((p) => p.isSystemPrompt).length}
            </div>
            <p className="text-xs text-muted-foreground">System Prompts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(prompts.map((p) => p.category)).size}
            </div>
            <p className="text-xs text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompts</CardTitle>
          <CardDescription>
            Configure system prompts that define AI assistant behavior and personality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search prompts..."
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
              value={searchParams.get("locale") || "all"}
              onValueChange={handleLocaleChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="el">🇬🇷 Greek</SelectItem>
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
                <TableHead>Prompt</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No prompts found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first prompt or seed the defaults
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleSeedDefaults}
                      disabled={isSeedingDefaults}
                    >
                      {isSeedingDefaults ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Seed Default Prompts
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                prompts.map((prompt) => (
                  <TableRow key={prompt.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{prompt.displayName}</span>
                          {prompt.isSystemPrompt && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground">
                          {prompt.name}
                        </code>
                        {prompt.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {prompt.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[prompt.category] || (
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                        )}
                        <Badge variant="outline">
                          {prompt.category}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {LOCALE_FLAGS[prompt.locale] || "🌐"}
                        </span>
                        <span className="text-sm uppercase">
                          {prompt.locale}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        v{prompt.version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={prompt.isEnabled}
                        onCheckedChange={() => handleToggle(prompt)}
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
                          <DropdownMenuItem onClick={() => setEditingPrompt(prompt)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Prompt
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(prompt.content);
                              toast.success("Prompt copied to clipboard", { isTranslationKey: false });
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Content
                          </DropdownMenuItem>
                          {!prompt.isSystemPrompt && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeletingPrompt(prompt);
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
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AiPromptDialog
        open={createDialogOpen || !!editingPrompt}
        onClose={handleDialogClose}
        prompt={editingPrompt}
        categories={categories}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the prompt
              &quot;{deletingPrompt?.displayName}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeletingPrompt(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete Prompt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
