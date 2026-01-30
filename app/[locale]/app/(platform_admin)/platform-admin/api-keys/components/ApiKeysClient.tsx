"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  isActive: boolean;
}

interface AvailableScope {
  scope: string;
  description: string;
}

export function ApiKeysClient() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [availableScopes, setAvailableScopes] = useState<AvailableScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<string>("never");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/admin/api-keys");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch API keys");
      }
      
      setApiKeys(data.apiKeys || []);
      setAvailableScopes(data.availableScopes || []);
      
      if (data.message) {
        toast.info(data.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load API keys";
      toast.error(message);
      console.error("[API_KEYS_FETCH]", error);
      // Still set available scopes so the form works
      setAvailableScopes([
        { scope: "calendar:read", description: "View calendar events and schedules" },
        { scope: "calendar:write", description: "Create, update, and delete calendar events" },
        { scope: "crm:read", description: "View clients, contacts, and CRM data" },
        { scope: "crm:write", description: "Create, update, and delete clients and contacts" },
        { scope: "mls:read", description: "View properties and MLS listings" },
        { scope: "mls:write", description: "Create, update, and delete properties" },
        { scope: "tasks:read", description: "View tasks and assignments" },
        { scope: "tasks:write", description: "Create, update, and complete tasks" },
        { scope: "documents:read", description: "View and download documents" },
        { scope: "documents:write", description: "Upload and manage documents" },
        { scope: "webhooks:manage", description: "Configure webhook endpoints" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error("Please select at least one scope");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName.trim(),
          scopes: selectedScopes,
          expiresInDays: expiresInDays === "never" ? null : parseInt(expiresInDays),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create API key");
      }
      const data = await response.json();
      setNewKey(data.key);
      setCreateDialogOpen(false);
      setNewKeyDialogOpen(true);
      fetchApiKeys();
      setKeyName("");
      setSelectedScopes([]);
      setExpiresInDays("never");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${keyId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to revoke API key");
      toast.success("API key revoked successfully");
      fetchApiKeys();
    } catch (error) {
      toast.error("Failed to revoke API key");
      console.error(error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const selectAllReadScopes = () => {
    const readScopes = availableScopes.filter((s) => s.scope.endsWith(":read")).map((s) => s.scope);
    setSelectedScopes(readScopes);
  };

  const selectAllScopes = () => {
    setSelectedScopes(availableScopes.map((s) => s.scope));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for external integrations (n8n, Make.com, webhooks)
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for external integrations. The key will only be shown once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., n8n Integration, Make.com Workflow"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiration</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Permissions</Label>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={selectAllReadScopes}>
                      Read Only
                    </Button>
                    <Button variant="outline" size="sm" onClick={selectAllScopes}>
                      Full Access
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                  {availableScopes.map((scope) => (
                    <div key={scope.scope} className="flex items-start space-x-2">
                      <Checkbox
                        id={scope.scope}
                        checked={selectedScopes.includes(scope.scope)}
                        onCheckedChange={() => toggleScope(scope.scope)}
                      />
                      <div className="grid gap-1 leading-none">
                        <label htmlFor={scope.scope} className="text-sm font-medium cursor-pointer">
                          {scope.scope}
                        </label>
                        <p className="text-xs text-muted-foreground">{scope.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={creating}>
                {creating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                Create Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>Copy your API key now. You won&apos;t be able to see it again!</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Input type={showKey ? "text" : "password"} value={newKey || ""} readOnly className="font-mono" />
              <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => newKey && copyToClipboard(newKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this key in the <code className="bg-muted px-1 rounded">Authorization</code> header:
            </p>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
              Authorization: Bearer {newKey?.substring(0, 12)}...
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={() => { setNewKeyDialogOpen(false); setNewKey(null); setShowKey(false); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>{apiKeys.filter((k) => k.isActive).length} active keys</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Key className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No API keys yet</p>
                    <p className="text-sm text-muted-foreground">Create your first API key to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">{key.keyPrefix}...</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {key.scopes.slice(0, 3).map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">{scope}</Badge>
                        ))}
                        {key.scopes.length > 3 && <Badge variant="outline" className="text-xs">+{key.scopes.length - 3} more</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.lastUsedAt ? (
                        <span className="text-sm">{format(new Date(key.lastUsedAt), "MMM d, yyyy")}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {key.expiresAt ? (
                        <span className="text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(key.expiresAt), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {key.isActive ? (
                        <Badge className="bg-success/10 text-success hover:bg-success/20">
                          <CheckCircle className="h-3 w-3 mr-1" />Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />{key.revokedAt ? "Revoked" : "Expired"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {key.isActive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to revoke this API key? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevokeKey(key.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Revoke Key
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>How to use your API keys with external tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Base URL</h4>
            <pre className="bg-muted p-3 rounded-md text-sm">{typeof window !== "undefined" ? window.location.origin : ""}/api/v1</pre>
          </div>
          <div>
            <h4 className="font-medium mb-2">Authentication</h4>
            <p className="text-sm text-muted-foreground mb-2">Include your API key in the Authorization header:</p>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
{`curl -X GET "${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/crm/clients" \\
  -H "Authorization: Bearer oik_your_api_key_here" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-2">Available Endpoints</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted p-2 rounded"><code>/api/v1/calendar/events</code></div>
              <div className="bg-muted p-2 rounded"><code>/api/v1/crm/clients</code></div>
              <div className="bg-muted p-2 rounded"><code>/api/v1/crm/tasks</code></div>
              <div className="bg-muted p-2 rounded"><code>/api/v1/mls/properties</code></div>
              <div className="bg-muted p-2 rounded"><code>/api/v1/documents</code></div>
              <div className="bg-muted p-2 rounded"><code>/api/v1/webhooks</code></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
