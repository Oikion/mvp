"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Settings, Sparkles, Wrench, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AgentConfigDialog } from "./AgentConfigDialog";
import { toast } from "sonner";
import { toggleOrganizationAgentConfig } from "@/actions/organization/ai-config";
import type { AiAgent, AiSystemPrompt, AiAgentTool, AiTool, OrganizationAgentConfig } from "@prisma/client";

// ============================================
// Types
// ============================================

interface AgentWithConfig extends AiAgent {
  systemPrompt: AiSystemPrompt | null;
  tools: Array<AiAgentTool & { tool: AiTool }>;
  orgConfigs: OrganizationAgentConfig[];
}

interface AiSettingsClientProps {
  agents: AgentWithConfig[];
}

// ============================================
// Component
// ============================================

export function AiSettingsClient({ agents }: AiSettingsClientProps) {
  const router = useRouter();
  const [selectedAgent, setSelectedAgent] = useState<AgentWithConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [togglingAgents, setTogglingAgents] = useState<Set<string>>(new Set());

  // Group agents by category
  const systemAgents = agents.filter((a) => a.isSystemAgent);
  const customAgents = agents.filter((a) => !a.isSystemAgent);

  const toggleAgentExpanded = (agentId: string) => {
    setExpandedAgents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  const handleConfigureAgent = (agent: AgentWithConfig) => {
    setSelectedAgent(agent);
    setIsDialogOpen(true);
  };

  const handleToggleAgent = async (agent: AgentWithConfig) => {
    const orgConfig = agent.orgConfigs[0];
    const currentlyEnabled = orgConfig?.isEnabled ?? agent.isEnabled;

    setTogglingAgents((prev) => new Set(prev).add(agent.id));

    try {
      const result = await toggleOrganizationAgentConfig(agent.id, !currentlyEnabled);
      
      if (result.success) {
        toast.success(
          `${agent.displayName} ${!currentlyEnabled ? "enabled" : "disabled"} for your organization`
        );
        router.refresh();
      } else {
        toast.error(result.error || "Failed to toggle agent");
      }
    } catch {
      toast.error("Failed to toggle agent");
    } finally {
      setTogglingAgents((prev) => {
        const newSet = new Set(prev);
        newSet.delete(agent.id);
        return newSet;
      });
    }
  };

  const getAgentStatus = (agent: AgentWithConfig) => {
    const orgConfig = agent.orgConfigs[0];
    if (orgConfig) {
      return orgConfig.isEnabled ? "enabled" : "disabled";
    }
    return agent.isEnabled ? "default" : "disabled";
  };

  return (
    <>
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Agents
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            General Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          {/* System Agents */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">System Agents</h3>
              <Badge variant="secondary">{systemAgents.length}</Badge>
            </div>
            
            <div className="grid gap-4">
              {systemAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isExpanded={expandedAgents.has(agent.id)}
                  isToggling={togglingAgents.has(agent.id)}
                  status={getAgentStatus(agent)}
                  onToggleExpanded={() => toggleAgentExpanded(agent.id)}
                  onConfigure={() => handleConfigureAgent(agent)}
                  onToggleEnabled={() => handleToggleAgent(agent)}
                />
              ))}
              {systemAgents.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No system agents configured
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Custom Agents */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Custom Agents</h3>
              <Badge variant="secondary">{customAgents.length}</Badge>
            </div>
            
            <div className="grid gap-4">
              {customAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isExpanded={expandedAgents.has(agent.id)}
                  isToggling={togglingAgents.has(agent.id)}
                  status={getAgentStatus(agent)}
                  onToggleExpanded={() => toggleAgentExpanded(agent.id)}
                  onConfigure={() => handleConfigureAgent(agent)}
                  onToggleEnabled={() => handleToggleAgent(agent)}
                />
              ))}
              {customAgents.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No custom agents configured. Custom agents can be added by platform administrators.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Provider Settings</CardTitle>
              <CardDescription>
                Configure the AI provider and model settings for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Default AI Provider</Label>
                  <p className="text-sm text-muted-foreground">
                    The AI provider used for all agents unless overridden
                  </p>
                </div>
                <Badge variant="outline">OpenAI</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Default Model</Label>
                  <p className="text-sm text-muted-foreground">
                    The default model used for AI operations
                  </p>
                </div>
                <Badge variant="outline">gpt-4o-mini</Badge>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Contact your platform administrator to change provider settings or add custom API keys.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage & Limits</CardTitle>
              <CardDescription>
                Monitor AI usage and configure limits for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Requests Today</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Tokens Used</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">Unlimited</p>
                  <p className="text-sm text-muted-foreground">Monthly Limit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedAgent && (
        <AgentConfigDialog
          agent={selectedAgent}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </>
  );
}

// ============================================
// Agent Card Component
// ============================================

interface AgentCardProps {
  agent: AgentWithConfig;
  isExpanded: boolean;
  isToggling: boolean;
  status: "enabled" | "disabled" | "default";
  onToggleExpanded: () => void;
  onConfigure: () => void;
  onToggleEnabled: () => void;
}

function AgentCard({
  agent,
  isExpanded,
  isToggling,
  status,
  onToggleExpanded,
  onConfigure,
  onToggleEnabled,
}: AgentCardProps) {
  const orgConfig = agent.orgConfigs[0];
  const effectiveModel = orgConfig?.modelName || agent.modelName;
  const effectiveTemp = orgConfig?.temperature ?? agent.temperature;
  const isEnabled = status !== "disabled";

  return (
    <Card className={!isEnabled ? "opacity-60" : undefined}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 text-left">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <div>
                <CardTitle className="text-base">{agent.displayName}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {agent.description || agent.name}
                </CardDescription>
              </div>
            </CollapsibleTrigger>
            
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  status === "enabled"
                    ? "default"
                    : status === "disabled"
                    ? "secondary"
                    : "outline"
                }
              >
                {status === "enabled"
                  ? "Enabled"
                  : status === "disabled"
                  ? "Disabled"
                  : "Default"}
              </Badge>
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggleEnabled}
                disabled={isToggling}
              />
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Model</p>
                <p className="font-medium">{effectiveModel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Temperature</p>
                <p className="font-medium">{effectiveTemp}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Steps</p>
                <p className="font-medium">{orgConfig?.maxSteps ?? agent.maxSteps}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tools</p>
                <p className="font-medium">{agent.tools.length} available</p>
              </div>
            </div>

            {agent.tools.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Available Tools</p>
                <div className="flex flex-wrap gap-1">
                  {agent.tools.slice(0, 8).map((t) => (
                    <Badge key={t.tool.id} variant="outline" className="text-xs">
                      {t.tool.displayName}
                    </Badge>
                  ))}
                  {agent.tools.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{agent.tools.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={onConfigure}>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
