"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Settings, 
  Shield, 
  Zap, 
  Gauge, 
  Plug,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface SystemSetting {
  name: string;
  displayName: string;
  description: string;
  category: string;
  sensitive: boolean;
  id: string | null;
  value: string;
  hasValue: boolean;
  displayValue: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  security: Shield,
  features: Zap,
  limits: Gauge,
  integrations: Plug,
};

export default function PlatformAdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [grouped, setGrouped] = useState<Record<string, SystemSetting[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  // Edit dialog state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/platform-admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      
      const data = await res.json();
      setSettings(data.settings || []);
      setCategories(data.categories || []);
      setGrouped(data.grouped || {});
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (setting: SystemSetting) => {
    setEditingKey(setting.name);
    setEditValue(setting.sensitive ? "" : setting.value);
    setShowValue(false);
    setDialogOpen(true);
  };

  const saveSetting = async () => {
    if (!editingKey) return;
    
    setSaving(editingKey);
    try {
      const res = await fetch("/api/platform-admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingKey,
          value: editValue
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save setting");
      }

      const data = await res.json();
      
      // Update local state
      setSettings(prev => prev.map(s => 
        s.name === editingKey ? data.setting : s
      ));
      
      // Update grouped state
      setGrouped(prev => {
        const newGrouped = { ...prev };
        for (const cat of Object.keys(newGrouped)) {
          newGrouped[cat] = newGrouped[cat].map(s =>
            s.name === editingKey ? data.setting : s
          );
        }
        return newGrouped;
      });

      toast.success("Setting saved successfully");
      setDialogOpen(false);
      setEditingKey(null);
      setEditValue("");
    } catch (error) {
      console.error("Failed to save setting:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save setting");
    } finally {
      setSaving(null);
    }
  };

  const resetSetting = async (name: string) => {
    setSaving(name);
    try {
      const res = await fetch(`/api/platform-admin/settings?name=${name}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to reset setting");

      // Reload settings
      await loadSettings();
      toast.success("Setting has been reset");
    } catch (error) {
      console.error("Failed to reset setting:", error);
      toast.error("Failed to reset setting");
    } finally {
      setSaving(null);
    }
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    setEditValue(secret);
    toast.success("Generated new secret");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getCurrentSetting = () => {
    return settings.find(s => s.name === editingKey);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Settings className="h-8 w-8 mr-2" />
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Manage environment variables and system configuration
          </p>
        </div>
        <Button variant="outline" onClick={loadSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/10 border-primary/30 dark:bg-primary/20 dark:border-primary/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-primary dark:text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary dark:text-blue-200">
                Settings Priority
              </p>
              <p className="text-primary dark:text-blue-300 mt-1">
                Database values take priority over environment variables. If a setting is not configured
                here, the system will fall back to the corresponding environment variable (if set).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue={categories[0]?.id || "security"}>
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.id] || Settings;
            return (
              <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {category.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id}>
            <Card>
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(grouped[category.id] || []).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No settings in this category
                  </p>
                ) : (
                  (grouped[category.id] || []).map((setting) => (
                    <div 
                      key={setting.name}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{setting.displayName}</p>
                          {setting.sensitive && (
                            <Badge variant="secondary">Sensitive</Badge>
                          )}
                          {setting.hasValue ? (
                            <Badge variant="default" className="bg-success/10 text-success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Configured
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Set</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {setting.description}
                        </p>
                        {setting.hasValue && (
                          <p className="text-xs font-mono text-muted-foreground mt-2 bg-muted/50 px-2 py-1 rounded inline-block">
                            {setting.displayValue}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(setting)}
                        >
                          {setting.hasValue ? "Edit" : "Set"}
                        </Button>
                        {setting.hasValue && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => resetSetting(setting.name)}
                            disabled={saving === setting.name}
                          >
                            {saving === setting.name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getCurrentSetting()?.hasValue ? "Edit" : "Set"} {getCurrentSetting()?.displayName}
            </DialogTitle>
            <DialogDescription>
              {getCurrentSetting()?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="value"
                    type={getCurrentSetting()?.sensitive && !showValue ? "password" : "text"}
                    placeholder={getCurrentSetting()?.sensitive ? "Enter new value" : "Value"}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="pr-10"
                  />
                  {getCurrentSetting()?.sensitive && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowValue(!showValue)}
                    >
                      {showValue ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {editValue && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(editValue)}
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {getCurrentSetting()?.sensitive && getCurrentSetting()?.hasValue && (
                <p className="text-xs text-muted-foreground">
                  Current value is hidden. Enter a new value to update, or leave empty to keep current.
                </p>
              )}
            </div>

            {/* Quick actions for specific settings */}
            {editingKey === "cron_secret" && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={generateSecret}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Random Secret
                </Button>
              </div>
            )}

            {editingKey === "market_intel_enabled" && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={editValue === "true" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditValue("true")}
                >
                  Enabled
                </Button>
                <Button
                  type="button"
                  variant={editValue === "false" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditValue("false")}
                >
                  Disabled
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveSetting} 
              disabled={saving === editingKey}
            >
              {saving === editingKey ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
