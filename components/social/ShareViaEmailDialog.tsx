"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAppToast } from "@/hooks/use-app-toast";
import { Mail, Loader2, Building2, User, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

type ShareEntityType = "property" | "client" | "post";

interface ShareViaEmailDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly entityType: ShareEntityType;
  readonly entityId: string;
  readonly entityName: string;
}

export function ShareViaEmailDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
}: ShareViaEmailDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useAppToast();
  const t = useTranslations("share.emailShare");

  const entityIcons = {
    property: Building2,
    client: User,
    post: FileText,
  };

  const Icon = entityIcons[entityType];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error(t("error.title"), { description: t("error.invalidEmail"), isTranslationKey: false });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/share/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityType,
          entityId,
          recipientEmail,
          recipientName: recipientName.trim() || undefined,
          personalMessage: personalMessage.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("error.generic"));
      }

      toast.success(t("success.title"), { description: t("success.description"), isTranslationKey: false });

      // Reset form and close dialog
      setRecipientEmail("");
      setRecipientName("");
      setPersonalMessage("");
      onOpenChange(false);
    } catch (error) {
      toast.error(t("error.title"), { description: error instanceof Error ? error.message : t("error.generic"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setRecipientEmail("");
      setRecipientName("");
      setPersonalMessage("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { entityType: t(`entityTypes.${entityType}`) })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Entity Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <div className="p-2 rounded-md bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground capitalize">
                  {t("sharing", { entityType: t(`entityTypes.${entityType}`) })}
                </p>
                <p className="font-medium truncate">{entityName}</p>
              </div>
            </div>

            {/* Recipient Email */}
            <div className="space-y-2">
              <Label htmlFor="recipient-email">{t("form.recipientEmail")}</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder={t("form.recipientEmailPlaceholder")}
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
            </div>

            {/* Recipient Name (optional) */}
            <div className="space-y-2">
              <Label htmlFor="recipient-name">{t("form.recipientName")}</Label>
              <Input
                id="recipient-name"
                type="text"
                placeholder={t("form.recipientNamePlaceholder")}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            {/* Personal Message (optional) */}
            <div className="space-y-2">
              <Label htmlFor="personal-message">{t("form.personalMessage")}</Label>
              <Textarea
                id="personal-message"
                placeholder={t("form.personalMessagePlaceholder")}
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {personalMessage.length}/500
              </p>
            </div>

            {/* Info text */}
            <p className="text-xs text-muted-foreground">
              {t("sharingDetails", { entityType: t(`entityTypes.${entityType}`) })}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {t("buttons.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || !recipientEmail}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("buttons.sending")}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {t("buttons.send")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}








