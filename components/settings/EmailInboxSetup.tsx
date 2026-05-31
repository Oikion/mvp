"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Plus, Trash2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  channelName: z.string().min(1, "Required").max(80),
  fromAddress: z.string().email("Enter a valid email address"),
  fromName: z.string().max(100).optional(),
  imapHost: z.string().min(1, "Required"),
  imapPort: z.coerce.number().int().min(1).max(65535).default(993),
  imapUseTLS: z.boolean().default(true),
  imapUser: z.string().min(1, "Required"),
  imapPassword: z.string().min(1, "Required"),
  smtpSendVia: z.enum(["RESEND_CUSTOM_DOMAIN", "SMTP_DIRECT"]),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EmailInbox {
  id: string;
  name: string;
  emailInbox: {
    fromAddress: string;
    fromName: string | null;
    imapHost: string;
    isActive: boolean;
    lastPolledAt: string | null;
  } | null;
}

interface EmailInboxSetupProps {
  inboxes: EmailInbox[];
  onCreated: () => void;
  onDeleted: (channelId: string) => void;
}

export function EmailInboxSetup({ inboxes, onCreated, onDeleted }: EmailInboxSetupProps) {
  const t = useTranslations("Settings.emailInbox");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxToDelete, setInboxToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      imapPort: 993,
      imapUseTLS: true,
      smtpSendVia: "RESEND_CUSTOM_DOMAIN",
    },
  });

  const smtpSendVia = form.watch("smtpSendVia");
  const imapUseTLS = form.watch("imapUseTLS");

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/email-inboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? t("errorFailedToConnect"));
        return;
      }

      form.reset();
      setOpen(false);
      onCreated();
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!inboxToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/settings/email-inboxes?channelId=${inboxToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) onDeleted(inboxToDelete);
    } finally {
      setIsDeleting(false);
      setInboxToDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{t("title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("description")}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("connectButton")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialogDescription")}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="channelName">{t("channelNameLabel")}</Label>
                  <Input id="channelName" placeholder={t("channelNamePlaceholder")} {...form.register("channelName")} />
                  {form.formState.errors.channelName && (
                    <p className="text-xs text-destructive">{form.formState.errors.channelName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fromAddress">{t("fromAddressLabel")}</Label>
                  <Input id="fromAddress" type="email" placeholder={t("fromAddressPlaceholder")} {...form.register("fromAddress")} />
                  {form.formState.errors.fromAddress && (
                    <p className="text-xs text-destructive">{form.formState.errors.fromAddress.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fromName">{t("fromNameLabel")} <span className="text-muted-foreground">{t("fromNameOptional")}</span></Label>
                  <Input id="fromName" placeholder={t("fromNamePlaceholder")} {...form.register("fromName")} />
                </div>
              </div>

              <hr />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="imapHost">{t("imapHostLabel")}</Label>
                  <Input id="imapHost" placeholder={t("imapHostPlaceholder")} {...form.register("imapHost")} />
                  {form.formState.errors.imapHost && (
                    <p className="text-xs text-destructive">{form.formState.errors.imapHost.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imapPort">{t("portLabel")}</Label>
                  <Input id="imapPort" type="number" {...form.register("imapPort")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imapUser">{t("imapUsernameLabel")}</Label>
                  <Input id="imapUser" placeholder={t("imapUsernamePlaceholder")} {...form.register("imapUser")} />
                  {form.formState.errors.imapUser && (
                    <p className="text-xs text-destructive">{form.formState.errors.imapUser.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imapPassword">{t("imapPasswordLabel")}</Label>
                  <Input id="imapPassword" type="password" {...form.register("imapPassword")} />
                  {form.formState.errors.imapPassword && (
                    <p className="text-xs text-destructive">{form.formState.errors.imapPassword.message}</p>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{t("useSslLabel")}</p>
                    <p className="text-xs text-muted-foreground">
                      {imapUseTLS ? t("useSslDescriptionEnabled") : t("useSslDescriptionDisabled")}
                    </p>
                  </div>
                  <Switch
                    checked={imapUseTLS}
                    onCheckedChange={(v) => form.setValue("imapUseTLS", v)}
                  />
                </div>
              </div>

              <hr />

              <div className="space-y-1.5">
                <Label>{t("outboundLabel")}</Label>
                <Select
                  value={smtpSendVia}
                  onValueChange={(v) => form.setValue("smtpSendVia", v as "RESEND_CUSTOM_DOMAIN" | "SMTP_DIRECT")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESEND_CUSTOM_DOMAIN">{t("outboundResend")}</SelectItem>
                    <SelectItem value="SMTP_DIRECT">{t("outboundSmtp")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {smtpSendVia === "SMTP_DIRECT" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpHost">{t("smtpHostLabel")}</Label>
                    <Input id="smtpHost" placeholder={t("smtpHostPlaceholder")} {...form.register("smtpHost")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpPort">{t("portLabel")}</Label>
                    <Input id="smtpPort" type="number" placeholder={t("smtpPortPlaceholder")} {...form.register("smtpPort")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpUser">{t("smtpUsernameLabel")}</Label>
                    <Input id="smtpUser" {...form.register("smtpUser")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpPassword">{t("smtpPasswordLabel")}</Label>
                    <Input id="smtpPassword" type="password" {...form.register("smtpPassword")} />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("cancelButton")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("connectSubmitButton")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inbox list */}
      {inboxes.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <Mail className="h-5 w-5 flex-shrink-0" />
          {t("emptyState")}
        </div>
      ) : (
        <div className="space-y-2">
          {inboxes.map((inbox) => (
            <div
              key={inbox.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{inbox.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {inbox.emailInbox?.fromAddress}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {inbox.emailInbox?.isActive ? (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <CheckCircle className="h-2.5 w-2.5 text-green-500" />
                    {t("statusActive")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">{t("statusPaused")}</Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                  onClick={() => setInboxToDelete(inbox.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disconnect confirmation */}
      <AlertDialog open={!!inboxToDelete} onOpenChange={(v) => !v && setInboxToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("disconnectTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("disconnectDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("disconnectCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t("disconnectConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
