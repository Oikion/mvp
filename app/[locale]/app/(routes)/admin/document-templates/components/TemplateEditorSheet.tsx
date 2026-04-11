"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDocumentTemplate,
  updateDocumentTemplate,
} from "@/actions/document-templates";
import { useAppToast } from "@/hooks/use-app-toast";

const DOC_CATEGORIES = [
  "LISTING_AGREEMENT",
  "BUYER_AGREEMENT",
  "OFFER",
  "COUNTER_OFFER",
  "PURCHASE_CONTRACT",
  "TRANSFER_DEED",
  "POWER_OF_ATTORNEY",
  "NDA",
  "GENERAL",
] as const;

interface TemplateEditorSheetProps {
  open: boolean;
  templateId: string | null;
  onClose: () => void;
}

export function TemplateEditorSheet({
  open,
  templateId,
  onClose,
}: TemplateEditorSheetProps) {
  const t = useTranslations("document-templates");
  const { toast } = useAppToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("GENERAL");
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class:
          "min-h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      },
    },
  });

  useEffect(() => {
    if (!open) {
      setName("");
      setCategory("GENERAL");
      editor?.commands.clearContent();
    }
  }, [open, editor]);

  const handleSave = async () => {
    if (!name.trim() || !editor) return;
    setIsSaving(true);

    const body = editor.getJSON();
    const input = { name, category, body };

    const result = templateId
      ? await updateDocumentTemplate(templateId, input)
      : await createDocumentTemplate(input);

    setIsSaving(false);
    if (result.success) {
      onClose();
    } else {
      toast.error("createFailed");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-[600px] sm:max-w-[600px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {templateId ? t("actions.edit") : t("createTemplate")}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">{t("fields.name")}</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("fields.name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-category">{t("fields.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="tpl-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`categories.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("fields.content")}</Label>
            <EditorContent editor={editor} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              {t("form.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
              {t("form.submit")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
