"use client";

import { useState } from "react";
import type { AiTool } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FlaskConical,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AiToolTestDialogProps {
  open: boolean;
  onClose: () => void;
  tool: AiTool;
}

interface TestResult {
  success: boolean;
  data?: unknown;
  error?: string;
  statusCode: number;
  durationMs: number;
}

export function AiToolTestDialog({ open, onClose, tool }: AiToolTestDialogProps) {
  const { toast } = useAppToast();
  const [inputJson, setInputJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [testMode, setTestMode] = useState(true); // Default to test mode (uses mock data)
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");

  const validateJson = (json: string): boolean => {
    try {
      JSON.parse(json);
      setJsonError(null);
      return true;
    } catch {
      setJsonError("Invalid JSON syntax");
      return false;
    }
  };

  const handleTest = async () => {
    if (!validateJson(inputJson)) {
      toast.error("Please fix the JSON syntax errors", { isTranslationKey: false });
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/ai-tools/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: tool.name,
          input: JSON.parse(inputJson),
          testMode,
          provider,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast.success("Tool executed successfully", { isTranslationKey: false });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Test failed";
      setResult({
        success: false,
        error: errorMessage,
        statusCode: 500,
        durationMs: 0,
      });
      toast.error(errorMessage, { isTranslationKey: false });
    } finally {
      setIsRunning(false);
    }
  };

  // Generate example input from schema
  const generateExampleInput = () => {
    const schema = tool.parameters as { properties?: Record<string, unknown> };
    const example: Record<string, unknown> = {};

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const propSchema = prop as Record<string, unknown>;
        if (propSchema.default !== undefined) {
          example[key] = propSchema.default;
        } else if (propSchema.enum && Array.isArray(propSchema.enum)) {
          example[key] = propSchema.enum[0];
        } else if (propSchema.type === "string") {
          example[key] = "";
        } else if (propSchema.type === "number" || propSchema.type === "integer") {
          example[key] = 0;
        } else if (propSchema.type === "boolean") {
          example[key] = false;
        } else if (propSchema.type === "array") {
          example[key] = [];
        } else if (propSchema.type === "object") {
          example[key] = {};
        }
      }
    }

    setInputJson(JSON.stringify(example, null, 2));
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Test Tool: {tool.displayName}</DialogTitle>
          <DialogDescription>
            Execute the tool with test input and view the response
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Input Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Input Parameters</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="test-mode"
                    checked={testMode}
                    onCheckedChange={setTestMode}
                  />
                  <Label 
                    htmlFor="test-mode" 
                    className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    Test Mode
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateExampleInput}
                >
                  Generate Example
                </Button>
              </div>
            </div>
            
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider</Label>
              <Select
                value={provider}
                onValueChange={(value) => setProvider(value as "openai" | "anthropic")}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={inputJson}
              onChange={(e) => {
                setInputJson(e.target.value);
                validateJson(e.target.value);
              }}
              rows={15}
              className="font-mono text-sm"
              placeholder="{}"
            />
            {jsonError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {jsonError}
              </p>
            )}

            {/* Test Mode Warning */}
            {!testMode && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="text-xs">
                  Test mode is off. This will execute real operations.
                </p>
              </div>
            )}

            {/* Tool Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Endpoint:</span>
                <code className="bg-muted px-2 py-1 rounded">
                  {tool.httpMethod} {tool.endpointPath}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Required Scopes:</span>
                {tool.requiredScopes.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {tool.requiredScopes.map((scope) => (
                      <Badge key={scope} variant="secondary" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </div>
            </div>

            <Button
              onClick={handleTest}
              disabled={isRunning || !!jsonError}
              className="w-full"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Test
            </Button>
          </div>

          {/* Output Panel */}
          <div className="space-y-4">
            <Label>Response</Label>
            <div className="border rounded-lg p-4 h-[400px] overflow-hidden flex flex-col">
              {!result ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Run a test to see the response
                </div>
              ) : (
                <>
                  {/* Status Header */}
                  <div className="flex items-center justify-between pb-3 border-b">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {result.success ? "Success" : "Failed"}
                      </span>
                      <Badge
                        variant={
                          result.statusCode < 200 || result.statusCode >= 300
                            ? "destructive"
                            : "default"
                        }
                      >
                        {result.statusCode}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {result.durationMs}ms
                    </div>
                  </div>

                  {/* Response Body */}
                  <ScrollArea className="flex-1 mt-3">
                    {result.error ? (
                      <div className="text-destructive">
                        <p className="font-medium">Error:</p>
                        <p>{result.error}</p>
                      </div>
                    ) : (
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </ScrollArea>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Schema Reference */}
        <Separator className="my-4" />
        <div className="space-y-2">
          <Label>Parameters Schema</Label>
          <ScrollArea className="h-32 border rounded-lg p-3">
            <pre className="text-xs font-mono text-muted-foreground">
              {JSON.stringify(tool.parameters, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
