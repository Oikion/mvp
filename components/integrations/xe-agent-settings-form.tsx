"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Globe,
  AlertCircle,
  CheckCircle2,
  Plus,
  ExternalLink,
} from "lucide-react";
import {
  getMyXeAgentSettings,
  saveMyXeAgentSettings,
  getXeIntegrationStatus,
} from "@/actions/xe";
import type { XePublicationType } from "@prisma/client";

// Form schema
const formSchema = z.object({
  xeOwnerId: z.string().min(1, "XE Owner ID is required"),
  majorPhone: z.string().min(1, "Phone number is required"),
  otherPhones: z.string().optional(),
  isActive: z.boolean().default(true),
  autoPublish: z.boolean().default(true),
  publicationType: z.enum(["BASIC", "GOLD"]).default("BASIC"),
});

type FormValues = z.infer<typeof formSchema>;

export function XEAgentSettingsForm() {
  const locale = useLocale() as "en" | "el";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrationConfigured, setIntegrationConfigured] = useState(false);
  const [hasExistingSettings, setHasExistingSettings] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      xeOwnerId: "",
      majorPhone: "",
      otherPhones: "",
      isActive: true,
      autoPublish: true,
      publicationType: "BASIC",
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusResult, settingsResult] = await Promise.all([
        getXeIntegrationStatus(),
        getMyXeAgentSettings(),
      ]);

      if (statusResult.success && statusResult.data) {
        setIntegrationConfigured(statusResult.data.isConfigured && statusResult.data.isActive);
      }

      if (settingsResult.success && settingsResult.data) {
        setHasExistingSettings(true);
        form.reset({
          xeOwnerId: settingsResult.data.xeOwnerId,
          majorPhone: settingsResult.data.majorPhone,
          otherPhones: settingsResult.data.otherPhones.join(", "),
          isActive: settingsResult.data.isActive,
          autoPublish: settingsResult.data.autoPublish,
          publicationType: settingsResult.data.publicationType,
        });
      }
    } catch (error) {
      console.error("Failed to load XE settings:", error);
      toast.error(
        locale === "el"
          ? "Αποτυχία φόρτωσης ρυθμίσεων"
          : "Failed to load settings"
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      // Parse other phones from comma-separated string
      const otherPhones = data.otherPhones
        ? data.otherPhones
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
        : [];

      const result = await saveMyXeAgentSettings({
        xeOwnerId: data.xeOwnerId,
        majorPhone: data.majorPhone,
        otherPhones,
        isActive: data.isActive,
        autoPublish: data.autoPublish,
        publicationType: data.publicationType as XePublicationType,
      });

      if (result.success) {
        setHasExistingSettings(true);
        toast.success(
          locale === "el"
            ? "Οι ρυθμίσεις XE.gr αποθηκεύτηκαν"
            : "XE.gr settings saved"
        );
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία αποθήκευσης"
          : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  // Not configured state
  if (!loading && !integrationConfigured) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {locale === "el" ? "Δημοσίευση XE.gr" : "XE.gr Publishing"}
              </CardTitle>
              <CardDescription>
                {locale === "el"
                  ? "Ρύθμιση των διαπιστευτηρίων σας για δημοσίευση στο XE.gr"
                  : "Configure your XE.gr publishing credentials"}
              </CardDescription>
            </div>
            <Button asChild>
              <a href="/app/admin/xe-integration" target="_blank" rel="noopener noreferrer">
                <Plus className="h-4 w-4 mr-2" />
                {locale === "el" ? "Ρύθμιση Ενσωμάτωσης" : "Configure Integration"}
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-warning mb-2" />
            <h4 className="font-medium">
              {locale === "el"
                ? "Η ενσωμάτωση XE.gr δεν έχει ρυθμιστεί"
                : "XE.gr integration not configured"}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {locale === "el"
                ? "Ο διαχειριστής του οργανισμού σας πρέπει πρώτα να ρυθμίσει την ενσωμάτωση XE.gr"
                : "Your organization admin must first configure XE.gr integration"}
            </p>
            <Button variant="outline" asChild>
              <a href="https://www.xe.gr/property/developers" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {locale === "el" ? "Μάθετε Περισσότερα" : "Learn More"}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Setup mode - show button to add credentials when none exist
  if (!loading && !hasExistingSettings && !showForm) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {locale === "el" ? "Δημοσίευση XE.gr" : "XE.gr Publishing"}
              </CardTitle>
              <CardDescription>
                {locale === "el"
                  ? "Ρύθμιση των διαπιστευτηρίων σας για δημοσίευση στο XE.gr"
                  : "Configure your XE.gr publishing credentials"}
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {locale === "el" ? "Προσθήκη Διαπιστευτηρίων" : "Add Credentials"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <h4 className="font-medium">
              {locale === "el"
                ? "Δεν έχουν ρυθμιστεί διαπιστευτήρια"
                : "No credentials configured"}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {locale === "el"
                ? "Προσθέστε τα διαπιστευτήριά σας XE.gr για να ξεκινήσετε τη δημοσίευση ακινήτων"
                : "Add your XE.gr credentials to start publishing properties"}
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {locale === "el" ? "Προσθήκη Διαπιστευτηρίων" : "Add Credentials"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {locale === "el" ? "Δημοσίευση XE.gr" : "XE.gr Publishing"}
            </CardTitle>
            <CardDescription>
              {locale === "el"
                ? "Ρύθμιση των διαπιστευτηρίων σας για δημοσίευση στο XE.gr"
                : "Configure your XE.gr publishing credentials"}
            </CardDescription>
          </div>
          {hasExistingSettings && (
            <CheckCircle2 className="h-5 w-5 text-success" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="xeOwnerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>XE Owner ID</FormLabel>
                    <FormControl>
                      <Input placeholder="xe_owner_id" {...field} />
                    </FormControl>
                    <FormDescription>
                      {locale === "el"
                        ? "Το Item.ownerId σας από το xe.gr"
                        : "Your Item.ownerId from xe.gr"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="majorPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {locale === "el" ? "Κύριο Τηλέφωνο" : "Primary Phone"}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+30 210 1234567" {...field} />
                    </FormControl>
                    <FormDescription>
                      {locale === "el"
                        ? "Πιστοποιημένο τηλέφωνο για αγγελίες"
                        : "Certified phone for listings"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="otherPhones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {locale === "el" ? "Επιπλέον Τηλέφωνα" : "Additional Phones"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+30 210 1234567, +30 697 1234567"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {locale === "el"
                        ? "Διαχωρίστε με κόμμα (προαιρετικό)"
                        : "Comma-separated (optional)"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publicationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {locale === "el" ? "Τύπος Δημοσίευσης" : "Publication Type"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BASIC">BASIC</SelectItem>
                        <SelectItem value="GOLD">GOLD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>
                          {locale === "el" ? "Ενεργό" : "Active"}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {locale === "el"
                            ? "Ενεργοποίηση δημοσίευσης"
                            : "Enable publishing"}
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

                <FormField
                  control={form.control}
                  name="autoPublish"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>
                          {locale === "el" ? "Αυτόματη Δημοσίευση" : "Auto-Publish"}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {locale === "el"
                            ? "Αυτόματη δημοσίευση νέων αγγελιών"
                            : "Automatically publish new listings"}
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
              </div>

              <div className="flex justify-end gap-2 pt-4">
                {!hasExistingSettings && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={saving}
                  >
                    {locale === "el" ? "Ακύρωση" : "Cancel"}
                  </Button>
                )}
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {hasExistingSettings
                    ? (locale === "el" ? "Ενημέρωση" : "Update Settings")
                    : (locale === "el" ? "Αποθήκευση" : "Save Credentials")}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
