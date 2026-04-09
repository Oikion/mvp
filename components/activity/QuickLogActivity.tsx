"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createActivity } from "@/actions/activities";
import type { ActivityParentType } from "@/hooks/swr/useActivities";
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
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await createActivity({ parentType, parentId, kind, body });
      if (result.success) {
        setBody("");
        onSuccess?.();
      } else {
        toast.error("createFailed");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Select value={kind} onValueChange={(v) => setKind(v as ActivityKind)}>
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
