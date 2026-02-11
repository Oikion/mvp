"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessagingPlatform, PLATFORM_INFO } from "@/types/messaging";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViberConnectionForm } from "./ViberConnectionForm";
import { WhatsAppConnectionFlow } from "./WhatsAppConnectionFlow";
import { MessengerConnectionFlow } from "./MessengerConnectionFlow";
import { ConnectionHelpDialog } from "./ConnectionHelpDialog";

const PLATFORM_CARDS: Array<{
  platform: MessagingPlatform;
  accent: string;
}> = [
  { platform: MessagingPlatform.VIBER, accent: "bg-primary/10 text-primary" },
  { platform: MessagingPlatform.WHATSAPP, accent: "bg-success/10 text-success" },
  { platform: MessagingPlatform.MESSENGER, accent: "bg-info/10 text-info" },
];

interface ConnectPlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectPlatformDialog({ open, onOpenChange }: ConnectPlatformDialogProps) {
  const t = useTranslations("messages");
  const [selectedPlatform, setSelectedPlatform] = useState<MessagingPlatform | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedPlatform(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" aria-describedby="connect-platform-description">
        <DialogHeader>
          <DialogTitle>{t("external.connectPlatformTitle")}</DialogTitle>
          <DialogDescription id="connect-platform-description">
            {t("external.connectPlatformDescription")}
          </DialogDescription>
        </DialogHeader>

        {!selectedPlatform ? (
          <div className="space-y-3">
            {PLATFORM_CARDS.map((card) => {
              const info = PLATFORM_INFO[card.platform];
              return (
                <Card
                  key={card.platform}
                  className={cn(
                    "cursor-pointer transition-colors hover:border-primary",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                  onClick={() => setSelectedPlatform(card.platform)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPlatform(card.platform);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={t("external.connect") + " " + t(`external.platforms.${card.platform.toLowerCase()}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full",
                          card.accent
                        )}
                      >
                        <img
                          src={info.icon}
                          alt=""
                          className="h-6 w-6"
                          width={24}
                          height={24}
                          aria-hidden
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {t(`external.platforms.${card.platform.toLowerCase()}`)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t(`external.platformDescriptions.${card.platform.toLowerCase()}`)}
                        </p>
                        {info.usersInGreece ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            {info.usersInGreece} {t("external.usersInGreece")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("external.connect")}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
            <Alert className="mt-4">
              <InfoIcon className="h-4 w-4" aria-hidden />
              <AlertDescription>
                {t("external.adminAccessNote")}
              </AlertDescription>
            </Alert>
            <div className="flex justify-end pt-2">
              <ConnectionHelpDialog />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPlatform(null)}>
              {t("external.back")}
            </Button>

            {selectedPlatform === MessagingPlatform.VIBER ? (
              <ViberConnectionForm
                onConnected={() => {
                  onOpenChange(false);
                }}
                onCancel={() => setSelectedPlatform(null)}
              />
            ) : null}

            {selectedPlatform === MessagingPlatform.WHATSAPP ? (
              <WhatsAppConnectionFlow
                onConnected={() => onOpenChange(false)}
                onCancel={() => setSelectedPlatform(null)}
              />
            ) : null}

            {selectedPlatform === MessagingPlatform.MESSENGER ? (
              <MessengerConnectionFlow
                onConnected={() => onOpenChange(false)}
                onCancel={() => setSelectedPlatform(null)}
              />
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
