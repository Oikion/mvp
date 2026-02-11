"use client";

import { useTranslations } from "next-intl";
import { HelpCircle, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ConnectionHelpDialog() {
  const t = useTranslations("messages");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("external.help.trigger")}>
          <HelpCircle className="h-4 w-4 mr-2" aria-hidden />
          {t("external.help.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="connection-help-description">
        <DialogHeader>
          <DialogTitle>{t("external.help.title")}</DialogTitle>
        </DialogHeader>
        <p id="connection-help-description" className="sr-only">
          {t("external.help.description")}
        </p>
        <Tabs defaultValue="common" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="common">{t("external.help.commonIssues")}</TabsTrigger>
            <TabsTrigger value="requirements">{t("external.help.requirements")}</TabsTrigger>
          </TabsList>
          <TabsContent value="common" className="space-y-4 mt-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>{t("external.help.issue1Title")}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("external.help.issue1Body")}
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>{t("external.help.issue1Bullet1")}</li>
                    <li>{t("external.help.issue1Bullet2")}</li>
                    <li>{t("external.help.issue1Bullet3")}</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>{t("external.help.issue2Title")}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("external.help.issue2Body")}
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>{t("external.help.issue2Bullet1")}</li>
                    <li>{t("external.help.issue2Bullet2")}</li>
                    <li>{t("external.help.issue2Bullet3")}</li>
                    <li>{t("external.help.issue2Bullet4")}</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>{t("external.help.issue3Title")}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("external.help.issue3BodyViber")}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("external.help.issue3BodyMeta")}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Alert>
              <InfoIcon className="h-4 w-4" aria-hidden />
              <AlertDescription>{t("external.help.contactSupport")}</AlertDescription>
            </Alert>
          </TabsContent>
          <TabsContent value="requirements" className="space-y-3 mt-4">
            <div>
              <h4 className="font-medium mb-2">{t("external.help.viberReqs")}</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>{t("external.help.viberReq1")}</li>
                <li>{t("external.help.viberReq2")}</li>
                <li>{t("external.help.viberReq3")}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("external.help.whatsappReqs")}</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>{t("external.help.whatsappReq1")}</li>
                <li>{t("external.help.whatsappReq2")}</li>
                <li>{t("external.help.whatsappReq3")}</li>
                <li>{t("external.help.whatsappReq4")}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("external.help.messengerReqs")}</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>{t("external.help.messengerReq1")}</li>
                <li>{t("external.help.messengerReq2")}</li>
                <li>{t("external.help.messengerReq3")}</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
