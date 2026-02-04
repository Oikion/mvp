"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/navigation";
import { DocumentEditor } from "@/components/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface DocumentEditorViewProps {
  documentId?: string;
  locale: string;
}

export function DocumentEditorView({ documentId }: DocumentEditorViewProps) {
  const t = useTranslations("documents.editor");
  const router = useRouter();
  
  const [documentName, setDocumentName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!documentId;

  // Load existing document if editing
  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const loadDocument = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error("Failed to load document");
      }
      const data = await response.json();
      
      setDocumentName(data.document_name || "");
      setDescription(data.description || "");
      
      // If document has HTML content stored, use it
      if (data.content) {
        setContent(data.content);
      }
    } catch (error) {
      console.error("Failed to load document:", error);
      toast.error(t("failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (html: string) => {
    if (!documentName.trim()) {
      toast.error(t("nameRequired"));
      return;
    }

    try {
      const endpoint = isEditing
        ? `/api/documents/${documentId}`
        : "/api/documents";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_name: documentName,
          description,
          content: html,
          document_file_mimeType: "text/html",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save document");
      }

      const data = await response.json();
      toast.success(t("saved"));

      if (!isEditing && data.id) {
        router.push(`/app/documents/editor?id=${data.id}`);
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error(t("failedToSave"));
    }
  };

  const handleExportPdf = async (html: string) => {
    // For PDF export, we'll use the browser's print functionality
    // Create a new window with the content and trigger print
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${documentName || "Document"}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
                line-height: 1.6;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 1em 0;
              }
              th, td {
                border: 1px solid #ccc;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #f5f5f5;
              }
              blockquote {
                border-left: 3px solid #ccc;
                margin-left: 0;
                padding-left: 1em;
              }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {isEditing ? t("editDocument") : t("createDocument")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("pageDescription")}</p>
        </div>
      </div>

      {/* Document Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("documentInfo")}</CardTitle>
          <CardDescription>{t("documentInfoDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("documentName")} *</Label>
            <Input
              id="name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder={t("documentNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <DocumentEditor
        initialContent={content}
        placeholder={t("startTyping")}
        onSave={handleSave}
        onExportPdf={handleExportPdf}
        className="min-h-[500px]"
      />
    </div>
  );
}

export default DocumentEditorView;








