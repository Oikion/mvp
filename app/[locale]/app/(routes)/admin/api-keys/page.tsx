"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

export default function ApiKeysPage() {
  const router = useRouter();
  const t = useTranslations("admin");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [availableScopes, setAvailableScopes] = useState<AvailableScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Form state
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
      if (!response.ok) {
        throw new Error("Failed to fetch API keys");
      }
      const data = await response.json();
      setApiKeys(data.apiKeys);
      setAvailableScopes(data.availableScopes);
    } catch (error) {
      toast.error(t("apiKeys.toast.loadError"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      toast.error(t("apiKeys.toast.nameRequired"));
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error(t("apiKeys.toast.scopeRequired"));
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
        throw new Error(error.error || t("apiKeys.toast.createError"));
      }

      const data = await response.json();
      setNewKey(data.key);
      setCreateDialogOpen(false);
      setNewKeyDialogOpen(true);
      fetchApiKeys();

      // Reset form
      setKeyName("");
      setSelectedScopes([]);
      setExpiresInDays("never");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("apiKeys.toast.createError"));
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(t("apiKeys.toast.revokeError"));
      }

      toast.success(t("apiKeys.toast.revoked"));
      fetchApiKeys();
    } catch (error) {
      toast.error(t("apiKeys.toast.revokeError"));
      console.error(error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("apiKeys.toast.copied"));
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const selectAllReadScopes = () => {
    const readScopes = availableScopes
      .filter((s) => s.scope.endsWith(":read"))
      .map((s) => s.scope);
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("apiKeys.title")}</h1>
          <p className="text-muted-foreground">
            {t("apiKeys.subtitle")}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("apiKeys.createKey")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("apiKeys.createDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("apiKeys.createDialog.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("apiKeys.createDialog.nameLabel")}</Label>
                <Input
                  id="name"
                  placeholder={t("apiKeys.createDialog.namePlaceholder")}
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("apiKeys.createDialog.expirationLabel")}</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("apiKeys.createDialog.expirationPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{t("apiKeys.expiration.never")}</SelectItem>
                    <SelectItem value="30">{t("apiKeys.expiration.days30")}</SelectItem>
                    <SelectItem value="90">{t("apiKeys.expiration.days90")}</SelectItem>
                    <SelectItem value="180">{t("apiKeys.expiration.days180")}</SelectItem>
                    <SelectItem value="365">{t("apiKeys.expiration.year1")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("apiKeys.createDialog.permissionsLabel")}</Label>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllReadScopes}
                    >
                      {t("apiKeys.createDialog.readOnly")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllScopes}
                    >
                      {t("apiKeys.createDialog.fullAccess")}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                  {availableScopes.map((scope) => (
                    <div
                      key={scope.scope}
                      className="flex items-start space-x-2"
                    >
                      <Checkbox
                        id={scope.scope}
                        checked={selectedScopes.includes(scope.scope)}
                        onCheckedChange={() => toggleScope(scope.scope)}
                      />
                      <div className="grid gap-1 leading-none">
                        <label
                          htmlFor={scope.scope}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {scope.scope}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {scope.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                {t("apiKeys.createDialog.cancel")}
              </Button>
              <Button onClick={handleCreateKey} disabled={creating}>
                {creating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {t("apiKeys.createDialog.submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* New Key Dialog */}
      <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("apiKeys.newKeyDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("apiKeys.newKeyDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Input
                type={showKey ? "text" : "password"}
                value={newKey || ""}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={showKey ? t("apiKeys.newKeyDialog.hideKey") : t("apiKeys.newKeyDialog.showKey")}
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("apiKeys.newKeyDialog.copyKey")}
                onClick={() => newKey && copyToClipboard(newKey)}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.rich("apiKeys.newKeyDialog.authHeaderNote", {
                header: () => <code className="bg-muted px-1 rounded">Authorization</code>,
              })}
            </p>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
              Authorization: Bearer {newKey?.substring(0, 12)}...
            </pre>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setNewKeyDialogOpen(false);
                setNewKey(null);
                setShowKey(false);
              }}
            >
              {t("apiKeys.newKeyDialog.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys.table.activeKeysTitle")}</CardTitle>
          <CardDescription>
            {t("apiKeys.table.activeKeysCount", { count: apiKeys.filter((k) => k.isActive).length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("apiKeys.table.name")}</TableHead>
                <TableHead>{t("apiKeys.table.key")}</TableHead>
                <TableHead>{t("apiKeys.table.scopes")}</TableHead>
                <TableHead>{t("apiKeys.table.lastUsed")}</TableHead>
                <TableHead>{t("apiKeys.table.expires")}</TableHead>
                <TableHead>{t("apiKeys.table.status")}</TableHead>
                <TableHead className="text-right">{t("apiKeys.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Key className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">{t("apiKeys.table.emptyTitle")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("apiKeys.table.emptyDescription")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {key.keyPrefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {key.scopes.slice(0, 3).map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                        {key.scopes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            {t("apiKeys.table.moreScopes", { count: key.scopes.length - 3 })}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.lastUsedAt ? (
                        <span className="text-sm">
                          {format(new Date(key.lastUsedAt), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t("apiKeys.table.never")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {key.expiresAt ? (
                        <span className="text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(key.expiresAt), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t("apiKeys.table.never")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {key.isActive ? (
                        <Badge className="bg-success/10 text-success hover:bg-success/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t("apiKeys.table.active")}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          {key.revokedAt ? t("apiKeys.table.revoked") : t("apiKeys.table.expired")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {key.isActive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={t("apiKeys.revoke.ariaLabel")}>
                              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("apiKeys.revoke.title")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("apiKeys.revoke.description")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("apiKeys.revoke.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevokeKey(key.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t("apiKeys.revoke.confirm")}
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

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys.quickStart.title")}</CardTitle>
          <CardDescription>
            {t("apiKeys.quickStart.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">{t("apiKeys.quickStart.baseUrl")}</h4>
            <pre className="bg-muted p-3 rounded-md text-sm">
              {typeof window !== "undefined" ? window.location.origin : ""}/api/v1
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">{t("apiKeys.quickStart.authentication")}</h4>
            <p className="text-sm text-muted-foreground mb-2">
              {t("apiKeys.quickStart.authNote")}
            </p>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`curl -X GET "${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/crm/contacts" \\
  -H "Authorization: Bearer oik_your_api_key_here" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">{t("apiKeys.quickStart.availableEndpoints")}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted p-2 rounded">
                <code>/api/v1/calendar/events</code>
              </div>
              <div className="bg-muted p-2 rounded">
                <code>/api/v1/crm/contacts</code>
              </div>
              <div className="bg-muted p-2 rounded">
                <code>/api/v1/crm/tasks</code>
              </div>
              <div className="bg-muted p-2 rounded">
                <code>/api/v1/mls/properties</code>
              </div>
              <div className="bg-muted p-2 rounded">
                <code>/api/v1/documents</code>
              </div>
              <div className="bg-muted p-2 rounded">
                <code>/api/v1/webhooks</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
