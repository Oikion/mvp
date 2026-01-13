"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { applyToReferralProgramme } from "@/actions/referrals/apply-to-referral-programme";

interface ApplicationFormProps {
  userName: string;
  userEmail: string;
  onSuccess: () => void;
}

export function ApplicationForm({
  userName,
  userEmail,
  onSuccess,
}: ApplicationFormProps) {
  const t = useTranslations("referrals.portal.application");
  const tErrors = useTranslations("referrals.errors");
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      const result = await applyToReferralProgramme({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

      if (result.success) {
        onSuccess();
      } else {
        toast.error(result.error || tErrors("applicationFailed"));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t("messageLabel")}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              rows={4}
              disabled={isPending}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t("submit")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
