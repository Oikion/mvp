"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { upsertOrganizationAgentConfig } from "@/actions/organization/ai-config";
import type { AiAgent, AiSystemPrompt, AiAgentTool, AiTool, OrganizationAgentConfig } from "@prisma/client";

// ============================================
// Types
// ============================================

interface AgentWithConfig extends AiAgent {
  systemPrompt: AiSystemPrompt | null;
  tools: Array<AiAgentTool & { tool: AiTool }>;
  orgConfigs: OrganizationAgentConfig[];
}

interface AgentConfigDialogProps {
  agent: AgentWithConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================
// Component
// ============================================

export function AgentConfigDialog({
  agent,
  open,
  onOpenChange,
}: AgentConfigDialogProps) {
  const router = useRouter();
  const orgConfig = agent.orgConfigs[0];

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [modelName, setModelName] = useState(orgConfig?.modelName || agent.modelName);
  const [temperature, setTemperature] = useState(
    orgConfig?.temperature ?? agent.temperature
  );
  const [maxTokens, setMaxTokens] = useState(
    orgConfig?.maxTokens ?? agent.maxTokens
  );
  const [maxSteps, setMaxSteps] = useState(
    orgConfig?.maxSteps ?? agent.maxSteps
  );
  const [customPrompt, setCustomPrompt] = useState(
    orgConfig?.customSystemPrompt || ""
  );

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const result = await upsertOrganizationAgentConfig(agent.id, {
        modelName,
        temperature,
        maxTokens,
        maxSteps,
        customSystemPrompt: customPrompt || null,
        isEnabled: true,
      });

      if (result.success) {
        toast.success("Agent configuration saved");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save configuration");
      }
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    // Reset to agent defaults
    setModelName(agent.modelName);
    setTemperature(agent.temperature);
    setMaxTokens(agent.maxTokens);
    setMaxSteps(agent.maxSteps);
    setCustomPrompt("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {agent.displayName}</DialogTitle>
          <DialogDescription>
            Customize this agent&apos;s behavior for your organization. Changes only
            affect your organization.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="model" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select value={modelName} onValueChange={setModelName}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o (Most Capable)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Balanced)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fastest)</SelectItem>
                  <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                  <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default: {agent.modelName}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Temperature: {temperature.toFixed(1)}</Label>
                <span className="text-xs text-muted-foreground">
                  Default: {agent.temperature}
                </span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={([value]) => setTemperature(value)}
                min={0}
                max={1}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                Lower values make responses more focused and deterministic.
                Higher values make responses more creative and varied.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
                  min={100}
                  max={8000}
                />
                <p className="text-xs text-muted-foreground">
                  Default: {agent.maxTokens}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxSteps">Max Tool Steps</Label>
                <Input
                  id="maxSteps"
                  type="number"
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(parseInt(e.target.value) || 5)}
                  min={1}
                  max={20}
                />
                <p className="text-xs text-muted-foreground">
                  Default: {agent.maxSteps}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Base System Prompt</Label>
              <div className="rounded-md bg-muted p-3 text-sm">
                {agent.systemPrompt?.content || "No system prompt configured"}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customPrompt">Custom Instructions (Optional)</Label>
              <Textarea
                id="customPrompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add custom instructions that will be appended to the base prompt..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be added to the base system prompt for your
                organization only.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Available Tools ({agent.tools.length})</Label>
              <p className="text-sm text-muted-foreground">
                These tools are available to this agent. Tool availability is
                managed by platform administrators.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {agent.tools.map((t) => (
                <div
                  key={t.tool.id}
                  className="flex items-start gap-2 p-2 rounded-md border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {t.tool.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {t.tool.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {t.tool.category}
                  </Badge>
                </div>
              ))}
              {agent.tools.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2 py-4 text-center">
                  No tools configured for this agent
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground border-t pt-4">
              Contact your platform administrator to add or remove tools from this
              agent.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
