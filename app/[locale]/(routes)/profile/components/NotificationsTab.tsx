"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Mail,
  MessageSquare,
  Users,
  Calendar,
  CheckSquare,
  Handshake,
  FileText,
  Settings,
  Loader2,
  Save,
} from "lucide-react";

interface NotificationSettings {
  id: string;
  socialEmailEnabled: boolean;
  socialInAppEnabled: boolean;
  crmEmailEnabled: boolean;
  crmInAppEnabled: boolean;
  calendarEmailEnabled: boolean;
  calendarInAppEnabled: boolean;
  tasksEmailEnabled: boolean;
  tasksInAppEnabled: boolean;
  dealsEmailEnabled: boolean;
  dealsInAppEnabled: boolean;
  documentsEmailEnabled: boolean;
  documentsInAppEnabled: boolean;
  systemEmailEnabled: boolean;
  systemInAppEnabled: boolean;
}

interface NotificationGroup {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  emailKey: keyof NotificationSettings;
  inAppKey: keyof NotificationSettings;
  color: string;
}

const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    id: "social",
    title: "Social",
    description: "Posts, comments, likes, and mentions",
    icon: <MessageSquare className="h-5 w-5" />,
    emailKey: "socialEmailEnabled",
    inAppKey: "socialInAppEnabled",
    color: "text-blue-600 bg-blue-500/10",
  },
  {
    id: "crm",
    title: "CRM",
    description: "Client & property updates and assignments",
    icon: <Users className="h-5 w-5" />,
    emailKey: "crmEmailEnabled",
    inAppKey: "crmInAppEnabled",
    color: "text-green-600 bg-green-500/10",
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Event reminders and invitations",
    icon: <Calendar className="h-5 w-5" />,
    emailKey: "calendarEmailEnabled",
    inAppKey: "calendarInAppEnabled",
    color: "text-purple-600 bg-purple-500/10",
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Task assignments, comments, and due dates",
    icon: <CheckSquare className="h-5 w-5" />,
    emailKey: "tasksEmailEnabled",
    inAppKey: "tasksInAppEnabled",
    color: "text-orange-600 bg-orange-500/10",
  },
  {
    id: "deals",
    title: "Deals",
    description: "Deal proposals and status changes",
    icon: <Handshake className="h-5 w-5" />,
    emailKey: "dealsEmailEnabled",
    inAppKey: "dealsInAppEnabled",
    color: "text-emerald-600 bg-emerald-500/10",
  },
  {
    id: "documents",
    title: "Documents",
    description: "Document shares and view notifications",
    icon: <FileText className="h-5 w-5" />,
    emailKey: "documentsEmailEnabled",
    inAppKey: "documentsInAppEnabled",
    color: "text-amber-600 bg-amber-500/10",
  },
  {
    id: "system",
    title: "System",
    description: "Account and administrative notifications",
    icon: <Settings className="h-5 w-5" />,
    emailKey: "systemEmailEnabled",
    inAppKey: "systemInAppEnabled",
    color: "text-gray-600 bg-gray-500/10",
  },
];

export function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] =
    useState<NotificationSettings | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/user/notification-settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data);
      setOriginalSettings(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load notification settings.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Check if there are changes
    const hasAnyChanges = NOTIFICATION_GROUPS.some(
      (group) =>
        newSettings[group.emailKey] !== originalSettings?.[group.emailKey] ||
        newSettings[group.inAppKey] !== originalSettings?.[group.inAppKey]
    );
    setHasChanges(hasAnyChanges);
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/notification-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      const data = await response.json();
      setSettings(data);
      setOriginalSettings(data);
      setHasChanges(false);

      toast({
        variant: "success",
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });

      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save notification settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAllEmail = (enabled: boolean) => {
    if (!settings) return;

    const newSettings = { ...settings };
    NOTIFICATION_GROUPS.forEach((group) => {
      (newSettings[group.emailKey] as boolean) = enabled;
    });
    setSettings(newSettings);
    setHasChanges(true);
  };

  const handleToggleAllInApp = (enabled: boolean) => {
    if (!settings) return;

    const newSettings = { ...settings };
    NOTIFICATION_GROUPS.forEach((group) => {
      (newSettings[group.inAppKey] as boolean) = enabled;
    });
    setSettings(newSettings);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load notification settings. Please refresh the page.
        </CardContent>
      </Card>
    );
  }

  const allEmailEnabled = NOTIFICATION_GROUPS.every(
    (g) => settings[g.emailKey]
  );
  const allInAppEnabled = NOTIFICATION_GROUPS.every(
    (g) => settings[g.inAppKey]
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about activity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Master toggles */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">All Email</span>
                <Switch
                  checked={allEmailEnabled}
                  onCheckedChange={(checked) => handleToggleAllEmail(checked)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">All In-App</span>
                <Switch
                  checked={allInAppEnabled}
                  onCheckedChange={(checked) => handleToggleAllInApp(checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Groups */}
      <div className="grid gap-4">
        {NOTIFICATION_GROUPS.map((group) => (
          <Card key={group.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${group.color}`}>
                    {group.icon}
                  </div>
                  <div>
                    <h4 className="font-medium">{group.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${group.id}-email`}
                      className="text-sm text-muted-foreground"
                    >
                      <Mail className="h-4 w-4" />
                    </Label>
                    <Switch
                      id={`${group.id}-email`}
                      checked={settings[group.emailKey] as boolean}
                      onCheckedChange={(checked) =>
                        handleToggle(group.emailKey, checked)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${group.id}-inapp`}
                      className="text-sm text-muted-foreground"
                    >
                      <Bell className="h-4 w-4" />
                    </Label>
                    <Switch
                      id={`${group.id}-inapp`}
                      checked={settings[group.inAppKey] as boolean}
                      onCheckedChange={(checked) =>
                        handleToggle(group.inAppKey, checked)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="shadow-lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}



