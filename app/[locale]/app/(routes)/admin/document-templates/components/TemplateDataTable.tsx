"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TemplateEditorSheet } from "./TemplateEditorSheet";
import { publishDocumentTemplate } from "@/actions/document-templates";
import { useDocumentTemplates } from "@/hooks/swr/useDocumentTemplates";

export interface TemplateRow {
  id: string;
  name: string;
  category: string;
  isPublished: boolean;
  version: number;
  updatedAt: string;
}

interface TemplateDataTableProps {
  initialTemplates: TemplateRow[];
}

export function TemplateDataTable({ initialTemplates }: TemplateDataTableProps) {
  const t = useTranslations("document-templates");
  const { templates: rawTemplates, mutate } = useDocumentTemplates();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The hook fetches from /api/document-templates which returns OrgDocumentTemplate
  // shaped data. Cast to TemplateRow[] to match actual runtime shape.
  const liveTemplates = rawTemplates as unknown as TemplateRow[];
  const rows = liveTemplates.length > 0 ? liveTemplates : initialTemplates;

  return (
    <>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setSelectedId(null);
            setEditorOpen(true);
          }}
        >
          {t("createTemplate")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("fields.name")}</TableHead>
            <TableHead>{t("fields.category")}</TableHead>
            <TableHead>{t("fields.status")}</TableHead>
            <TableHead>{t("fields.version")}</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tpl) => (
            <TableRow key={tpl.id}>
              <TableCell className="font-medium">{tpl.name}</TableCell>
              <TableCell>{t(`categories.${tpl.category}`)}</TableCell>
              <TableCell>
                <Badge variant={tpl.isPublished ? "default" : "secondary"}>
                  {tpl.isPublished ? t("status.published") : t("status.draft")}
                </Badge>
              </TableCell>
              <TableCell>v{tpl.version}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedId(tpl.id);
                      setEditorOpen(true);
                    }}
                  >
                    {t("actions.edit")}
                  </Button>
                  {!tpl.isPublished && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await publishDocumentTemplate(tpl.id);
                        mutate();
                      }}
                    >
                      {t("actions.publish")}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TemplateEditorSheet
        open={editorOpen}
        templateId={selectedId}
        onClose={() => {
          setEditorOpen(false);
          setSelectedId(null);
          mutate();
        }}
      />
    </>
  );
}
