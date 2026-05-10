"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Share2, Eye, MessageSquare, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ShareInfo {
  permissions: "VIEW_ONLY" | "VIEW_COMMENT";
  message: string | null;
  sharedAt: Date;
  sharedBy: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;
}

interface SharedAccessBannerProps {
  shareInfo: ShareInfo;
  entityType: "property" | "contact" | "request";
}

export function SharedAccessBanner({ shareInfo, entityType: _entityType }: SharedAccessBannerProps) {
  const isViewOnly = shareInfo.permissions === "VIEW_ONLY";

  return (
    <Card className="p-4 bg-primary/10 border-primary/30">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-full bg-primary/15">
          <Share2 className="h-4 w-4 text-primary dark:text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Shared with you
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${
                  isViewOnly
                    ? "border-warning text-warning dark:text-warning"
                    : "border-success text-success dark:text-success"
                }`}
              >
                {isViewOnly ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    View only
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    View & Comment
                  </>
                )}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(shareInfo.sharedAt), { addSuffix: true })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={shareInfo.sharedBy?.avatar || ""} />
              <AvatarFallback className="text-xs bg-info/20">
                {shareInfo.sharedBy?.name?.charAt(0) || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              Shared by{" "}
              <span className="font-medium text-foreground">
                {shareInfo.sharedBy?.name || shareInfo.sharedBy?.email || "Deleted User"}
              </span>
            </span>
          </div>

          {shareInfo.message && (
            <p className="text-sm text-muted-foreground italic border-l-2 border-info/40 pl-3 mt-2">
              &ldquo;{shareInfo.message}&rdquo;
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
