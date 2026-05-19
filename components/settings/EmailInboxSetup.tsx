"use client";

import { useState } from "react";
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
        setError(body.error ?? "Failed to connect inbox");
        return;
      }

      form.reset();
      setOpen(false);
      onCreated();
    } catch {
      setError("Network error — please try again");
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
          <h3 className="text-sm font-medium">Email Inboxes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect a mailbox to receive and reply to emails inside the Messaging Hub.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Connect Inbox
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Connect Email Inbox</DialogTitle>
              <DialogDescription>
                Enter your IMAP credentials to connect a mailbox. Emails will be polled every 2 minutes.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="channelName">Channel name</Label>
                  <Input id="channelName" placeholder="e.g. info@agency.gr" {...form.register("channelName")} />
                  {form.formState.errors.channelName && (
                    <p className="text-xs text-destructive">{form.formState.errors.channelName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fromAddress">From address</Label>
                  <Input id="fromAddress" type="email" placeholder="info@agencyname.gr" {...form.register("fromAddress")} />
                  {form.formState.errors.fromAddress && (
                    <p className="text-xs text-destructive">{form.formState.errors.fromAddress.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fromName">Display name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="fromName" placeholder="Agency Name" {...form.register("fromName")} />
                </div>
              </div>

              <hr />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="imapHost">IMAP host</Label>
                  <Input id="imapHost" placeholder="imap.gmail.com" {...form.register("imapHost")} />
                  {form.formState.errors.imapHost && (
                    <p className="text-xs text-destructive">{form.formState.errors.imapHost.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imapPort">Port</Label>
                  <Input id="imapPort" type="number" {...form.register("imapPort")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imapUser">IMAP username</Label>
                  <Input id="imapUser" placeholder="info@agencyname.gr" {...form.register("imapUser")} />
                  {form.formState.errors.imapUser && (
                    <p className="text-xs text-destructive">{form.formState.errors.imapUser.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="imapPassword">IMAP password / app password</Label>
                  <Input id="imapPassword" type="password" {...form.register("imapPassword")} />
                  {form.formState.errors.imapPassword && (
                    <p className="text-xs text-destructive">{form.formState.errors.imapPassword.message}</p>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Use SSL/TLS</p>
                    <p className="text-xs text-muted-foreground">
                      {imapUseTLS ? "Port 993 (SSL) — recommended" : "Port 143 with STARTTLS"}
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
                <Label>Outbound sending via</Label>
                <Select
                  value={smtpSendVia}
                  onValueChange={(v) => form.setValue("smtpSendVia", v as "RESEND_CUSTOM_DOMAIN" | "SMTP_DIRECT")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESEND_CUSTOM_DOMAIN">Resend (custom domain — recommended)</SelectItem>
                    <SelectItem value="SMTP_DIRECT">SMTP direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {smtpSendVia === "SMTP_DIRECT" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpHost">SMTP host</Label>
                    <Input id="smtpHost" placeholder="smtp.agencyname.gr" {...form.register("smtpHost")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input id="smtpPort" type="number" placeholder="587" {...form.register("smtpPort")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpUser">SMTP username</Label>
                    <Input id="smtpUser" {...form.register("smtpUser")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpPassword">SMTP password</Label>
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
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Connect Inbox
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
          No email inboxes connected yet.
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
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Paused</Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
            <AlertDialogTitle>Disconnect inbox?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop polling for new emails. Existing conversations will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
