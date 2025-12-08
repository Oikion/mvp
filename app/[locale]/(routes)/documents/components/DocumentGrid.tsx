"use client";

import { useState } from "react";
import { DocumentCard } from "./DocumentCard";
import { UploadModal } from "./UploadModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "@/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { MentionOption } from "./MentionInput";
import type { MultiSelectOption } from "@/components/ui/multi-select";

interface Document {
  id: string;
  document_name: string;
  description?: string | null;
  createdAt?: Date | null;
  mentions?: any;
  linkEnabled?: boolean;
  shareableLink?: string | null;
  passwordProtected?: boolean;
  viewsCount?: number;
  accounts?: Array<{ id: string; client_name: string }>;
  linkedProperties?: Array<{ id: string; property_name: string }>;
  linkedCalComEvents?: Array<{ id: string; title: string | null }>;
  linkedTasks?: Array<{ id: string; title: string }>;
}

interface DocumentGridProps {
  documents: Document[];
  mentionOptions: {
    clients: MentionOption[];
    properties: MentionOption[];
    events: MentionOption[];
    tasks: MentionOption[];
  };
}

export function DocumentGrid({ documents, mentionOptions: mentionOptionsData }: DocumentGridProps) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Prepare options for components
  const allMentionOptions: MentionOption[] = [
    ...mentionOptionsData.clients,
    ...mentionOptionsData.properties,
    ...mentionOptionsData.events,
    ...mentionOptionsData.tasks,
  ];

  const clientOptions: MultiSelectOption[] = mentionOptionsData.clients.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const propertyOptions: MultiSelectOption[] = mentionOptionsData.properties.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const eventOptions: MultiSelectOption[] = mentionOptionsData.events.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const taskOptions: MultiSelectOption[] = mentionOptionsData.tasks.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const handleUpload = async (data: {
    file: File;
    document_name: string;
    description?: string;
    clientIds?: string[];
    propertyIds?: string[];
    eventIds?: string[];
    taskIds?: string[];
  }) => {
    try {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("document_name", data.document_name);
      if (data.description) formData.append("description", data.description);
      if (data.clientIds) formData.append("clientIds", JSON.stringify(data.clientIds));
      if (data.propertyIds) formData.append("propertyIds", JSON.stringify(data.propertyIds));
      if (data.eventIds) formData.append("eventIds", JSON.stringify(data.eventIds));
      if (data.taskIds) formData.append("taskIds", JSON.stringify(data.taskIds));

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Try to get the actual error message from the API response
        let errorMessage = t("documentGrid.failedToUpload");
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If parsing fails, use the default message
        }
        throw new Error(errorMessage);
      }

      toast.success(t("uploadModal.documentUploadedSuccess"));
      router.refresh();
    } catch (error: any) {
      console.error("Failed to upload document:", error);
      toast.error(error.message || t("documentGrid.failedToUpload"));
      throw error; // Re-throw so UploadModal can handle it
    }
  };

  const handleView = (id: string) => {
    router.push(`/documents/${id}`);
  };

  const handleShare = (id: string) => {
    router.push(`/documents/${id}?tab=share`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("documentGrid.deleteConfirm"))) {
      return;
    }

    const response = await fetch(`/api/documents/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error(t("documentGrid.failedToDelete"));
      return;
    }

    toast.success(t("documentGrid.documentDeleted"));
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {documents.length === 1 
            ? t("documentGrid.documentsCount", { count: documents.length })
            : t("documentGrid.documentsCountPlural", { count: documents.length })}
        </h2>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("documentGrid.uploadDocument")}
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("documentGrid.noDocuments")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              id={document.id}
              document_name={document.document_name}
              description={document.description}
              createdAt={document.createdAt}
              mentions={document.mentions}
              linkEnabled={document.linkEnabled}
              shareableLink={document.shareableLink}
              passwordProtected={document.passwordProtected}
              viewsCount={document.viewsCount}
              onView={handleView}
              onShare={handleShare}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUpload={handleUpload}
        mentionOptions={allMentionOptions}
        clientOptions={clientOptions}
        propertyOptions={propertyOptions}
        eventOptions={eventOptions}
        taskOptions={taskOptions}
      />
    </>
  );
}

