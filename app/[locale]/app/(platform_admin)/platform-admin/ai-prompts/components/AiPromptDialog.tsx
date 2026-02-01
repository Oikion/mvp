"use client";

import { useState, useEffect } from "react";
import type { AiSystemPrompt } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppToast } from "@/hooks/use-app-toast";
import { RefreshCw, Info } from "lucide-react";
import { createAiSystemPrompt, updateAiSystemPrompt } from "@/actions/platform-admin/ai-prompts";

interface AiPromptDialogProps {
  open: boolean;
  onClose: (refreshData?: boolean) => void;
  prompt: AiSystemPrompt | null;
  categories: string[];
}

const DEFAULT_CATEGORIES = [
  "assistant",
  "voice",
  "document",
  "mls",
  "matchmaking",
  "messaging",
];

export function AiPromptDialog({
  open,
  onClose,
  prompt,
  categories,
}: AiPromptDialogProps) {
  const { toast } = useAppToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    category: "assistant",
    content: "",
    locale: "en",
    isEnabled: true,
  });

  // Reset form when dialog opens/closes or prompt changes
  useEffect(() => {
    if (open) {
      if (prompt) {
        setFormData({
          name: prompt.name,
          displayName: prompt.displayName,
          description: prompt.description || "",
          category: prompt.category,
          content: prompt.content,
          locale: prompt.locale,
          isEnabled: prompt.isEnabled,
        });
      } else {
        setFormData({
          name: "",
          displayName: "",
          description: "",
          category: "assistant",
          content: "",
          locale: "en",
          isEnabled: true,
        });
      }
      setActiveTab("general");
    }
  }, [open, prompt]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error("Name is required", { isTranslationKey: false });
      return;
    }
    if (!formData.displayName.trim()) {
      toast.error("Display name is required", { isTranslationKey: false });
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Prompt content is required", { isTranslationKey: false });
      return;
    }

    setIsSubmitting(true);
    try {
      if (prompt) {
        // Update existing prompt
        await updateAiSystemPrompt({
          id: prompt.id,
          displayName: formData.displayName,
          description: formData.description || undefined,
          category: formData.category,
          content: formData.content,
          isEnabled: formData.isEnabled,
        });
        toast.success("Prompt updated successfully", { isTranslationKey: false });
      } else {
        // Create new prompt
        await createAiSystemPrompt({
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description || undefined,
          category: formData.category,
          content: formData.content,
          locale: formData.locale,
          isEnabled: formData.isEnabled,
        });
        toast.success("Prompt created successfully", { isTranslationKey: false });
      }
      onClose(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save prompt";
      toast.error(message, { isTranslationKey: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])].sort();

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {prompt ? "Edit System Prompt" : "Create System Prompt"}
          </DialogTitle>
          <DialogDescription>
            {prompt
              ? "Modify the system prompt configuration and content"
              : "Define a new system prompt for AI assistants"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="content">Prompt Content</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Name (only editable for new prompts) */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., chat_assistant"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value.toLowerCase().replaceAll(/[^a-z0-9_]/g, "_") })
                }
                disabled={!!prompt}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier in snake_case. Cannot be changed after creation.
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="displayName"
                placeholder="e.g., Chat Assistant"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this prompt is used for..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>

            {/* Category and Locale */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={formData.locale}
                  onValueChange={(value) =>
                    setFormData({ ...formData, locale: value })
                  }
                  disabled={!!prompt}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="el">🇬🇷 Greek</SelectItem>
                  </SelectContent>
                </Select>
                {prompt && (
                  <p className="text-xs text-muted-foreground">
                    Language cannot be changed. Create a new prompt for different language.
                  </p>
                )}
              </div>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  When disabled, the AI will fall back to built-in defaults
                </p>
              </div>
              <Switch
                checked={formData.isEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isEnabled: checked })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            {/* Prompt Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">
                  Prompt Content <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {formData.content.length} characters
                </span>
              </div>
              <Textarea
                id="content"
                placeholder="Enter the system prompt content..."
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={18}
                className="font-mono text-sm"
              />
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Tips for writing effective prompts:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Start with a clear role definition</li>
                    <li>List capabilities and limitations</li>
                    <li>Include specific rules and guidelines</li>
                    <li>Provide examples of expected behavior</li>
                    <li>Specify response format preferences</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Version info for existing prompts */}
            {prompt && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  Current version: <strong>v{prompt.version}</strong>
                  {prompt.content !== formData.content && (
                    <span className="text-amber-600 ml-2">
                      (unsaved changes will create v{prompt.version + 1})
                    </span>
                  )}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {prompt ? "Save Changes" : "Create Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
