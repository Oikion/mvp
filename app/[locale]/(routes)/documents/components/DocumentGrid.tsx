"use client";

import type { JsonValue } from "@prisma/client/runtime/library";
import { DocumentCard } from "./DocumentCard";
import { type MentionData } from "./MentionDisplay";
import { useRouter } from "@/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface Document {
  id: string;
  document_name: string;
  description?: string | null;
  createdAt?: Date | null;
  mentions?: JsonValue;
  linkEnabled?: boolean;
  shareableLink?: string | null;
  passwordProtected?: boolean;
  viewsCount?: number;
  accounts?: Array<{ id: string; client_name: string }>;
  linkedProperties?: Array<{ id: string; property_name: string }>;
  linkedCalComEvents?: Array<{ id: string; title: string | null }>;
  linkedTasks?: Array<{ id: string; title: string }>;
}

interface MentionOption {
  id: string;
  name: string;
  type: "client" | "property" | "event" | "task";
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

export function DocumentGrid({ documents }: DocumentGridProps) {
  const t = useTranslations("documents");
  const router = useRouter();

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {documents.length === 1
            ? t("documentGrid.documentsCount", { count: documents.length })
            : t("documentGrid.documentsCountPlural", { count: documents.length })}
        </h2>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
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
              mentions={document.mentions as MentionData | null}
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
    </div>
  );
}
