"use client";

import { Building2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AgencyWorkspaceOnlyMessageProps {
  message: string;
}

export function AgencyWorkspaceOnlyMessage({ message }: AgencyWorkspaceOnlyMessageProps) {
  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" aria-hidden />
          Agency workspace required
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
