"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoGenerateRequestsDialog } from "../../../../requests/components/AutoGenerateRequestsDialog";

interface Props {
  contactId: string;
  linkedPropertyCount: number;
}

export function GenerateRequestSuggestion({ contactId, linkedPropertyCount }: Props) {
  const t = useTranslations("requests.autoGenerate");
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm text-foreground">
            {t("suggestionBanner", { count: linkedPropertyCount })}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() => setOpen(true)}
          >
            {t("generateButton")}
          </Button>
        </div>
      </div>

      <AutoGenerateRequestsDialog
        open={open}
        onOpenChange={setOpen}
        initialContactIds={[contactId]}
      />
    </>
  );
}
