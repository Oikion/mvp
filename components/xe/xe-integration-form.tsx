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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Save, Trash2, Eye, EyeOff } from "lucide-react";
import { saveXeIntegration, deleteXeIntegration } from "@/actions/xe";
import type { XePublicationType } from "@prisma/client";

// ============================================
// FORM SCHEMA
// ============================================

const xeIntegrationSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  authToken: z.string().min(1, "Auth token is required"),
  agentId: z.string().min(1, "Agent ID is required"),
  isActive: z.boolean().default(false),
  autoPublish: z.boolean().default(false),
  publicationType: z.enum(["BASIC", "GOLD"]).default("BASIC"),
  trademark: z.string().optional(),
});

type XeIntegrationFormValues = z.infer<typeof xeIntegrationSchema>;

// ============================================
// COMPONENT PROPS
// ============================================

interface XeIntegrationFormProps {
  integration: {
    id: string;
    username: string;
    authToken: string;
    agentId: string;
    isActive: boolean;
    autoPublish: boolean;
    publicationType: XePublicationType;
    trademark: string | null;
    lastSyncAt: Date | null;
    lastPackageId: string | null;
  } | null;
  onSave: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function XeIntegrationForm({ integration, onSave }: XeIntegrationFormProps) {
  const locale = useLocale() as "en" | "el";
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);

  const form = useForm<XeIntegrationFormValues>({
    resolver: zodResolver(xeIntegrationSchema),
    defaultValues: {
      username: integration?.username || "",
      password: "", // Don't pre-fill password
      authToken: integration?.authToken || "",
      agentId: integration?.agentId || "",
      isActive: integration?.isActive || false,
      autoPublish: integration?.autoPublish || false,
      publicationType: integration?.publicationType || "BASIC",
      trademark: integration?.trademark || "",
    },
  });

  async function onSubmit(data: XeIntegrationFormValues) {
    setIsSaving(true);
    try {
      const result = await saveXeIntegration({
        username: data.username,
        password: data.password,
        authToken: data.authToken,
        agentId: data.agentId,
        isActive: data.isActive,
        autoPublish: data.autoPublish,
        publicationType: data.publicationType,
        trademark: data.trademark || undefined,
      });

      if (result.success) {
        toast.success(
          locale === "el"
            ? "Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς"
            : "Settings saved successfully"
        );
        onSave();
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία αποθήκευσης ρυθμίσεων"
          : "Failed to save settings"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteXeIntegration();

      if (result.success) {
        toast.success(
          locale === "el"
            ? "Η ενσωμάτωση διαγράφηκε"
            : "Integration deleted"
        );
        onSave();
      } else {
        toast.error(result.error || "Failed to delete integration");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία διαγραφής ενσωμάτωσης"
          : "Failed to delete integration"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {locale === "el" ? "Διαπιστευτήρια xe.gr" : "xe.gr Credentials"}
        </CardTitle>
        <CardDescription>
          {locale === "el"
            ? "Εισάγετε τα διαπιστευτήρια σύνδεσης του Bulk Import Tool (BIT) API"
            : "Enter your Bulk Import Tool (BIT) API credentials"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Credentials Section */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {locale === "el" ? "Όνομα χρήστη" : "Username"}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="xe_username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {locale === "el" ? "Κωδικός πρόσβασης" : "Password"}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={integration ? "••••••••" : ""}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {integration
                        ? locale === "el"
                          ? "Αφήστε κενό για να διατηρήσετε τον υπάρχοντα κωδικό"
                          : "Leave empty to keep existing password"
                        : ""}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="authToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth Token</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showAuthToken ? "text" : "password"}
                          placeholder="xeAuthToken..."
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                        >
                          {showAuthToken ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {locale === "el"
                        ? "Το xeAuthToken παρέχεται από το xe.gr"
                        : "The xeAuthToken provided by xe.gr"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {locale === "el" ? "ID Πράκτορα/Καταστήματος" : "Agent/Store ID"}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="agent_id" {...field} />
                    </FormControl>
                    <FormDescription>
                      {locale === "el"
                        ? "Το ID του καταστήματος στο xe.gr"
                        : "Your store ID on xe.gr"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Configuration Section */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-medium">
                {locale === "el" ? "Ρυθμίσεις Δημοσίευσης" : "Publishing Settings"}
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="publicationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {locale === "el" ? "Τύπος Δημοσίευσης" : "Publication Type"}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BASIC">
                            BASIC - {locale === "el" ? "Βασικό" : "Standard"}
                          </SelectItem>
                          <SelectItem value="GOLD">
                            GOLD - {locale === "el" ? "Προβεβλημένο" : "Featured"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {locale === "el"
                          ? "Προεπιλεγμένος τύπος για νέες δημοσιεύσεις"
                          : "Default type for new publications"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trademark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {locale === "el" ? "Trademark/Εμπορικό Σήμα" : "Trademark"}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="OIKION" {...field} />
                      </FormControl>
                      <FormDescription>
                        {locale === "el"
                          ? "Προαιρετικό - εμφανίζεται στις αγγελίες"
                          : "Optional - displayed on listings"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {locale === "el"
                            ? "Ενεργοποίηση Ενσωμάτωσης"
                            : "Enable Integration"}
                        </FormLabel>
                        <FormDescription>
                          {locale === "el"
                            ? "Επιτρέπει τη δημοσίευση ακινήτων στο xe.gr"
                            : "Allows publishing properties to xe.gr"}
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {locale === "el"
                            ? "Αυτόματη Δημοσίευση"
                            : "Auto-Publish"}
                        </FormLabel>
                        <FormDescription>
                          {locale === "el"
                            ? "Αυτόματη δημοσίευση νέων ακινήτων με ΔΗΜΟΣΙΑ ορατότητα"
                            : "Automatically publish new properties with PUBLIC visibility"}
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
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              {integration && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button" disabled={isDeleting}>
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {locale === "el" ? "Διαγραφή Ενσωμάτωσης" : "Delete Integration"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {locale === "el"
                          ? "Διαγραφή Ενσωμάτωσης xe.gr"
                          : "Delete xe.gr Integration"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {locale === "el"
                          ? "Αυτή η ενέργεια θα διαγράψει όλες τις ρυθμίσεις και το ιστορικό συγχρονισμού. Τα δημοσιευμένα ακίνητα θα παραμείνουν στο xe.gr έως ότου αφαιρεθούν χειροκίνητα."
                          : "This will delete all settings and sync history. Published properties will remain on xe.gr until manually removed."}
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

              <Button type="submit" disabled={isSaving} className="ml-auto">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {locale === "el" ? "Αποθήκευση" : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
