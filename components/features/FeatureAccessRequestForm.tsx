"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { requestFeatureAccess } from "@/actions/features/request-feature-access";
import type { FeatureType } from "./FeatureAccessDenied";

interface FeatureAccessRequestFormProps {
  /**
   * The feature to request access for
   */
  readonly feature: FeatureType;
  /**
   * The display name of the feature
   */
  readonly featureTitle: string;
  /**
   * Callback when request is successfully submitted
   */
  readonly onSuccess: () => void;
  /**
   * Callback when form is cancelled
   */
  readonly onCancel: () => void;
  /**
   * Custom class name for the container
   */
  readonly className?: string;
}

/**
 * Form component for requesting access to a premium feature.
 * Follows the referral application pattern.
 */
export function FeatureAccessRequestForm({
  feature,
  featureTitle,
  onSuccess,
  onCancel,
  className = ""
}: FeatureAccessRequestFormProps) {
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error(t("featureAccess.reasonRequired"));
      return;
    }

    startTransition(async () => {
      const result = await requestFeatureAccess({
        feature,
        message: message.trim(),
      });

      if (result.success) {
        toast.success(t("featureAccess.requestSubmitted"));
        onSuccess();
      } else {
        toast.error(result.error || t("featureAccess.requestFailed"));
      }
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <CardTitle>{t("featureAccess.applyTitle")}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          {t("featureAccess.applyDescription", { feature: featureTitle })}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">{t("featureAccess.reasonLabel")}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("featureAccess.reasonPlaceholder")}
              rows={4}
              disabled={isPending}
              required
            />
            <p className="text-sm text-muted-foreground">
              {t("featureAccess.reasonHint")}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button 
            type="submit" 
            className="flex-1"
            leftIcon={isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            disabled={isPending}
          >
            {isPending ? t("featureAccess.submitting") : t("featureAccess.submit")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
