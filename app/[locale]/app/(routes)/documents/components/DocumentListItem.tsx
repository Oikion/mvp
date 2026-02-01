"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Share2, Eye, Trash2, Link as LinkIcon, Lock } from "lucide-react";
import { MentionDisplay, type MentionData } from "./MentionDisplay";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface DocumentListItemProps {
  id: string;
  document_name: string;
  description?: string | null;
  createdAt?: Date | null;
  mentions?: MentionData | null;
  linkEnabled?: boolean;
  passwordProtected?: boolean;
  viewsCount?: number;
  onView?: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function DocumentListItem({
  id,
  document_name,
  description,
  createdAt,
  mentions,
  linkEnabled,
  passwordProtected,
  viewsCount = 0,
  onView,
  onShare,
  onDelete,
}: DocumentListItemProps) {
  const t = useTranslations("documents");

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
      {/* Icon */}
      <div className="shrink-0">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1fr,200px,120px] lg:grid-cols-[1fr,250px,150px,100px] gap-2 md:gap-4 items-center">
        {/* Name & Description */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{document_name}</h3>
            {linkEnabled && (
              <Badge variant="outline" className="text-xs shrink-0">
                <LinkIcon className="h-3 w-3 mr-1" />
                {t("documentCard.shared")}
              </Badge>
            )}
            {passwordProtected && (
              <Badge variant="outline" className="text-xs shrink-0">
                <Lock className="h-3 w-3 mr-1" />
                {t("documentCard.protected")}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {description}
            </p>
          )}
        </div>

        {/* Mentions - hidden on mobile */}
        <div className="hidden md:block">
          <MentionDisplay mentions={mentions} compact />
        </div>

        {/* Date - hidden on mobile */}
        <div className="hidden lg:block text-sm text-muted-foreground">
          {createdAt && format(new Date(createdAt), "MMM d, yyyy")}
        </div>

        {/* Views - hidden on mobile */}
        <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground">
          <Eye className="h-3 w-3" />
          <span>{viewsCount}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView?.(id)}
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">{t("documentCard.view")}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShare?.(id)}
        >
          <Share2 className="h-4 w-4" />
          <span className="sr-only">{t("documentCard.share")}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete?.(id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">{t("documentCard.delete")}</span>
        </Button>
      </div>
    </div>
  );
}
