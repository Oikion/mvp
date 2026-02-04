"use client";

import { useState, useEffect } from "react";
import type {
  AiAgent,
  AiAgentTool,
  AiTool,
  AiSystemPrompt,
} from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppToast } from "@/hooks/use-app-toast";
import { createAiAgent, updateAiAgent } from "@/actions/platform-admin/ai-agents";
import { Loader2 } from "lucide-react";

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

interface AiAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AiAgentWithRelations | null;
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
  onSaved: (agent: AiAgentWithRelations, isNew: boolean) => void;
}

// ============================================
// Component
// ============================================

export function AiAgentDialog({
  open,
  onOpenChange,
  agent,
  providers,
  availablePrompts,
  availableTools,
  onSaved,
}: AiAgentDialogProps) {
  const { toast } = useAppToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Form state
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPromptId, setSystemPromptId] = useState<string>("");
  const [modelProvider, setModelProvider] = useState<"OPENAI" | "ANTHROPIC">("OPENAI");
  const [modelName, setModelName] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [maxSteps, setMaxSteps] = useState(5);
  const [toolChoice, setToolChoice] = useState<"AUTO" | "REQUIRED" | "NONE">("AUTO");
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSystemAgent, setIsSystemAgent] = useState(false);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);

  const isEditing = !!agent;

  // Reset form when dialog opens/closes or agent changes
  useEffect(() => {
    if (open) {
      if (agent) {
        setName(agent.name);
        setDisplayName(agent.displayName);
        setDescription(agent.description || "");
        setSystemPromptId(agent.systemPromptId || "");
        setModelProvider(agent.modelProvider);
        setModelName(agent.modelName);
        setTemperature(agent.temperature);
        setMaxTokens(agent.maxTokens);
        setMaxSteps(agent.maxSteps);
        setToolChoice(agent.toolChoice);
        setIsEnabled(agent.isEnabled);
        setIsSystemAgent(agent.isSystemAgent);
        setSelectedToolIds(agent.tools.map((t) => t.toolId));
      } else {
        // Reset to defaults for new agent
        setName("");
        setDisplayName("");
        setDescription("");
        setSystemPromptId("");
        setModelProvider("OPENAI");
        setModelName("gpt-4o-mini");
        setTemperature(0.7);
        setMaxTokens(1000);
        setMaxSteps(5);
        setToolChoice("AUTO");
        setIsEnabled(true);
        setIsSystemAgent(false);
        setSelectedToolIds([]);
      }
      setActiveTab("general");
    }
  }, [open, agent]);

  // Update available models when provider changes
  const availableModels =
    providers.find((p) => p.value === modelProvider)?.models || [];

  const handleProviderChange = (value: string) => {
    setModelProvider(value as "OPENAI" | "ANTHROPIC");
    // Set default model for the provider
    const providerModels = providers.find((p) => p.value === value)?.models;
    if (providerModels && providerModels.length > 0) {
      setModelName(providerModels[0].value);
    }
  };

  const handleToolToggle = (toolId: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Name is required", { isTranslationKey: false });
      return;
    }
    if (!displayName.trim()) {
      toast.error("Display name is required", { isTranslationKey: false });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        const result = await updateAiAgent(agent.id, {
          displayName,
          description: description || null,
          systemPromptId: systemPromptId || null,
          modelProvider,
          modelName,
          temperature,
          maxTokens,
          maxSteps,
          toolChoice,
          isEnabled,
          toolIds: selectedToolIds,
        });

        if (result.success && result.agent) {
          toast.success("Agent updated successfully", { isTranslationKey: false });
          onSaved(result.agent, false);
        } else {
          toast.error(result.error || "Failed to update agent", {
            isTranslationKey: false,
          });
        }
      } else {
        const result = await createAiAgent({
          name,
          displayName,
          description: description || undefined,
          systemPromptId: systemPromptId || null,
          modelProvider,
          modelName,
          temperature,
          maxTokens,
          maxSteps,
          toolChoice,
          isEnabled,
          isSystemAgent,
          toolIds: selectedToolIds,
        });

        if (result.success && result.agent) {
          toast.success("Agent created successfully", { isTranslationKey: false });
          onSaved(result.agent, true);
        } else {
          toast.error(result.error || "Failed to create agent", {
            isTranslationKey: false,
          });
        }
      }
    } catch {
      toast.error("An error occurred", { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  // Group tools by category
  const toolsByCategory = availableTools.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    },
    {} as Record<string, typeof availableTools>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Agent" : "Create New Agent"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the agent configuration"
              : "Configure a new AI agent with model, tools, and settings"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="tools">Tools ({selectedToolIds.length})</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 pr-4" style={{ height: "400px" }}>
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="name">Name (identifier)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                  placeholder="my_custom_agent"
                  disabled={isEditing}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="My Custom Agent"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this agent does..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Select value={systemPromptId} onValueChange={setSystemPromptId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a system prompt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {availablePrompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.displayName} ({prompt.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Agent can be used when enabled
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>

              {!isEditing && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Agent</Label>
                    <p className="text-xs text-muted-foreground">
                      System agents cannot be deleted
                    </p>
                  </div>
                  <Switch
                    checked={isSystemAgent}
                    onCheckedChange={setIsSystemAgent}
                  />
                </div>
              )}
            </TabsContent>

            {/* Model Tab */}
            <TabsContent value="model" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={modelProvider} onValueChange={handleProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={modelName} onValueChange={setModelName}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm text-muted-foreground">
                    {temperature.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[temperature]}
                  onValueChange={([value]) => setTemperature(value)}
                  min={0}
                  max={2}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  Lower = more focused, Higher = more creative
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Output Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 1000)}
                  min={1}
                  max={128000}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxSteps">Max Tool Steps</Label>
                <Input
                  id="maxSteps"
                  type="number"
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(parseInt(e.target.value, 10) || 5)}
                  min={1}
                  max={20}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum tool call rounds per request
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tool Choice</Label>
                <Select
                  value={toolChoice}
                  onValueChange={(v) => setToolChoice(v as "AUTO" | "REQUIRED" | "NONE")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto (model decides)</SelectItem>
                    <SelectItem value="REQUIRED">Required (force tool use)</SelectItem>
                    <SelectItem value="NONE">None (disable tools)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground">
                Select tools this agent can use. Tools determine what actions the
                agent can perform.
              </p>

              {Object.entries(toolsByCategory).map(([category, tools]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium capitalize">{category}</h4>
                    <Badge variant="outline">{tools.length}</Badge>
                  </div>
                  <div className="space-y-2 ml-2">
                    {tools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={tool.id}
                          checked={selectedToolIds.includes(tool.id)}
                          onCheckedChange={() => handleToolToggle(tool.id)}
                        />
                        <label
                          htmlFor={tool.id}
                          className="text-sm cursor-pointer"
                        >
                          {tool.displayName}
                          <span className="text-muted-foreground ml-2 font-mono text-xs">
                            {tool.name}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Update Agent" : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
