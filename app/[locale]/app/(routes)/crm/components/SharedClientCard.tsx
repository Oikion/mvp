"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, ExternalLink, Share2, Eye, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import type { SharedClientData } from "@/actions/crm/get-shared-clients";

interface SharedClientCardProps {
  data: SharedClientData;
}

export function SharedClientCard({ data }: SharedClientCardProps) {
  const t = useTranslations("crm");

  const initials = data.contact?.displayName
    ? data.contact.displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CL";

  const statusLabel =
    data.contact?.status === "ACTIVE" ? "Active" : data.contact?.status || "Unknown";

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col h-full relative">
      {/* Shared badge overlay */}
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="flex items-center gap-1 bg-warning/15 text-warning dark:text-warning">
          <Share2 className="h-3 w-3" />
          {t("SharedView.shared")}
        </Badge>
      </div>

      <CardHeader className="flex flex-row items-center gap-4 pb-4 pr-24">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-semibold text-lg truncate">{data.contact?.displayName}</h3>
          <div className="flex items-center gap-2">
            <Badge
              variant={statusLabel === "Active" ? "default" : "secondary"}
              className="text-xs"
            >
              {statusLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span className="truncate">{data.contact?.email || "-"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span className="truncate">{data.contact?.primaryPhone || "-"}</span>
        </div>

        {/* Shared by info */}
        <div className="pt-3 border-t mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src="" />
              <AvatarFallback className="text-xs bg-muted">
                ?
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {t("SharedView.sharedBy")}{" "}
              <span className="font-medium text-foreground">{"Deleted User"}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {data.permissions === "VIEW_COMMENT" ? (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {t("SharedView.canComment")}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {t("SharedView.viewOnly")}
              </span>
            )}
            <span>•</span>
            <span>{formatDistanceToNow(new Date(data.createdAt))} ago</span>
          </div>
          {data.message && (
            <p className="text-xs italic text-muted-foreground bg-muted/50 rounded p-2">
              &ldquo;{data.message}&rdquo;
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex justify-end">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link href={`/app/crm/clients/${data.contact?.friendlyId}`} className="inline-flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            {t("SharedView.viewProfile")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}













