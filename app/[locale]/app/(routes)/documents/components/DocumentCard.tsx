"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Share2, Eye, Trash2, Link as LinkIcon, Lock } from "lucide-react";
import { MentionDisplay, type MentionData } from "./MentionDisplay";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface DocumentCardProps {
  id: string;
  document_name: string;
  description?: string | null;
  createdAt?: Date | null;
  mentions?: MentionData | null;
  linkEnabled?: boolean;
  shareableLink?: string | null;
  passwordProtected?: boolean;
  viewsCount?: number;
  onView?: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function DocumentCard({
  id,
  document_name,
  description,
  createdAt,
  mentions,
  linkEnabled,
  shareableLink,
  passwordProtected,
  viewsCount = 0,
  onView,
  onShare,
  onDelete,
}: DocumentCardProps) {
  const t = useTranslations("documents");

  return (
    <Card className="hover:shadow-elevation-3 transition-all duration-fast">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <FileText className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{document_name}</CardTitle>
              {createdAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(createdAt), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {linkEnabled && (
              <Badge variant="outline" className="text-xs">
                <LinkIcon className="h-3 w-3 mr-1" />
                {t("documentCard.shared")}
              </Badge>
            )}
            {passwordProtected && (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                {t("documentCard.protected")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
        )}
        
        <MentionDisplay mentions={mentions} />
        
        {viewsCount > 0 && (
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>
              {viewsCount === 1 
                ? t("documentCard.views", { count: viewsCount })
                : t("documentCard.viewsPlural", { count: viewsCount })}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView?.(id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {t("documentCard.view")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShare?.(id)}
          >
            <Share2 className="h-4 w-4 mr-1" />
            {t("documentCard.share")}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete?.(id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

