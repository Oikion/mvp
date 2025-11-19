"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, FileText, Download, Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";

interface SharedDocumentViewerProps {
  linkId: string;
  document?: any;
  requiresPassword?: boolean;
  invalidPassword?: boolean;
}

export function SharedDocumentViewer({
  linkId,
  document: initialDocument,
  requiresPassword = false,
  invalidPassword = false,
}: SharedDocumentViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [document, setDocument] = useState(initialDocument);
  const [error, setError] = useState(invalidPassword ? "Invalid password" : "");

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Redirect with password in query params
    const params = new URLSearchParams(searchParams.toString());
    params.set("password", password);
    router.push(`/documents/share/${linkId}?${params.toString()}`);
  };

  if (requiresPassword || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Lock className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle className="text-center">Password Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center mb-6">
              This document is password protected. Please enter the password to view it.
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
                error={error}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full">
                Access Document
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-6xl py-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <FileText className="h-6 w-6 text-muted-foreground mt-1" />
                <div>
                  <CardTitle>{document.document_name}</CardTitle>
                  {document.createdAt && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {format(new Date(document.createdAt), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open(document.document_file_url, "_blank")}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {document.description && (
              <div className="mb-6">
                <p className="text-muted-foreground">{document.description}</p>
              </div>
            )}

            {/* Document Preview */}
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              {document.document_file_mimeType === "application/pdf" ? (
                <iframe
                  src={document.document_file_url}
                  className="w-full h-[800px] border-0"
                  title={document.document_name}
                />
              ) : (
                <div className="p-12 text-center">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Preview not available for this file type.
                  </p>
                  <Button
                    onClick={() => window.open(document.document_file_url, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              )}
            </div>

            {/* View Count */}
            {document.viewsCount > 0 && (
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{document.viewsCount} view{document.viewsCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

