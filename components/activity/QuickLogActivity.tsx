"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createActivity } from "@/actions/activities";
import type { ActivityParentType } from "@/hooks/swr/useActivities";
import { useContacts } from "@/hooks/swr/useContacts";
import { useProperties } from "@/hooks/swr/useProperties";
import { useDocuments } from "@/hooks/swr/useDocuments";
import { useAppToast } from "@/hooks/use-app-toast";

const ACTIVITY_KINDS = [
  "EMAIL",
  "CALL",
  "MEETING",
  "NOTE",
  "TASK",
  "SHOWING",
  "DOCUMENT",
  "OTHER",
] as const;

type ActivityKind = (typeof ACTIVITY_KINDS)[number];

const KINDS_WITH_SUBJECT: ActivityKind[] = ["EMAIL", "CALL", "MEETING", "TASK"];

interface QuickLogActivityProps {
  parentType: ActivityParentType;
  parentId: string;
  onSuccess?: () => void;
}

export function QuickLogActivity({
  parentType,
  parentId,
  onSuccess,
}: QuickLogActivityProps) {
  const t = useTranslations("activities");
  const { toast } = useAppToast();
  const [kind, setKind] = useState<ActivityKind>("NOTE");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [relatedContactId, setRelatedContactId] = useState("");
  const [relatedPropertyId, setRelatedPropertyId] = useState("");
  const [relatedDocumentId, setRelatedDocumentId] = useState("");
  const [isPending, startTransition] = useTransition();

  const isShowing = kind === "SHOWING";
  const isDocument = kind === "DOCUMENT";
  const hasSubject = KINDS_WITH_SUBJECT.includes(kind);

  const { contacts } = useContacts({ enabled: isShowing });
  const { properties } = useProperties({ enabled: isShowing });
  const { documents } = useDocuments({ enabled: isDocument });

  const handleKindChange = (v: string) => {
    setKind(v as ActivityKind);
    setSubject("");
    setRelatedContactId("");
    setRelatedPropertyId("");
    setRelatedDocumentId("");
  };

  const handleSubmit = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const payload: Record<string, unknown> = {
        parentType,
        parentId,
        kind,
        body,
      };
      if (hasSubject && subject.trim()) payload.subject = subject.trim();
      if (isShowing) {
        if (relatedContactId) payload.relatedContactId = relatedContactId;
        if (relatedPropertyId) payload.relatedPropertyId = relatedPropertyId;
      }
      if (isDocument && relatedDocumentId) {
        payload.relatedDocumentId = relatedDocumentId;
      }

      const result = await createActivity(payload);
      if (result.success) {
        setBody("");
        setSubject("");
        setRelatedContactId("");
        setRelatedPropertyId("");
        setRelatedDocumentId("");
        onSuccess?.();
      } else {
        toast.error("createFailed");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Select value={kind} onValueChange={handleKindChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTIVITY_KINDS.map((k) => (
            <SelectItem key={k} value={k}>
              {t(`kinds.${k}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasSubject && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            {t("fields.subject")}
          </Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("fields.subject")}
            className="h-8 text-sm"
          />
        </div>
      )}

      {isShowing && (
        <>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">
              {t("fields.relatedContact")}
            </Label>
            <Select
              value={relatedContactId}
              onValueChange={setRelatedContactId}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("fields.selectContact")} />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">
              {t("fields.relatedProperty")}
            </Label>
            <Select
              value={relatedPropertyId}
              onValueChange={setRelatedPropertyId}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("fields.selectProperty")} />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {isDocument && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            {t("fields.relatedDocument")}
          </Label>
          <Select
            value={relatedDocumentId}
            onValueChange={setRelatedDocumentId}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t("fields.selectDocument")} />
            </SelectTrigger>
            <SelectContent>
              {documents.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("fields.body")}
        rows={3}
        className="resize-none"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!body.trim() || isPending}
        >
          {t("actions.create")}
        </Button>
      </div>
    </div>
  );
}
