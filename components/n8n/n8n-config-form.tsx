"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { toast } from "sonner";
import {
  Loader2,
  Settings,
  Trash2,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  saveN8nConfig,
  deleteN8nConfig,
  testN8nConnection,
  type N8nConfigData,
} from "@/actions/n8n";

// Form schema
const formSchema = z.object({
  baseUrl: z.string().url("Must be a valid URL").min(1, "Base URL is required"),
  webhookSecret: z.string().min(8, "Webhook secret must be at least 8 characters"),
  isActive: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface N8nConfigFormProps {
  config: N8nConfigData | null;
  onSave?: () => void;
}

export function N8nConfigForm({ config, onSave }: N8nConfigFormProps) {
  const locale = useLocale() as "en" | "el";
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseUrl: config?.baseUrl ?? "",
      webhookSecret: config?.webhookSecret ?? "",
      isActive: config?.isActive ?? false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      const result = await saveN8nConfig({
        baseUrl: data.baseUrl,
        webhookSecret: data.webhookSecret,
        isActive: data.isActive,
      });

      if (result.success) {
        toast.success(
          locale === "el"
            ? "Η διαμόρφωση n8n αποθηκεύτηκε"
            : "n8n configuration saved"
        );
        onSave?.();
      } else {
        toast.error(result.error || "Failed to save configuration");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία αποθήκευσης"
          : "Failed to save configuration"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const baseUrl = form.getValues("baseUrl");
    if (!baseUrl) {
      toast.error(
        locale === "el"
          ? "Παρακαλώ εισάγετε τη διεύθυνση URL"
          : "Please enter the base URL first"
      );
      return;
    }

    // First save the config
    setSaving(true);
    const saveResult = await saveN8nConfig({
      baseUrl,
      webhookSecret: form.getValues("webhookSecret"),
      isActive: form.getValues("isActive"),
    });

    if (!saveResult.success) {
      setSaving(false);
      toast.error(saveResult.error || "Failed to save configuration");
      return;
    }
    setSaving(false);

    // Then test the connection
    setTesting(true);
    try {
      const result = await testN8nConnection();

      if (result.success && result.data) {
        toast.success(
          locale === "el"
            ? `Σύνδεση επιτυχής! Βρέθηκαν ${result.data.workflowCount} ροές εργασίας`
            : `Connection successful! Found ${result.data.workflowCount} workflows`
        );
        onSave?.();
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία σύνδεσης"
          : "Connection test failed"
      );
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteN8nConfig();

      if (result.success) {
        toast.success(
          locale === "el"
            ? "Η διαμόρφωση n8n διαγράφηκε"
            : "n8n configuration deleted"
        );
        form.reset({
          baseUrl: "",
          webhookSecret: "",
          isActive: false,
        });
        onSave?.();
      } else {
        toast.error(result.error || "Failed to delete configuration");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία διαγραφής"
          : "Failed to delete configuration"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {locale === "el" ? "Ρυθμίσεις Σύνδεσης" : "Connection Settings"}
        </CardTitle>
        <CardDescription>
          {locale === "el"
            ? "Διαμόρφωση της σύνδεσης με το n8n instance του οργανισμού σας"
            : "Configure the connection to your organization's n8n instance"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {locale === "el" ? "Διεύθυνση URL" : "Base URL"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://n8n.example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {locale === "el"
                      ? "Η διεύθυνση του n8n instance σας (π.χ. https://n8n.example.com)"
                      : "The URL of your n8n instance (e.g. https://n8n.example.com)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webhookSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {locale === "el" ? "Webhook Secret" : "Webhook Secret"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {locale === "el"
                      ? "Μυστικό κλειδί για την επαλήθευση webhooks από το n8n"
                      : "Secret key to verify webhooks from n8n"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>
                      {locale === "el" ? "Ενεργοποίηση Ενσωμάτωσης" : "Enable Integration"}
                    </FormLabel>
                    <FormDescription className="text-xs">
                      {locale === "el"
                        ? "Επιτρέψτε στα μέλη του οργανισμού να χρησιμοποιούν ροές εργασίας n8n"
                        : "Allow organization members to use n8n workflows"}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Health Status */}
            {config && (
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {locale === "el" ? "Κατάσταση Σύνδεσης" : "Connection Status"}
                    </p>
                    {config.lastHealthCheck && (
                      <p className="text-xs text-muted-foreground">
                        {locale === "el" ? "Τελευταίος έλεγχος:" : "Last check:"}{" "}
                        {new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(config.lastHealthCheck))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {config.lastHealthStatus === "healthy" ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : config.lastHealthStatus === "error" ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : null}
                    <span className="text-sm capitalize">
                      {config.lastHealthStatus || (locale === "el" ? "Άγνωστο" : "Unknown")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4">
              <Button type="submit" disabled={saving || testing}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {locale === "el" ? "Αποθήκευση" : "Save Settings"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={saving || testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {locale === "el" ? "Δοκιμή Σύνδεσης" : "Test Connection"}
              </Button>

              {config && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {locale === "el" ? "Διαγραφή" : "Delete"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {locale === "el"
                          ? "Διαγραφή Διαμόρφωσης n8n"
                          : "Delete n8n Configuration"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {locale === "el"
                          ? "Αυτή η ενέργεια θα διαγράψει τη διαμόρφωση n8n και όλες τις αναθέσεις ροών εργασίας. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
                          : "This will delete the n8n configuration and all workflow assignments. This action cannot be undone."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {locale === "el" ? "Ακύρωση" : "Cancel"}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {locale === "el" ? "Διαγραφή" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
