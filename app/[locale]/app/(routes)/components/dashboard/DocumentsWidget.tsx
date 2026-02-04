"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Download,
} from "lucide-react";
import moment from "moment";
import type { RecentDocument } from "@/actions/dashboard/get-recent-documents";

interface DocumentsWidgetProps {
  documents: RecentDocument[];
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4" />;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  )
    return <FileSpreadsheet className="h-4 w-4" />;
  if (mimeType === "application/pdf" || mimeType.includes("document"))
    return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentsWidget: React.FC<DocumentsWidgetProps> = ({ documents }) => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("recentDocuments")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/app/documents`} className="flex items-center gap-1">
            {tCommon("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {t("noRecentDocuments")}
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/${locale}/app/documents?id=${doc.id}`}
                className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
              >
                <div className="rounded-md bg-muted p-2 flex-shrink-0">
                  {getFileIcon(doc.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {doc.size && <span>{formatFileSize(doc.size)}</span>}
                    {doc.createdAt && (
                      <span>{moment(doc.createdAt).fromNow()}</span>
                    )}
                  </div>
                  {(doc.linkedClients.length > 0 || doc.linkedProperties.length > 0) && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {doc.linkedClients.slice(0, 1).map((client) => (
                        <Badge
                          key={client.id}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {client.name}
                        </Badge>
                      ))}
                      {doc.linkedProperties.slice(0, 1).map((property) => (
                        <Badge
                          key={property.id}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {property.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(doc.url, "_blank");
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">{tCommon("download")}</span>
                </Button>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
