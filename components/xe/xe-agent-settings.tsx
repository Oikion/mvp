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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  UserCircle,
  Phone,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  getXeAgentSettings,
  saveXeAgentSettings,
  deleteXeAgentSettings,
} from "@/actions/xe";
import type { XePublicationType } from "@prisma/client";

// ============================================
// FORM SCHEMA
// ============================================

const agentSettingsSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  xeOwnerId: z.string().min(1, "XE Owner ID is required"),
  majorPhone: z.string().min(1, "Phone number is required"),
  otherPhones: z.string().optional(),
  isActive: z.boolean().default(true),
  autoPublish: z.boolean().default(true),
  publicationType: z.enum(["BASIC", "GOLD"]).default("BASIC"),
});

type AgentSettingsFormValues = z.infer<typeof agentSettingsSchema>;

// ============================================
// COMPONENT PROPS
// ============================================

interface XeAgentSettingsTableProps {
  onUpdate: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function XeAgentSettingsTable({ onUpdate }: XeAgentSettingsTableProps) {
  const locale = useLocale() as "en" | "el";
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<
    Array<{
      id: string;
      agentId: string;
      xeOwnerId: string;
      majorPhone: string;
      otherPhones: string[];
      isActive: boolean;
      autoPublish: boolean;
      publicationType: XePublicationType;
      createdAt: Date;
      updatedAt: Date;
    }>
  >([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<AgentSettingsFormValues>({
    resolver: zodResolver(agentSettingsSchema),
    defaultValues: {
      agentId: "",
      xeOwnerId: "",
      majorPhone: "",
      otherPhones: "",
      isActive: true,
      autoPublish: true,
      publicationType: "BASIC",
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getXeAgentSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error("Failed to load agent settings:", error);
      toast.error(
        locale === "el"
          ? "Αποτυχία φόρτωσης ρυθμίσεων"
          : "Failed to load settings"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (setting?: (typeof settings)[0]) => {
    if (setting) {
      setEditingId(setting.id);
      form.reset({
        agentId: setting.agentId,
        xeOwnerId: setting.xeOwnerId,
        majorPhone: setting.majorPhone,
        otherPhones: setting.otherPhones.join(", "),
        isActive: setting.isActive,
        autoPublish: setting.autoPublish,
        publicationType: setting.publicationType,
      });
    } else {
      setEditingId(null);
      form.reset({
        agentId: "",
        xeOwnerId: "",
        majorPhone: "",
        otherPhones: "",
        isActive: true,
        autoPublish: true,
        publicationType: "BASIC",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    form.reset();
  };

  async function onSubmit(data: AgentSettingsFormValues) {
    setIsSaving(true);
    try {
      // Parse other phones from comma-separated string
      const otherPhones = data.otherPhones
        ? data.otherPhones
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
        : [];

      const result = await saveXeAgentSettings({
        agentId: data.agentId,
        xeOwnerId: data.xeOwnerId,
        majorPhone: data.majorPhone,
        otherPhones,
        isActive: data.isActive,
        autoPublish: data.autoPublish,
        publicationType: data.publicationType,
      });

      if (result.success) {
        toast.success(
          locale === "el"
            ? "Οι ρυθμίσεις αποθηκεύτηκαν"
            : "Settings saved"
        );
        handleCloseDialog();
        loadSettings();
        onUpdate();
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία αποθήκευσης"
          : "Failed to save"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(agentId: string) {
    try {
      const result = await deleteXeAgentSettings(agentId);

      if (result.success) {
        toast.success(
          locale === "el"
            ? "Διαγράφηκε επιτυχώς"
            : "Deleted successfully"
        );
        loadSettings();
        onUpdate();
      } else {
        toast.error(result.error || "Failed to delete");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία διαγραφής"
          : "Failed to delete"
      );
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>
            {locale === "el" ? "Ρυθμίσεις Πρακτόρων" : "Agent Settings"}
          </CardTitle>
          <CardDescription>
            {locale === "el"
              ? "Διαχείριση διαπιστευτηρίων XE για κάθε πράκτορα"
              : "Manage XE credentials for each agent"}
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {locale === "el" ? "Προσθήκη Πράκτορα" : "Add Agent"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId
                  ? locale === "el"
                    ? "Επεξεργασία Πράκτορα"
                    : "Edit Agent"
                  : locale === "el"
                    ? "Νέος Πράκτορας"
                    : "New Agent"}
              </DialogTitle>
              <DialogDescription>
                {locale === "el"
                  ? "Προσθέστε τα στοιχεία XE του πράκτορα για δημοσίευση ακινήτων"
                  : "Add the agent's XE details for property publishing"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="agentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {locale === "el" ? "ID Πράκτορα (Clerk)" : "Agent ID (Clerk)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="user_..."
                          {...field}
                          disabled={!!editingId}
                        />
                      </FormControl>
                      <FormDescription>
                        {locale === "el"
                          ? "Το Clerk User ID του πράκτορα"
                          : "The agent's Clerk User ID"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          ? "Το Item.ownerId από το xe.gr"
                          : "The Item.ownerId from xe.gr"}
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
                          : "Separate with commas (optional)"}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            {locale === "el" ? "Ενεργός" : "Active"}
                          </FormLabel>
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                  >
                    {locale === "el" ? "Ακύρωση" : "Cancel"}
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {locale === "el" ? "Αποθήκευση" : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : settings.length === 0 ? (
          <div className="text-center py-8">
            <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {locale === "el"
                ? "Δεν υπάρχουν ρυθμίσεις πρακτόρων"
                : "No agent settings configured"}
            </p>
            <p className="text-sm text-muted-foreground">
              {locale === "el"
                ? "Προσθέστε πράκτορες για να ενεργοποιήσετε τη δημοσίευση"
                : "Add agents to enable property publishing"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "el" ? "Πράκτορας" : "Agent"}</TableHead>
                <TableHead>XE Owner ID</TableHead>
                <TableHead>{locale === "el" ? "Τηλέφωνο" : "Phone"}</TableHead>
                <TableHead>{locale === "el" ? "Τύπος" : "Type"}</TableHead>
                <TableHead>{locale === "el" ? "Κατάσταση" : "Status"}</TableHead>
                <TableHead className="text-right">
                  {locale === "el" ? "Ενέργειες" : "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell className="font-mono text-sm">
                    {setting.agentId.slice(0, 12)}...
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {setting.xeOwnerId}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{setting.majorPhone}</span>
                      {setting.otherPhones.length > 0 && (
                        <Badge variant="outline" className="text-xs ml-1">
                          +{setting.otherPhones.length}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={setting.publicationType === "GOLD" ? "default" : "secondary"}>
                      {setting.publicationType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {setting.isActive ? (
                      <Badge className="bg-success/10 text-success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {locale === "el" ? "Ενεργός" : "Active"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        {locale === "el" ? "Ανενεργός" : "Inactive"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(setting)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {locale === "el"
                                ? "Διαγραφή Ρυθμίσεων Πράκτορα"
                                : "Delete Agent Settings"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {locale === "el"
                                ? "Είστε σίγουροι ότι θέλετε να διαγράψετε τις ρυθμίσεις; Τα ακίνητα αυτού του πράκτορα δεν θα μπορούν να δημοσιευτούν."
                                : "Are you sure you want to delete these settings? This agent's properties won't be publishable."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {locale === "el" ? "Ακύρωση" : "Cancel"}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(setting.agentId)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              {locale === "el" ? "Διαγραφή" : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
