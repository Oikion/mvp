"use client";

import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmailConversationHeaderProps {
  subject: string | null;
  senderEmail: string | null;
  senderName: string | null;
}

export function EmailConversationHeader({
  subject,
  senderEmail,
  senderName,
}: EmailConversationHeaderProps) {
  if (!senderEmail) return null;

  const displayName = senderName ?? senderEmail;

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b bg-muted/30">
      <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{subject ?? "(no subject)"}</p>
        <p className="text-xs text-muted-foreground truncate">
          {displayName !== senderEmail ? (
            <>
              {displayName}{" "}
              <span className="text-muted-foreground/60">&lt;{senderEmail}&gt;</span>
            </>
          ) : (
            senderEmail
          )}
        </p>
      </div>
      <Badge variant="secondary" className="flex-shrink-0 text-[10px] h-5">
        Email
      </Badge>
    </div>
  );
}
