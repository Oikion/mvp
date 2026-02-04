"use client";

import { useState, useEffect } from "react";
import type { AiTool } from "@prisma/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  RefreshCw,
  Plus,
  Save,
  FileText,
  List,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  ToggleRight,
  Layers,
  Archive,
  Bell,
  Download,
  UserPlus,
  Calendar,
  Home,
  Users,
  Eye,
  Filter,
  GitBranch,
  Copy,
  Check,
} from "lucide-react";
import {
  createAiTool,
  updateAiTool,
  type CreateAiToolInput,
} from "@/actions/platform-admin/ai-tools";
import { API_SCOPES, SCOPE_DESCRIPTIONS } from "@/lib/api-auth";
import {
  TOOL_TEMPLATES,
  getTemplateCategories,
  getTemplatesByCategory,
  type ToolTemplate,
} from "@/lib/ai-tools/templates";
import {
  validateToolSchema,
  type SchemaValidationResult,
} from "@/lib/ai-sdk/schema-validator";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AiToolDialogProps {
  open: boolean;
  onClose: (refreshData?: boolean) => void;
  tool: AiTool | null;
  categories: string[];
}

const DEFAULT_SCHEMA = {
  type: "object",
  properties: {},
  required: [],
};

// Icon mapping for templates
const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  list: <List className="h-4 w-4" />,
  "list-ordered": <List className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  filter: <Filter className="h-4 w-4" />,
  plus: <PlusCircle className="h-4 w-4" />,
  "git-branch": <GitBranch className="h-4 w-4" />,
  pencil: <Pencil className="h-4 w-4" />,
  "toggle-right": <ToggleRight className="h-4 w-4" />,
  layers: <Layers className="h-4 w-4" />,
  trash: <Trash2 className="h-4 w-4" />,
  archive: <Archive className="h-4 w-4" />,
  bell: <Bell className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  "user-plus": <UserPlus className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  eye: <Eye className="h-4 w-4" />,
};

export function AiToolDialog({
  open,
  onClose,
  tool,
  categories,
}: AiToolDialogProps) {
  const { toast } = useAppToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("all");

  // Form state
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [endpointType, setEndpointType] = useState<"INTERNAL_ACTION" | "API_ROUTE" | "EXTERNAL_URL">("API_ROUTE");
  const [endpointPath, setEndpointPath] = useState("");
  const [httpMethod, setHttpMethod] = useState<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">("POST");
  const [requiredScopes, setRequiredScopes] = useState<string[]>([]);
  const [parametersJson, setParametersJson] = useState(JSON.stringify(DEFAULT_SCHEMA, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [schemaValidation, setSchemaValidation] = useState<SchemaValidationResult | null>(null);
  const [schemaCopied, setSchemaCopied] = useState(false);

  // Copy schema to clipboard
  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(parametersJson);
      setSchemaCopied(true);
      toast.success("Schema copied to clipboard", { isTranslationKey: false });
      setTimeout(() => setSchemaCopied(false), 2000);
    } catch {
      toast.error("Failed to copy schema", { isTranslationKey: false });
    }
  };

  // Reset form when tool changes
  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setDisplayName(tool.displayName);
      setDescription(tool.description);
      setCategory(tool.category);
      setEndpointType(tool.endpointType as "INTERNAL_ACTION" | "API_ROUTE" | "EXTERNAL_URL");
      setEndpointPath(tool.endpointPath);
      setHttpMethod(tool.httpMethod as "GET" | "POST" | "PUT" | "PATCH" | "DELETE");
      setRequiredScopes(tool.requiredScopes);
      setParametersJson(JSON.stringify(tool.parameters, null, 2));
      setActiveTab("basic"); // Skip templates tab when editing
    } else {
      // Reset to defaults for new tool
      setName("");
      setDisplayName("");
      setDescription("");
      setCategory("");
      setEndpointType("API_ROUTE");
      setEndpointPath("");
      setHttpMethod("POST");
      setRequiredScopes([]);
      setParametersJson(JSON.stringify(DEFAULT_SCHEMA, null, 2));
      setActiveTab("templates"); // Show templates tab for new tools
    }
    setJsonError(null);
    setSelectedTemplateCategory("all");
  }, [tool, open]);

  // Apply a template
  const applyTemplate = (template: ToolTemplate) => {
    setDisplayName(template.defaultValues.displayName);
    setDescription(template.defaultValues.description);
    setCategory(template.defaultValues.category);
    setEndpointType(template.defaultValues.endpointType);
    setHttpMethod(template.defaultValues.httpMethod);
    setRequiredScopes(template.defaultValues.requiredScopes);
    setParametersJson(JSON.stringify(template.defaultValues.parameters, null, 2));
    
    // Auto-generate name from template displayName
    const generatedName = template.defaultValues.displayName
      .toLowerCase()
      .replace(/\[entity\]/g, "item")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .replace(/^[0-9]/, "tool_$&");
    setName(generatedName);
    
    setActiveTab("basic");
    toast.success(`Template "${template.name}" applied`, { isTranslationKey: false });
  };

  // Get templates to display
  const displayedTemplates = selectedTemplateCategory === "all"
    ? TOOL_TEMPLATES
    : getTemplatesByCategory(selectedTemplateCategory);

  // Auto-generate name from displayName
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!tool) {
      // Only auto-generate for new tools
      const generatedName = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .replace(/^[0-9]/, "tool_$&");
      setName(generatedName);
    }
  };

  const validateJson = (json: string, provider: "openai" | "anthropic" = "openai"): boolean => {
    try {
      const parsed = JSON.parse(json);
      
      // Basic JSON parse check
      if (parsed.type !== "object") {
        setJsonError('Schema type must be "object"');
        setSchemaValidation(null);
        return false;
      }
      if (!parsed.properties || typeof parsed.properties !== "object") {
        setJsonError("Schema must have properties object");
        setSchemaValidation(null);
        return false;
      }
      
      // Run comprehensive validation
      const result = validateToolSchema(parsed, provider);
      setSchemaValidation(result);
      
      if (!result.valid) {
        setJsonError(result.errors[0]?.message || "Schema validation failed");
        return false;
      }
      
      setJsonError(null);
      return true;
    } catch {
      setJsonError("Invalid JSON syntax");
      setSchemaValidation(null);
      return false;
    }
  };

  const toggleScope = (scope: string) => {
    setRequiredScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Tool name is required", { isTranslationKey: false });
      setActiveTab("basic");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Display name is required", { isTranslationKey: false });
      setActiveTab("basic");
      return;
    }
    if (!description.trim() || description.length < 10) {
      toast.error("Description must be at least 10 characters", { isTranslationKey: false });
      setActiveTab("basic");
      return;
    }
    const finalCategory = category === "_new" ? newCategory : category;
    if (!finalCategory.trim()) {
      toast.error("Category is required", { isTranslationKey: false });
      setActiveTab("basic");
      return;
    }
    if (!endpointPath.trim()) {
      toast.error("Endpoint path is required", { isTranslationKey: false });
      setActiveTab("endpoint");
      return;
    }
    if (!validateJson(parametersJson)) {
      toast.error("Invalid parameters schema", { isTranslationKey: false });
      setActiveTab("schema");
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreateAiToolInput = {
        name: name.trim(),
        displayName: displayName.trim(),
        description: description.trim(),
        category: finalCategory.trim().toLowerCase(),
        endpointType,
        endpointPath: endpointPath.trim(),
        httpMethod,
        requiredScopes,
        parameters: JSON.parse(parametersJson),
        isEnabled: true,
        isSystemTool: false,
      };

      if (tool) {
        const result = await updateAiTool({ id: tool.id, ...data });
        if (result.success) {
          toast.success("Tool updated successfully", { isTranslationKey: false });
          onClose(true);
        } else {
          toast.error(result.error || "Failed to update tool", { isTranslationKey: false });
        }
      } else {
        const result = await createAiTool(data);
        if (result.success) {
          toast.success("Tool created successfully", { isTranslationKey: false });
          onClose(true);
        } else {
          toast.error(result.error || "Failed to create tool", { isTranslationKey: false });
        }
      }
    } catch (error) {
      toast.error("An error occurred", { isTranslationKey: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? "Edit Tool" : "Create New Tool"}</DialogTitle>
          <DialogDescription>
            {tool
              ? "Update the tool configuration and parameters"
              : "Define a new AI tool that can be called by assistants and external agents"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className={`grid w-full ${tool ? "grid-cols-4" : "grid-cols-5"}`}>
            {!tool && <TabsTrigger value="templates">Templates</TabsTrigger>}
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="endpoint">Endpoint</TabsTrigger>
            <TabsTrigger value="schema">Parameters</TabsTrigger>
            <TabsTrigger value="scopes">Scopes</TabsTrigger>
          </TabsList>

          {/* Templates Tab - Only shown for new tools */}
          {!tool && (
            <TabsContent value="templates" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Choose a template to quickly set up your tool with pre-configured settings
                    </p>
                  </div>
                  <Select
                    value={selectedTemplateCategory}
                    onValueChange={setSelectedTemplateCategory}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      {getTemplateCategories().map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-2 gap-3">
                    {displayedTemplates.map((template) => (
                      <button
                        type="button"
                        key={template.id}
                        className="border rounded-lg p-4 hover:border-primary hover:bg-accent/50 cursor-pointer transition-colors text-left w-full"
                        onClick={() => applyTemplate(template)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-md bg-primary/10 p-2 text-primary">
                            {TEMPLATE_ICONS[template.icon] || <FileText className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">
                                {template.name}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">
                                {template.defaultValues.httpMethod}
                              </Badge>
                              <span>{template.defaultValues.category}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Or start from scratch with an empty tool
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("basic")}>
                    Start from Scratch
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., List Properties"
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Human-readable name shown in the UI
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tool Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., list_properties"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!!tool}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase, underscores only (used for invocation)
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this tool does and when to use it..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This description is provided to AI models to help them understand when to use the tool
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                  <SelectItem value="_new">+ New Category</SelectItem>
                </SelectContent>
              </Select>
              {category === "_new" && (
                <Input
                  placeholder="Enter new category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="endpoint" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Endpoint Type *</Label>
              <Select
                value={endpointType}
                onValueChange={(v) => setEndpointType(v as typeof endpointType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL_ACTION">
                    Server Action (actions/...)
                  </SelectItem>
                  <SelectItem value="API_ROUTE">
                    API Route (/api/...)
                  </SelectItem>
                  <SelectItem value="EXTERNAL_URL">
                    External URL
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endpointPath">
                {endpointType === "INTERNAL_ACTION"
                  ? "Action Path *"
                  : endpointType === "API_ROUTE"
                  ? "API Route *"
                  : "External URL *"}
              </Label>
              <Input
                id="endpointPath"
                placeholder={
                  endpointType === "INTERNAL_ACTION"
                    ? "crm/clients/get-clients"
                    : endpointType === "API_ROUTE"
                    ? "/api/v1/crm/clients"
                    : "https://api.example.com/endpoint"
                }
                value={endpointPath}
                onChange={(e) => setEndpointPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {endpointType === "INTERNAL_ACTION"
                  ? "Path relative to the actions/ directory"
                  : endpointType === "API_ROUTE"
                  ? "Internal API route starting with /api/"
                  : "Full URL including https://"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>HTTP Method</Label>
              <Select
                value={httpMethod}
                onValueChange={(v) => setHttpMethod(v as typeof httpMethod)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="schema" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="parameters">Parameters Schema (JSON Schema)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => validateJson(parametersJson)}
                    className="h-7 gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Validate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopySchema}
                    className="h-7 gap-1.5"
                  >
                    {schemaCopied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {schemaCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <Textarea
                id="parameters"
                value={parametersJson}
                onChange={(e) => {
                  setParametersJson(e.target.value);
                  // Debounced validation on change
                  try {
                    JSON.parse(e.target.value);
                    setJsonError(null);
                  } catch {
                    setJsonError("Invalid JSON syntax");
                    setSchemaValidation(null);
                  }
                }}
                onBlur={() => validateJson(parametersJson)}
                rows={12}
                className="font-mono text-sm"
                placeholder={JSON.stringify(
                  {
                    type: "object",
                    properties: {
                      status: {
                        type: "string",
                        enum: ["ACTIVE", "PENDING", "SOLD"],
                        description: "Filter by property status",
                      },
                      limit: {
                        type: "number",
                        description: "Number of results to return",
                      },
                    },
                    required: [],
                  },
                  null,
                  2
                )}
              />
              
              {/* Validation Status */}
              {jsonError && !schemaValidation && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{jsonError}</AlertDescription>
                </Alert>
              )}
              
              {schemaValidation && !schemaValidation.valid && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Schema Validation Failed</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {schemaValidation.errors.map((error, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-mono text-xs">{error.path || "root"}</span>: {error.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              {schemaValidation?.valid && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700 dark:text-green-300">Schema Valid</AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    Schema is valid and compatible with AI providers.
                  </AlertDescription>
                </Alert>
              )}
              
              {schemaValidation?.valid && schemaValidation.warnings.length > 0 && (
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-700 dark:text-yellow-300">Warnings</AlertTitle>
                  <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {schemaValidation.warnings.map((warning, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-mono text-xs">{warning.path || "root"}</span>: {warning.message}
                          {warning.provider && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {warning.provider}
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <p className="text-xs text-muted-foreground">
                Define the input parameters using JSON Schema format. The schema is validated for compatibility with OpenAI and Anthropic providers.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="scopes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Required API Scopes</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select which API scopes are required to use this tool. External API consumers must have these scopes to call this tool.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {Object.entries(API_SCOPES).map(([key, scope]) => (
                  <div key={scope} className="flex items-start space-x-2">
                    <Checkbox
                      id={scope}
                      checked={requiredScopes.includes(scope)}
                      onCheckedChange={() => toggleScope(scope)}
                    />
                    <div className="grid gap-1 leading-none">
                      <label
                        htmlFor={scope}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {scope}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {SCOPE_DESCRIPTIONS[scope as keyof typeof SCOPE_DESCRIPTIONS]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : tool ? (
              <Save className="h-4 w-4 mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {tool ? "Save Changes" : "Create Tool"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
